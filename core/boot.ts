import { reactive } from 'vue';
import { detectPage, pageMatches } from '@/shared/regs';
import { error as logError, warn } from './log';
import type { ModuleContext, ModuleDefinition } from './module';
import { createPlayerApi } from './player';
import { modules as runtimeModules } from './registry';
import type { FullConf } from './settings/schema';
import { normalizeConf, loadModuleConf, onStorageChanged } from './settings/storage';
import { mountVueComponent } from './ui';

interface ModuleInstance {
  definition: ModuleDefinition<any>;
  conf: FullConf<any>;
  controller: AbortController | null;
  cleanup: (() => void) | null;
  phaseReady: boolean;
  started: boolean;
}

function domReady(): Promise<void> {
  if (document.readyState !== 'loading') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), {
      once: true,
    });
  });
}

export async function boot(): Promise<void> {
  const page = detectPage();
  const player = createPlayerApi();
  const instances = new Map<string, ModuleInstance>();

  const candidates = runtimeModules.filter((definition) =>
    pageMatches(definition.config.pages, page),
  );

  await Promise.all(
    candidates.map(async (definition) => {
      const conf = reactive(
        await loadModuleConf(definition.config),
      ) as FullConf<any>;

      instances.set(definition.config.id, {
        definition,
        conf,
        controller: null,
        cleanup: null,
        phaseReady: false,
        started: false,
      });
    }),
  );

  const start = (instance: ModuleInstance) => {
    if (instance.started || !instance.phaseReady || !instance.conf.enabled) {
      return;
    }

    const controller = new AbortController();
    let ctx!: ModuleContext<any>;

    ctx = {
      conf: instance.conf,
      signal: controller.signal,
      player,
      log: (...args: unknown[]) => {
        console.log(
          `[AcFun Helper][${instance.definition.config.id}]`,
          ...args,
        );
      },
      ui: {
        mount: (component, props) =>
          mountVueComponent(component, props, ctx, controller.signal),
        mountAt: (target, component, props) =>
          mountVueComponent(component, props, ctx, controller.signal, {
            target,
            removeTarget: true,
          }),
      },
    };

    instance.controller = controller;

    try {
      const cleanup = instance.definition.setup(ctx);
      instance.cleanup = typeof cleanup === 'function' ? cleanup : null;
      instance.started = true;
    } catch (error) {
      logError(instance.definition.config.id, error);
      controller.abort();
      instance.controller = null;
      instance.cleanup = null;
      instance.started = false;
    }
  };

  const stop = (instance: ModuleInstance) => {
    if (!instance.started) {
      return;
    }

    try {
      instance.cleanup?.();
    } catch (error) {
      logError(instance.definition.config.id, error);
    }

    instance.controller?.abort();
    instance.controller = null;
    instance.cleanup = null;
    instance.started = false;
  };

  const runPhase = (phase: string) => {
    for (const instance of instances.values()) {
      if ((instance.definition.config.when ?? 'dom-ready') !== phase) {
        continue;
      }

      instance.phaseReady = true;
      start(instance);
    }
  };

  const unsubscribe = onStorageChanged((moduleId, newValue) => {
    const instance = instances.get(moduleId);
    if (!instance) {
      return;
    }

    const nextConf = normalizeConf(
      instance.definition.config,
      newValue,
    ) as FullConf<any>;

    Object.assign(instance.conf, nextConf);

    if (nextConf.enabled) {
      start(instance);
    } else {
      stop(instance);
    }
  });

  window.addEventListener(
    'pagehide',
    () => {
      unsubscribe();
      for (const instance of instances.values()) {
        stop(instance);
      }
      player.destroy();
    },
    { once: true },
  );

  runPhase('immediate');
  await domReady();
  runPhase('dom-ready');

  const needsPlayer = candidates.some(
    (definition) =>
      (definition.config.when ?? 'dom-ready') === 'player-ready',
  );

  if (needsPlayer) {
    const ready = await player.whenReady();
    if (ready) {
      runPhase('player-ready');
    } else {
      warn('boot', 'player was not ready, player modules skipped');
    }
  }
}
