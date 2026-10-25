<template>
  <Teleport :to="teleportTarget">
    <div
      class="ah-fpb"
      :class="{ 'ah-fpb--hidden': hidden }"
      :style="barStyle"
      aria-hidden="true"
    >
      <div
        v-if="conf.showLoaded"
        class="ah-fpb__loaded"
        :style="{ transform: `scaleX(${loadedRatio})` }"
      ></div>
      <div
        class="ah-fpb__current"
        :style="{ transform: `scaleX(${currentRatio})` }"
      ></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { ratio } from '@/core/dom';
import type { PlayerApi } from '@/core/player';
import type { Conf } from './config';

const props = defineProps<{
  conf: Conf;
  player: PlayerApi;
}>();

const teleportTarget = computed(() => props.player.fullscreenTarget.value);

const currentRatio = computed(() =>
  ratio(props.player.currentTime.value, props.player.duration.value),
);

const loadedRatio = computed(() =>
  ratio(props.player.loaded.value, props.player.duration.value),
);

const hidden = computed(
  () => props.conf.hideWithControls && props.player.controlsVisible.value,
);

const barStyle = computed<Record<string, string>>(() => ({
  '--ah-fpb-height': `${props.conf.barHeight}px`,
  '--ah-fpb-current': props.conf.barColor,
  '--ah-fpb-loaded': props.conf.loadedColor,
  '--ah-fpb-opacity': String(props.conf.opacity / 100),
}));

let lastPrefix = '';
let lastPercent = -1;

const restoreTitle = () => {
  if (lastPrefix && document.title.startsWith(lastPrefix)) {
    document.title = document.title.slice(lastPrefix.length);
  }
};

const syncTitle = () => {
  if (!props.conf.showPercentInTitle || props.player.duration.value <= 0) {
    restoreTitle();
    lastPrefix = '';
    lastPercent = -1;
    return;
  }

  const percent = Math.floor(currentRatio.value * 100);
  if (percent === lastPercent) {
    return;
  }

  let base = document.title;
  if (lastPrefix && base.startsWith(lastPrefix)) {
    base = base.slice(lastPrefix.length);
  }

  lastPrefix = `${percent}% `;
  lastPercent = percent;
  document.title = `${lastPrefix}${base}`;
};

watch(
  [currentRatio, () => props.conf.showPercentInTitle],
  syncTitle,
  { immediate: true },
);

onBeforeUnmount(restoreTitle);
</script>

<style scoped>
.ah-fpb {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2147483000;
  height: var(--ah-fpb-height);
  pointer-events: none;
  opacity: var(--ah-fpb-opacity);
  transition: opacity 0.2s ease;
}

.ah-fpb--hidden {
  opacity: 0;
}

.ah-fpb__loaded,
.ah-fpb__current {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transition: transform 0.2s linear;
  will-change: transform;
}

.ah-fpb__loaded {
  background: var(--ah-fpb-loaded);
}

.ah-fpb__current {
  background: var(--ah-fpb-current);
}
</style>
