import { defineModule } from '@/core/module';
import { config } from './config';

const CHECK_INTERVAL = 500;

const findWrapper = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.tv-wrapper');

const findControl = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.tv-wrapper .btn-span') ??
  document.querySelector<HTMLElement>('.btn-span');

const findVolume = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.tv-wrapper .volume') ??
  document.querySelector<HTMLElement>('.volume');

const findVolumeIcon = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.tv-wrapper .volume-icon') ??
  document.querySelector<HTMLElement>('.volume-icon');

export default defineModule(config, ({ conf }) => {
  let timer: number | undefined;

  const sync = () => {
    const control = findControl();
    const controlFlag = control?.dataset.bindAttr;

    if (conf.mute) {
      const volume = findVolume();
      const volumeIcon = findVolumeIcon();

      if (volume && volume.dataset.bindAttr !== 'muted' && volumeIcon) {
        volumeIcon.click();
      }
    }

    if (controlFlag === 'play') {
      control?.click();
    }

    if (conf.mode === 'remove' && controlFlag === 'pause') {
      findWrapper()?.remove();
    }
  };

  const start = () => {
    if (timer !== undefined) {
      return;
    }

    sync();
    timer = window.setInterval(sync, CHECK_INTERVAL);
  };

  start();

  return () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
});
