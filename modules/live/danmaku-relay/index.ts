import { defineModule } from '@/core/module';
import {
  DANMAKU_RELAY_BATCH,
  type RelayBatch,
  type RelayDanmaku,
} from '@/shared/danmakuRelay';
import { config } from './config';
import { isFeedItem, parseFeedItem } from './parse';

const MAX_BUFFER = 200;

export default defineModule(config, ({ conf, signal, log }) => {
  const buffer: RelayDanmaku[] = [];
  let flushScheduled = false;
  let disposed = false;

  const getServer = () => conf.serverUrl.trim().replace(/\/+$/, '');

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }

    const messages = buffer.splice(0, buffer.length);
    const room = /\/live\/(\d+)/.exec(location.pathname)?.[1];

    if (conf.debug) {
      for (const message of messages) {
        log('relay', message);
      }
    }

    const batch: RelayBatch = {
      type: DANMAKU_RELAY_BATCH,
      server: getServer(),
      ...(room ? { room } : {}),
      messages,
    };

    try {
      const result = browser.runtime.sendMessage(batch);
      if (result && typeof result.catch === 'function') {
        result.catch(() => undefined);
      }
    } catch {
      // 中转服务未启动或扩展上下文已失效时忽略，下一条弹幕会继续尝试。
    }
  };

  const scheduleFlush = () => {
    if (flushScheduled) {
      return;
    }

    flushScheduled = true;

    // 用微任务而不是定时器：页面切到后台时定时器会被节流，微任务不会。
    queueMicrotask(() => {
      flushScheduled = false;
      flush();
    });
  };

  const enqueue = (message: RelayDanmaku) => {
    buffer.push(message);

    if (buffer.length > MAX_BUFFER) {
      buffer.splice(0, buffer.length - MAX_BUFFER);
    }

    scheduleFlush();
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!isFeedItem(node)) {
          continue;
        }

        const message = parseFeedItem(node);
        if (message) {
          enqueue(message);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    observer.disconnect();
    signal.removeEventListener('abort', dispose);
    flush();
  };

  signal.addEventListener('abort', dispose, { once: true });

  return dispose;
});
