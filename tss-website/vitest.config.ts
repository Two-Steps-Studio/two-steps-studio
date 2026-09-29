import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const storybookDir = path.join(dirname, '.storybook');

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      // Plain unit tests for pure logic (`*.test.ts` next to the code), run
      // in Node - fast, no browser. `npm test` runs only this project.
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      // The Storybook project needs a .storybook/ config directory. There
      // isn't one in the repo yet, and storybookTest() throws at config load
      // without it - which used to take every other test down with it. It
      // switches itself back on once .storybook/ exists.
      ...(existsSync(storybookDir)
        ? [
            {
              extends: true as const,
              plugins: [
                // The plugin will run tests for the stories defined in your Storybook config
                // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                storybookTest({ configDir: storybookDir }),
              ],
              test: {
                name: 'storybook',
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [{ browser: 'chromium' as const }],
                },
              },
            },
          ]
        : []),
    ],
  },
});
