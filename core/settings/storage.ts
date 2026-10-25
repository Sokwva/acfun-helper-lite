import type {
  FullConf,
  ModuleConfig,
  SettingsSchema,
} from './schema';
import { getDefaultConf } from './schema';

const STORAGE_PREFIX = 'ah:';

export function getStorageKey(moduleId: string): string {
  return `${STORAGE_PREFIX}${moduleId}`;
}

export function normalizeConf<S extends SettingsSchema>(
  config: ModuleConfig<S>,
  stored: unknown,
): FullConf<S> {
  const conf = getDefaultConf(config) as Record<string, unknown>;

  if (stored && typeof stored === 'object') {
    const raw = stored as Record<string, unknown>;

    for (const key of Object.keys(config.settings)) {
      const value = raw[key];
      if (value !== undefined) {
        conf[key] = value;
      }
    }

    if (typeof raw.enabled === 'boolean') {
      conf.enabled = raw.enabled;
    }
  }

  return conf as FullConf<S>;
}

export async function loadModuleConf<S extends SettingsSchema>(
  config: ModuleConfig<S>,
): Promise<FullConf<S>> {
  const key = getStorageKey(config.id);
  const result = await browser.storage.local.get(key);
  return normalizeConf(config, result[key]);
}

export async function saveModuleConf(
  moduleId: string,
  conf: Record<string, unknown>,
): Promise<void> {
  await browser.storage.local.set({ [getStorageKey(moduleId)]: conf });
}

export async function resetModuleConf<S extends SettingsSchema>(
  config: ModuleConfig<S>,
): Promise<FullConf<S>> {
  const conf = getDefaultConf(config);
  await saveModuleConf(config.id, conf);
  return conf;
}

export function onStorageChanged(
  callback: (moduleId: string, newValue: unknown) => void,
): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName !== 'local') {
      return;
    }

    for (const [key, change] of Object.entries(changes)) {
      if (key.startsWith(STORAGE_PREFIX)) {
        callback(key.slice(STORAGE_PREFIX.length), change.newValue);
      }
    }
  };

  browser.storage.onChanged.addListener(listener);

  return () => {
    browser.storage.onChanged.removeListener(listener);
  };
}
