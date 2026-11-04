import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'video.ab-play',
  title: 'AB 回放',
  description: '在视频播放器中标记 A/B 点，并在两点之间循环播放。',
  group: 'video',
  order: 20,
  pages: ['video', 'bangumi'],
  when: 'player-ready',
  defaultEnabled: true,
  settings: {
    showTips: {
      type: 'boolean',
      label: '显示操作提示',
      description: '标记 A/B、开始或停止循环时显示播放器提示。',
      default: true,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
