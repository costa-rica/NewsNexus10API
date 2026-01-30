Package Audit Report

Issue Summary
- npm audit fix --force attempted to downgrade/upgrade sqlite3 to 5.0.2 and failed.
- Failure occurred while building sqlite3 from source on macOS arm64 with Node 24.11.0.

Observed Errors
- Prebuilt binary download for sqlite3@5.0.2 returned 403 from mapbox-node-binary.
- Fallback build failed because /bin/sh could not find `python`.

Likely Causes
- sqlite3@5.0.2 has no prebuilt binary for Node 24 (ABI v137) and relies on source build.
- Build toolchain expects `python` on PATH (python3 is available but no `python` shim).

Proposed Solutions (pick one)
1) Use a supported Node version for sqlite3 prebuilt binaries (LTS 20 or 22), then rerun npm install.
2) Install a python shim so `python` resolves to python3, then rerun npm install (or npm rebuild sqlite3).
3) Avoid the forced audit change: keep sqlite3 at 5.1.7 (already in package.json) and run `npm audit` for a targeted fix plan.

Notes
- The npm install warnings are mostly deprecated transitive dependencies; they do not block install but add noise.
- The audit fix --force may introduce breaking changes; prefer a targeted update plan.

npm audit results and path forward
- On Node 22, `npm audit fix` resolved lodash and undici; remaining issues are the tar chain only.
- tar vulnerabilities are in a transitive chain (tar -> cacache -> make-fetch-happen -> node-gyp -> sqlite3). npm only offers a fix via `npm audit fix --force`, which would move sqlite3 to 5.0.2.
- Best path: keep sqlite3 at 5.1.7, accept the tar-chain risk short term, and monitor for an upstream update of node-gyp/make-fetch-happen/cacache that pulls a patched tar without forcing sqlite3 to 5.0.2.
