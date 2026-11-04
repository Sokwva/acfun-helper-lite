import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'live.hide-player',
  title: '直播主页播放器',
  description: '暂停或删除直播主页自动播放的大屏播放器（“吓人的大电视”）。',
  group: 'live',
  order: 10,
  pages: ['live-index'],
  when: 'dom-ready',
  defaultEnabled: true,
  settings: {
    mode: {
      type: 'select',
      label: '处理方式',
      description: '删除会直接从页面移除播放器；仅暂停只阻止自动播放。',
      default: 'pause',
      options: [
        { label: '仅暂停（阻止自动播放）', value: 'pause' },
        { label: '删除播放器并隐藏', value: 'remove' },
      ],
    },
    mute: {
      type: 'boolean',
      label: '暂停时静音',
      description: '阻止自动播放后自动静音，可能影响之后打开的页面。',
      default: false,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
