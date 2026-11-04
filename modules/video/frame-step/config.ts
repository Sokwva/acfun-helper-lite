import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'video.frame-step',
  title: '帧步进',
  description: '暂停视频后按帧前进或后退，支持自动识别帧率。',
  group: 'video',
  order: 30,
  pages: ['video', 'bangumi'],
  when: 'player-ready',
  defaultEnabled: true,
  settings: {
    frameRate: {
      type: 'select',
      label: '帧率',
      description: '自动识别失败时，可以在设置页手动指定。',
      default: 'auto',
      options: [
        { label: '自动识别', value: 'auto' },
        { label: '23.976 fps', value: '23.976' },
        { label: '24 fps', value: '24' },
        { label: '25 fps', value: '25' },
        { label: '29.97 fps', value: '29.97' },
        { label: '30 fps', value: '30' },
        { label: '59.94 fps', value: '59.94' },
        { label: '60 fps', value: '60' },
        { label: '120 fps', value: '120' },
      ],
    },
    keyboardShortcuts: {
      type: 'boolean',
      label: '启用快捷键',
      description: 'Shift+A 上一帧，Shift+D 下一帧。',
      default: true,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
