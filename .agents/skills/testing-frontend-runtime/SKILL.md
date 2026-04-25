# Nazl Frontend Runtime Testing

Use this skill when testing Nazl frontend deployment changes, Vite production builds, SPA routing, or runtime API configuration.

## Devin Secrets Needed

- `VERCEL_TOKEN` (optional): only needed to inspect protected Vercel preview deployments/logs with `npx vercel inspect ... --logs` or to bypass preview protection. If unavailable, test the production build locally and clearly report that the Vercel preview is protected.

## Setup

1. Install dependencies from the repo root and frontend package:
   ```bash
   pnpm install --frozen-lockfile
   pnpm --dir app/frontend install --frozen-lockfile
   ```
2. Build the production frontend from the repo root:
   ```bash
   pnpm run build
   ```
3. Serve the built app as a static SPA:
   ```bash
   cd app/frontend
   npx --yes serve@14.2.4 -s dist -l 4173
   ```
4. Expose port `4173` with Devin's deploy/expose tool and use the exposed non-localhost URL for production-like runtime checks.

## What to Test

- Direct route loads: open `/download` directly and verify the Nazl app renders instead of a static-server/Vercel 404.
- SPA refresh fallback: navigate to `/extract`, refresh, and verify the route still renders.
- Production API fallback: on the exposed non-localhost URL, inspect browser resource entries and confirm `/api/config` is requested from same-origin and no `127.0.0.1:8000` or `localhost:8000` resources are used.

Useful browser console snippet:

```js
({
  origin: window.location.origin,
  hostname: window.location.hostname,
  apiConfigResources: performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.includes('/api/config'))
    .map((entry) => entry.name),
  localhostResources: performance
    .getEntriesByType('resource')
    .filter(
      (entry) =>
        entry.name.includes('127.0.0.1:8000') ||
        entry.name.includes('localhost:8000'),
    )
    .map((entry) => entry.name),
  bodyHas404:
    document.body.innerText.includes('404') ||
    document.body.innerText.includes('NOT_FOUND'),
})
```

## Expected UI Text

- `/download` should show navbar logo `نزّل` and page heading `حمّل أي فيديو`.
- `/extract` should show heading `استخرج الأصول` and mode labels including `استخراج الصوت` and `تفريغ نصي`.

## Notes

- Vercel preview deployments may be protected by Vercel Auth and return HTTP 401. If there is no `VERCEL_TOKEN`, do not treat this as app failure; document it as an access constraint and use the local production build for runtime UI validation.
- Prefer recording one focused browser flow: direct `/download`, click navbar `استخراج`, refresh `/extract`, then inspect the runtime API/resource evidence.
