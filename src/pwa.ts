// eslint-disable-next-line import-x/no-unresolved
import { registerSW } from "virtual:pwa-register";

/**
 * Recovery for a stale, foreign service worker.
 *
 * While the domain was expired it served a parking page that registered its
 * own service worker at this origin (scope "/"). That worker redirects the
 * root navigation to /lander, which no longer exists, and it keeps running in
 * affected browsers until explicitly removed.
 *
 * The parking worker was a Next.js build: it precaches `/_next/...` URLs, a
 * signature our Astro site never produces. If we find that signature in the
 * Cache Storage, we unregister every worker, clear the caches, and reload once
 * (guarded by sessionStorage so it can never loop).
 */
const RECOVERY_FLAG = `sw-recovery-reloaded`;

async function hasForeignCache(): Promise<boolean> {
  if (!(`caches` in window)) return false;
  const keys = await caches.keys();
  for (const key of keys) {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    if (
      requests.some((req) => new URL(req.url).pathname.startsWith(`/_next/`))
    ) {
      return true;
    }
  }
  return false;
}

async function recoverFromForeignWorker(): Promise<boolean> {
  if (sessionStorage.getItem(RECOVERY_FLAG)) return false; // already tried once
  if (!navigator.serviceWorker.controller) return false; // nothing controlling us
  if (!(await hasForeignCache())) return false; // controller looks like ours

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async (r) => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.map(async (k) => caches.delete(k)));
  sessionStorage.setItem(RECOVERY_FLAG, `1`);
  // Bypass any cached redirect with a hard, cache-busting navigation.
  window.location.replace(`/?sw=${Date.now()}`);
  return true;
}

async function init(): Promise<void> {
  if (`serviceWorker` in navigator && (await recoverFromForeignWorker())) {
    return; // reloading; don't register over a worker we're tearing down
  }

  registerSW({
    immediate: true,
    onRegisteredSW(swScriptUrl) {
      console.log(`SW registered: `, swScriptUrl);
    },
    onOfflineReady() {
      console.log(`PWA application ready to work offline`);
    }
  });
}

void init();
