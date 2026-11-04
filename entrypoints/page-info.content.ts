const PAGE_INFO_ELEMENT_ID = 'acfun-helper-page-info';
const POLL_INTERVAL = 250;
const MAX_TRIES = 80;

interface PageInfoPayload {
  title?: string;
  coverUrl?: string;
  user?: { name?: string };
  channel?: { parentName?: string; name?: string };
  videoList?: Array<{
    id?: string;
    title?: string;
    priority?: number;
  }>;
  currentVideoId?: string;
}

interface PageInfoSource {
  title?: string;
  coverUrl?: string;
  user?: { name?: string };
  channel?: { parentName?: string; name?: string };
  videoList?: Array<{
    id?: string;
    title?: string;
    priority?: number;
  }>;
  currentVideoId?: string;
}

export default defineContentScript({
  matches: ['*://www.acfun.cn/v/ac*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    let lastJson = '';

    const asString = (value: unknown): string | undefined =>
      typeof value === 'string' ? value : undefined;

    const writePageInfo = (source: PageInfoSource) => {
      const payload: PageInfoPayload = {
        title: asString(source.title),
        coverUrl: asString(source.coverUrl),
        user: source.user
          ? { name: asString(source.user.name) }
          : undefined,
        channel: source.channel
          ? {
              parentName: asString(source.channel.parentName),
              name: asString(source.channel.name),
            }
          : undefined,
        videoList: Array.isArray(source.videoList)
          ? source.videoList.map((part) => ({
              id: part.id != null ? String(part.id) : undefined,
              title: asString(part.title),
              priority:
                typeof part.priority === 'number'
                  ? part.priority
                  : undefined,
            }))
          : undefined,
        currentVideoId:
          source.currentVideoId != null
            ? String(source.currentVideoId)
            : undefined,
      };

      let json = '';

      try {
        json = JSON.stringify(payload);
      } catch {
        return;
      }

      if (!json || json === lastJson) {
        return;
      }

      lastJson = json;

      let element = document.getElementById(PAGE_INFO_ELEMENT_ID);

      if (!element) {
        element = document.createElement('div');
        element.id = PAGE_INFO_ELEMENT_ID;
        element.hidden = true;
        element.style.display = 'none';
        (document.body ?? document.documentElement)?.appendChild(element);
      }

      element.textContent = json;
    };

    const tryWrite = (): boolean => {
      const source = (window as Window & { pageInfo?: PageInfoSource })
        .pageInfo;

      if (!source || typeof source !== 'object') {
        return false;
      }

      writePageInfo(source);
      return true;
    };

    if (tryWrite()) {
      return;
    }

    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;

      if (tryWrite() || tries >= MAX_TRIES) {
        window.clearInterval(timer);
      }
    }, POLL_INTERVAL);
  },
});

