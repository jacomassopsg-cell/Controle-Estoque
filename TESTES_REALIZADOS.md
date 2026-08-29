# TESTES REALIZADOS — V7

## V7 — operação compacta e novas tiragens

- Sintaxe de `app.py`, `quality_module.py`, `processing_module.py` e `static/app.js`.
- Inicialização e migração incremental sobre o banco V6.
- Importação real do relatório com 15.008 linhas sem manter o Excel bloqueado no Windows.
- Fila compacta do Processamento com Grade e Saldo.
- Pesquisa, filtros de Tipo/Status/Marca, seleção, limpeza e atalhos de abertura.
- Retorno CD01 com quantidade efetivamente retornada, nova tiragem de 10% e cronômetro.
- Grade retornada com amostra mínima elevada para cobrir os 33 itens distintos.
- Encaminhamento à Qualidade somente após retorno físico e tiragem concluídos.
- Criação da Inspeção 2 usando a amostra do Recebimento, meta 33 e modo Grade.
- Validação visual em navegador e console sem erros.

## Testes preservados do V6

Execução automatizada com o relatório real `relatorio_20260722_012442.xlsx`.

## Importação e tipo

- 15.008 linhas lidas;
- 38 linhas com Status Kanban em trânsito;
- 2 Cards criados;
- Compra 341 classificada como Grade a partir de `Private Label`;
- Compra 336 classificada como Saldo.

## Regressão do Recebimento

- recebimento físico concluído antes dos 10%;
- Card permaneceu no Recebimento com pendência dos 10%;
- após concluir os 10%, Card seguiu à Qualidade;
- despacho CD01 permaneceu na aba Recebimento com status `Em Costura`.

## Regressão da Qualidade

- criação de Inspeção 1 sem enviar tipo manualmente;
- Qualidade utilizou automaticamente o tipo Grade importado.

## Ajuste da Inspeção 2 sem Costura

- mercadoria nova enviada à Qualidade após recebimento físico e separação dos 10%;
- criação da Inspeção 2 diretamente após o primeiro Recebimento;
- utilização da amostra dos 10% já separada pelo Recebimento;
- atribuição integral da amostra, apontamento dos resultados e finalização do inspetor;
- conclusão da Inspeção 2 e envio ao Processamento sem despacho para Costura;
- preservação do tipo de entrada `NOVA` no Card;
- retorno CD01 continuou exigindo Inspeção 2;
- no retorno, a Qualidade calculou nova amostra de 10% sobre a quantidade retornada;
- tentativa de Inspeção 1 após retorno continuou bloqueada.

## Processamento

- configuração de compra Saldo;
- quantidade geral processada;
- produção individual;
- cronômetro iniciar/finalizar;
- conclusão e envio à Triagem;
- configuração de compra Grade;
- 33 itens carregados;
- opção de quantidade final na Estocagem;
- Etiquetagem Branca;
- conclusão e envio à Etiquetagem;
- métricas do Processamento no Dashboard.

## Validações técnicas

- `python -m py_compile app.py quality_module.py processing_module.py`;
- `node --check static/app.js`;
- inicialização FastAPI;
- chamadas reais aos endpoints por TestClient.
