# Controle Logística V12 — fluxo operacional completo

## Importação e localização real

- Leitura integral da aba `Relatorio de Compras` para compras com Status Compra `TRANSITO` ou `OPERACOES`.
- Mapeamento item a item das colunas Status Kanban, Status Lote, Status Qualidade, Fase Inspeção, Status PCP, Costureiro e Status Logística.
- Separação entre material no fornecedor, em trânsito, na Qualidade, PCP para configurar, aguardando Costura, em Costura, retornado da Costura, em Processamento e em Estocagem.
- Uma compra pode apresentar itens em etapas diferentes sem gerar Cards duplicados.
- O Card importado permanece no Recebimento e mostra a fotografia da posição real por produto, cor e tamanho.
- Mantida a regra `Private Label = Grade` e `Saldo = Saldo`.

## Recebimento e Qualidade

- Preservada a tiragem de 10% junto da triagem inicial no primeiro Recebimento.
- Preservada a nova tiragem obrigatória de 10% para material retornado da Costura CD01.
- Preservada a Inspeção 2 direta para mercadoria que não segue à Costura.
- Atribuição da Qualidade simplificada com o botão `Assumir agora` por linha disponível.
- Preenchimento simplificado com `Tudo aprovado`, mantendo os campos completos para rejeição, retrabalho, observação e evidências.
- Mantidos controles de Desenvolvimento, transferência, devolução, timers e validações de fechamento.

## Etiquetagem e Estocagem

- Novos setores com filas compactas de materiais.
- Grade: o colaborador assume exatamente um tamanho completo por vez; tamanhos já assumidos ficam bloqueados.
- Saldo: o colaborador assume uma quantidade do saldo geral disponível, sem divisão obrigatória por tamanho.
- Registro de quantidade concluída, colaborador, início, pausa, retomada, finalização e tempo de execução.
- Etiquetagem concluída encaminha para Estocagem; Estocagem concluída finaliza o Card.
- Novos acessos de teste: `etiquetagem1`, `etiquetagem2`, `estocagem1` e `estocagem2`, todos com senha `1234`.

## Interface

- Cards grandes substituídos por filas tabulares compactas nos setores produtivos.
- Busca e filtros rápidos para localizar compra, marca, produto, cor e tamanho.
- Resumo fixo de quantidades prevista, assumida, concluída e disponível.
- Localização importada agrupada em filtros visuais por etapa, com rolagem interna para evitar páginas excessivamente longas.

## Validações realizadas

- Sintaxe Python e JavaScript.
- Importação real das 16.860 linhas do relatório fornecido: 8.992 linhas operacionais, 114 Cards e zero erros.
- Conferência da compra 290 com itens simultaneamente em Costura, retorno da Costura, Qualidade, Processamento e concluídos.
- Conferência dos costureiros Michael, Rose e Rosemari por item.
- Assunção de tamanho Grade, bloqueio de quantidade, timer e conclusão parcial.
- Assunção por quantidade geral para Saldo.
- Verificação visual das telas de Recebimento e Etiquetagem no navegador.
