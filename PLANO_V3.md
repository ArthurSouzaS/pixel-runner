# Plano — Pixel Runner 3

Checklist da versão 3. Ao fim de cada fase: testes, build, correções, atualização deste plano, commit e push na `main`.
Regra geral: nada das partes 1 e 2 pode quebrar, e saves antigos continuam funcionando (com migração quando o formato mudar).
Decisões tomadas sem consulta ficam em [DECISOES.md](DECISOES.md) (a partir da decisão 36).

## Fase 1 — Mundo 3 (espacial)
- [x] 5 fases novas (11 a 15)
- [x] Baixa gravidade
- [x] Inversão de gravidade
- [x] Portais de teletransporte
- [x] Asteroides em movimento
- [x] Lasers temporizados
- [x] Chefe final com 4 fases de ataque
- [x] Cena de final
- [x] Migração de save (quem zerou a v2 libera o Mundo 3)

## Fase 2 — Modo história
- [x] Caixa de diálogo com retrato e texto digitado
- [x] NPCs originais
- [x] Cenas curtas entre os mundos
- [x] Vila central (hub) ligando os 3 mundos

## Fase 3 — Missões
- [x] Missões principais e secundárias dadas pelos NPCs
- [x] Objetivos: coletar itens, vencer fase sem dano, terminar abaixo de um tempo
- [x] Recompensas em moedas e skins exclusivas
- [x] Diário de missões

## Fase 4 — Modo Infinito (roguelike)
- [x] Blocos de fase prontos
- [x] Gerador procedural com seed
- [x] Dificuldade crescente
- [x] Power-ups temporários entre as salas
- [x] Seed compartilhável

## Fase 5 — Desafio diário
- [x] Fase gerada com a seed do dia (igual para todos)
- [x] Placar local do dia

## Fase 6 — Speedrun
- [ ] Cronômetro por fase e geral
- [ ] Splits
- [ ] Fantasma da melhor corrida (gravar e reproduzir comandos)

## Fase 7 — Acessibilidade
- [ ] Modo daltônico
- [ ] Desligar tremida de câmera e flashes
- [ ] Velocidade do jogo (75%/100%)
- [ ] Remapear teclas e controles
- [ ] Tamanho do texto

## Fase 8 — Idiomas
- [ ] Português e inglês em todos os textos (inclusive diálogos)
- [ ] Troca de idioma no menu

## Fase 9 — PWA
- [ ] Manifest e ícones originais
- [ ] Service worker: instalável e jogável offline

## Fase 10 — Testes e revisão
- [ ] Testes: geração procedural (determinismo e fases possíveis), missões, fantasma, migração de save, traduções faltando
- [ ] Revisão do código: bugs e desempenho (60 FPS no celular)

## Fase 11 — Documentação
- [ ] README com as novidades das partes 2 e 3, controles, modos de jogo e link do site
