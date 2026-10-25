import { boot } from '@/core/boot';

export default defineContentScript({
  matches: ['*://*.acfun.cn/*'],
  runAt: 'document_start',
  main() {
    void boot().catch((error) => {
      console.error('[AcFun Helper] boot failed', error);
    });
  },
});
