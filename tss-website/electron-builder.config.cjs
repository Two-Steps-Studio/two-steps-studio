// electron-builder configuration.
//
// Kept in its own file rather than package.json's `build` field so the output
// directory can be redirected with an env var without `--config.x=y` CLI
// overrides, which make electron-builder ignore package.json's build block
// entirely (silently dropping settings like `toolsets`).

// electron/main.js requires electron-updater at runtime. Resolved transitive
// dependency set (regenerate if electron-updater is upgraded).
const ELECTRON_UPDATER_RUNTIME_DEPS = [
  'argparse',
  'builder-util-runtime',
  'debug',
  'electron-updater',
  'fs-extra',
  'graceful-fs',
  'js-yaml',
  'jsonfile',
  'lazy-val',
  'lodash.escaperegexp',
  'lodash.isequal',
  'ms',
  'sax',
  'semver',
  'tiny-typed-emitter',
  'universalify',
];

module.exports = {
  appId: 'com.twostepsstudio.app',
  productName: 'Two Steps Studio',
  // 0.0.0 ships one combined archive containing macOS symlinks, which Windows
  // refuses to extract without Developer Mode. 1.1.0 uses Windows-only ZIPs.
  toolsets: {
    winCodeSign: '1.1.0',
  },
  directories: {
    output: process.env.TSS_BUILD_OUT || 'dist-electron',
    buildResources: 'electron-builder-resources',
  },
  // Only the Electron wrapper goes into app.asar. Every web dependency is
  // already bundled inside the standalone server shipped via extraResources,
  // so packing package.json's `dependencies` again would add ~700 MB of dead
  // weight. electron-updater is the one runtime require in electron/main.js,
  // so it and its transitive dependencies are re-included explicitly.
  files: [
    'electron/**/*',
    'package.json',
    '!node_modules/**/*',
    ...ELECTRON_UPDATER_RUNTIME_DEPS.map((name) => `node_modules/${name}/**/*`),
  ],
  asarUnpack: ['electron/**/*'],
  extraResources: [
    {
      // Next.js `output: 'standalone'` bundle — a self-contained Node server
      // with only the traced dependencies. Lives outside app.asar because the
      // server runs in a child process, which cannot read an asar archive.
      from: '.next/standalone',
      to: 'app-server',
      // Next copies .env into the standalone output. It holds server secrets
      // and must never ship inside a binary handed to end users.
      filter: ['**/*', '!.env', '!.env.*'],
    },
    {
      // Copied as its own entry because electron-builder's file filter has a
      // hardcoded `if (relative === "node_modules") return false`, which drops
      // a node_modules directory sitting at the root of a copied tree. Starting
      // the copy inside it sidesteps that, and the standalone server is useless
      // without its traced dependency tree.
      from: '.next/standalone/node_modules',
      to: 'app-server/node_modules',
    },
    {
      // Not included in the standalone bundle by design; Next expects the
      // deployer to place it.
      from: '.next/static',
      to: 'app-server/.next/static',
    },
    {
      from: 'public',
      to: 'app-server/public',
    },
  ],
  extraMetadata: {
    main: 'electron/main.js',
  },
  protocols: [
    {
      name: 'Two Steps Studio',
      schemes: ['tss'],
      role: 'Viewer',
    },
  ],
  publish: {
    provider: 'generic',
    url: 'https://releases.twostepsstudio.com/updates',
  },
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'electron-builder-resources/icon.ico',
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Two Steps Studio',
    uninstallDisplayName: 'Two Steps Studio',
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    installerIcon: 'electron-builder-resources/icon.ico',
    uninstallerIcon: 'electron-builder-resources/icon.ico',
    license: 'electron-builder-resources/LICENSE.txt',
    perMachine: false,
    packElevateHelper: true,
    installerHeaderIcon: 'electron-builder-resources/icon.ico',
    // installerSidebar intentionally unset: NSIS expects a 164x314 BMP there,
    // not an .ico, and the default sidebar renders fine.
    displayLanguageSelector: false,
    language: '1045',
    multiLanguageInstaller: false,
    // installer.nsh is a macro file (preInit/customInstall/customUnInstall),
    // so it belongs in `include`. Setting it as `script` would replace the whole
    // generated NSIS installer script.
    include: 'electron-builder-resources/installer.nsh',
  },
  portable: {
    artifactName: '${productName}-${version}-portable.${ext}',
  },
};
