import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkPlantUml from './src/lib/remark-plantuml';

export default defineConfig({
  integrations: [tailwind()],
  build: {
    assets: '_astro',
    inlineStylesheets: 'auto'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    },
    remarkPlugins: [remarkPlantUml]
  },
  publicDir: 'public'
});
