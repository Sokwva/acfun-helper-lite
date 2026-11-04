import { defineModuleConfig, type InferSettings } from '@/core/settings/schema';

export const config = defineModuleConfig({
  id: 'live.danmaku-relay',
  title: '直播弹幕转发',
  description:
    '把当前直播间的弹幕转发到本机中转服务，平板等设备用浏览器打开服务页面即可查看。需要先运行 v3/remote-danmaku-server。',
  group: 'live',
  order: 20,
  pages: ['live'],
  when: 'dom-ready',
  defaultEnabled: false,
  settings: {
    serverUrl: {
      type: 'text',
      label: '中转服务地址',
      description:
        '弹幕会 POST 到该地址的 /push。保持默认即可，只有改过服务端口时才需要修改。',
      default: 'http://127.0.0.1:12451',
      placeholder: 'http://127.0.0.1:12451',
    },
    debug: {
      type: 'boolean',
      label: '输出解析日志',
      description: '在控制台打印每条解析出的弹幕，便于校准页面选择器。',
      default: false,
    },
  },
});

export type Conf = InferSettings<typeof config.settings>;
