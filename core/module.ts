import type { Component, InjectionKey } from 'vue';
import type { PlayerApi } from './player';
import type {
  FullConf,
  ModuleConfig,
  SettingsSchema,
} from './settings/schema';

export interface ModuleUI {
  mount(component: Component, props?: Record<string, unknown>): () => void;
  mountAt(
    target: HTMLElement,
    component: Component,
    props?: Record<string, unknown>,
  ): () => void;
}

export interface ModuleContext<S extends SettingsSchema> {
  readonly conf: FullConf<S>;
  readonly signal: AbortSignal;
  readonly player: PlayerApi;
  readonly ui: ModuleUI;
  readonly log: (...args: unknown[]) => void;
}

export interface ModuleDefinition<S extends SettingsSchema> {
  config: ModuleConfig<S>;
  setup: (ctx: ModuleContext<S>) => void | (() => void);
}

export const MODULE_CONTEXT_KEY: InjectionKey<ModuleContext<any>> =
  Symbol('acfun-helper-module-context');

export function defineModule<S extends SettingsSchema>(
  config: ModuleConfig<S>,
  setup: ModuleDefinition<S>['setup'],
): ModuleDefinition<S> {
  return { config, setup };
}
