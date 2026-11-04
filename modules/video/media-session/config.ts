import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'video.media-session',
  title: 'MediaSession',
  description: '把当前视频信息同步到系统媒体控制中心。',
  group: 'video',
  order: 50,
  pages: ['video'],
  when: 'player-ready',
  defaultEnabled: true,
  settings: {
    seekStep: {
      type: 'number',
      label: '快进 / 快退秒数',
      default: 5,
      min: 1,
      max: 60,
      step: 1,
      unit: '秒',
    },
    multiPart: {
      type: 'boolean',
      label: '启用上一 P / 下一 P 控制',
      default: true,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
