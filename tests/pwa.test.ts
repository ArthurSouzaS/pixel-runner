import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildServiceWorker } from '../build/serviceWorker';

const root = fileURLToPath(new URL('..', import.meta.url));

function filesOf(code: string): string[] {
  const match = /const FILES = (\[.*\]);/.exec(code);
  if (!match) throw new Error('lista FILES não encontrada');
  return JSON.parse(match[1]) as string[];
}

describe('service worker', () => {
  const files = ['index.html', 'assets/index-abc.js', 'assets/phaser-def.js', 'icons/icon-192.png', 'sw.js', 'manifest.webmanifest'];
  const code = buildServiceWorker(files, '1a2b3c');

  it('guarda a raiz e todos os arquivos do build, menos ele mesmo', () => {
    const list = filesOf(code);
    expect(list).toContain('./');
    expect(list).toContain('./index.html');
    expect(list).toContain('./assets/index-abc.js');
    expect(list).toContain('./icons/icon-192.png');
    expect(list).toContain('./manifest.webmanifest');
    expect(list).not.toContain('./sw.js');
    expect(new Set(list).size).toBe(list.length);
  });

  it('usa um cache com a versão e limpa os antigos', () => {
    expect(code).toContain("const CACHE = 'pixel-runner-1a2b3c'");
    expect(code).toContain('caches.delete');
    expect(code).toContain('skipWaiting');
  });

  it('sem internet, a navegação cai no index.html guardado', () => {
    expect(code).toContain("request.mode === 'navigate'");
    expect(code).toContain("caches.match('./index.html')");
    expect(code).toContain('ignoreVary: true');
  });

  it('o código gerado é JavaScript válido', () => {
    expect(() => new Function(code)).not.toThrow();
  });

  it('é determinístico', () => {
    expect(buildServiceWorker([...files].reverse(), '1a2b3c')).toBe(code);
  });
});

describe('manifest', () => {
  const manifest = JSON.parse(readFileSync(`${root}public/manifest.webmanifest`, 'utf8')) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };

  it('tem nome, início relativo e modo instalável', () => {
    expect(manifest.name).toBe('Pixel Runner');
    expect(manifest.start_url).toBe('./');
    expect(['standalone', 'fullscreen']).toContain(manifest.display);
  });

  it('aponta para ícones que existem, incluindo 192, 512 e maskable', () => {
    for (const icon of manifest.icons) expect(existsSync(`${root}public/${icon.src}`)).toBe(true);
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose?.includes('maskable'))).toBe(true);
  });
});
