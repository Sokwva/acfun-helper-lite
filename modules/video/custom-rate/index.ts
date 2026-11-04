import { watch } from 'vue';
import { defineModule } from '@/core/module';
import { isTypingTarget } from '../shared/keyboard';
import { config } from './config';

const RATE_PATTERN = /^[0-4](\.\d{1,2})?$/;

export default defineModule(config, ({ conf, player }) => {
  let item: HTMLLIElement | null = null;
  let panelObserver: MutationObserver | null = null;
  let currentPanel: HTMLElement | null = null;
  let stopped = false;

  const applyRate = (rate: number) => {
    const video = player.video.value;
    if (!video) {
      return;
    }

    try {
      video.playbackRate = rate;
    } catch {
      window.alert('当前播放器不支持该倍速。');
    }
  };

  const promptRate = () => {
    const video = player.video.value;
    if (!video) {
      return;
    }

    const input = window.prompt(
      '请输入播放倍速（0-5，不含 5，最多两位小数，例如 0.1）',
      String(video.playbackRate),
    );

    if (input === null) {
      return;
    }

    const value = input.trim();
    if (!value) {
      return;
    }

    if (!RATE_PATTERN.test(value)) {
      window.alert(
        '倍速格式不正确：请输入 0-5 之间（不含 5）、最多两位小数的数字。',
      );
      return;
    }

    applyRate(Number(value));
  };

  const createItem = () => {
    const element = document.createElement('li');
    element.className = 'ah-custom-rate';
    element.textContent = '自定义';
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      promptRate();
    });

    return element;
  };

  const ensureItem = () => {
    if (stopped) {
      return;
    }

    const panel = player.speedPanel.value;

    if (panel !== currentPanel) {
      panelObserver?.disconnect();
      panelObserver = null;
      currentPanel = panel;
      item?.remove();
      item = null;
    }

    if (!panel) {
      return;
    }

    if (!panelObserver) {
      panelObserver = new MutationObserver(() => {
        ensureItem();
      });
      panelObserver.observe(panel, {
        childList: true,
        subtree: true,
      });
    }

    const list = panel.querySelector('ul');
    if (!list) {
      return;
    }

    if (!item || !list.contains(item)) {
      item?.remove();
      item = createItem();

      const last = Array.from(list.children)
        .filter((child) => child.tagName === 'LI')
        .at(-1);

      if (last) {
        last.after(item);
      } else {
        list.append(item);
      }
    }
  };

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

    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown'
    ) {
      return;
    }

    const video = player.video.value;
    if (!video) {
      return;
    }

    event.preventDefault();

    const delta = event.key === 'ArrowUp' ? 0.25 : -0.25;
    const next = Math.min(
      2,
      Math.max(
        0.25,
        Math.round((video.playbackRate + delta) * 100) / 100,
      ),
    );

    video.playbackRate = next;
  };

  const stopWatch = watch(
    () => player.speedPanel.value,
    () => ensureItem(),
    { immediate: true },
  );

  document.addEventListener('keydown', onKeydown);
  void player.whenSpeedPanelReady();

  return () => {
    stopped = true;
    stopWatch();
    panelObserver?.disconnect();
    panelObserver = null;
    item?.remove();
    item = null;
    document.removeEventListener('keydown', onKeydown);
  };
});



