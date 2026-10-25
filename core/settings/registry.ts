import type { ModuleConfig } from './schema';

const configModules = import.meta.glob<{
  config: ModuleConfig<any>;
}>('../../modules/**/config.ts', { eager: true });

export const moduleConfigs: ModuleConfig<any>[] = Object.values(configModules)
  .map((module) => module.config)
  .sort((a, b) => {
    const orderDiff = (a.order ?? 100) - (b.order ?? 100);
    return orderDiff !== 0 ? orderDiff : a.title.localeCompare(b.title);
  });
