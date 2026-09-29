// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

// eslint-config-next 16 ships flat configs. It used to be loaded through
// @eslint/eslintrc's FlatCompat, which can't read them (config validation
// crashed on a circular structure), so lint never ran at all.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "dist/**", "dist-electron*/**", "node_modules/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Same globs eslint-config-next registers its plugins for - an override
    // without `files` would also hit e.g. *.cjs, where those plugins don't exist.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'import/no-unresolved': 'off',
      'import/named': 'off',
      'import/default': 'off',
      'import/namespace': 'off',
      'import/no-absolute-path': 'off',
      'import/no-dynamic-require': 'off',
      'import/no-self-import': 'off',
      'import/no-cycle': 'off',
      'import/no-useless-path-segments': 'off',
      // React Compiler rules that eslint-plugin-react-hooks v6 turned on.
      // They flag ~50 existing spots (mostly setState in data-fetching
      // effects in admin/profile pages) that predate them. Warnings for now
      // so they stay visible without blocking CI; new code shouldn't add
      // more, and they should go back to errors once the backlog is fixed.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    // Electron's main process and the webpack loader are CommonJS on
    // purpose - require() is correct there.
    files: ["electron/**/*.js", "src/visual-edits/**/*.js"],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  ...storybook.configs["flat/recommended"],
];

export default eslintConfig;
