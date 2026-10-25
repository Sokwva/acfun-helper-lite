<script setup lang="ts">
import { onMounted, ref, toRaw } from 'vue';
import MduiSwitch from '@/components/mdui/MduiSwitch.vue';
import { moduleConfigs } from '@/core/settings/registry';
import { loadModuleConf, saveModuleConf } from '@/core/settings/storage';
import { showSnackbar } from '@/ui/mdui/popup';

const flexConfig = moduleConfigs.find(
  (config) => config.id === 'video.flex-progress-bar',
);
const conf = ref<Record<string, any> | null>(null);
const version = browser.runtime.getManifest().version;

onMounted(async () => {
  if (!flexConfig) {
    return;
  }

  try {
    conf.value = await loadModuleConf(flexConfig);
  } catch (error) {
    console.error('[AcFun Helper] failed to load settings', error);
  }
});

const toggle = async (value: boolean) => {
  if (!flexConfig || !conf.value) {
    return;
  }

  conf.value.enabled = value;

  try {
    await saveModuleConf(flexConfig.id, toRaw(conf.value));
    showSnackbar(value ? '已启用' : '已停用');
  } catch (error) {
    console.error('[AcFun Helper] failed to save settings', error);
    showSnackbar('设置保存失败');
  }
};

const openOptions = () => {
  void browser.runtime.openOptionsPage();
};
</script>

<template>
  <div class="ah-popup">
    <header class="ah-popup__header">
      <div class="ah-popup__brand">
        <div class="ah-popup__logo">
          <i class="mdui-icon material-icons">extension</i>
        </div>
        <div>
          <h1>AcFun Helper</h1>
          <span>Light {{ version }}</span>
        </div>
      </div>
      <button
        type="button"
        class="mdui-btn mdui-btn-icon mdui-ripple"
        title="设置"
        @click="openOptions"
      >
        <i class="mdui-icon material-icons">settings</i>
      </button>
    </header>

    <div v-if="flexConfig && conf" class="mdui-card ah-popup__card">
      <div class="ah-popup__card-head">
        <div>
          <div class="ah-popup__card-title">{{ flexConfig.title }}</div>
          <div class="ah-popup__card-sub">
            {{ flexConfig.description }}
          </div>
        </div>
        <MduiSwitch
          :model-value="conf.enabled"
          @update:model-value="toggle"
        />
      </div>
    </div>

    <p v-else class="ah-popup__hint">正在加载设置...</p>

    <button
      type="button"
      class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent ah-popup__button"
      @click="openOptions"
    >
      打开全部设置
    </button>
  </div>
</template>
