<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, toRaw } from 'vue';
import type {
  ModuleConfig,
  SettingsField,
} from '@/core/settings/schema';
import { getDefaultConf } from '@/core/settings/schema';
import { saveModuleConf } from '@/core/settings/storage';
import MduiSwitch from '@/components/mdui/MduiSwitch.vue';
import {
  confirmAction,
  refreshMdui,
  showSnackbar,
} from '@/ui/mdui/runtime';
import FieldRenderer from './FieldRenderer.vue';

const props = defineProps<{
  config: ModuleConfig<any>;
  conf: Record<string, any>;
}>();

const fields = computed(
  () => Object.entries(props.config.settings) as [string, SettingsField][],
);

let timer: number | undefined;

const saveNow = () => {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }

  void saveModuleConf(props.config.id, toRaw(props.conf)).catch((error) => {
    console.error('[AcFun Helper] failed to save settings', error);
  });
};

const saveDebounced = () => {
  if (timer !== undefined) {
    window.clearTimeout(timer);
  }

  timer = window.setTimeout(saveNow, 250);
};

const updateField = (key: string, value: unknown) => {
  const field = props.config.settings[key];

  if (field?.type !== 'number' || typeof value !== 'number') {
    props.conf[key] = value;
    saveDebounced();
    return;
  }

  let next = value;

  if (field.min !== undefined) {
    next = Math.max(field.min, next);
  }

  if (field.max !== undefined) {
    next = Math.min(field.max, next);
  }

  props.conf[key] = next;
  saveDebounced();
};

const setEnabled = (value: boolean) => {
  props.conf.enabled = value;
  saveNow();
  showSnackbar(value ? '已启用' : '已停用');
};

const reset = async () => {
  const confirmed = await confirmAction(
    `确定恢复「${props.config.title}」的默认设置吗？`,
    '恢复默认设置',
  );

  if (!confirmed) {
    return;
  }

  Object.assign(props.conf, getDefaultConf(props.config));
  saveNow();
  await nextTick();
  refreshMdui();
  showSnackbar('已恢复默认设置');
};

onBeforeUnmount(saveNow);
</script>

<template>
  <section
    class="mdui-card ah-module-card"
    :class="{ 'ah-module-card--disabled': !conf.enabled }"
  >
    <div class="ah-module-card__head">
      <div class="ah-module-card__title">
        <div class="mdui-card-primary-title">{{ config.title }}</div>
        <div
          v-if="config.description"
          class="mdui-card-primary-subtitle"
        >
          {{ config.description }}
        </div>
      </div>

      <div class="ah-module-card__actions">
        <span class="ah-enable-label">启用</span>
        <MduiSwitch
          :model-value="conf.enabled"
          @update:model-value="setEnabled"
        />
        <button
          type="button"
          class="mdui-btn mdui-btn-flat mdui-ripple ah-reset-btn"
          @click="reset"
        >
          <i class="mdui-icon material-icons">restore</i>
          <span>恢复默认</span>
        </button>
      </div>
    </div>

    <div class="ah-module-card__body">
      <FieldRenderer
        v-for="[key, field] in fields"
        :key="key"
        :field="field"
        :model-value="conf[key]"
        @update:model-value="(value) => updateField(key, value)"
      />
    </div>
  </section>
</template>
