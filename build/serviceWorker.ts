/**
 * Plugin do Vite que gera o service worker do PWA no build: lista todos os arquivos
 * gerados (e os da pasta public) para funcionar offline. Sem dependências externas.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Monta o código do service worker. Função pura, testada no Vitest. */
export function buildServiceWorker(files: readonly string[], version: string): string {
  const list = [...new Set(['./', './index.html', ...files.filter((f) => f !== 'sw.js').map((f) => `./${f}`)])].sort();
  return `// Service worker do Pixel Runner (gerado no build).
const CACHE = 'pixel-runner-${version}';
const FILES = ${JSON.stringify(list)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pixel-runner-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Páginas: tenta a rede e, sem internet, usa o index.html guardado.
    event.respondWith(fetch(request).catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))));
    return;
  }
  // Arquivos do jogo: primeiro o cache (têm hash no nome), depois a rede.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
`;
}

function listFiles(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? listFiles(path).map((f) => `${name}/${f}`) : [name];
    });
  } catch {
    return [];
  }
}

export function serviceWorker(publicDir = 'public'): Plugin {
  return {
    name: 'pixel-runner-service-worker',
    apply: 'build',
    // Depois dos outros plugins, para o index.html já estar no pacote.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const publicFiles = listFiles(publicDir).map((f) => relative('.', f).replace(/\\/g, '/'));
      const files = [...Object.keys(bundle), ...publicFiles];
      // A versão muda quando qualquer arquivo muda, para o cache antigo ser trocado.
      const hash = createHash('sha256').update(files.sort().join('|'));
      for (const name of Object.keys(bundle).sort()) {
        const item = bundle[name];
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const name of publicFiles) hash.update(readFileSync(join(publicDir, name)));
      const version = hash.digest('hex').slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: buildServiceWorker(files, version) });
    },
  };
}
