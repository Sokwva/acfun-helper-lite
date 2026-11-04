export const DANMAKU_RELAY_BATCH = 'ah:danmaku-relay:batch';

export type DanmakuType =
  | 'comment'
  | 'user-enter'
  | 'gift'
  | 'like'
  | 'follow'
  | 'join-club'
  | 'rich-text'
  | 'emoji'
  | 'other';

export interface RelayDanmaku {
  id: string;
  type: DanmakuType;
  nickname: string;
  content: string;
  medal?: string;
  timestamp: number;
}

export interface RelayBatch {
  type: typeof DANMAKU_RELAY_BATCH;
  server: string;
  room?: string;
  messages: RelayDanmaku[];
}
