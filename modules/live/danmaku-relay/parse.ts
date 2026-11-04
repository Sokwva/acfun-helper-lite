import type { DanmakuType, RelayDanmaku } from '@/shared/danmakuRelay';

export const FEED_CONTAINER_CLASS = 'live-feed-messages';

const TYPE_CLASS_MAP: ReadonlyArray<readonly [string, DanmakuType]> = [
  ['comment', 'comment'],
  ['user-enter', 'user-enter'],
  ['gift', 'gift'],
  ['like', 'like'],
  ['follow', 'follow'],
  ['join-club', 'join-club'],
  ['rich-text', 'rich-text'],
  ['emojiCommand', 'emoji'],
];

const NICKNAME_SELECTOR = '.nickname';

const CONTENT_SELECTOR = '.comment-text';

const MEDAL_SELECTOR = '.medal-name';

const STRIP_SELECTOR = [
  '.nickname',
  '.medal-wrapper',
  '.medal-name',
  '.medal-level',
  '.medal-flash',
  '.medal',
  '.anchor',
  '.btn-follow',
  '.btn-copy',
  '.btn-filter',
  '.manage-icon',
].join(', ');

const TIME_PREFIX = /^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/;

function textOf(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').replace(TIME_PREFIX, '').trim();
}

function cleanContent(value: string): string {
  return clean(value).replace(/^[：:]\s*/, '').trim();
}

function contentFromClone(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(STRIP_SELECTOR).forEach((node) => node.remove());
  return cleanContent(textOf(clone));
}

export function isFeedItem(node: Node): node is HTMLElement {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  const parent = node.parentElement;
  return !!parent && parent.classList.contains(FEED_CONTAINER_CLASS);
}

function resolveTypeElement(element: HTMLElement): {
  el: HTMLElement;
  type: DanmakuType;
} {
  for (const [className, type] of TYPE_CLASS_MAP) {
    if (element.classList.contains(className)) {
      return { el: element, type };
    }
  }

  for (const child of Array.from(element.children)) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }

    for (const [className, type] of TYPE_CLASS_MAP) {
      if (child.classList.contains(className)) {
        return { el: child, type };
      }
    }
  }

  return { el: element, type: 'other' };
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function parseFeedItem(node: HTMLElement): RelayDanmaku | null {
  const { el, type } = resolveTypeElement(node);

  // 注意：.nickname 上还有一个 data-comment 属性，里面存的是弹幕内容而不是用户名，
  // 用户名只能从文本节点读取。
  const nicknameEl = el.querySelector(NICKNAME_SELECTOR);
  const nickname = clean(textOf(nicknameEl));

  const contentEl = el.querySelector(CONTENT_SELECTOR);
  let content = cleanContent(textOf(contentEl));

  if (!content) {
    content = contentFromClone(el);
  }

  if (!content) {
    content = cleanContent(textOf(el));
    if (nickname && content.startsWith(nickname)) {
      content = cleanContent(content.slice(nickname.length));
    }
  }

  if (!nickname && !content) {
    return null;
  }

  const medalEl = el.querySelector(MEDAL_SELECTOR);
  const medal = clean(textOf(medalEl));

  return {
    id: createId(),
    type,
    nickname,
    content,
    ...(medal ? { medal } : {}),
    timestamp: Date.now(),
  };
}
