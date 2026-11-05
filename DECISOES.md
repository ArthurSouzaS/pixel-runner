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
| 17 | 4 | O editor usa o mesmo formato ASCII das fases oficiais (17 linhas, largura de 30 a 200) e oferece terreno, gelo, blocos rachados, espinhos, moedas, checkpoints, molas, plataformas que caem, 5 inimigos, início e chegada. Chefes, água, vento e plataformas móveis ficam de fora. | Mantém o editor simples e as fases criadas sempre válidas para o parser. |
| 18 | 4 | 3 slots de fases no `localStorage` (chave `pixel-runner:editor`, separada do save principal). | Evita que fases grandes inflem o save e permite apagar uma coisa sem a outra. |
| 19 | 4 | Exportar gera um arquivo `.json` para download e também copia o JSON para a área de transferência; importar abre o seletor de arquivos. O JSON tem `format: "pixel-runner-level"` e `version`. | Funciona em computador e celular e permite evoluir o formato. |
| 20 | 4 | Fases do editor são jogadas com 3 vidas, não contam para recorde nem desbloqueios e voltam ao editor ao terminar. O nome é editado com `prompt()` do navegador. | Teste rápido sem afetar o progresso; `prompt()` funciona também no celular. |
| 21 | 5 | As moedas coletadas vão para a carteira ao terminar a fase, perder todas as vidas, reiniciar ou sair; fases do editor não pagam. | Grava o save poucas vezes e evita "fazendas" de moedas em fases criadas. |
| 22 | 5 | 8 skins (trocas de cor do capacete e do cachecol do Pix) e 7 rastros de partícula, de 120 a 500 moedas; comprar já equipa o item. | Preços pensados para ~430 moedas por campanha completa; tudo continua sendo o personagem original. |
| 23 | 5 | Skins e rastros valem para o jogador 1; o jogador 2 mantém a cor própria. | Garante que os dois jogadores sejam sempre distinguíveis. |
| 24 | 6 | 23 conquistas baseadas em estatísticas acumuladas (moedas, inimigos, combos, chefes, habilidades, modos, editor e loja). Conquistas novas aparecem num aviso no canto da tela, numa cena sempre ativa. | Cobre todos os recursos da v2 e incentiva explorar cada um. |
| 25 | 6 | Estatísticas ficam em memória e são gravadas ao morrer, pausar, terminar/sair da fase, a cada 15 s e quando a aba é escondida. | Evita gravar no `localStorage` a cada pulo. |
| 26 | 6 | O menu principal foi reorganizado (Novo jogo/Continuar, 2 jogadores, Editor, Loja, Conquistas, Controles, Som e Créditos); conquistas e estatísticas dividem uma tela com abas. | Mantém o menu legível com tantos recursos novos. |
