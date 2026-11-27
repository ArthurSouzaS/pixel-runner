"""Gera os ícones do jogo (aba do navegador, PWA e iPhone) a partir da arte do Pix.

Uso: python3 scripts/generate-icons.py   (precisa do Pillow: pip install pillow)
Fonte: art/pix-icon-source.png
"""
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'pix-icon-source.png'
OUT = ROOT / 'public' / 'icons'

# Recorte quadrado justo no personagem (fica legível em tamanhos pequenos).
TIGHT = (215, 240, 975, 1000)
# Recorte mais aberto para o ícone "maskable" (o Android pode cortar até 20% das bordas).
WIDE = (59, 0, 1131, 1072)


def save(img: Image.Image, size: int, name: str) -> None:
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
    print('ok', name)


def main() -> None:
    art = Image.open(SRC).convert('RGB')
    OUT.mkdir(parents=True, exist_ok=True)
    tight = art.crop(TIGHT)
    wide = art.crop(WIDE)
    save(tight, 32, 'favicon-32.png')
    save(tight, 48, 'favicon-48.png')
    save(tight, 180, 'apple-touch-icon.png')
    save(tight, 192, 'icon-192.png')
    save(tight, 512, 'icon-512.png')
    # Maskable: a arte reduzida a 78% no centro (zona segura), com as bordas suavizadas
    # sobre um degradê com as cores do céu (topo) e da grama (base) da própria arte.
    size = wide.size[0]
    inner = int(size * 0.78)
    art_small = wide.resize((inner, inner), Image.LANCZOS)
    top = wide.crop((0, 0, size, 8)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    bottom = wide.crop((0, size - 8, size, size)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    canvas = Image.new('RGB', (size, size))
    for y in range(size):
        k = y / (size - 1)
        color = tuple(round(a + (b - a) * k) for a, b in zip(top, bottom))
        canvas.paste(color, (0, y, size, y + 1))
    fade = 40
    mask = Image.new('L', (inner, inner), 0)
    mask.paste(255, (fade, fade, inner - fade, inner - fade))
    mask = mask.filter(ImageFilter.GaussianBlur(fade / 2))
    canvas.paste(art_small, ((size - inner) // 2, (size - inner) // 2), mask)
    save(canvas, 512, 'icon-maskable-512.png')


if __name__ == '__main__':
    main()
