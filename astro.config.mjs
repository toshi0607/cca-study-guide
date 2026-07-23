import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { fileURLToPath } from 'node:url';
import { generateDeploymentManifest } from './scripts/deployment-manifest.mjs';

// Emit dist/deployment-manifest.json after every build (local and Vercel). The
// hook fires for `astro build` however it is invoked, so Production always
// serves a manifest the deployment-identity check can compare against. It only
// adds one JSON file to the output — no page or asset is changed.
const deploymentManifest = {
  name: 'deployment-manifest',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await generateDeploymentManifest(fileURLToPath(dir));
    },
  },
};

export default defineConfig({
  site: 'https://cca.toshi0607.com',
  output: 'static',
  integrations: [preact(), deploymentManifest],
});
