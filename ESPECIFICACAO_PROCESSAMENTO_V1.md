# ESPECIFICAÇÃO — PROCESSAMENTO V1

Esta versão adiciona o Processamento sem remover ou alterar as regras operacionais aprovadas do Recebimento e da Qualidade.

## 1. Entrada

O Card chega após a conclusão da Inspeção 2:

- setor: `PROCESSAMENTO`;
- status: `AGUARDANDO_PROCESSAMENTO`.

O tipo da compra já vem do Excel:

- `Private Label` → Grade;
- `Saldo` → Saldo.

O campo é somente para consulta no Processamento.

## 2. Configuração inicial

Antes de iniciar a produção, devem ser informados:

- Marca;
- Perfil: `Cadastro + Entrada` ou `Somente Entrada`;
- Necessita Triagem: Sim/Não;
- Necessita Etiquetagem: Sim/Não;
- Tipo de etiqueta, quando Etiquetagem = Sim: Branca, Vermelha ou Personalizada;
- Observações;
- para Grade, opção de confirmar a quantidade final somente na Estocagem.

## 3. Produção

Um ou mais colaboradores podem atuar no mesmo Card. Cada colaborador possui:

- assumir Card ou ser incluído por Supervisor/Admin;
- Iniciar;
- Pausar;
- Retomar;
- Finalizar;
- tempo útil;
- tempo parado;
- permanência;
- quantidade produzida individual.

O calendário útil permanece:

- segunda a quinta, 08:00–18:00;
- sexta, 08:00–17:00;
- sábados e domingos fechados.

## 4. Quantidades

### Saldo

- controle por quantidade geral processada;
- a soma da produção dos colaboradores deve fechar a quantidade processada.

### Grade

- controle de quantidade processada por item;
- quando a quantidade já for conhecida, cada item deve ser preenchido;
- quando a quantidade final só puder ser conhecida na Estocagem, a opção correspondente permite concluir o Processamento sem preencher todos os itens;
- a função `Copiar Estocada → Processada` fica preparada para uso após a criação da Estocagem.

## 5. Direcionamento

Ao concluir:

1. se necessita Triagem → `TRIAGEM / AGUARDANDO_TRIAGEM`;
2. sem Triagem e com Etiquetagem → `ETIQUETAGEM / AGUARDANDO_ETIQUETAGEM`;
3. sem Triagem e sem Etiquetagem → `ESTOCAGEM / AGUARDANDO_ESTOCAGEM`.

## 6. Histórico

Devem ser registrados no mesmo Card:

- configuração e alterações;
- colaboradores incluídos;
- início, pausa, retomada e finalização;
- produção individual;
- quantidades processadas;
- conclusão e destino seguinte.
