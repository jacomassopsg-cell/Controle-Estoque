# ESPECIFICAÇÃO CONGELADA — RECEBIMENTO V1

Este arquivo é a referência funcional obrigatória para as próximas versões. Novos módulos devem ser adicionados sem alterar estas regras, salvo solicitação expressa do usuário.

## 1. Importação

- Seguir exclusivamente o campo `Status Kanban`.
- Importar apenas `1.3 Compras - Em Trânsito`.
- Não existe aba ou setor Em Trânsito.
- Agrupar pelo `ID Compra`.
- Criar um único Card por compra.
- O Card entra diretamente em `Recebimento — Aguardando recebimento`.

## 2. Mercadoria nova

- Recebimento geral não possui cronômetro.
- Marca é somente consulta e não é responsabilidade do Recebimento.
- O operador informa volumes, quantidade recebida, danos, fotos e observações.
- O operador pode concluir o recebimento físico antes ou depois da separação dos 10%.
- A tiragem dos 10% e a triagem inicial são uma única atividade, com cronômetro próprio e ações Iniciar, Pausar, Retomar e Concluir.
- Enquanto apenas o recebimento físico estiver concluído, o Card permanece no Recebimento com pendência dos 10%.
- Enquanto apenas os 10% estiverem concluídos, o Card permanece no Recebimento com pendência do recebimento físico.
- O Card só é encaminhado à Qualidade quando as duas partes estiverem concluídas.

## 3. Casulo

- Indica a localização física atual da mercadoria.
- Pode ser alterado quantas vezes for necessário.
- Só pode ser alterado quando o Card estiver no Recebimento.
- Só pode ser alterado pelo perfil Operador de Recebimento.
- Deve registrar Casulo anterior, novo Casulo, operador, data, hora e observação.
- Permanece visível para consulta fora do Recebimento.

## 4. Retorno da Qualidade após Inspeção 1

- A Qualidade escolhe CD01 ou CD02.
- Depois da Inspeção 1, o Card retorna ao Recebimento.
- Status: `Aguardando despacho para Costura`.
- O Recebimento não pode alterar o destino definido pela Qualidade.

## 5. Despacho para Costura

O operador de Recebimento informa:

- transportadora;
- nome do costureiro;
- quantidade despachada;
- volumes;
- fotos;
- observações.

### CD01

- Status após despacho: `Em Costura`.
- O Card permanece visível na aba Recebimento durante todo o período em Costura.
- Não deve desaparecer da fila do Recebimento após o despacho.
- A tela deve exibir os dados do despacho e a previsão de retorno.
- A mercadoria deve retornar ao CD.
- Previsão de retorno: despacho + 7 dias úteis.

### CD02

- Status após despacho: `Despacho CD02`.
- A mercadoria não retorna ao fluxo interno.

## 6. Retorno da Costura CD01 — regra atualizada

- O mesmo Card retorna ao Recebimento.
- Status: `Aguardando recebimento do retorno`.
- Existe nova tiragem obrigatória de 10% sobre a quantidade efetivamente retornada.
- A nova tiragem possui cronômetro próprio e pode terminar antes ou depois da conferência física.
- Para Grade, a amostra não pode ser inferior à quantidade de itens distintos disponíveis.
- O operador registra volumes retornados, quantidade retornada, danos, fotos, observações e Casulo.
- O Card só é encaminhado novamente à Qualidade quando o retorno físico e a nova tiragem estiverem concluídos.
- Após o retorno CD01, a Qualidade executará obrigatoriamente a Inspeção 2 usando a amostra separada pelo Recebimento.

## 7. Histórico

Toda importação, conclusão física, evento dos 10%, alteração de Casulo, despacho e retorno deve permanecer no histórico do Card único.
