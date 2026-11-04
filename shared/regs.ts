export type PageKind =
  | 'video'
  | 'bangumi'
  | 'live'
  | 'live-index'
  | 'article'
  | 'index'
  | 'search'
  | 'other';

export function detectPage(url: string = window.location.href): PageKind {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return 'other';
  }

  if (!parsed.hostname.endsWith('acfun.cn')) {
    return 'other';
  }

  if (parsed.hostname === 'live.acfun.cn') {
    return parsed.pathname.startsWith('/live/') ? 'live' : 'live-index';
  }

  if (parsed.hostname !== 'www.acfun.cn') {
    return 'other';
  }

  if (/^\/v\/ac\d+/i.test(parsed.pathname)) {
    return 'video';
  }

  if (/^\/bangumi\//i.test(parsed.pathname)) {
    return 'bangumi';
  }

  if (/^\/a\/ac\d+/i.test(parsed.pathname)) {
    return 'article';
  }

  if (parsed.pathname === '/' || parsed.pathname === '') {
    return 'index';
  }

  if (parsed.pathname.startsWith('/search')) {
    return 'search';
  }

  return 'other';
}

export function pageMatches(
  pages: PageKind[] | undefined,
  page: PageKind,
): boolean {
  if (!pages || pages.length === 0) {
    return true;
  }

  return pages.includes(page);
}
