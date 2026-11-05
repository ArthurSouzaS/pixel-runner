# Pixel Runner 2

Jogo de plataforma 2D em pixel art feito para o navegador com **Phaser 3**, **TypeScript** e **Vite**.
Projeto de portfólio de **Arthur Souza Soares**.

### ▶️ Jogue agora: **https://arthursouzas.github.io/pixel-runner**

![Gameplay do Pixel Runner](docs/gameplay.gif)

| Menu | Mapa dos mundos |
| :---: | :---: |
| ![Menu inicial](docs/menu.png) | ![Mapa de seleção de mundos](docs/mapa.png) |
| **Mundo 2 — água e nado** | **Mundo 2 — correntes de ar** |
| ![Recife Submerso](docs/mundo2-recife.png) | ![Penhasco dos Ventos](docs/mundo2-vento.png) |
| **Chefe: Tempestade Rubra** | **Modo cooperativo (câmera com zoom)** |
| ![Chefe do Mundo 2](docs/chefe-tempestade.png) | ![Dois jogadores](docs/cooperativo.png) |
| **Editor de fases** | **Loja** |
| ![Editor de fases](docs/editor.png) | ![Loja de skins e rastros](docs/loja.png) |
| **Conquistas** | **Chefe: Núcleo Ancestral** |
| ![Conquistas](docs/conquistas.png) | ![Arena do primeiro chefe](docs/chefe.png) |

---

## Sobre o jogo

Você controla **Pix**, um pequeno robô corredor de capacete verde e cachecol laranja, através de **2 mundos e 10 fases**, enfrentando o **Núcleo Ancestral** e a **Tempestade Rubra**.

Todo o visual e o som são gerados por código, sem arquivos de imagem ou áudio externos:

- **Sprites** desenhados como pixel art em texto (`src/gfx/sprites.ts`) e convertidos em texturas na inicialização.
- **Tiles e cenários** com parallax gerados proceduralmente para cada um dos 10 temas.
- **Efeitos sonoros e trilha sonora** sintetizados em tempo real com a **Web Audio API** (uma música por tema, mais chefes, mapa e créditos).

## Novidades do Pixel Runner 2

- 🌍 **Mundo 2 — Arquipélago Celeste**: 5 fases novas com **gelo escorregadio**, **molas**, **plataformas que caem**, **vento** (empurrões e correntes de ar) e **água com nado**, além do peixe-espinho e do inimigo blindado.
- ⛈️ **Novo chefe**, a **Tempestade Rubra**, com **3 fases de ataque**: chuva de gelo e rasantes, explosões radiais e mergulhos com onda de choque.
- 🧗 **Habilidades desbloqueáveis** com tutorial ao ganhar cada uma: **escalar paredes**, **planar** e **investida** (quebra blocos rachados e derrota blindados).
- 👥 **2 jogadores no mesmo teclado**: modo **cooperativo** (vidas compartilhadas) e **corrida** (quem chega primeiro vence), com **câmera que acompanha os dois** e dá zoom.
- 🛠️ **Editor de fases**: grade de tiles, inimigos, moedas e checkpoints; **3 slots no localStorage**; **exportar/importar JSON**; **teste instantâneo** da fase criada.
- 🛍️ **Loja**: troque as moedas por **8 skins de cores** do Pix e **7 rastros de partícula**.
- 🏆 **23 conquistas**, **estatísticas do jogador** e **tela de créditos**.
- 🗺️ **Mapa de seleção de mundos**, **trilha sonora por mundo** e **opções de volume** (geral, música e efeitos).
- 🎮 **Gamepad** no jogo e em todos os menus, junto com teclado e toque.

## Recursos

- Correr, pular (altura variável, *coyote time* e *buffer* de pulo), **pulo duplo**, **dash** e as 3 habilidades
- 10 fases: Campos Verdes, Caverna de Cristal, Fábrica Enferrujada, Picos Gelados, Fortaleza do Núcleo, Lago Congelado, Recife Submerso, Ruínas Desmoronando, Penhasco dos Ventos e Olho da Tempestade
- 6 tipos de inimigo: gosma, saltador, morcego, torreta, peixe-espinho e gosma blindada
- 2 chefes com padrões de ataque diferentes e música própria
- Moedas (vida extra a cada 50), checkpoints, plataformas móveis, espinhos, combos e bônus de tempo
- Recorde, progresso, melhores tempos, habilidades, carteira, compras, conquistas, estatísticas e volumes **salvos no `localStorage`** (saves da v1 são migrados automaticamente)
- Partículas, rastros, tremida de câmera e transições
- **Teclado**, **botões na tela** (celular/tablet) e **gamepad**

## Controles

### Um jogador

| Ação | Teclado | Toque | Gamepad |
| --- | --- | --- | --- |
| Correr | `←` `→` ou `A` `D` | Setas na tela | Analógico / direcional |
| Pular / nadar | `Espaço`, `W`, `Z` ou `↑` | Botão **A** | **A** |
| Pulo duplo | Pular de novo no ar | **A** no ar | **A** no ar |
| Dash | `Shift`, `X` ou `K` | Botão **B** | **X** / **Y** / **RB** |
| Planar* | Segurar o pulo caindo | Segurar **A** | Segurar **A** |
| Escalar* | No ar, segurar a direção da parede | Idem | Idem |
| Investida* | Segurar `C` ou `L` e soltar | Segurar **C** | Segurar **B** / **LB** |
| Pausar | `Esc` ou `P` | Botão **II** | **Start** |
| Ligar/desligar som | `M` | Menu de opções | — |

\* Habilidades conquistadas no Mundo 2.

### Dois jogadores (mesmo teclado)

| Ação | Jogador 1 | Jogador 2 |
| --- | --- | --- |
| Mover | `A` `D` | `←` `→` |
| Pular | `W` | `↑` |
| Dash | `S` | `↓` |
| Investida | `E` | `Enter` |

Com dois gamepads, cada um comanda um jogador; com apenas um, ele fica com o jogador 2.

### Editor de fases

Clique (ou toque) para desenhar, botão direito apaga, `1`–`9` escolhem ferramentas, setas ou roda do mouse rolam o mapa, `T` testa, `Ctrl+S` salva, `Ctrl+Z` desfaz e `Esc` abre o menu (slots, tema, largura, exportar/importar JSON).

## Como rodar localmente

Requisitos: **Node.js 20+**.

```bash
npm install
```

```bash
npm run dev
```

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:5173/pixel-runner/` |
| `npm test` | Testes com Vitest |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |

## Estrutura do código

```
src/
├── main.ts               # Configuração do Phaser, gamepad e inicialização
├── scenes/               # Boot, Menu, WorldMap, Level (Fase), HUD, Pause, Tutorial, GameOver,
│                         # TwoPlayer, Editor, Shop, Achievements, Options, Credits, Toast
├── levels/               # As 10 fases em arquivos de dados (mapas ASCII + água, vento, plataformas, dicas)
├── logic/                # Lógica pura, sem Phaser (testada com Vitest)
│   ├── score.ts          #   pontuação, vidas, combos e bônus
│   ├── progress.ts       #   desbloqueio e sequência de fases
│   ├── save.ts           #   save versionado, validação e migração
│   ├── levelParser.ts    #   conversão do mapa ASCII em dados
│   ├── abilities.ts      #   habilidades desbloqueáveis
│   ├── editor.ts         #   editor: edição, validação, JSON e slots
│   ├── shop.ts           #   loja: catálogo, carteira, compra e equipamento
│   ├── stats.ts          #   estatísticas do jogador
│   ├── achievements.ts   #   23 conquistas
│   └── audioSettings.ts  #   volumes
├── objects/              # Player, inimigos, chefes, molas, plataformas móveis e que caem
├── gfx/                  # Paleta, sprites em pixel art, skins e geração de texturas
├── audio/                # Efeitos e músicas com Web Audio (barramentos de volume separados)
├── input/                # Teclado por jogador, toque e gamepad
├── systems/              # Ponte entre o save e o localStorage (estatísticas em lote, conquistas)
└── ui/                   # Texto pixelado e menus navegáveis
tests/                    # 113 testes do Vitest
```

### Formato das fases

Cada fase é um arquivo em `src/levels/` com um mapa ASCII de 17 linhas (o mesmo formato usado pelo editor e pelo JSON exportado):

| Caractere | Significado |
| --- | --- |
| `#` | Chão (o topo é escolhido automaticamente) |
| `X` / `I` / `Q` | Bloco sólido / gelo escorregadio / bloco rachado |
| `-` / `F` | Plataforma atravessável / plataforma que cai |
| `^` / `S` | Espinhos / mola |
| `o` | Moeda |
| `P` / `G` / `K` | Início / chegada / checkpoint |
| `w` `h` `b` `t` `f` `a` | Gosma, saltador, morcego, torreta, peixe, blindado |
| `A` | Orbe de habilidade |
| `B` / `\|` | Chefe / portão da arena |

Água, vento, plataformas móveis e dicas ficam em listas separadas no mesmo arquivo. Os testes verificam que todas as fases são válidas.

### Formato do JSON exportado pelo editor

```json
{
  "format": "pixel-runner-level",
  "version": 1,
  "name": "Minha fase",
  "theme": "grass",
  "map": ["....", "...", "17 linhas no total"]
}
```

## Publicação

O deploy é automático no **GitHub Pages** pelo workflow `.github/workflows/deploy.yml` a cada push na `main`: instala as dependências, roda os testes, gera o build (com `base: "/pixel-runner/"`) e publica a pasta `dist/`.

> Na primeira vez, ative em **Settings → Pages → Build and deployment → Source: GitHub Actions**.

O planejamento da v2 está em [PLANO_V2.md](PLANO_V2.md) e as decisões de design em [DECISOES.md](DECISOES.md).

## Créditos

- Código, design de fases, pixel art, música e sons: **Arthur Souza Soares**
- Fonte [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (SIL Open Font License), empacotada via `@fontsource`
- Feito com [Phaser 3](https://phaser.io), [TypeScript](https://www.typescriptlang.org), [Vite](https://vite.dev) e [Vitest](https://vitest.dev)

Licença MIT.
