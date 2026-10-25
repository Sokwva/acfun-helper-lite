import type { PageKind } from '@/shared/regs';

export type ModuleGroup =
  | 'global'
  | 'video'
  | 'video-page'
  | 'live'
  | 'article'
  | 'page'
  | 'comments';

export type ModuleWhen = 'immediate' | 'dom-ready' | 'player-ready';

export const GROUP_LABELS: Record<ModuleGroup, string> = {
  global: '全局',
  video: '视频播放器',
  'video-page': '视频页面',
  live: '直播',
  article: '文章',
  page: '页面',
  comments: '评论',
};

export const GROUP_ORDER: ModuleGroup[] = [
  'video',
  'video-page',
  'live',
  'article',
  'page',
  'comments',
  'global',
];

interface BaseField {
  label: string;
  description?: string;
}

export interface BooleanField extends BaseField {
  type: 'boolean';
  default: boolean;
}

export interface NumberField extends BaseField {
  type: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface TextField extends BaseField {
  type: 'text';
  default: string;
  placeholder?: string;
}

export interface ColorField extends BaseField {
  type: 'color';
  default: string;
}

export interface SelectField extends BaseField {
  type: 'select';
  default: string;
  options: ReadonlyArray<{ label: string; value: string }>;
}

export type SettingsField =
  | BooleanField
  | NumberField
  | TextField
  | ColorField
  | SelectField;

export type SettingsSchema = Record<string, SettingsField>;

type FieldValue<F> = F extends BooleanField
  ? boolean
  : F extends NumberField
    ? number
    : F extends TextField
      ? string
      : F extends ColorField
        ? string
        : F extends SelectField
          ? string
          : never;

export type InferSettings<S extends SettingsSchema> = {
  [K in keyof S]: FieldValue<S[K]>;
};

export type FullConf<S extends SettingsSchema> = InferSettings<S> & {
  enabled: boolean;
};

export interface ModuleConfig<S extends SettingsSchema = SettingsSchema> {
  id: string;
  title: string;
  description?: string;
  group: ModuleGroup;
  order?: number;
  pages?: PageKind[];
  when?: ModuleWhen;
  defaultEnabled?: boolean;
  settings: S;
}

export function defineModuleConfig<S extends SettingsSchema>(
  config: ModuleConfig<S>,
): ModuleConfig<S> {
  return config;
}

export function getDefaultConf<S extends SettingsSchema>(
  config: ModuleConfig<S>,
): FullConf<S> {
  const conf: Record<string, unknown> = {
    enabled: config.defaultEnabled ?? true,
  };

  for (const [key, field] of Object.entries(config.settings)) {
    conf[key] = field.default;
  }

  return conf as FullConf<S>;
}
