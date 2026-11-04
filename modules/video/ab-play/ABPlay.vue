<template>
  <span data-bind-key="AddABPlayUI" @click.stop>AB</span>

  <div class="speed-panel ah-ab-play-panel" @click.stop>
    <ul>
      <li class="ah-ab-play-item" @click.stop="markA">{{ aLabel }}</li>
      <li class="ah-ab-play-item" @click.stop="markB">{{ bLabel }}</li>
      <li class="ah-ab-play-item" @click.stop="toggleLoop">
        {{ actionLabel }}
      </li>
      <li class="ah-ab-play-item" @click.stop="clear">{{ clearLabel }}</li>
    </ul>
    <div class="transparent-placeholder"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { PlayerApi } from '@/core/player';
import type { Conf } from './config';
import { showPlayerTip } from './playerTip';

const props = defineProps<{
  conf: Conf;
  player: PlayerApi;
}>();

const video = computed(() => props.player.video.value);

const a = ref<number | null>(null);
const b = ref<number | null>(null);
const looping = ref(false);

let loopVideo: HTMLVideoElement | null = null;
let boundVideo: HTMLVideoElement | null = null;

const formatTime = (seconds: number) => {
  const total = Math.max(
    0,
    Math.floor(Number.isFinite(seconds) ? seconds : 0),
  );
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const minuteText =
    hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const secondText = String(rest).padStart(2, '0');

  return hours > 0
    ? `${hours}:${minuteText}:${secondText}`
    : `${minuteText}:${secondText}`;
};

const aLabel = computed(() =>
  a.value === null ? '标记 A' : `A: ${formatTime(a.value)}`,
);
const bLabel = computed(() =>
  b.value === null ? '标记 B' : `B: ${formatTime(b.value)}`,
);
const actionLabel = computed(() => (looping.value ? '停止' : '开始'));
const clearLabel = computed(() => (looping.value ? '清除并停止' : '清除'));

const showTip = (text: string, importantText = '') => {
  if (!props.conf.showTips) {
    return;
  }

  showPlayerTip(text, importantText);
};

function onLoopTimeUpdate() {
  if (
    !looping.value ||
    a.value === null ||
    b.value === null ||
    !loopVideo
  ) {
    return;
  }

  if (loopVideo.currentTime >= b.value) {
    loopVideo.currentTime = a.value;
  }
}

function onLoopEnded() {
  if (!looping.value || a.value === null || !loopVideo) {
    return;
  }

  loopVideo.currentTime = a.value;
  void loopVideo.play().catch(() => undefined);
}

function detachLoop(pause: boolean) {
  if (loopVideo) {
    loopVideo.removeEventListener('timeupdate', onLoopTimeUpdate);
    loopVideo.removeEventListener('ended', onLoopEnded);

    if (pause) {
      loopVideo.pause();
    }
  }

  loopVideo = null;
  looping.value = false;
}

function attachLoop(element: HTMLVideoElement) {
  detachLoop(false);
  loopVideo = element;
  element.addEventListener('timeupdate', onLoopTimeUpdate);
  element.addEventListener('ended', onLoopEnded);
  looping.value = true;
}

function resetPoints() {
  a.value = null;
  b.value = null;
}

function onVideoSourceReset() {
  detachLoop(false);
  resetPoints();
}

function unbindVideo() {
  if (!boundVideo) {
    return;
  }

  boundVideo.removeEventListener('emptied', onVideoSourceReset);
  boundVideo.removeEventListener('loadstart', onVideoSourceReset);
  boundVideo = null;
}

function bindVideo(element: HTMLVideoElement | null) {
  unbindVideo();
  detachLoop(false);
  resetPoints();

  if (!element) {
    return;
  }

  boundVideo = element;
  element.addEventListener('emptied', onVideoSourceReset);
  element.addEventListener('loadstart', onVideoSourceReset);
}

const markA = () => {
  const element = video.value;
  if (!element) {
    return;
  }

  if (looping.value) {
    showTip('请先停止循环');
    return;
  }

  const time = element.currentTime;

  if (b.value !== null && time >= b.value) {
    showTip('A 必须小于 B');
    return;
  }

  a.value = time;
  showTip('标记 A:', formatTime(time));
};

const markB = () => {
  const element = video.value;
  if (!element) {
    return;
  }

  if (looping.value) {
    showTip('请先停止循环');
    return;
  }

  if (a.value === null) {
    showTip('请先标记 A');
    return;
  }

  const time = element.currentTime;

  if (time <= a.value) {
    showTip('B 必须大于 A');
    return;
  }

  b.value = time;
  showTip('标记 B:', formatTime(time));
};

const toggleLoop = () => {
  const element = video.value;
  if (!element) {
    return;
  }

  if (looping.value) {
    detachLoop(true);
    showTip('AB 回放已停止');
    return;
  }

  if (a.value === null || b.value === null) {
    showTip('请先标记 A 和 B');
    return;
  }

  if (b.value <= a.value) {
    showTip('A 必须小于 B');
    return;
  }

  element.currentTime = a.value;

  if (element.paused) {
    void element.play().catch(() => undefined);
  }

  attachLoop(element);
  showTip(
    '循环区间:',
    `${formatTime(a.value)} - ${formatTime(b.value)}`,
  );
};

const clear = () => {
  const wasLooping = looping.value;
  detachLoop(wasLooping);
  resetPoints();
  showTip(wasLooping ? '已清除并停止 AB 回放' : '已清除 AB 标记');
};

watch(video, bindVideo, { immediate: true });

onBeforeUnmount(() => {
  detachLoop(false);
  unbindVideo();
});
</script>
