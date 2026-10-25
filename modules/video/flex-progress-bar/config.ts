import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'video.flex-progress-bar',
  title: '底部进度条',
  description: '在视频页和番剧页底部显示播放进度与缓冲进度。',
  group: 'video',
  order: 10,
  pages: ['video', 'bangumi'],
  when: 'player-ready',
  defaultEnabled: true,
  settings: {
    barColor: {
      type: 'color',
      label: '已播放颜色',
      default: '#fd4c5d',
    },
    loadedColor: {
      type: 'color',
      label: '缓冲颜色',
      default: '#e8e8e8',
    },
    barHeight: {
      type: 'number',
      label: '进度条高度',
      description: '普通模式和全屏模式共用。',
      default: 3,
      min: 1,
      max: 12,
      step: 1,
      unit: 'px',
    },
    opacity: {
      type: 'number',
      label: '透明度',
      default: 100,
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    showLoaded: {
      type: 'boolean',
      label: '显示缓冲进度',
      default: true,
    },
    hideWithControls: {
      type: 'boolean',
      label: '控制栏显示时隐藏',
      description: '避免和 AcFun 原生控制栏重叠。',
      default: true,
    },
    showPercentInTitle: {
      type: 'boolean',
      label: '在标题显示百分比',
      default: false,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
