# Auto-updater — Two Steps Studio

The desktop application updates itself from **GitHub Releases** of this
repository (`twostepsstudio/tss-desktop`). All update artefacts and the
metadata files consumed by `electron-updater` (`latest.yml`, etc.) are
published to GitHub Releases by the Release workflow — no other host is
ever queried.

The single source of truth for the version is `package.json`:

```json
"version": "1.0.1"
```

The updater compares it as SemVer against the latest GitHub Release tag.
A leading `v` on the tag is stripped, so `v1.0.2` and `1.0.2` compare
identically.

---

## 1. How to bump the version

1. Edit `tss-website/package.json`:
   ```json
   "version": "1.0.2"
   ```
2. Commit and push to the branch you cut the tag from (typically `main`).
3. Tag the commit:
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```

Follow Semantic Versioning:

| Bump   | When                                               | Example       |
|--------|----------------------------------------------------|---------------|
| patch  | Bugfixes, no API changes                           | `1.0.1 → 1.0.2` |
| minor  | New features, backwards-compatible                 | `1.0.1 → 1.1.0` |
| major  | Breaking changes to user-visible behaviour         | `1.0.1 → 2.0.0` |

The updater will **never** downgrade a user. A user on `1.0.2` will not
be offered a `1.0.1` release even if it is published.

---

## 2. How to cut a release

```bash
git checkout main
git pull
# edit package.json → "version": "1.0.2"
git commit -am "Bump version to 1.0.2"
git tag v1.0.2
git push origin main --follow-tags
```

The push of the `vX.Y.Z` tag triggers `.github/workflows/release.yml`.

You can also trigger the workflow manually from the Actions tab for a
build-only run (no GitHub Release is created). Useful when smoke-testing
the pipeline before cutting a real release.

---

## 3. How to build the `.exe`

### Local (developer machine)

```bash
cd tss-website
npm install
npm run build:electron          # Next.js standalone bundle
npm run electron:build:win      # produces NSIS installer + portable EXE
```

The artefacts land in `tss-website/release-artifacts/` (overridable via
the `TSS_BUILD_OUT` env var):

```
two-steps-studio-1.0.2-x64.exe        (NSIS installer)
two-steps-studio-1.0.2-portable.exe   (portable build)
```

### CI

The Release workflow runs the same commands on `windows-latest`,
`macos-latest`, and `ubuntu-latest` runners. Each OS matrix entry uploads
its artefacts to the same GitHub Release.

---

## 4. How to publish a GitHub Release

The Release workflow handles publishing end-to-end. It:

1. Builds the platform installers.
2. Creates (or updates) the GitHub Release with tag `1.0.2` (the leading
   `v` is stripped from the ref).
3. Uploads the installer, the portable archive, the blockmap files
   (for differential updates), and the manifest files
   (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`).

If you ever need to publish by hand — for example when re-cutting a broken
release — use `electron-builder` directly:

```bash
cd tss-website
GH_TOKEN=<your-pat> \
npx electron-builder --config electron-builder.config.cjs --win --publish always
```

---

## 5. How the app detects an update

The updater is wired into three triggers:

| Trigger               | When                                               | Where                          |
|-----------------------|----------------------------------------------------|--------------------------------|
| Startup check         | 30s after launch, only when `autoUpdate` is on     | `electron/main.js` → `setTimeout` |
| Periodic check        | Every 60 minutes while the app is running          | `updater.schedulePeriodicCheck` |
| Manual check          | `Check for updates` button or tray menu entry      | IPC `check-for-updates`        |

All three go through the same `updater.checkForUpdates` function, which
coalesces concurrent calls so two clicks cannot fire two GitHub
requests.

The main process sends a typed event over IPC for each state transition;
the renderer hooks them through the existing `useAutoUpdater` hook. The
hook and `UpdaterPanel` component are intentionally minimal — they only
reflect the current state.

States:

```
Checking for updates...
You're up to date
Update available
Downloading update... (with progress %)
Update downloaded
Restart and install
Update failed
```

---

## 6. How to test the updater

The full lifecycle can only be tested against a real GitHub Release.

### Test 1 — "You're up to date"

1. Set `package.json` to a version that matches the latest GitHub Release.
2. Launch the app.
3. Expected: the renderer shows "You're up to date" within ~30s.

### Test 2 — "Update available"

1. Set `package.json` to a version **lower** than the latest GitHub
   Release.
2. Launch the app.
3. Expected: "Update available" with `Update now` / `Later` buttons.

### Test 3 — No downgrade

1. Set `package.json` to a version **higher** than the latest GitHub
   Release.
2. Launch the app.
3. Expected: "You're up to date". No update offered.

### Test 4 — No internet

1. Disable the network.
2. Launch the app.
3. Expected: app starts normally, no crash, no update prompt.

### Test 5 — Full download

1. Cut a new tag `v1.0.2` while the locally installed app is on `1.0.1`.
2. Wait for the workflow to publish the GitHub Release.
3. Open the installed app → "Update available" → click **Update now**.
4. Expected: progress fills to 100%, "Restart and install" appears, app
   restarts and reports the new version.

### Test 6 — SemVer comparisons

`semver` (already a transitive dependency of `electron-updater`) handles
all comparisons via `semver.clean()` + `semver.gt()`. Verified locally:

```
1.0.9  <  1.0.10   ✓
1.0.0  <  1.1.0    ✓
1.1.0  <  2.0.0    ✓
v1.0.1 == 1.0.1    ✓
```

---

## 7. What to do when a release is bad

Two recovery paths:

### Re-publish (preferred)

Bump to `1.0.3`, push the tag, let the workflow publish again. Users on
`1.0.2` will be offered `1.0.3` immediately on next check.

### Yank (if the release must be removed)

1. Delete the GitHub Release (and tag) from the GitHub UI or via the API.
2. Users who have **already downloaded** `1.0.2` keep it — there is no
   way to force them back via the updater protocol.
3. Users who have **not yet downloaded** it will receive whichever
   release is `latest` next time they check.

The updater never re-offers a deleted release to users who did not yet
install it, because the GitHub Releases API no longer reports it as the
latest.

---

## 8. How rollback works

The updater itself does not roll back. Two practical paths:

1. **Forward recovery** — always preferred. Cut `1.0.3` with the fix; the
   updater delivers it automatically.
2. **Manual uninstall** — `Settings → Apps → Installed apps → Two Steps
   Studio → Uninstall`, then install the desired `.exe`. Settings are
   preserved because the NSIS installer sets `deleteAppDataOnUninstall:
   false` in `electron-builder.config.cjs`.

The installer also keeps a `settings.backup.json` file in `userData/`
before each update install, so a botched upgrade does not wipe local
state.

---

## 9. GitHub Actions — required secrets

Configure these under
**Settings → Secrets and variables → Actions** of the
`tss-website` repo (or whatever repo you wire the workflow into):

| Secret name          | Required?     | Purpose                                                      |
|----------------------|---------------|--------------------------------------------------------------|
| `GH_TOKEN`           | **Yes**       | PAT with `repo` scope. Lets `electron-builder` create / update the GitHub Release and upload artefacts. The default `GITHUB_TOKEN` is not sufficient because it cannot trigger subsequent workflow runs and has narrower release scope. |
| `CSC_LINK`           | macOS only    | base64 of the `.p12` Developer ID certificate.               |
| `CSC_KEY_PASSWORD`   | macOS only    | Password for the `.p12`.                                     |
| `CSC_KEY_ID`         | macOS only    | App Store Connect API key id (for notarisation).             |
| `CSC_ISSUER_ID`      | macOS only    | App Store Connect issuer id.                                 |
| `CSC_BUNDLE_ID`      | macOS only    | The app's bundle id, e.g. `com.twostepsstudio.app`.          |

### Windows code-signing

**Not configured.** Production releases should be code-signed, but this
requires a certificate (Authenticode or Azure Trusted Signing). Add the
relevant `win` keys in `electron-builder.config.cjs` once the cert type
is decided:

```js
win: {
  certificateSubjectName: 'Two Steps Studio',
  certificateSha1: '<thumbprint>',
  // or, for Azure Trusted Signing:
  // azure: {
  //   trustedSigning: {
  //     endpoint: 'https://wus2.trustedsigningservice.azure.net',
  //     codeSigningAccountName: '<account>',
  //     certificateProfileName: '<profile>',
  //   },
  // },
}
```

Without a certificate the `electron-builder` build will print a warning
and ship unsigned binaries. The app will still install on most Windows
machines, but SmartScreen will warn the user.

---

## 10. How to add a beta channel later

The updater already accepts a channel name. To enable it:

### Step 1 — Build

Append a second `publish` entry to `electron-builder.config.cjs`:

```js
publish: [
  // existing stable entry
  {
    provider: 'github',
    owner: 'twostepsstudio',
    repo: 'tss-desktop',
    channel: 'latest',
    publishAutoUpdate: true,
  },
  // beta entry
  {
    provider: 'github',
    owner: 'twostepsstudio',
    repo: 'tss-desktop',
    channel: 'beta',
    releaseType: 'prerelease',
    publishAutoUpdate: true,
  },
],
```

### Step 2 — Tag

Cut a tag like `v1.1.0-beta.1` and mark the GitHub Release as a
**Pre-release** when publishing it (or let `releaseType: 'prerelease'`
do that for you automatically).

### Step 3 — Tell the app

Set `TSS_UPDATE_CHANNEL=beta` at build / launch time, or surface it in
the settings panel. The updater picks the channel up from
`process.env.TSS_UPDATE_CHANNEL` and configures the feed accordingly.

No renderer changes are required — the same UI works for every channel.

---

## File map

| File                                          | Purpose                                       |
|-----------------------------------------------|-----------------------------------------------|
| `package.json`                                | Version source of truth                       |
| `electron/updater.js`                         | Updater module (SemVer, channel, events)      |
| `electron/main.js`                            | Calls `updater.init()`, schedules checks      |
| `electron/preload.js`                         | Renderer-facing IPC surface                   |
| `electron-builder.config.cjs`                 | Build + publish targets                       |
| `src/components/Electron/UpdaterPanel.tsx`    | Standalone update UI on the settings page     |
| `src/components/Electron/UpdateNotification.tsx` | Modal prompt when an update is found       |
| `.github/workflows/release.yml`               | CI: build + publish on tag push               |
