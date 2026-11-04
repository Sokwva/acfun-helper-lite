import { waitFor } from '@/core/dom';

const PAGE_INFO_ELEMENT_ID = 'acfun-helper-page-info';

export interface PageInfoPart {
  id?: string;
  title?: string;
  priority?: number;
}

export interface BridgedPageInfo {
  title?: string;
  coverUrl?: string;
  user?: { name?: string };
  channel?: { parentName?: string; name?: string };
  videoList?: PageInfoPart[];
  currentVideoId?: string;
}

export interface MediaPart {
  element: HTMLElement;
  title: string;
  id?: string;
}

export interface MediaPageInfo {
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  parts: MediaPart[];
  videoList: PageInfoPart[];
  currentVideoId?: string;
}

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const textFrom = (selectors: string[]): string => {
  for (const selector of selectors) {
    const text = document
      .querySelector<HTMLElement>(selector)
      ?.textContent?.trim();

    if (text) {
      return text;
    }
  }

  return '';
};

const metaContent = (selectors: string[]): string => {
  for (const selector of selectors) {
    const content = document
      .querySelector<HTMLMetaElement>(selector)
      ?.content?.trim();

    if (content) {
      return content;
    }
  }

  return '';
};

const absoluteUrl = (url: string): string => {
  if (!url) {
    return '';
  }

  try {
    return new URL(url, window.location.href).href;
  } catch {
    return '';
  }
};

const documentTitle = (): string =>
  document.title.replace(/\s*[-_]\s*AcFun.*$/i, '').trim();

const imageSrc = (selectors: string[]): string => {
  for (const selector of selectors) {
    const image = document.querySelector<HTMLImageElement>(selector);
    const src = image?.currentSrc || image?.src;

    if (src) {
      return src;
    }
  }

  return '';
};

const extractDomInfo = (): BridgedPageInfo => {
  const parentName = textFrom([
    '.channel-bread a.channel-second',
    'a.channel-second',
  ]);
  const channelName = textFrom([
    '.channel-bread a.channel-third',
    'a.channel-third',
  ]);
  const title =
    textFrom(['.video-description .title']) ||
    metaContent(['meta[property="og:title"]', 'meta[name="title"]']) ||
    documentTitle();
  const artist =
    textFrom(['a.up-name', '.up-name']) ||
    metaContent(['meta[name="author"]']);
  const coverUrl =
    metaContent(['meta[property="og:image"]', 'meta[name="og:image"]']) ||
    imageSrc([
      '.video-description img',
      '.up-details img',
      '.up-area img',
    ]);

  return {
    title,
    coverUrl,
    user: artist ? { name: artist } : undefined,
    channel:
      parentName || channelName
        ? {
            parentName: parentName || undefined,
            name: channelName || undefined,
          }
        : undefined,
  };
};

export async function readBridgedPageInfo(
  signal: AbortSignal,
): Promise<BridgedPageInfo | null> {
  const element = await waitFor<HTMLElement>(
    () => {
      const candidate = document.getElementById(PAGE_INFO_ELEMENT_ID);

      if (!candidate?.textContent?.trim()) {
        return null;
      }

      return candidate;
    },
    {
      timeout: 10000,
      signal,
    },
  );

  if (!element?.textContent) {
    return null;
  }

  try {
    const parsed = JSON.parse(element.textContent) as BridgedPageInfo;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getPartElements(): HTMLElement[] {
  const container = document.querySelector<HTMLElement>('.scroll-div');

  if (!container) {
    return [];
  }

  const partItems = container.querySelectorAll<HTMLElement>('.single-p');

  if (partItems.length > 0) {
    return Array.from(partItems).filter((element) =>
      Boolean(element.textContent?.trim()),
    );
  }

  return Array.from(container.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      Boolean(element.textContent?.trim()),
  );
}

export function resolveMediaPageInfo(
  bridged: BridgedPageInfo | null,
): MediaPageInfo {
  const domInfo = extractDomInfo();
  const videoList = Array.isArray(bridged?.videoList)
    ? bridged.videoList
    : [];
  const elements = getPartElements();
  const parts = elements.map((element, index) => ({
    element,
    title:
      asText(videoList[index]?.title) ||
      element.textContent?.trim() ||
      '',
    id: videoList[index]?.id,
  }));

  const title =
    asText(bridged?.title) ||
    domInfo.title?.trim() ||
    documentTitle() ||
    'AcFun';
  const artist =
    asText(bridged?.user?.name) ||
    domInfo.user?.name?.trim() ||
    '';
  const parentName =
    asText(bridged?.channel?.parentName) ||
    domInfo.channel?.parentName?.trim() ||
    '';
  const channelName =
    asText(bridged?.channel?.name) ||
    domInfo.channel?.name?.trim() ||
    '';
  const album = [parentName, channelName].filter(Boolean).join(' > ');
  const coverUrl = absoluteUrl(
    asText(bridged?.coverUrl) || domInfo.coverUrl?.trim() || '',
  );

  return {
    title,
    artist,
    album,
    coverUrl,
    parts,
    videoList,
    currentVideoId: bridged?.currentVideoId,
  };
}

export function getCurrentPartIndex(info: MediaPageInfo): number {
  const parts = info.parts;

  if (parts.length === 0) {
    return 0;
  }

  const urlMatch = window.location.href.match(/_(\d+)(?:$|[?&#])/);

  if (urlMatch?.[1]) {
    const index = Number(urlMatch[1]) - 1;

    if (index >= 0 && index < parts.length) {
      return index;
    }
  }

  const active = document.querySelector<HTMLElement>(
    '.scroll-div .current-priority, .scroll-div .active, .scroll-div .selected',
  );

  if (active) {
    const index = parts.findIndex(
      (part) =>
        part.element === active || part.element.contains(active),
    );

    if (index >= 0) {
      return index;
    }
  }

  if (info.currentVideoId) {
    const index = info.videoList.findIndex(
      (part) => part.id === info.currentVideoId,
    );

    if (index >= 0 && index < parts.length) {
      return index;
    }
  }

  return 0;
}

export function getPartTitle(
  info: MediaPageInfo,
  index: number,
): string {
  return (
    asText(info.videoList[index]?.title) ||
    asText(info.parts[index]?.title) ||
    ''
  );
}
