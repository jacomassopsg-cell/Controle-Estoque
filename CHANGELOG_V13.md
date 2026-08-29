# Controle Logística V13 — distribuição por setor

- Cards integralmente localizados na Qualidade passam a ter setor atual Qualidade.
- Cards integralmente localizados no Processamento passam a ter setor atual Processamento.
- Cards integralmente localizados em Estocagem passam a ter setor atual Estocagem.
- Compras mistas aparecem em todas as filas relacionadas, mantendo um único Card.
- Ao abrir uma compra mista pela fila de um setor, são mostrados somente os itens daquela etapa.
- Cards de destino CD2/CD02 sem itens em trânsito para Recebimento são removidos durante a importação.
- Cards CD2/CD02 que ainda possuem itens em trânsito permanecem no Recebimento.
- Teste com o relatório fornecido: 62 Cards visíveis na Qualidade, 2 no Processamento, 1 na Estocagem e 44 Cards CD2 removidos.
- Reimportação do mesmo relatório validada sem erros ou duplicação do Card único.
