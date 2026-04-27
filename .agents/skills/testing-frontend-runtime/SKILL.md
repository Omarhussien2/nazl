# Nazl Frontend Runtime Testing

Use this skill when testing Nazl frontend deployment changes, Vite production builds, SPA routing, runtime API configuration, auth entrypoints, or production anonymous quota behavior.

## Devin Secrets Needed

- `VERCEL_TOKEN` (optional): only needed to inspect protected Vercel preview deployments/logs with `npx vercel inspect ... --logs` or to bypass preview protection. If unavailable, test production or the local production build and clearly report that the Vercel preview is protected.
- Google OAuth credentials are not needed for anonymous quota testing. Full OAuth login testing requires the Google OAuth client to already allow the deployed callback URI, e.g. `https://nazl.vercel.app/api/v1/auth/callback`.

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
- Auth UI: open the deployed home page at desktop width and verify the navbar contains `سجّل دخول`; resize to mobile width, open the hamburger menu, and verify `سجّل دخول` appears there too.
- OAuth boundary: click `سجّل دخول` and verify the app reaches Google OAuth. If Google shows `redirect_uri_mismatch`, report it as an external Google Console configuration blocker, not a frontend routing failure.
- Anonymous quota: use `/extract` → `تفريغ نصي` → submit a public, no-auth audio URL twice from the same browser. The first attempt should reach transcription; the second should return HTTP 429 with `detail.error = "quota_exceeded"`, `used = 1`, and `limit = 1`.

## Quota Test Media Tips

- Use a media URL that Cloud Run and Groq can fetch without cookies, basic auth, or a browser session. Devin `deploy frontend` static URLs work well for small WAV fixtures.
- Avoid Devin exposed tunnels that include basic-auth credentials in the URL; `yt-dlp` or downstream services may not treat them as fetchable direct media.
- Avoid private Devin attachment URLs for backend/Groq fetches unless you have verified they return HTTP 200 without session auth from a non-browser client.
- Before using a fixture in the UI, probe it from the shell:
  ```bash
  curl -I https://example.devinapps.com/sample.wav
  python -m yt_dlp --simulate --print title https://example.devinapps.com/sample.wav
  ```
- A failed extraction message like `ما قدرنا نستخرج الصوت من الرابط هذا، جرّب رابط ثاني.` does not consume quota because the backend resolves audio before reserving the quota slot.

## Useful browser console snippets

Production API resource check:

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

Quota evidence check when the UI only shows a generic 429:

```js
fetch('/api/v1/download/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.devinapps.com/sample.wav' }),
}).then(async (r) =>
  console.log('QUOTA_EVIDENCE', JSON.stringify({ status: r.status, body: await r.json() })),
)
```

## Expected UI Text

- `/download` should show navbar logo `نزّل` and page heading `حمّل أي فيديو`.
- `/extract` should show heading `استخرج الأصول` and mode labels including `استخراج الصوت` and `تفريغ نصي`.
- Auth controls should show `سجّل دخول` when unauthenticated.
- A successful transcription should show `تم التفريغ النصي!`.

## Notes

- Vercel preview deployments may be protected by Vercel Auth and return HTTP 401. If there is no `VERCEL_TOKEN`, do not treat this as app failure; document it as an access constraint and use production or the local production build for runtime UI validation.
- Prefer recording one focused browser flow: direct `/download`, click navbar `استخراج`, refresh `/extract`, verify auth entrypoint, and then test anonymous quota if a public no-auth media fixture is ready.
