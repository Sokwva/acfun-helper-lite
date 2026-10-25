import { defineConfig } from 'wxt';
import { trimMduiFonts } from './ui/mdui/trimFonts';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: ({ browser }) => ({
    name: 'AcFun Helper Light',
    description: 'AcFun Helper lightweight rewrite',
    permissions: ['storage'],
    action: {
      default_title: 'AcFun Helper',
    },
    icons: {
      16: 'icon/icon16.png',
      32: 'icon/icon32.png',
      48: 'icon/icon48.png',
      64: 'icon/icon64.png',
      128: 'icon/icon128.png',
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'acfun-helper-light@acfun-helper',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          },
        }
      : {}),
  }),
  vite: () => ({
    css: {
      postcss: {
        plugins: [trimMduiFonts],
      },
    },
  }),
});
