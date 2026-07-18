import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'protektor:chunk-reload-url';
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

interface ChunkReloadMarker {
  url: string;
  reloadedAt: number;
}

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk [\d]+ failed|chunkloaderror|unable to preload css/i.test(message);
}

export function shouldReloadForChunkError(currentUrl: string, now = Date.now()): boolean {
  const storedMarker = sessionStorage.getItem(CHUNK_RELOAD_KEY);

  if (storedMarker) {
    try {
      const marker = JSON.parse(storedMarker) as ChunkReloadMarker;
      if (marker.url === currentUrl && now - marker.reloadedAt < CHUNK_RELOAD_COOLDOWN_MS) {
        return false;
      }
    } catch {
      // Buzilgan marker yangi, to'g'ri qiymat bilan almashtiriladi.
    }
  }

  const marker: ChunkReloadMarker = { url: currentUrl, reloadedAt: now };
  sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify(marker));
  return true;
}

export async function importWithReload<T>(importer: () => Promise<T>): Promise<T> {
  try {
    return await importer();
  } catch (error) {
    if (isChunkLoadError(error)) {
      const currentUrl = window.location.href;

      if (shouldReloadForChunkError(currentUrl)) {
        window.location.reload();

        // Navigatsiya boshlanganda React eski route xatosini render qilmasin.
        return new Promise<T>(() => undefined);
      }
    }

    throw error;
  }
}

export const lazyWithRetry: typeof lazy = (importer) => (
  lazy(() => importWithReload(importer))
);
