import { createApp, type Component } from 'vue';
import type { ModuleContext } from './module';
import { MODULE_CONTEXT_KEY } from './module';

interface MountVueOptions {
  target?: HTMLElement;
  removeTarget?: boolean;
}

export function mountVueComponent(
  component: Component,
  props: Record<string, unknown> | undefined,
  context: ModuleContext<any>,
  signal: AbortSignal,
  options: MountVueOptions = {},
): () => void {
  const target = options.target;
  const host = target ?? document.createElement('div');
  host.dataset.acfunHelper = 'ui';

  if (!target) {
    const parent = document.body ?? document.documentElement;
    if (!parent) {
      throw new Error('AcFun Helper: unable to find mount parent');
    }

    parent.appendChild(host);
  }

  const app = createApp(component, props ?? {});
  app.provide(MODULE_CONTEXT_KEY, context);
  app.config.errorHandler = (error) => {
    console.error('[AcFun Helper] Vue error', error);
  };
  app.mount(host);

  let mounted = true;

  const unmount = () => {
    if (!mounted) {
      return;
    }

    mounted = false;
    app.unmount();

    if (!target || options.removeTarget) {
      host.remove();
    }

    signal.removeEventListener('abort', unmount);
  };

  if (signal.aborted) {
    unmount();
  } else {
    signal.addEventListener('abort', unmount, { once: true });
  }

  return unmount;
}
