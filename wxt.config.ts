import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Web Comment',
    description: 'Local-first comments pinned to website elements.',
    version: '0.1.0',
    permissions: ['activeTab', 'scripting'],
    host_permissions: process.env.WXT_TEST_HOST ? ['http://127.0.0.1/*'] : undefined,
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: { default_title: 'Toggle Web Comment' },
    web_accessible_resources: [{ resources: ['content-scripts/content.css'], matches: ['http://*/*', 'https://*/*'] }],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
