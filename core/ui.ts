import { createApp, type Component } from 'vue';
import type { ModuleContext } from './module';
import { MODULE_CONTEXT_KEY } from './module';

export function mountVueComponent(
  component: Component,
  props: Record<string, unknown> | undefined,
  context: ModuleContext<any>,
  signal: AbortSignal,
): void {
  const parent = document.body ?? document.documentElement;
  if (!parent) {
    throw new Error('AcFun Helper: unable to find mount parent');
  }

  const host = document.createElement('div');
  host.dataset.acfunHelper = 'ui';
  parent.appendChild(host);

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
    host.remove();
    signal.removeEventListener('abort', unmount);
  };

  signal.addEventListener('abort', unmount, { once: true });
}
