import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import { waitFor } from './dom';
import { createLogger } from './log';

const FRAME_RATE_BY_LABEL: Record<string, number> = {
  '24': 23.976,
  '25': 25,
  '30': 29.97,
  '60': 59.94,
  '120': 120,
};

export interface PlayerApi {
  video: ShallowRef<HTMLVideoElement | null>;
  currentTime: Ref<number>;
  duration: Ref<number>;
  loaded: Ref<number>;
  controlsVisible: Ref<boolean>;
  fullscreenTarget: ShallowRef<HTMLElement>;
  controlBarRight: ShallowRef<HTMLElement | null>;
  speedPanel: ShallowRef<HTMLElement | null>;
  whenReady(): Promise<boolean>;
  whenControlBarReady(): Promise<boolean>;
  whenSpeedPanelReady(): Promise<boolean>;
  getFrameRate(): number;
  destroy(): void;
}

export function createPlayerApi(): PlayerApi {
  const log = createLogger('player');
  const video = shallowRef<HTMLVideoElement | null>(null);
  const currentTime = ref(0);
  const duration = ref(0);
  const loaded = ref(0);
  const controlsVisible = ref(false);
  const fullscreenTarget = shallowRef<HTMLElement>(document.documentElement);
  const controlBarRight = shallowRef<HTMLElement | null>(null);
  const speedPanel = shallowRef<HTMLElement | null>(null);

  let currentVideo: HTMLVideoElement | null = null;
  let controlBar: HTMLElement | null = null;
  let controlBarObserver: MutationObserver | null = null;
  let controlBarChildObserver: MutationObserver | null = null;
  let readyPromise: Promise<boolean> | null = null;
  let controlBarReadyPromise: Promise<boolean> | null = null;
  let speedPanelReadyPromise: Promise<boolean> | null = null;
  let destroyed = false;

  const findPlayerRoot = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('#ACPlayer') ??
    document.querySelector<HTMLElement>('.container-video');

  const findVideo = (): HTMLVideoElement | null =>
    findPlayerRoot()?.querySelector<HTMLVideoElement>('video') ?? null;

  const findControlBar = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('#ACPlayer .control-bar-top') ??
    document.querySelector<HTMLElement>('.control-bar-top');

  const findControlBarRight = (): HTMLElement | null =>
    document.querySelector<HTMLElement>(
      '#ACPlayer .control-bar-top .box-right',
    ) ??
    document.querySelector<HTMLElement>('.control-bar-top .box-right');

  const findQualityButton = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('#ACPlayer .control-btn.quality') ??
    document.querySelector<HTMLElement>('.control-btn.quality');

  const findSpeedPanel = (): HTMLElement | null => {
    const findIn = (scope: ParentNode): HTMLElement | null => {
      const panels = scope.querySelectorAll<HTMLElement>(
        '.control-btn.speed .speed-panel',
      );

      for (const panel of panels) {
        if (
          panel.closest('.ah-ab-play, .ah-frame-step, [data-acfun-helper]')
        ) {
          continue;
        }

        return panel;
      }

      return null;
    };

    return findIn(findPlayerRoot() ?? document) ?? findIn(document);
  };

  const isMainVideo = (element: HTMLVideoElement): boolean => {
    const root = findPlayerRoot();
    return root !== null && root.contains(element);
  };

  const updateLoaded = () => {
    const element = currentVideo;

    if (
      !element ||
      !Number.isFinite(element.duration) ||
      element.duration <= 0
    ) {
      loaded.value = 0;
      return;
    }

    let end = 0;
    for (let index = 0; index < element.buffered.length; index += 1) {
      end = Math.max(end, element.buffered.end(index));
    }

    loaded.value = Math.min(end, element.duration);
  };

  const updateTime = () => {
    const element = currentVideo;

    if (!element) {
      return;
    }

    currentTime.value = Number.isFinite(element.currentTime)
      ? element.currentTime
      : 0;
    duration.value = Number.isFinite(element.duration) ? element.duration : 0;
    updateLoaded();
  };

  const updateControlsVisible = () => {
    if (!controlBar) {
      controlsVisible.value = false;
      return;
    }

    const attr = controlBar.getAttribute('data-bind-attr');
    if (attr !== null) {
      controlsVisible.value = attr === 'true';
      return;
    }

    const style = window.getComputedStyle(controlBar);
    controlsVisible.value =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';
  };

  const syncControlBar = () => {
    const next = findControlBar();

    if (next !== controlBar) {
      controlBarObserver?.disconnect();
      controlBarChildObserver?.disconnect();
      controlBar = next;

      if (controlBar) {
        controlBarObserver = new MutationObserver(updateControlsVisible);
        controlBarObserver.observe(controlBar, {
          attributes: true,
          attributeFilter: ['data-bind-attr', 'style', 'class'],
        });

        controlBarChildObserver = new MutationObserver(() => {
          const right = findControlBarRight();
          if (right !== controlBarRight.value) {
            controlBarRight.value = right;
          }

          const panel = findSpeedPanel();
          if (panel !== speedPanel.value) {
            speedPanel.value = panel;
          }
        });
        controlBarChildObserver.observe(controlBar, {
          childList: true,
          subtree: true,
        });
      }
    }

    controlBarRight.value = findControlBarRight();
    speedPanel.value = findSpeedPanel();
    updateControlsVisible();
  };

  const updateFullscreenTarget = () => {
    const element = document.fullscreenElement;

    if (element instanceof HTMLVideoElement) {
      fullscreenTarget.value =
        element.parentElement ?? document.body ?? document.documentElement;
      return;
    }

    fullscreenTarget.value =
      element instanceof HTMLElement
        ? element
        : (document.body ?? document.documentElement);
  };

  const detachVideo = () => {
    if (!currentVideo) {
      return;
    }

    currentVideo.removeEventListener('timeupdate', updateTime);
    currentVideo.removeEventListener('progress', updateLoaded);
    currentVideo.removeEventListener('durationchange', updateTime);
    currentVideo.removeEventListener('loadedmetadata', updateTime);
    currentVideo.removeEventListener('emptied', updateTime);
    currentVideo.removeEventListener('seeking', updateTime);
    currentVideo.removeEventListener('seeked', updateTime);
    currentVideo = null;
    video.value = null;
    currentTime.value = 0;
    duration.value = 0;
    loaded.value = 0;
  };

  const attachVideo = (element: HTMLVideoElement | null) => {
    if (!element || element === currentVideo) {
      return;
    }

    detachVideo();
    currentVideo = element;
    video.value = element;

    element.addEventListener('timeupdate', updateTime);
    element.addEventListener('progress', updateLoaded);
    element.addEventListener('durationchange', updateTime);
    element.addEventListener('loadedmetadata', updateTime);
    element.addEventListener('emptied', updateTime);
    element.addEventListener('seeking', updateTime);
    element.addEventListener('seeked', updateTime);

    updateTime();
    syncControlBar();
    updateFullscreenTarget();
  };

  const handleCapturedMediaEvent = (event: Event) => {
    if (
      event.target instanceof HTMLVideoElement &&
      isMainVideo(event.target)
    ) {
      attachVideo(event.target);
      syncControlBar();
    }
  };

  const handleFullscreenChange = () => {
    updateFullscreenTarget();
    syncControlBar();
  };

  document.addEventListener('play', handleCapturedMediaEvent, true);
  document.addEventListener('loadedmetadata', handleCapturedMediaEvent, true);
  document.addEventListener('durationchange', handleCapturedMediaEvent, true);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  const whenReady = (): Promise<boolean> => {
    if (readyPromise) {
      return readyPromise;
    }

    readyPromise = (async () => {
      const element = await waitFor<HTMLVideoElement>(findVideo, {
        timeout: 0,
      });

      if (destroyed) {
        return false;
      }

      if (!element) {
        log('player not found');
        return false;
      }

      attachVideo(element);
      syncControlBar();
      updateFullscreenTarget();
      return true;
    })();

    return readyPromise;
  };

  const whenControlBarReady = (): Promise<boolean> => {
    if (controlBarReadyPromise) {
      return controlBarReadyPromise;
    }

    controlBarReadyPromise = (async () => {
      const element = await waitFor<HTMLElement>(findControlBarRight, {
        timeout: 0,
      });

      if (destroyed || !element) {
        return false;
      }

      controlBarRight.value = element;
      syncControlBar();
      return true;
    })();

    return controlBarReadyPromise;
  };

  const whenSpeedPanelReady = (): Promise<boolean> => {
    if (speedPanelReadyPromise) {
      return speedPanelReadyPromise;
    }

    speedPanelReadyPromise = (async () => {
      const element = await waitFor<HTMLElement>(findSpeedPanel, {
        timeout: 0,
      });

      if (destroyed || !element) {
        return false;
      }

      speedPanel.value = element;
      syncControlBar();
      return true;
    })();

    return speedPanelReadyPromise;
  };

  const getFrameRate = (): number => {
    const qualityButton = findQualityButton();

    if (!qualityButton) {
      return 23.976;
    }

    const label =
      (qualityButton.firstElementChild as HTMLElement | null)?.innerText ??
      qualityButton.innerText ??
      '';
    const match = label.match(/(?:P|K)(\d{2,3})/i);
    const frameRate = match?.[1]
      ? FRAME_RATE_BY_LABEL[match[1]]
      : undefined;

    return frameRate ?? 23.976;
  };

  const destroy = () => {
    destroyed = true;
    detachVideo();
    controlBarObserver?.disconnect();
    controlBarObserver = null;
    controlBarChildObserver?.disconnect();
    controlBarChildObserver = null;
    controlBar = null;
    controlBarRight.value = null;
    speedPanel.value = null;
    document.removeEventListener('play', handleCapturedMediaEvent, true);
    document.removeEventListener(
      'loadedmetadata',
      handleCapturedMediaEvent,
      true,
    );
    document.removeEventListener(
      'durationchange',
      handleCapturedMediaEvent,
      true,
    );
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };

  return {
    video,
    currentTime,
    duration,
    loaded,
    controlsVisible,
    fullscreenTarget,
    controlBarRight,
    speedPanel,
    whenReady,
    whenControlBarReady,
    whenSpeedPanelReady,
    getFrameRate,
    destroy,
  };
}
