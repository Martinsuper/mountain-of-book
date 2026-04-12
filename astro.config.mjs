import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import remarkPlantUml from './src/lib/remark-plantuml';

export default defineConfig({
  integrations: [tailwind()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    },
    remarkPlugins: [remarkPlantUml]
  }
});
