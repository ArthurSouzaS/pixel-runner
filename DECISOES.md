# Decisões — Pixel Runner 2

Registro das decisões tomadas durante o desenvolvimento da v2 sem consulta prévia.

| # | Fase | Decisão | Motivo |
| --- | --- | --- | --- |
| 1 | 1 | O Mundo 2 continua a sequência do Mundo 1 (fases 6 a 10) com desbloqueio linear e o mesmo save. Após a fase 5 aparece "Mundo concluído" e o jogo segue; a vitória final passa a ser após a fase 10. | Mantém compatibilidade com o save da v1 e evita duas progressões paralelas. |
| 2 | 1 | Água e vento são regiões retangulares nos dados da fase (`water`, `winds`), não caracteres do mapa. | Assim moedas, inimigos e checkpoints podem ficar dentro da água ou do vento. |
| 3 | 1 | Vento horizontal soma à velocidade-alvo do jogador; corrente de ar vertical é uma aceleração (negativa = para cima). | Dá controle previsível e permite "elevadores" de ar sobre abismos. |
| 4 | 1 | Na água a gravidade cai para 32%, a queda é limitada e cada pulo vira uma braçada (ilimitada); pulo duplo e dash são recarregados. | Nado simples de entender, sem medidor de ar. |
| 5 | 1 | Chefe do Mundo 2, "Tempestade Rubra": 12 de vida e 3 fases de ataque (12–9, 8–5, 4–1), dano só por pisão. | Mesma regra do primeiro chefe; as fases mudam o padrão em vez de exigir outra mecânica. |
| 6 | 1 | Peixe-espinho adicionado como inimigo aquático. | Torna as seções de nado desafiadoras. |
| 7 | 2 | As habilidades são conquistadas por orbes nas fases 6 (escalar), 7 (planar) e 8 (investida) e ficam salvas para sempre; o orbe não reaparece depois de coletado. | Progressão clara e coerente com o desbloqueio linear. |
| 8 | 2 | Escalar: no ar, segurar a direção de uma parede (tile sólido) faz o Pix subir; pular na parede dá impulso para o lado oposto. Paredes do limite do mundo não contam. | Usa só os controles existentes, sem tecla nova. |
| 9 | 2 | Planar: segurar o pulo enquanto cai limita a queda; correntes de ar sobem 60% mais forte planando. | Combina com as zonas de vento do Mundo 2. |
| 10 | 2 | Investida: nova tecla `C`/`L` (botão C no toque). Segura ~0,35 s para carregar e solta; quebra blocos rachados (`Q`), derrota o novo inimigo blindado (`a`) e também fere os chefes. | Dá um papel único à habilidade e cria obstáculos que só ela resolve. |
| 11 | 2 | O inimigo blindado ignora pisões e dash (ricocheteia o jogador); encostar de lado machuca. | Exige o uso da investida. |
| 12 | 3 | Teclas no modo 2 jogadores: P1 = `A`/`D` mover, `W` pular, `S` dash, `E` investida; P2 = setas, `↑` pular, `↓` dash, `Enter` investida. `Esc`/`P` pausam. | Divide o teclado em lados esquerdo e direito sem conflito, inclusive em teclados ABNT. |
| 13 | 3 | A câmera mira o ponto médio entre os jogadores e dá zoom até 0,6×; se a distância passar disso, quem está atrás é teletransportado para perto do outro (na corrida, fica 0,9 s parado como penalidade). | Mantém os dois sempre visíveis numa tela só. |
| 14 | 3 | Cooperativo: vidas e pontos compartilhados, renascimento ao lado do parceiro e progresso/recorde salvos. Corrida: vidas infinitas, checkpoint individual, não altera recorde nem desbloqueios. | O cooperativo é uma forma de jogar a campanha; a corrida é um modo de disputa. |
| 15 | 3 | O jogador 2 usa uma variação de cores do Pix (capacete azul, cachecol amarelo). | Distinguir os jogadores sem criar outro personagem. |
| 16 | 3 | Os controles de toque comandam apenas o jogador 1. | O modo 2 jogadores foi pedido para o mesmo teclado. |
