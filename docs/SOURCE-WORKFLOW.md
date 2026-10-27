# Source workflow

The deployed application currently reconstructs its HTML and server-side bundle from Brotli-compressed Base64 parts. Runtime patches are also applied by `server.js`. Editing individual generated chunk files directly is unsafe.

## Extract for inspection

Run:

```bash
npm run source:extract
```

This writes decoded copies to `.workbench/app.html` and `.workbench/server-bundle.js`. The directory is git-ignored; extraction never changes the original chunk files.

## Before editing or repacking

- Inspect the decoded files and identify the exact source/build origin.
- Keep the runtime wrapper and the generated bundle responsibilities separate.
- Do not add secrets, default passwords, or service-role keys to browser-visible source.
- Add a test for every behavior change and run `npm run test:security`.
- Do not deploy the extracted files directly. A deterministic pack/build procedure and round-trip tests must be established before generated chunks are replaced.

This script is an inspection step, not a build or deployment step.
