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
