import {
  DANMAKU_RELAY_BATCH,
  type RelayBatch,
} from '@/shared/danmakuRelay';

let connectionWarned = false;

async function pushBatch(batch: RelayBatch): Promise<void> {
  if (!batch.server) {
    return;
  }

  try {
    const response = await fetch(`${batch.server}/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room: batch.room ?? '',
        messages: batch.messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    connectionWarned = false;
  } catch (error) {
    if (connectionWarned) {
      return;
    }

    connectionWarned = true;
    console.warn(
      '[AcFun Helper][live.danmaku-relay] 无法连接中转服务，请确认 v3/remote-danmaku-server 已启动。',
      error,
    );
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!message || typeof message !== 'object') {
      return;
    }

    const batch = message as Partial<RelayBatch>;

    if (batch.type !== DANMAKU_RELAY_BATCH || !Array.isArray(batch.messages)) {
      return;
    }

    void pushBatch(batch as RelayBatch);
  });
});
