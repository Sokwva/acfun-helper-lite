# AcFun Helper Light 程序基础设计

## 1. 目标

本项目是 AcFun Helper 的轻量重构版本。目标不是一次性复刻旧版全部功能，而是建立一套足够小、可持续增加功能的插件骨架。

核心原则：

1. 一个功能一个目录，功能相关代码、配置、样式、Vue 组件放在一起。
2. 配置 Schema 是唯一数据源，类型、默认值、设置页表单都由它推导。
3. 内容脚本使用 Vue，但不引入 Pinia、mdui、jQuery 等重依赖。
4. 核心层只负责调度、配置、播放器适配和 Vue 挂载，不承载业务逻辑。
5. AcFun 页面选择器集中在 `core/player.ts`，业务模块不直接依赖易变选择器。
6. 模块必须可以安全卸载：所有监听、观察器、DOM、Vue 实例都随模块停止而释放。

## 2. 技术栈

- WXT：扩展构建、manifest、entrypoints、自动导入。
- Vue 3：设置页、popup、内容脚本内的模块 UI。
- TypeScript：核心逻辑和模块契约。
- mdui 1.0.2：只用于 options 和 popup 的 Material Design 1 视觉与少量稳定交互。
- 原生 DOM API：播放器事件、页面观察、样式注入。
- `chrome.storage.local` / `browser.storage.local`：模块配置持久化。

content script 不引入 mdui。mdui 只存在于扩展页面，避免影响页面样式和内容脚本体积。

## 3. 目录结构

```text
v3/
├─ entrypoints/
│  ├─ background.ts
│  ├─ content.ts
│  ├─ options/
│  │  └─ components/
│  └─ popup/
├─ core/
│  ├─ boot.ts
│  ├─ module.ts
│  ├─ registry.ts
│  ├─ player.ts
│  ├─ ui.ts
│  ├─ dom.ts
│  ├─ log.ts
│  └─ settings/
│     ├─ schema.ts
│     ├─ storage.ts
│     └─ registry.ts
├─ modules/
│  ├─ global/
│  ├─ video/
│  ├─ video-page/
│  ├─ live/
│  ├─ article/
│  ├─ page/
│  └─ comments/
├─ components/
│  └─ mdui/
├─ ui/
│  └─ mdui/
│     ├─ styles.ts
│     ├─ runtime.ts
│     ├─ popup.ts
│     └─ trimFonts.ts
├─ shared/
│  └─ regs.ts
└─ public/
```

`entrypoints/`、`core/`、`modules/` 都位于 WXT 默认 `srcDir` 下，因此 `@/core/...`、`@/modules/...` 可直接使用。

## 4. 核心分层

### 4.1 配置层

`core/settings/schema.ts`：

- 定义配置字段类型：`boolean`、`number`、`text`、`color`、`select`。
- `defineModuleConfig()` 声明模块元信息和配置 Schema。
- `InferSettings` 从 Schema 推导配置类型。
- 每个模块自动拥有 `enabled`，不需要在 Schema 中重复声明。
- `defaultEnabled` 控制模块首次安装时的默认开关。

`core/settings/storage.ts`：

- 存储键格式：`ah:<moduleId>`。
- 读取配置时与默认值合并，保证旧配置缺少字段时仍然可用。
- 提供 `loadModuleConf`、`saveModuleConf`、`resetModuleConf`、`onStorageChanged`。
- 通过 `storage.onChanged` 将设置页修改同步到内容脚本。

`core/settings/registry.ts`：

- 使用 `import.meta.glob('../../modules/**/config.ts')` 收集所有模块配置。
- 设置页只加载 `config.ts`，不加载模块运行时逻辑。

首期不迁移旧版配置，使用全新的 `ah:<moduleId>` 存储键。后续如果需要，可以在读取配置时增加一次性迁移逻辑。

### 4.2 模块层

`core/module.ts` 定义模块契约：

```ts
export default defineModule(config, ({ conf, player, ui, signal, log }) => {
  ui.mount(MyComponent, { conf, player });
});
```

- `config`：来自模块目录的 `config.ts`。
- `conf`：响应式配置对象，设置页修改后实时更新。
- `player`：AcFun 播放器适配层，提供视频元素、播放进度、缓冲进度、控制栏显隐、全屏目标。
- `ui`：Vue 挂载工具，模块停止时自动卸载。
- `signal`：模块生命周期信号，模块停止时触发。
- `log`：带模块名前缀的日志函数。

`core/registry.ts` 使用 `import.meta.glob('../modules/**/index.ts')` 收集运行时模块。

### 4.3 页面与生命周期

`shared/regs.ts` 负责 URL 识别，当前页面类型包括：

- `video`：普通视频页
- `bangumi`：番剧页
- `live`：直播页
- `article`：文章页
- `index`：首页
- `search`：搜索页
- `other`：其他页面

模块通过 `pages` 声明适用页面，通过 `when` 声明启动阶段：

- `immediate`：内容脚本启动后立即执行。
- `dom-ready`：`DOMContentLoaded` 后执行。
- `player-ready`：AcFun 播放器就绪后执行。

`core/boot.ts` 的流程：

1. 识别当前页面。
2. 过滤适用模块。
3. 读取所有模块配置。
4. 按阶段启动模块。
5. 监听配置变化，动态启动或停止模块。
6. 页面卸载时停止全部模块并销毁播放器适配层。

模块的 `enabled` 判断由核心层统一处理，模块内部不写“是否启用”逻辑。

### 4.4 播放器适配层

`core/player.ts` 是唯一集中管理 AcFun 播放器选择器的地方。对模块暴露：

```ts
interface PlayerApi {
  video: ShallowRef<HTMLVideoElement | null>;
  currentTime: Ref<number>;
  duration: Ref<number>;
  loaded: Ref<number>;
  controlsVisible: Ref<boolean>;
  fullscreenTarget: ShallowRef<HTMLElement>;
  whenReady(): Promise<boolean>;
  destroy(): void;
}
```

职责：

- 等待播放器出现。
- 监听 `timeupdate`、`progress`、`durationchange`、`loadedmetadata`。
- 计算缓冲位置。
- 观察控制栏状态。
- 处理全屏目标元素。
- 在播放器元素被替换时重新绑定。
- 提供统一清理入口。

### 4.5 Vue 挂载层

`core/ui.ts` 为模块提供 `ui.mount(component, props)`：

- 每次挂载创建独立 Vue 应用和宿主节点。
- 自动向组件注入模块上下文。
- 模块停止时自动 `unmount` 并移除宿主节点。
- 一个模块可以挂载多个 Vue 组件。

内容脚本不创建一个覆盖全站的大 Vue 应用，避免模块之间相互影响。

## 5. 设置页

### 5.1 Schema 驱动

`entrypoints/options/` 是 Schema 驱动的设置页：

- 左侧使用 mdui Drawer 展示模块分组。
- 右侧自动渲染模块开关和配置字段。
- 支持字段类型：开关、数字、颜色、文本、下拉框。
- 修改后自动保存。
- 每个模块支持恢复默认值。
- 支持搜索、加载状态和错误状态。
- 后续可增加导入/导出配置、自定义配置组件。

复杂模块如果需要特殊配置界面，后续在 `config.ts` 中增加 `customSettings` 字段，设置页按需加载对应 Vue 组件。

### 5.2 mdui + Vue 混合边界

mdui 只用于 options 和 popup，不进入 content script。

使用 mdui JS 的部分：

- `mdui.Drawer`：设置页导航抽屉。
- `mdui.confirm`：恢复默认确认框。
- `mdui.snackbar`：启用、停用、恢复默认提示。
- mdui textfield：输入框 focus / not-empty 状态。
- mdui ripple：按钮涟漪效果。

由 Vue 负责的部分：

- 设置页布局、分组、搜索、卡片。
- 所有配置字段状态和自动保存。
- 开关、字段值、恢复默认逻辑。
- 主题和响应式布局。

不使用的 mdui JS：

- Panel、Tooltip、Select、Tab、Headroom。
- 避免 mdui 与 Vue 同时管理复杂动态 DOM。

动态内容渲染后通过 `mdui.mutation()` 初始化新出现的 textfield。输入事件本身由 mdui 的 document 级事件委托处理，不需要每次输入都重新初始化。

### 5.3 体积控制

mdui 完整 CSS 约 325KB，完整字体资源约 2MB。当前策略：

- options / popup 引入完整 mdui CSS。
- 通过 `ui/mdui/trimFonts.ts` 只保留 Material Icons 和 Roboto 400 / 500 / 700 的 woff2。
- content script 不引入 mdui，保持原有体积。
- 当前构建总大小约 754KB，其中 mdui CSS 约 283KB，字体约 236KB；content script 保持约 78KB。
- 后续如有必要，再通过 PurgeCSS 或组件级 CSS 裁剪进一步减小 CSS。

## 6. 底部进度条模块

首个模块位于：

```text
modules/video/flex-progress-bar/
├─ config.ts
├─ index.ts
└─ FlexProgressBar.vue
```

### 6.1 功能

- 在视频页、番剧页底部显示播放进度。
- 显示已播放进度和缓冲进度。
- 普通模式和全屏模式共用一套样式。
- 支持颜色、高度、透明度、缓冲显示、随控制栏隐藏、标题百分比。
- 设置修改后实时生效。

### 6.2 实现方式

- 使用原生 `<video>` 的 `currentTime`、`duration`、`buffered`，不再读取 `.pro-current` 的 `style.width`。
- 使用 `transform: scaleX(ratio)` 更新进度，避免触发布局。
- 使用 Vue `<Teleport>` 将进度条投送到全屏元素或 `body`，自动处理全屏切换。
- 播放器状态由 `core/player.ts` 提供。
- 标题百分比功能保存并恢复原始标题。
- 模块停止时移除 Vue 应用、Teleport 内容和事件监听。

### 6.3 验收标准

- 视频页、番剧页正常显示。
- 普通模式和全屏模式都正常，进出全屏无残留。
- 切换分 P 不重复创建进度条。
- 修改配置立即生效。
- 非视频页不注入。
- `pnpm compile` 和 `pnpm build` 通过。

## 7. 后续模块规划

| 层 | 目录 | 职责 |
|---|---|---|
| 全局 | `modules/global/` | URL 参数、Omnibox、右键菜单、未读通知 |
| 视频播放器 | `modules/video/` | 进度条、倍速、AB 循环、画中画、MediaSession、清晰度 |
| 视频页面 | `modules/video-page/` | 简介展开、历史成就、分 P 增强 |
| 直播 | `modules/live/` | 首页暂停、宽屏、弹幕时间、按类型屏蔽 |
| 文章 | `modules/article/` | 图片拖拽、漫画模式、分区屏蔽 |
| 页面 | `modules/page/` | 导航美化、右侧导航、下一页、快捷键 |
| 评论 | `modules/comments/` | 评论遍历、用户标签、评论过滤 |

新增模块时只需要：

1. 创建 `modules/<group>/<module>/config.ts`。
2. 创建 `modules/<group>/<module>/index.ts`。
3. 如有 UI，创建对应 Vue 组件。
4. 设置页和运行时注册会自动发现新模块。
