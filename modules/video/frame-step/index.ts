import { watch } from 'vue';
import { defineModule } from '@/core/module';
import { insertControlButton } from '../shared/controlBar';
import { isTypingTarget } from '../shared/keyboard';
import { config } from './config';
import FrameStep from './FrameStep.vue';

type StepMode = 'f' | 'b';

export default defineModule(config, ({ conf, player, ui }) => {
  let unmountCurrent: (() => void) | null = null;
  let stopped = false;

  const step = (mode: StepMode) => {
    if (isTypingTarget(document.activeElement)) {
      return;
    }

    const video = player.video.value;
    if (!video) {
      return;
    }

    const frameRate =
      conf.frameRate === 'auto'
        ? player.getFrameRate()
        : Number(conf.frameRate);

    if (!Number.isFinite(frameRate) || frameRate <= 0) {
      return;
    }

    video.pause();

    const max = Number.isFinite(video.duration)
      ? video.duration
      : Number.POSITIVE_INFINITY;
    const next =
      video.currentTime + (mode === 'f' ? 1 : -1) / frameRate;

    video.currentTime = Math.max(0, Math.min(max, next));
  };

  const removeCurrent = () => {
    unmountCurrent?.();
    unmountCurrent = null;
  };

  const stopWatch = watch(
    () => player.controlBarRight.value,
    (target) => {
      if (stopped) {
        return;
      }

      removeCurrent();

      if (!target) {
        return;
      }

      const host = document.createElement('div');
      host.className = 'control-btn speed ah-frame-step';
      host.id = 'ah-frame-step';
      insertControlButton(target, host, 10);

      unmountCurrent = ui.mountAt(host, FrameStep, { step });
    },
    { immediate: true },
  );

  const onKeydown = (event: KeyboardEvent) => {
    if (event.isComposing || !conf.keyboardShortcuts || !event.shiftKey) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'a') {
      event.preventDefault();
      step('b');
      return;
    }

    if (key === 'd') {
      event.preventDefault();
      step('f');
    }
  };

  document.addEventListener('keydown', onKeydown);
  void player.whenControlBarReady();

  return () => {
    stopped = true;
    stopWatch();
    removeCurrent();
    document.removeEventListener('keydown', onKeydown);
  };
});


