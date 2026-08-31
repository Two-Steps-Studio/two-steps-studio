# Unity WebGL build — drop location

This folder is what `/dev/game` (see `src/app/dev/game/page.tsx`) loads in an
`<iframe src="/unity-game/index.html">`. It's currently empty — the page
shows a "not uploaded yet" placeholder until something lands here.

## What to put here

A Unity **WebGL** build's *output folder contents* (not the folder itself),
i.e. after `File > Build Settings > WebGL > Build`, copy everything from
inside the build output directory straight into this folder, so you end up
with:

```
public/unity-game/
├── index.html          <- Unity's generated entry point
├── Build/
│   ├── *.wasm(.br|.gz)
│   ├── *.data(.br|.gz)
│   ├── *.framework.js(.br|.gz)
│   └── *.loader.js
├── TemplateData/
└── StreamingAssets/     (only if the project uses any)
```

## Things to check once a real build is dropped in

- **Compression**: if the build uses Brotli/Gzip compression (Unity's
  default for WebGL), Next.js's static file server does not set
  `Content-Encoding` automatically — either turn compression off in
  Unity's Publishing Settings (simplest), or this will need a small
  rewrite/route to serve those files with the right header.
- **Threading (COOP/COEP)**: if the project uses WebGL with multithreading,
  the browser requires `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` on the response for
  `/dev/game` (and everything the build itself loads). Don't add those
  site-wide in `next.config.ts` — they'd break cross-origin resources the
  rest of the site depends on (Google Fonts, Vercel Analytics, etc.). Scope
  them to this one route only when it's actually needed.
- **Size**: WebGL builds can be large. If it gets big enough that committing
  it to git is unwelcome, this folder is the thing to `.gitignore` and swap
  for a proper storage/CDN upload instead — the `/dev/game` page doesn't
  care where the files physically come from as long as `/unity-game/...`
  still resolves.

## Access

`/dev/game` is admin-gated (same `/api/admin/auth` check as the other
`/dev/*` panels) and excluded from `robots.txt` — it's reachable only by a
signed-in admin who has the direct URL, not linked from any nav menu.
