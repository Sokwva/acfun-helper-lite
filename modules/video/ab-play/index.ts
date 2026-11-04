import { watch } from 'vue';
import { defineModule } from '@/core/module';
import { insertControlButton } from '../shared/controlBar';
import { config } from './config';
import ABPlay from './ABPlay.vue';

export default defineModule(config, ({ conf, player, ui }) => {
  let unmountCurrent: (() => void) | null = null;

  const removeCurrent = () => {
    unmountCurrent?.();
    unmountCurrent = null;
  };

  const stopWatch = watch(
    () => player.controlBarRight.value,
    (target) => {
      removeCurrent();

      if (!target) {
        return;
      }

      const host = document.createElement('div');
      host.className = 'control-btn speed ah-ab-play';
      host.id = 'ah-ab-play';
      insertControlButton(target, host, 20);

      unmountCurrent = ui.mountAt(host, ABPlay, {
        conf,
        player,
      });
    },
    { immediate: true },
  );

  void player.whenControlBarReady();

  return () => {
    stopWatch();
    removeCurrent();
  };
});
