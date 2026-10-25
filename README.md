# AcFun Helper Light

AcFun Helper 的轻量重构版本，基于 WXT + Vue 3 + TypeScript。设置页和 popup 使用 mdui 1.0.2 的 Material Design 1 视觉。

## 开发

```bash
pnpm install
pnpm dev
```

构建：

```bash
pnpm compile
pnpm build
```

## 当前功能

- 核心和框架
- mdui + Vue 的设置页和 popup
- Schema 驱动的模块设置页
- 视频页 / 番剧页底部进度条
  - 已播放进度与缓冲进度
  - 普通模式和全屏模式
  - 颜色、高度、透明度配置
  - 控制栏显示时自动隐藏
  - 可选标题百分比

## 目录

```text
entrypoints/    WXT 入口（content / background / options / popup）
core/           配置、模块调度、播放器适配、Vue 挂载
modules/        功能模块
components/     Vue 通用组件
ui/mdui/        mdui 引入、运行时封装和字体裁剪
shared/         页面识别等共享代码
```

详细设计见 [PROG_DESIGN.md](./PROG_DESIGN.md)。

## 添加模块

1. 创建 `modules/<group>/<module>/config.ts`。
2. 创建 `modules/<group>/<module>/index.ts`。
3. 如有界面，创建对应 Vue 组件。

设置页和内容脚本会自动发现新模块。

## 第三方资源

- mdui 1.0.2：MIT License，见 `public/licenses/mdui-LICENSE.txt`
- Roboto、Material Icons：Apache License 2.0，见 `public/licenses/`
