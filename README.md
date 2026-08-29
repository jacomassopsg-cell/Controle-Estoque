# Controle Logística

Sistema web local para acompanhar o fluxo de mercadorias entre Recebimento, Qualidade, Processamento, Etiquetagem e Estocagem.

O Recebimento funciona como painel central. Os mesmos Cards aparecem nas filas setoriais conforme a posição de cada item, mantendo cadastro e histórico únicos.

## Funcionalidades

- importação do relatório Excel `Relatorio de Compras`;
- classificação automática `Private Label = Grade` e `Saldo = Saldo`;
- localização por compra, produto, referência, cor e tamanho;
- recebimento físico e tiragem de 10% com triagem inicial;
- nova tiragem de 10% no retorno da Costura CD01;
- Inspeção 1 e Inspeção 2, incluindo Inspeção 2 direta;
- atribuição de amostras e resultados por inspetor;
- processamento por colaborador com cronômetros;
- Etiquetagem e Estocagem por tamanho para Grade;
- Etiquetagem e Estocagem por quantidade geral para Saldo;
- acompanhamento de compras mistas em diferentes etapas;
- remoção de Cards CD2/CD02 fora do Recebimento;
- histórico completo das movimentações.

## Tecnologias

- Python 3.12;
- FastAPI e Uvicorn;
- SQLite;
- OpenPyXL;
- HTML, CSS e JavaScript.

## Estrutura

```text
app.py                    Backend principal e Recebimento
quality_module.py         Qualidade e inspeções
processing_module.py      Processamento
downstream_module.py      Etiquetagem e Estocagem
templates/index.html      Estrutura da interface
static/app.js             Comportamento do frontend
static/style.css          Estilos visuais
data/                     Banco local e uploads
arquivo_teste/            Local para relatórios de teste
requirements.txt          Dependências Python
```

## Executar no Windows

1. Instale o Python 3.12.
2. Baixe ou clone este repositório.
3. Execute `INICIAR_CONTROLE_LOGISTICA.bat`.
4. Acesse `http://127.0.0.1:8000`.

O inicializador cria o ambiente virtual e instala as dependências automaticamente.

## Executar pelo terminal

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

## Importação e dados privados

O arquivo precisa conter a aba `Relatorio de Compras`. Relatórios `.xlsx` e `.xlsm` são aceitos.

Relatórios, banco SQLite e uploads estão no `.gitignore` porque podem conter informações comerciais. Para testar, coloque manualmente um relatório em `arquivo_teste/`.

## Usuários iniciais

Os usuários de demonstração são criados automaticamente na primeira execução. Consulte o painel de login para os nomes disponíveis.

> Antes de utilizar em produção, substitua as senhas iniciais e restrinja o acesso ao servidor.

## Documentação

- `CHANGELOG_V15.md`: revisão integral mais recente;
- `ESPECIFICACAO_RECEBIMENTO_CONGELADA.md`;
- `ESPECIFICACAO_QUALIDADE_CONGELADA.md`;
- `ESPECIFICACAO_PROCESSAMENTO_V1.md`;
- `TESTES_REALIZADOS.md`.

## Versão

Versão atual: **V15 — revisão integral**.
