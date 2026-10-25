export interface WaitForOptions {
  timeout?: number;
  root?: ParentNode;
  signal?: AbortSignal;
}

export function waitFor<T extends Element>(
  target: string | (() => T | null),
  options: WaitForOptions = {},
): Promise<T | null> {
  const root = options.root ?? document;
  const find = (): T | null => {
    if (typeof target === 'function') {
      return target();
    }

    return root.querySelector<T>(target);
  };

  const existing = find();
  if (existing) {
    return Promise.resolve(existing);
  }

  const observeNode = (
    root instanceof Document ? (root.documentElement ?? root) : root
  ) as Node;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: T | null) => {
      if (settled) {
        return;
      }

      settled = true;
      observer.disconnect();
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      options.signal?.removeEventListener('abort', onAbort);
      resolve(value);
    };

    const onAbort = () => finish(null);

    const observer = new MutationObserver(() => {
      const element = find();
      if (element) {
        finish(element);
      }
    });

    observer.observe(observeNode, { childList: true, subtree: true });

    const timeout = options.timeout ?? 15000;
    const timer =
      timeout > 0 ? window.setTimeout(() => finish(null), timeout) : undefined;

    if (options.signal) {
      if (options.signal.aborted) {
        finish(null);
      } else {
        options.signal.addEventListener('abort', onAbort, { once: true });
      }
    }
  });
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function ratio(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return clamp01(value / total);
}
