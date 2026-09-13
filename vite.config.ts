import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {version} from './package.json';
import {buildTimestamp} from './src/releaseInfo';

export default defineConfig(({command}) => {
  // The updater need not pass a date: each compiled image carries its actual build time.
  const buildDate=command==='build'?(buildTimestamp(process.env.VITE_APP_BUILD_DATE)??new Date().toISOString()):null;
  const commit=process.env.VITE_APP_COMMIT_SHA||'local';
  return {
    define: {'import.meta.env.VITE_APP_BUILD_DATE':JSON.stringify(buildDate)},
    plugins: [react(), tailwindcss(), {
      name:'release-build-info',
      generateBundle() {
        this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify({version,commit,buildDate})});
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
