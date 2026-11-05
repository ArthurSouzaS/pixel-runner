# Pixel Runner 3

Jogo de plataforma 2D em pixel art feito para o navegador com **Phaser 3**, **TypeScript** e **Vite**.
Projeto de portfólio de **Arthur Souza Soares**.

### ▶️ Jogue agora: **https://arthursouzas.github.io/pixel-runner**

Funciona no computador e no celular, em **português e inglês**, e pode ser **instalado como app** (PWA) para jogar **offline**.

![Gameplay do Pixel Runner](docs/gameplay.gif)

| Menu | Vila das Estrelas (hub do modo história) |
| :---: | :---: |
| ![Menu inicial](docs/menu.png) | ![Vila com diálogo de NPC](docs/vila.png) |
| **Mundo 3 — portais e lasers** | **Mundo 3 — gravidade baixa e asteroides** |
| ![Estação Orbital](docs/mundo3-portais.png) | ![Base Lunar](docs/mundo3-asteroides.png) |
| **Chefe final: Eclipse** | **Missões** |
| ![Chefe Eclipse](docs/chefe-eclipse.png) | ![Diário de missões](docs/missoes.png) |
| **Modo Infinito** | **Power-up entre salas** |
| ![Sala gerada do modo Infinito](docs/infinito-sala.png) | ![Escolha de power-up](docs/infinito.png) |
| **Desafio diário** | **Speedrun com fantasma** |
| ![Desafio diário](docs/diario.png) | ![Speedrun](docs/speedrun.png) |
| **Acessibilidade** | **Modos de jogo** |
| ![Opções de acessibilidade](docs/acessibilidade.png) | ![Modos de jogo](docs/modos.png) |

<details>
<summary>Mais imagens (partes 1 e 2)</summary>

| Mapa dos mundos | Mundo 2 — água e nado |
| :---: | :---: |
| ![Mapa de seleção de mundos](docs/mapa.png) | ![Recife Submerso](docs/mundo2-recife.png) |
| **Mundo 2 — correntes de ar** | **Chefe: Tempestade Rubra** |
| ![Penhasco dos Ventos](docs/mundo2-vento.png) | ![Chefe do Mundo 2](docs/chefe-tempestade.png) |
| **Modo cooperativo** | **Editor de fases** |
| ![Dois jogadores](docs/cooperativo.png) | ![Editor de fases](docs/editor.png) |
| **Loja** | **Conquistas** |
| ![Loja de skins e rastros](docs/loja.png) | ![Conquistas](docs/conquistas.png) |
| **Chefe: Núcleo Ancestral** | **Fase concluída** |
| ![Arena do primeiro chefe](docs/chefe.png) | ![Tela de vitória](docs/vitoria.png) |

</details>

---

## Sobre o jogo

Você controla **Pix**, um pequeno robô corredor de capacete verde e cachecol laranja. Partindo da **Vila das Estrelas**, ele atravessa **3 mundos e 15 fases** — da terra firme ao espaço — e enfrenta o **Núcleo Ancestral**, a **Tempestade Rubra** e o **Eclipse**.

Todo o visual e o som são gerados por código, sem arquivos de imagem ou áudio externos:

- **Sprites** desenhados como pixel art em texto (`src/gfx/sprites.ts`) e convertidos em texturas na inicialização.
- **Tiles e cenários** com parallax gerados proceduralmente para cada um dos 15 temas.
- **Efeitos sonoros e trilha sonora** sintetizados em tempo real com a **Web Audio API** (uma música por tema, mais chefes, vila, mapa e créditos).
- **Ícones do app** desenhados por um script (`scripts/generate-icons.mjs`).

## Novidades do Pixel Runner 3

- 🚀 **Mundo 3 — Fronteira Estelar**: 5 fases espaciais com **gravidade baixa**, **inversores de gravidade** (andar no teto!), **portais**, **asteroides em movimento**, **lasers temporizados** (com aviso antes de ligar) e o drone patrulheiro.
- 🌑 **Chefe final, o Eclipse**, com **4 fases de ataque** — bombardeio estelar, varredura de lasers, inversão da gravidade da arena e fúria com teleportes — e uma **cena de final** com créditos.
- 📖 **Modo história**: cenas curtas entre os mundos com **caixas de diálogo** (retrato, nome e texto letra por letra) e a **Vila das Estrelas**, um hub com portais para os 3 mundos, loja, quadro de missões e **4 NPCs originais**: Vovó Bolt, Lumi, Capitão Brisa e Dra. Órbita.
- 📜 **Missões** principais e secundárias dadas pelos NPCs: **coletar itens** espalhados pelas fases, **vencer uma fase sem levar dano** e **terminar abaixo de um tempo**. Recompensas em **moedas** e **4 skins exclusivas**.
- ♾️ **Modo Infinito** (roguelike): salas montadas a partir de **blocos prontos**, **dificuldade crescente**, escolha de **power-up temporário** entre as salas (escudo, ímã, super pulo, turbo, vida extra e câmera lenta) e **seed compartilhável** — digite a seed de um amigo para jogar exatamente as mesmas salas.
- 📅 **Desafio diário**: uma fase gerada a partir da data — **igual para todo mundo** no mesmo dia — com **placar local do dia** e histórico dos dias anteriores.
- ⏱️ **Speedrun**: cronômetro com centésimos **por fase e geral**, categorias por fase, por mundo e jogo completo, **splits** com a diferença para o recorde, soma dos melhores trechos e um **fantasma** que grava os seus comandos e reproduz a melhor corrida ao seu lado.
- ♿ **Acessibilidade**: **modo daltônico** (protanopia, deuteranopia e tritanopia), **desligar tremida de câmera e flashes**, **velocidade do jogo 75%/100%**, **remapear teclas e botões do controle** e **texto grande**.
- 🌐 **Português e inglês**, com troca no menu principal — todos os textos, inclusive diálogos, missões, conquistas e nomes das fases.
- 📱 **PWA**: instalável no celular e no computador e **jogável offline** depois da primeira visita (service worker e manifest próprios).
- ✅ **207 testes** cobrindo geração procedural (a mesma seed gera sempre a mesma fase e toda fase gerada é possível de terminar), missões, gravação e reprodução do fantasma, migração de save e traduções faltando.
- 💾 **Saves das partes 1 e 2 continuam funcionando**: o save é versionado e migrado automaticamente (quem zerou a parte 2 já encontra o Mundo 3 liberado).

## Novidades do Pixel Runner 2

- 🌍 **Mundo 2 — Arquipélago Celeste**: 5 fases com **gelo escorregadio**, **molas**, **plataformas que caem**, **vento** (empurrões e correntes de ar) e **água com nado**, além do peixe-espinho e do inimigo blindado.
- ⛈️ **Chefe Tempestade Rubra**, com **3 fases de ataque**: chuva de gelo e rasantes, explosões radiais e mergulhos com onda de choque.
- 🧗 **Habilidades desbloqueáveis** com tutorial: **escalar paredes**, **planar** e **investida** (quebra blocos rachados e derrota blindados).
- 👥 **2 jogadores no mesmo teclado**: **cooperativo** (vidas compartilhadas) e **corrida**, com **câmera que acompanha os dois** e dá zoom.
- 🛠️ **Editor de fases**: grade de tiles, inimigos, moedas e checkpoints; **3 slots**; **exportar/importar JSON**; **teste instantâneo**.
- 🛍️ **Loja**: troque as moedas por **skins de cores** do Pix e **rastros de partícula**.
- 🏆 **Conquistas**, **estatísticas do jogador** e **tela de créditos**.
- 🗺️ **Mapa de seleção de mundos**, **trilha sonora por mundo** e **volume** separado (geral, música e efeitos).
- 🎮 **Gamepad** no jogo e em todos os menus.

## Modos de jogo

| Modo | Como acessar | O que é |
| --- | --- | --- |
| **História** | Menu → *Novo jogo* / *Continuar* | Campanha de 15 fases a partir da Vila das Estrelas, com cenas, NPCs e missões. Também dá para escolher fases liberadas no mapa dos mundos. |
| **Infinito** | Menu → *Modos de jogo* | Salas geradas sem fim, cada vez mais difíceis, com power-ups entre elas. Seed aleatória ou digitada; placar das melhores corridas. |
| **Desafio diário** | Menu → *Modos de jogo* | A fase do dia (seed baseada na data, em UTC), a mesma para todos. Placar local do dia com o seu nome. |
| **Speedrun** | Menu → *Modos de jogo* | Corridas cronometradas por fase, por mundo ou do jogo completo, com splits, recordes e fantasma (tecla `G` liga/desliga). Vidas infinitas. |
| **2 jogadores** | Menu → *Modos de jogo* | Cooperativo ou corrida no mesmo teclado (ou com dois gamepads). |
| **Editor de fases** | Menu → *Modos de jogo* | Crie, teste, salve e exporte suas próprias fases. |

## Recursos

- Correr, pular (altura variável, *coyote time* e *buffer* de pulo), **pulo duplo**, **dash** e as 3 habilidades
- 15 fases: Campos Verdes, Caverna de Cristal, Fábrica Enferrujada, Picos Gelados, Fortaleza do Núcleo, Lago Congelado, Recife Submerso, Ruínas Desmoronando, Penhasco dos Ventos, Olho da Tempestade, Base Lunar, Estação Orbital, Nebulosa Invertida, Cinturão de Asteroides e Cidadela do Eclipse
- 7 tipos de inimigo: gosma, saltador, morcego, torreta, peixe-espinho, gosma blindada e drone
- 3 chefes com padrões de ataque diferentes, várias fases de ataque e música própria
- Moedas (vida extra a cada 50), checkpoints, plataformas móveis, espinhos, combos e bônus de tempo
- 27 conquistas, 11 missões, 12 skins (4 exclusivas de missões) e 7 rastros
- Tudo **salvo no `localStorage`** com save versionado e migração automática
- Partículas, rastros, tremida de câmera e transições (com opção de desligar)
- **Teclado**, **botões na tela** (celular/tablet) e **gamepad**, com controles remapeáveis

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

\* Habilidades conquistadas no Mundo 2. As teclas e os botões do gamepad podem ser trocados em **Opções → Acessibilidade → Remapear controles**.

### Vila e diálogos

| Ação | Teclado | Toque | Gamepad |
| --- | --- | --- | --- |
| Falar com NPC / entrar no portal | `↓`, `S`, `E` ou `Enter` | Botão **!** (ou tocar no aviso) | **X** |
| Avançar o diálogo | `Enter`, `Espaço` ou `Z` | Tocar na tela | **A** |
| Ver missões / abrir a loja | Interagir com o quadro de missões / a loja da vila | Idem | Idem |
| Voltar ao menu | `Esc` | Botão **Menu** (canto superior direito) | **Start** |

A primeira tecla completa a frase que está sendo digitada; a seguinte passa para a próxima.

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

## Instalar como app (PWA)

- **Android / Chrome / Edge**: abra o site e use **Opções → Instalar no dispositivo** (ou o botão de instalar do navegador).
- **iPhone / iPad**: no Safari, toque em **Compartilhar → Adicionar à Tela de Início**.

Depois da primeira visita o jogo inteiro fica guardado no aparelho e funciona **sem internet**. Quando há uma versão nova, ela é baixada na próxima vez que o jogo é aberto com conexão.

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
| `npm run build` | Checagem de tipos + build de produção em `dist/` (com o service worker) |
| `npm run preview` | Serve o build de produção localmente (dá para testar o modo offline) |

## Estrutura do código

```
src/
├── main.ts               # Configuração do Phaser, idioma, acessibilidade, gamepad e service worker
├── scenes/               # Boot, Menu, Hub (vila), Cutscene, MissionLog, WorldMap, Level (Fase), HUD,
│                         # Pause, Tutorial, GameOver, Ending, Modes, Infinite, PowerUp, Daily, Speedrun,
│                         # TwoPlayer, Editor, Shop, Achievements, Options, Accessibility, Remap, Credits, Toast
├── levels/               # As 15 fases em arquivos de dados + blocos do modo Infinito (chunks.ts)
├── logic/                # Lógica pura, sem Phaser (testada com Vitest)
│   ├── score.ts          #   pontuação, vidas, combos, bônus e formatação de tempo
│   ├── progress.ts       #   desbloqueio e sequência de fases
│   ├── save.ts           #   save versionado, validação e migração
│   ├── levelParser.ts    #   conversão do mapa ASCII em dados
│   ├── procgen.ts        #   seeds, geração de salas e verificador de "fase possível"
│   ├── powerups.ts       #   power-ups e placar do modo Infinito
│   ├── daily.ts          #   desafio diário e placar do dia
│   ├── speedrun.ts       #   categorias, splits e recordes
│   ├── ghost.ts          #   gravação e reprodução do fantasma
│   ├── missions.ts       #   missões, itens e recompensas
│   ├── accessibility.ts  #   filtros de daltonismo, controles remapeados e opções
│   ├── laser.ts          #   ciclo dos lasers temporizados
│   ├── abilities.ts, editor.ts, shop.ts, stats.ts, achievements.ts, audioSettings.ts
├── story/                # NPCs, cenas e falas do modo história
├── i18n/                 # Dicionários pt/en e traduções dos dados do jogo
├── objects/              # Player, inimigos, 3 chefes, perigos espaciais, molas e plataformas
├── gfx/                  # Paleta, sprites em pixel art, skins e geração de texturas
├── audio/                # Efeitos e músicas com Web Audio (barramentos de volume separados)
├── input/                # Teclado por jogador (remapeável), toque e gamepad
├── systems/              # Save no localStorage, fantasmas, acessibilidade global e instalação do PWA
└── ui/                   # Texto pixelado, menus navegáveis, caixa de diálogo e botões de toque
build/serviceWorker.ts    # Plugin do Vite que gera o service worker no build
scripts/generate-icons.mjs# Gera os ícones PNG do app
public/                   # Manifest do PWA e ícones
tests/                    # 207 testes do Vitest
```

### Formato das fases

Cada fase é um arquivo em `src/levels/` com um mapa ASCII de 17 linhas (o mesmo formato usado pelo editor, pelo JSON exportado e pelos blocos do modo Infinito):

| Caractere | Significado |
| --- | --- |
| `#` | Chão (o topo é escolhido automaticamente) |
| `X` / `I` / `Q` | Bloco sólido / gelo escorregadio / bloco rachado |
| `-` / `F` | Plataforma atravessável / plataforma que cai |
| `^` / `S` / `V` | Espinhos / mola / inversor de gravidade |
| `o` | Moeda (algumas viram itens de missão quando a missão está ativa) |
| `P` / `G` / `K` | Início / chegada / checkpoint |
| `w` `h` `b` `t` `f` `a` `d` | Gosma, saltador, morcego, torreta, peixe, blindado, drone |
| `A` | Orbe de habilidade |
| `B` / `\|` | Chefe / portão da arena |

Gravidade, água, vento, plataformas móveis, portais, asteroides, lasers e dicas ficam em listas separadas no mesmo arquivo. Os testes verificam que todas as fases são válidas.

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

O planejamento está em [PLANO_V2.md](PLANO_V2.md) e [PLANO_V3.md](PLANO_V3.md), e as decisões de design em [DECISOES.md](DECISOES.md).

## Créditos

- Código, design de fases, história, pixel art, música e sons: **Arthur Souza Soares**
- Fonte [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (SIL Open Font License), empacotada via `@fontsource`
- Feito com [Phaser 3](https://phaser.io), [TypeScript](https://www.typescriptlang.org), [Vite](https://vite.dev) e [Vitest](https://vitest.dev)

Licença MIT.
