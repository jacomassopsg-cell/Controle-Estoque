# Controle Logística V15 — revisão integral

## Correções da revisão

- O Dashboard agora usa a mesma regra das filas e contabiliza corretamente os Cards visíveis na Qualidade, Processamento e Estocagem.
- O Recebimento permanece como painel-mãe de todos os Cards importados, inclusive quando o andamento local já está em outro setor.
- Uma reimportação atualiza a posição informada pelo relatório sem sobrescrever o fluxo local já iniciado ou finalizado.
- Cards CD2/CD02 fora do Recebimento podem ser removidos mesmo quando possuem registros antigos de Etiquetagem ou Estocagem.
- A criação de Etiquetagem e Estocagem foi bloqueada quando o Card não está realmente no setor solicitado.
- Apenas colaboradores do setor podem receber atribuições; supervisor e administrador continuam podendo distribuir e acompanhar.
- Operadores de Etiquetagem e Estocagem não podem alterar quantidades ou cronômetros de outro operador.
- Para Grade, a quantidade assumida por tamanho utiliza a quantidade efetivamente processada quando ela estiver disponível.
- A conclusão de Etiquetagem e Estocagem exige quantidade integral e todos os cronômetros finalizados.
- Incluído indicador de Estocagem no Dashboard e atualizada a descrição dos módulos.

## Testes executados

- Sintaxe Python dos quatro módulos e sintaxe JavaScript.
- Importação de 16.860 linhas, com 8.992 linhas operacionais e zero erros.
- Reimportação sem duplicação de Cards e sem regressão do setor operacional local.
- Recebimento físico, tiragem de 10% junto da triagem inicial e encaminhamento à Qualidade.
- Inspeção 2 direta, amostra automática Grade com 56 linhas e 152 peças, atribuição, timer, aprovação total e conclusão.
- Processamento Grade com 6 tamanhos e 32 peças.
- Etiquetagem Grade por tamanho, bloqueio de alteração entre operadores e fechamento de 32 peças.
- Estocagem Grade por tamanho e finalização do Card.
- Processamento e Estocagem de Saldo com 8.069 peças por quantidade geral e `item_id` vazio.
- Exclusão CD02 validada mesmo com operação antiga de Estocagem vinculada.
- Dashboard validado visualmente com 70 Cards no Recebimento, 62 na Qualidade, 2 no Processamento e 1 na Estocagem.
