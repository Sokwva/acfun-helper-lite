import { watch } from 'vue';
import { defineModule } from '@/core/module';
import { config } from './config';
import {
  getCurrentPartIndex,
  getPartTitle,
  readBridgedPageInfo,
  resolveMediaPageInfo,
  type MediaPageInfo,
} from './pageInfo';

type ActionName = Parameters<MediaSession['setActionHandler']>[0];
type ActionHandler = Parameters<MediaSession['setActionHandler']>[1];

const ACTIONS: readonly ActionName[] = [
  'play',
  'pause',
  'stop',
  'seekbackward',
  'seekforward',
  'seekto',
  'previoustrack',
  'nexttrack',
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export default defineModule(config, ({ conf, player, signal }) => {
  if (
    !('mediaSession' in navigator) ||
    typeof MediaMetadata === 'undefined' ||
    typeof navigator.mediaSession.setActionHandler !== 'function'
  ) {
    return;
  }

  const mediaSession = navigator.mediaSession;
  const previousMetadata = mediaSession.metadata;
  const previousPlaybackState = mediaSession.playbackState;

  let stopped = false;
  let currentVideo: HTMLVideoElement | null = null;
  let currentInfo: MediaPageInfo = resolveMediaPageInfo(null);
  let ourMetadata: MediaMetadata | null = null;
  let lastMetadataKey = '';
  let lastPositionUpdate = 0;
  let metadataTimer: number | undefined;
  let partPlayTimer: number | undefined;

  const setHandler = (action: ActionName, handler: ActionHandler) => {
    try {
      mediaSession.setActionHandler(action, handler);
    } catch {
      // Ignore unsupported actions.
    }
  };

  const applyMetadata = (indexOverride?: number) => {
    if (stopped) {
      return;
    }

    const index = indexOverride ?? getCurrentPartIndex(currentInfo);
    const partTitle = getPartTitle(currentInfo, index);
    const title =
      partTitle && partTitle !== currentInfo.title
        ? `${currentInfo.title} - ${partTitle}`
        : currentInfo.title;
    const artist = currentInfo.artist
      ? `AcFun: ${currentInfo.artist}`
      : 'AcFun';
    const artwork = currentInfo.coverUrl
      ? [{ src: currentInfo.coverUrl }]
      : [];
    const key = JSON.stringify([
      title,
      artist,
      currentInfo.album,
      artwork[0]?.src ?? '',
    ]);

    if (
      key === lastMetadataKey &&
      mediaSession.metadata === ourMetadata
    ) {
      return;
    }

    lastMetadataKey = key;

    const metadata = new MediaMetadata({
      title: title || 'AcFun',
      artist,
      album: currentInfo.album,
      artwork,
    });

    ourMetadata = metadata;

    try {
      mediaSession.metadata = metadata;
    } catch {
      // Ignore metadata update errors.
    }
  };

  const updatePlaybackState = (
    state?: MediaSessionPlaybackState,
  ) => {
    if (stopped) {
      return;
    }

    const next =
      state ??
      (currentVideo
        ? currentVideo.paused
          ? 'paused'
          : 'playing'
        : 'none');

    try {
      mediaSession.playbackState = next;
    } catch {
      // Ignore unsupported playbackState updates.
    }
  };

  const updatePositionState = (force = false) => {
    if (
      stopped ||
      typeof mediaSession.setPositionState !== 'function'
    ) {
      return;
    }

    const video = currentVideo;
    if (!video) {
      return;
    }

    const now = performance.now();
    if (!force && now - lastPositionUpdate < 1000) {
      return;
    }

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const position = clamp(video.currentTime, 0, duration);
    const state: MediaPositionState = {
      duration,
      position,
    };

    if (
      Number.isFinite(video.playbackRate) &&
      video.playbackRate > 0
    ) {
      state.playbackRate = video.playbackRate;
    }

    lastPositionUpdate = now;

    try {
      mediaSession.setPositionState(state);
    } catch {
      // Ignore invalid position state.
    }
  };

  const seekTo = (time: number, fastSeek?: boolean) => {
    const video = currentVideo;
    if (!video || !Number.isFinite(time)) {
      return;
    }

    const duration = video.duration;
    const target =
      Number.isFinite(duration) && duration > 0
        ? clamp(time, 0, duration)
        : Math.max(0, time);

    if (fastSeek) {
      const fast = (
        video as HTMLVideoElement & {
          fastSeek?: (time: number) => void;
        }
      ).fastSeek;

      if (typeof fast === 'function') {
        try {
          fast.call(video, target);
          updatePositionState(true);
          return;
        } catch {
          // Fall back to currentTime.
        }
      }
    }

    video.currentTime = target;
    updatePositionState(true);
  };

  const seekBy = (offset: number) => {
    const video = currentVideo;
    if (!video) {
      return;
    }

    seekTo(video.currentTime + offset);
  };

  const playAfterSwitch = () => {
    if (partPlayTimer !== undefined) {
      window.clearTimeout(partPlayTimer);
    }

    let attempts = 0;

    const attempt = () => {
      if (stopped) {
        return;
      }

      const video = currentVideo;
      if (!video) {
        return;
      }

      void video.play().catch(() => {
        if (attempts >= 3) {
          return;
        }

        attempts += 1;
        partPlayTimer = window.setTimeout(attempt, 350);
      });
    };

    partPlayTimer = window.setTimeout(attempt, 250);
  };

  const switchPart = (direction: -1 | 1) => {
    if (stopped || !conf.multiPart) {
      return;
    }

    const parts = currentInfo.parts;
    if (parts.length <= 1) {
      return;
    }

    const index = getCurrentPartIndex(currentInfo);
    const targetIndex =
      (index + direction + parts.length) % parts.length;
    const target = parts[targetIndex];

    if (!target) {
      return;
    }

    target.element.click();
    applyMetadata(targetIndex);
    playAfterSwitch();
  };

  const updatePartHandlers = () => {
    if (!conf.multiPart || currentInfo.parts.length <= 1) {
      setHandler('previoustrack', null);
      setHandler('nexttrack', null);
      return;
    }

    setHandler('previoustrack', () => switchPart(-1));
    setHandler('nexttrack', () => switchPart(1));
  };

  const refreshMetadataSoon = () => {
    if (metadataTimer !== undefined) {
      window.clearTimeout(metadataTimer);
    }

    metadataTimer = window.setTimeout(() => {
      metadataTimer = undefined;

      if (!stopped) {
        applyMetadata();
      }
    }, 300);
  };

  const onPlay = () => {
    updatePlaybackState('playing');
    updatePositionState(true);
  };

  const onPlaying = onPlay;

  const onPause = () => {
    updatePlaybackState('paused');
    updatePositionState(true);
  };

  const onEnded = () => {
    updatePlaybackState('none');
    updatePositionState(true);
  };

  const onTimeUpdate = () => {
    updatePositionState();
  };

  const onDurationChange = () => {
    updatePositionState(true);
  };

  const onRateChange = () => {
    updatePositionState(true);
  };

  const onSeeking = () => {
    updatePositionState(true);
  };

  const onSeeked = () => {
    updatePositionState(true);
  };

  const onLoadedMetadata = () => {
    refreshMetadataSoon();
    updatePositionState(true);
    updatePlaybackState();
  };

  const onEmptied = () => {
    updatePlaybackState('none');
  };

  const detachVideo = () => {
    const video = currentVideo;
    if (!video) {
      return;
    }

    video.removeEventListener('play', onPlay);
    video.removeEventListener('playing', onPlaying);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.removeEventListener('durationchange', onDurationChange);
    video.removeEventListener('ratechange', onRateChange);
    video.removeEventListener('seeking', onSeeking);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('loadedmetadata', onLoadedMetadata);
    video.removeEventListener('emptied', onEmptied);
    currentVideo = null;
  };

  const attachVideo = (video: HTMLVideoElement | null) => {
    if (video === currentVideo) {
      return;
    }

    detachVideo();
    currentVideo = video;

    if (!video) {
      updatePlaybackState('none');
      return;
    }

    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('emptied', onEmptied);

    updatePlaybackState();
    updatePositionState(true);
  };

  setHandler('play', () => {
    const video = currentVideo;
    if (!video) {
      return;
    }

    void video.play().catch(() => undefined);
  });

  setHandler('pause', () => {
    currentVideo?.pause();
  });

  setHandler('stop', () => {
    currentVideo?.pause();
    updatePlaybackState('none');
  });

  setHandler('seekbackward', (details) => {
    seekBy(-Math.abs(details.seekOffset ?? conf.seekStep));
  });

  setHandler('seekforward', (details) => {
    seekBy(Math.abs(details.seekOffset ?? conf.seekStep));
  });

  setHandler('seekto', (details) => {
    if (details.seekTime == null) {
      return;
    }

    seekTo(details.seekTime, details.fastSeek);
  });

  applyMetadata();
  updatePartHandlers();

  const stopPartHandlersWatch = watch(
    () => conf.multiPart,
    updatePartHandlers,
  );
  const stopVideoWatch = watch(
    () => player.video.value,
    attachVideo,
    { immediate: true },
  );

  void (async () => {
    const bridged = await readBridgedPageInfo(signal);

    if (stopped || !bridged) {
      return;
    }

    currentInfo = resolveMediaPageInfo(bridged);
    applyMetadata();
    updatePartHandlers();
  })();

  return () => {
    stopped = true;
    stopPartHandlersWatch();
    stopVideoWatch();
    detachVideo();

    if (metadataTimer !== undefined) {
      window.clearTimeout(metadataTimer);
      metadataTimer = undefined;
    }

    if (partPlayTimer !== undefined) {
      window.clearTimeout(partPlayTimer);
      partPlayTimer = undefined;
    }

    for (const action of ACTIONS) {
      setHandler(action, null);
    }

    try {
      if (ourMetadata && mediaSession.metadata === ourMetadata) {
        mediaSession.metadata = previousMetadata;
      }
    } catch {
      // Ignore metadata restore errors.
    }

    try {
      mediaSession.playbackState = previousPlaybackState;
    } catch {
      // Ignore playbackState restore errors.
    }

    try {
      if (typeof mediaSession.setPositionState === 'function') {
        mediaSession.setPositionState();
      }
    } catch {
      // Ignore position state reset errors.
    }
  };
});
