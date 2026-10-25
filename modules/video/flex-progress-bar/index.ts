import { defineModule } from '@/core/module';
import { config } from './config';
import FlexProgressBar from './FlexProgressBar.vue';

export default defineModule(config, ({ conf, player, ui }) => {
  ui.mount(FlexProgressBar, {
    conf,
    player,
  });
});
