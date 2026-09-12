# Nortis

Aplicativo de gestão financeira pessoal para acompanhar receitas, gastos e metas de economia em um painel mensal. Projeto em desenvolvimento, feito com HTML, CSS e JavaScript puro.

## Funcionalidades atuais

- Cadastro e exclusão de receitas e gastos por categoria e data.
- Resumo mensal de receitas, despesas, saldo e taxa de economia.
- Navegação entre meses e gráfico de fluxo dos seis meses até o mês selecionado.
- Gráfico de gastos por categoria.
- Metas de economia com acompanhamento de progresso e incrementos rápidos.
- Interface escura e responsiva, com validação dos formulários e confirmação de exclusão.
- Armazenamento local no navegador.

## Executar localmente

As instruções abaixo destinam-se ao titular e a pessoas previamente autorizadas, conforme a [licença](LICENSE).

1. Abra a pasta do projeto no VS Code.
2. Com a extensão Live Server instalada, clique com o botão direito em `finance-dashboard.html` e selecione **Open with Live Server**.
3. Acesse o endereço informado pela extensão, normalmente `http://127.0.0.1:5500/finance-dashboard.html`.

Para visualizar dentro do VS Code, abra o navegador integrado pela paleta de comandos e informe o mesmo endereço.

Não é necessário instalar Node.js ou executar um build. Os gráficos dependem do carregamento do Chart.js 4.4.1 pelo CDN cdnjs e, portanto, precisam de conexão para esse carregamento.

## Estrutura

```text
Nortis/
├── finance-dashboard.html        # Estrutura da página e formulários
├── styles.css                    # Aparência e responsividade
├── app.js                        # Comportamentos, gráficos e persistência
├── contexto-dashboard-financas.md # Contexto original do protótipo
├── README.md
├── .gitignore
└── LICENSE
```

O documento de contexto registra a versão inicial e contém informações antigas sobre a estrutura e a persistência. Este README descreve o estado atual.

## Armazenamento e limitações

Os lançamentos e as metas ficam no `localStorage`, nas chaves `finance:transactions` e `finance:goals`. Eles permanecem após recarregar a página, desde que o navegador permita o armazenamento.

Os dados pertencem ao navegador, perfil e origem utilizados. Alternar entre `localhost` e `127.0.0.1`, mudar a porta ou usar outro navegador pode mostrar um armazenamento diferente. Limpar os dados do site pode apagar os registros. Ainda não há exportação de backup, login, servidor ou sincronização entre celular e computador.

Se o ambiente antigo disponibilizar `window.storage` e não houver dados locais para a coleção, o aplicativo tenta migrar os registros acessíveis nesse ambiente. Isso não transfere automaticamente dados de outro navegador ou do Claude para uma página local.

Os incrementos nas metas são registros manuais independentes dos lançamentos; não representam transferências reais nem alteram o saldo mensal.

## Próximos passos possíveis

- Edição de lançamentos.
- Exportação e importação de backup.
- Orçamentos por categoria e lançamentos recorrentes.
- Contas e cartões.
- Autenticação e sincronização, quando houver um backend.

Esses recursos ainda não estão implementados.

## Licença e permissões

Copyright (c) 2026 Antonio Salomão. Todos os direitos reservados.

O Nortis é software proprietário. Usar, executar, copiar, modificar, distribuir, hospedar ou comercializar o aplicativo exige autorização prévia, expressa e por escrito do titular, ressalvadas as exceções da [LICENSE](LICENSE). A disponibilização do código não concede uma licença de uso.

Para solicitar autorização, contate Antonio Salomão pelo [perfil do GitHub](https://github.com/antoniossalomao) e aguarde uma autorização expressa antes de utilizar o aplicativo.

Componentes de terceiros, como o [Chart.js](https://github.com/chartjs/Chart.js), permanecem sujeitos às suas próprias licenças.
