import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'video.custom-rate',
  title: '自定义倍速',
  description: '在播放器原生倍速菜单中添加自定义倍速入口。',
  group: 'video',
  order: 40,
  pages: ['video', 'bangumi'],
  when: 'player-ready',
  defaultEnabled: true,
  settings: {
    keyboardShortcuts: {
      type: 'boolean',
      label: '启用快捷键',
      description: 'Shift+↑ 加速 0.25，Shift+↓ 减速 0.25。',
      default: true,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
