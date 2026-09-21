# Nortis

Aplicativo desktop de gestão financeira pessoal para acompanhar receitas, gastos e metas de
economia em um painel mensal. Feito com Electron (JavaScript puro na interface) e SQLite local —
sem servidor, sem navegador, sem dependência de internet.

## Funcionalidades

- Cadastro, edição e exclusão de receitas e gastos por categoria e data.
- Busca por descrição/categoria e filtros de receitas/gastos no mês corrente.
- Resumo mensal de receitas, despesas, saldo e taxa de economia.
- Navegação entre meses e gráficos de fluxo (6 meses) e gastos por categoria.
- Metas de economia com contribuições rápidas ou personalizadas.
- Backup e restauração dos dados em JSON.
- Autenticação multiusuário local (registro/login/logout) com bloqueio temporário após tentativas
  de login incorretas — cada pessoa que usa o app tem seus próprios lançamentos, metas e categorias.
- Banco SQLite versionado por migrations, com estrutura preparada para contas, cartões, parcelas,
  recorrências, orçamentos, tags, anexos e importações (ainda sem telas próprias).

## Executar em desenvolvimento

Requer [Node.js](https://nodejs.org) 22 ou superior.

```bash
npm install
npm run dev
```

Isso abre a janela do app. Na primeira execução você verá a tela de login — use **Criar conta**
para se cadastrar.

## Gerar o instalador (.exe)

```bash
npm run build
```

Gera um instalador NSIS e uma versão portátil em `release/`.

## Estrutura

```text
Nortis/
├── electron/
│   ├── main.js               # janela, ciclo de vida do app, handlers de IPC
│   ├── preload.js            # contextBridge: expõe window.nortis ao front-end
│   └── db/
│       ├── connection.js     # abre o SQLite (node:sqlite) e roda as migrations
│       ├── migrations/       # schema versionado (SQL puro + uma migration em JS)
│       ├── auth.js           # registro/login/logout, hash de senha, bloqueio por tentativas
│       └── finance.js        # transações, metas, categorias, backup, auditoria
├── src/                       # interface (HTML/CSS/JS puro, sem build step)
│   ├── index.html / app.js   # painel principal
│   ├── login.html / login.js # tela de entrar/criar conta
│   ├── styles.css
│   └── vendor/chart.umd.js   # Chart.js vendorizado (sem CDN, funciona offline)
├── build/                     # ícone do instalador (build/icon.ico, opcional)
└── package.json
```

## Dados e backup

O SQLite é a fonte de verdade e fica em `app.getPath('userData')` (no Windows,
`%APPDATA%\nortis\nortis.sqlite`), fora da pasta do projeto — sobrevive a atualizações do app.
Valores monetários são armazenados como centavos inteiros e as relações usam chaves estrangeiras.

Use **Backup** para baixar um JSON e **Importar** para restaurá-lo (a importação manual substitui
lançamentos e metas atuais após confirmação).

## Autenticação

Não há servidor HTTP, então não há cookies nem CSRF: a sessão é mantida em memória no processo
principal do Electron enquanto o app está aberto. O primeiro cadastro feito no computador reaproveita
automaticamente um eventual banco de dados já existente (nenhum lançamento é perdido); cadastros
seguintes criam usuários independentes, cada um com seus próprios dados.

## Licença e permissões

Copyright (c) 2026 Antonio Salomão. Todos os direitos reservados.

O Nortis é software proprietário. Usar, executar, copiar, modificar, distribuir, hospedar ou
comercializar o aplicativo exige autorização prévia, expressa e por escrito do titular, ressalvadas
as exceções da [LICENSE](LICENSE). A disponibilização do código não concede uma licença de uso.

Para solicitar autorização, contate Antonio Salomão pelo
[perfil do GitHub](https://github.com/antoniossalomao) e aguarde uma autorização expressa antes de
utilizar o aplicativo.

Componentes de terceiros, como o [Chart.js](https://github.com/chartjs/Chart.js) e o
[Electron](https://github.com/electron/electron), permanecem sujeitos às suas próprias licenças.
