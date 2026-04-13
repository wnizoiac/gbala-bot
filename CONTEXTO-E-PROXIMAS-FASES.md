# Contexto Atual e Proximas Fases

## Estado atual do projeto

Data de referencia: 2026-04-13

Fase concluida: FASE 1 - Camada Discord minima

O que foi implementado nesta base:

- Projeto inicial em TypeScript com modo strict
- Regra noUncheckedIndexedAccess ativa
- Scripts padrao de desenvolvimento, build, start, lint, typecheck e teste
- ESLint e Prettier configurados
- Validacao de variaveis de ambiente no boot
- Resolucao de caminhos cross-platform
- Logger estruturado em JSON com pino
- Bootstrap com encerramento gracioso via SIGINT e SIGTERM
- Pipeline de CI no GitHub Actions para Node 22 e 24
- Teste inicial com Vitest
- Cliente Discord com intent minima para guilds
- Registro dinamico de slash commands
- Handler generico para interactions
- Comandos slash ping e status
- Error boundary por comando com resposta de fallback
- Logging estruturado por interaction

Arquivos principais atuais:

- package.json
- tsconfig.json
- tsconfig.eslint.json
- eslint.config.mjs
- .prettierrc
- .env.example
- src/config/constants.ts
- src/config/env.ts
- src/config/paths.ts
- src/discord/client.ts
- src/discord/command-handler.ts
- src/discord/commands-registry.ts
- src/discord/commands/ping.ts
- src/discord/commands/status.ts
- src/discord/register-commands.ts
- src/discord/types.ts
- src/shared/logger.ts
- src/main.ts
- vitest.config.ts
- tests/smoke.test.ts
- .github/workflows/ci.yml

Validacoes executadas com sucesso:

- npm run lint
- npm run typecheck
- npm run test
- npm run build

Comportamento validado:

- O boot falha com mensagem clara quando DISCORD_TOKEN e MEDIA_ROOT nao estao definidos
- O handler de commands nao derruba o processo em caso de falha de execucao
- Comandos podem ser registrados globalmente ou por guild via DISCORD_GUILD_ID

## Decisoes de arquitetura aplicadas

- Monolito modular como padrao de crescimento
- Separacao inicial por modulos em src/config e src/shared
- Nenhuma logica de musica, fila, playback ou catalogo iniciada antes da fase correta
- Nenhuma abstracao prematura de provider criada

## Proxima fase de execucao

## FASE 2 - Catalogo local de midia

Objetivo:

- Permitir que o bot enxergue, valide e indexe musicas locais

Entregaveis previstos:

- src/storage/db.ts
- migrations iniciais da tabela de tracks
- src/storage/repositories/tracks-repo.ts
- src/music/catalog/scanner.ts
- src/music/catalog/metadata.ts
- src/music/catalog/search.ts
- src/discord/commands/catalogo.ts
- testes unitarios de search.ts e metadata.ts
- testes de integracao de tracks-repo.ts com SQLite in-memory

Regras obrigatorias desta fase:

- Definir extensoes aceitas para audio local
- Normalizar nomes para busca sem acentos e sem caracteres especiais
- Gerar id interno estavel por faixa a partir do path relativo
- Ignorar arquivos invalidos sem quebrar o scan
- Diferenciar estado persistente de estado efemero

Criterio de saida da Fase 2:

- Scanner varre pasta e indexa corretamente
- /catalogo exibe faixas indexadas com busca e paginacao
- Arquivos problematicos sao logados e ignorados
- Testes de search, metadata e repositorio passam

## Macro-roadmap das fases seguintes

## FASE 2 - Catalogo local de midia

- SQLite inicial
- Scanner recursivo de arquivos
- Metadata de audio com fallback por nome
- Busca por catalogo com normalizacao
- Comando /catalogo

## FASE 3 - Fila por guild

- QueueState e QueueManager isolados do Discord
- Historico em memoria separado da fila
- Operacoes de fila completas e testadas

## FASE 4 - Playback e conexao de voz

- ConnectionManager
- AudioResource
- PlayerManager
- IdleHandler com timeout e cleanup

## FASE 5 - Commands de musica

- /tocar, /fila, /agora, /pausar, /retomar, /pular, /parar, /sair
- comandos secundarios de manipulacao da fila
- guards compartilhados e respostas padronizadas

## FASE 6 - Painel e persistencia

- Embed de now playing
- botoes e validacao de contexto
- persistencia de configuracoes duraveis por guild

## FASE 7 - Hardening

- robustez de erros
- protecoes anti-spam e cooldown
- checklist manual completo no README
- cobertura elevada em music e storage

## FASE 8 - Polimento e release

- README final completo
- checklists de deploy e setup Discord
- limpeza final de codigo e release tag

## Regras de execucao para manter qualidade

- Nao pular fases
- Nao antecipar abstrações futuras sem consumidor real
- Nao persistir estado efemero na v1
- Nao misturar camada Discord com regras de dominio
- CI deve permanecer verde em toda entrega

## Proximo passo objetivo

Iniciar implementacao da FASE 2 com:

1. camada SQLite e repositorio de tracks
2. scanner recursivo de media local
3. extracao e fallback de metadata
4. busca normalizada no catalogo
5. comando /catalogo
6. testes unitarios e de integracao da fase
