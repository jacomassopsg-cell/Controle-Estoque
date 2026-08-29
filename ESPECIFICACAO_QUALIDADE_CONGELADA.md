# ESPECIFICAÇÃO CONGELADA — QUALIDADE V5

Este arquivo registra as regras aprovadas da Qualidade. As próximas áreas devem ser adicionadas sem remover ou alterar estas regras, salvo solicitação expressa do usuário.

## 1. Entrada na Qualidade

### Mercadoria nova

O Card entra somente depois do recebimento físico e da separação dos 10% concluídos. A Qualidade poderá escolher:

- **Inspeção 1**, quando a mercadoria precisar seguir para Costura;
- **Inspeção 2**, quando a mercadoria não precisar de Costura e puder seguir diretamente para Processamento.

Nos dois casos, a base será a quantidade efetivamente separada nos 10% pelo Recebimento.

### Retorno da Costura CD01

O Recebimento conclui o retorno físico e separa uma nova amostra de 10%. A Inspeção 2 é obrigatória e utiliza essa amostra já separada.

## 2. Tipo da compra

O tipo não é escolhido manualmente pela Qualidade. Ele é importado da coluna `Tipo` do relatório:

- `Private Label` → **Grade**: controle por item e quantidade;
- `Saldo` → **Saldo**: controle por quantidade geral.

A classificação fica gravada no Card desde a importação e é utilizada pela Qualidade e pelos setores seguintes.

## 3. Amostra de compras Grade

- O sistema distribui automaticamente a quantidade total da amostra entre os itens distintos.
- Cada item recebe pelo menos uma peça.
- Quando os 10% forem menores que o número de itens, a amostra obrigatória é aumentada para cobrir todos os itens.
- As sobras da divisão são distribuídas automaticamente para fechar o total.
- A distribuição não pode ultrapassar a quantidade prevista do item.
- A conclusão exige fechamento individual de todos os itens da amostra.

## 4. Amostra de compras Saldo

- A amostra é controlada como uma quantidade geral.
- Não há obrigação de distribuir por SKU, cor ou tamanho.
- Os inspetores podem dividir a quantidade geral entre si.
- A soma das quantidades inspecionadas deve fechar a amostra geral.

## 5. Inspeção 1

- Usa a quantidade efetivamente separada nos 10% pelo Recebimento.
- Grade: composição automática por item.
- Saldo: quantidade geral.
- Exige destino CD01 ou CD02.
- Ao concluir, retorna ao Recebimento para despacho.

## 6. Inspeção 2

A Inspeção 2 pode ocorrer em dois momentos:

### Diretamente após o primeiro Recebimento

- utilizada quando a mercadoria não precisa ir para Costura;
- usa a amostra dos 10% já separada pelo Recebimento;
- não exige destino CD01 ou CD02;
- ao concluir, segue diretamente para `Processamento — Aguardando Processamento`.

### Após o retorno da Costura CD01

- é obrigatória;
- o Recebimento separa a nova amostra;
- os 10% são calculados sobre a quantidade efetivamente recebida no retorno;
- Grade: distribuição automática com pelo menos uma peça de cada item;
- Saldo: quantidade geral;
- ao concluir, segue para `Processamento — Aguardando Processamento`.

## 7. Distribuição e autoatribuição rápida

Os dois modelos continuam permitidos:

- supervisor distribui;
- inspetor assume para si.

A tela deve permitir operação em lote:

- todos os itens em uma única grade;
- checkbox por linha;
- quantidade preenchida diretamente na linha;
- preenchimento rápido do saldo disponível;
- seleção de várias linhas;
- confirmação única;
- pesquisa por produto, SKU, referência, cor e tamanho;
- supervisor escolhe o inspetor uma única vez por lote.

Cada reserva mantém item e quantidade, impedindo duplicidade.

## 8. Vários inspetores e tempo

- Mais de um inspetor pode atuar no mesmo Card.
- Cada inspetor possui Iniciar, Pausar, Retomar e Finalizar.
- Cada um mantém tempo útil, parado, permanência e produção próprios.
- Calendário: segunda a quinta 08:00–18:00; sexta 08:00–17:00; fins de semana fechados.

## 9. Resultado

Por atribuição:

- quantidade inspecionada;
- aprovada calculada;
- rejeitada;
- retrabalho.

`Aprovada = Inspecionada − Rejeitada − Retrabalho`

Rejeição e retrabalho exigem motivo, observação e evidência.

## 10. Desenvolvimento

- pergunta se é necessário separar peças;
- se Sim, pergunta se já foram separadas;
- pendência gera aviso não bloqueante;
- a inspeção pode ser concluída após confirmação;
- a pendência permanece no Card e no histórico.

## 11. Conclusão

A conclusão exige:

- amostra fechada;
- toda a quantidade atribuída;
- toda a quantidade inspecionada;
- todos os inspetores finalizados;
- resultados e evidências válidos;
- nenhuma duplicidade.

Na Grade, a validação ocorre por item e no total. No Saldo, ocorre pela quantidade geral.
