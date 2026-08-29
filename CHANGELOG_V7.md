# Changelog — V7 Operação Compacta

Base: `CONTROLE_LOGISTICA_RECEBIMENTO_QUALIDADE_PROCESSAMENTO_V6` fornecido pelo usuário.

## Fluxos acrescentados

- Mercadoria nova: tiragem dos 10% e triagem inicial passam a ser uma única atividade operacional no Recebimento.
- A atividade conjunta mantém Iniciar, Pausar, Retomar, Concluir e todos os tempos já existentes.
- Retorno CD01: o Recebimento registra o retorno e separa uma nova amostra obrigatória de 10%.
- O percentual do retorno é recalculado sobre a quantidade efetivamente retornada.
- Grade mantém o mínimo de uma peça por item distinto, quando superior aos 10%.
- O Card só segue à Qualidade depois que conferência física e nova tiragem terminarem.
- A Inspeção 2 usa a amostra do retorno já separada pelo Recebimento.
- Migração automática habilita a nova regra em retornos abertos de bancos anteriores.

## Experiência operacional

- Processamento ganhou uma fila compacta de materiais em tabela.
- Pesquisa instantânea por compra, fornecedor, marca, produto, referência, SKU e Casulo.
- Filtros independentes de Tipo, Status e Marca.
- Seleção de linha com destaque visual e barra fixa de ação.
- Abertura por botão, duplo clique ou tecla Enter.
- Cabeçalho fixo para listas extensas.
- Seleção é limpa automaticamente quando um filtro oculta o material escolhido.
- Modal, resumos, formulários, colaboradores e atribuições ficaram mais compactos.
- Correção do arquivo Excel permanecer bloqueado no Windows após a importação.

## Validações

- Sintaxe Python e JavaScript.
- Inicialização e migração do banco existente.
- Login e carregamento do Dashboard.
- Fila do Processamento com dados reais do relatório de teste.
- Pesquisa, filtros, seleção e barra de ação.
- Tela do retorno CD01 com nova tiragem de 10%.
- Console do navegador sem erros.
