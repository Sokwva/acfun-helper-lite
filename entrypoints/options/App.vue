<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import {
  GROUP_LABELS,
  GROUP_ORDER,
  type ModuleGroup,
} from '@/core/settings/schema';
import { moduleConfigs } from '@/core/settings/registry';
import { loadModuleConf } from '@/core/settings/storage';
import {
  createDrawer,
  refreshMdui,
  type MduiDrawerInstance,
} from '@/ui/mdui/runtime';
import ModuleCard from './components/ModuleCard.vue';

const GROUP_ICONS: Record<ModuleGroup, string> = {
  video: 'video_library',
  'video-page': 'movie',
  live: 'live_tv',
  article: 'line_style',
  page: 'web',
  comments: 'comment',
  global: 'public',
};

const confs = reactive<Record<string, Record<string, any>>>({});
const activeGroup = ref<ModuleGroup>('video');
const search = ref('');
const loading = ref(true);
const errorMessage = ref('');
const version = browser.runtime.getManifest().version;

let drawer: MduiDrawerInstance | null = null;

const availableGroups = computed(() =>
  GROUP_ORDER.filter((group) =>
    moduleConfigs.some((config) => config.group === group),
  ),
);

const filteredConfigs = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) {
    return moduleConfigs;
  }

  return moduleConfigs.filter((config) => {
    const text = `${config.title} ${config.id} ${config.description ?? ''}`;
    return text.toLowerCase().includes(keyword);
  });
});

const displayedGroups = computed<ModuleGroup[]>(() => {
  if (search.value.trim()) {
    return GROUP_ORDER.filter((group) =>
      filteredConfigs.value.some((config) => config.group === group),
    );
  }

  return [activeGroup.value];
});

const configsByGroup = (group: ModuleGroup) =>
  filteredConfigs.value.filter((config) => config.group === group);

const countByGroup = (group: ModuleGroup) =>
  moduleConfigs.filter((config) => config.group === group).length;

const getConf = (moduleId: string) => confs[moduleId] ?? {};

const toggleDrawer = () => {
  drawer?.toggle();
};

const selectGroup = (group: ModuleGroup) => {
  activeGroup.value = group;
  search.value = '';

  if (window.innerWidth < 1024) {
    drawer?.close();
  }
};

watch(
  [loading, displayedGroups],
  async () => {
    if (loading.value) {
      return;
    }

    await nextTick();
    refreshMdui();
  },
  { deep: true },
);

onMounted(async () => {
  const drawerElement = document.getElementById('ah-drawer');
  if (drawerElement) {
    drawer = createDrawer(drawerElement);
  }

  try {
    await Promise.all(
      moduleConfigs.map(async (config) => {
        confs[config.id] = await loadModuleConf(config);
      }),
    );

    if (!availableGroups.value.includes(activeGroup.value)) {
      activeGroup.value = availableGroups.value[0] ?? 'video';
    }
  } catch (error) {
    console.error('[AcFun Helper] failed to load settings', error);
    errorMessage.value = '设置加载失败，请打开扩展页面重试。';
  } finally {
    loading.value = false;
    await nextTick();
    refreshMdui();
  }
});

onBeforeUnmount(() => {
  drawer?.close();
  drawer = null;
});
</script>

<template>
  <header class="mdui-appbar mdui-appbar-fixed ah-appbar">
    <div class="mdui-toolbar mdui-color-theme">
      <button
        type="button"
        class="mdui-btn mdui-btn-icon mdui-ripple mdui-ripple-white"
        aria-label="打开导航"
        @click="toggleDrawer"
      >
        <i class="mdui-icon material-icons">menu</i>
      </button>
      <span class="mdui-typo-title ah-appbar__title">AcFun Helper</span>
      <span class="ah-appbar__version">Light {{ version }}</span>
      <div class="mdui-toolbar-spacer"></div>
      <a
        class="mdui-btn mdui-btn-icon mdui-ripple mdui-ripple-white"
        href="https://github.com/niuchaobo/acfun-helper"
        target="_blank"
        rel="noreferrer"
        title="GitHub"
      >
        <i class="mdui-icon material-icons">code</i>
      </a>
    </div>
  </header>

  <div id="ah-drawer" class="mdui-drawer ah-drawer">
    <div class="ah-drawer__brand">
      <div class="ah-drawer__logo">
        <i class="mdui-icon material-icons">extension</i>
      </div>
      <div>
        <div class="ah-drawer__title">AcFun Helper</div>
        <div class="ah-drawer__sub">Light {{ version }}</div>
      </div>
    </div>

    <div class="mdui-textfield mdui-textfield-floating-label ah-search">
      <label class="mdui-textfield-label">搜索模块</label>
      <input
        v-model="search"
        class="mdui-textfield-input"
        type="search"
      />
    </div>

    <ul class="mdui-list">
      <li
        v-for="group in availableGroups"
        :key="group"
        class="mdui-list-item mdui-ripple"
        :class="{
          'mdui-list-item-active': !search && activeGroup === group,
        }"
        @click="selectGroup(group)"
      >
        <i class="mdui-list-item-icon mdui-icon material-icons" v-text="GROUP_ICONS[group]"></i>
        <div class="mdui-list-item-content">
          {{ GROUP_LABELS[group] }}
        </div>
        <span class="ah-nav-count">{{ countByGroup(group) }}</span>
      </li>
    </ul>
  </div>

  <main class="mdui-container ah-main">
    <div v-if="loading" class="ah-state">
      <div class="mdui-progress">
        <div class="mdui-progress-indeterminate"></div>
      </div>
      <p>正在加载设置...</p>
    </div>

    <p v-else-if="errorMessage" class="ah-state ah-state--error">
      {{ errorMessage }}
    </p>

    <template v-else>
      <section
        v-for="group in displayedGroups"
        :key="group"
        class="ah-group"
      >
        <h2 class="ah-group__title">
          <i class="mdui-icon material-icons">{{ GROUP_ICONS[group] }}</i>
          {{ GROUP_LABELS[group] }}
        </h2>

        <ModuleCard
          v-for="config in configsByGroup(group)"
          :key="config.id"
          :config="config"
          :conf="getConf(config.id)"
        />
      </section>

      <p v-if="filteredConfigs.length === 0" class="ah-state">
        没有匹配的模块
      </p>
    </template>
  </main>
</template>



