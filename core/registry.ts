import type { ModuleDefinition } from './module';

const runtimeModules = import.meta.glob<{
  default: ModuleDefinition<any>;
}>('../modules/**/index.ts', { eager: true });

export const modules: ModuleDefinition<any>[] = Object.values(runtimeModules)
  .map((module) => module.default)
  .sort((a, b) => {
    const orderDiff =
      (a.config.order ?? 100) - (b.config.order ?? 100);
    return orderDiff !== 0
      ? orderDiff
      : a.config.title.localeCompare(b.config.title);
  });
