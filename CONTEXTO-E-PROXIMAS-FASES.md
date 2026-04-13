# Contexto Atual e Proximas Fases

## Estado atual do projeto

Data de referencia: 2026-04-13

Fase atual: FASE 8 - Polimento e release

O que ja existe na base:

- catalogo local com scanner recursivo, metadata e persistencia em SQLite
- comandos `/catalogo`, `/tocar`, `/agora`, `/fila`, `/historico`
- fila por guild com move, remove, shuffle, loop e historico separado
- playback local com `ConnectionManager`, `AudioResourceFactory`, `PlayerManager` e `IdleHandler`
- painel now playing com embed, botoes, validacao de contexto e debounce
- persistencia de `defaultVolume` e `preferredLoopMode` por guild
- cooldown anti-spam para slash commands e botoes
- respostas padronizadas na camada Discord
- `/status` com metricas de catalogo, fila e playback
- testes automatizados para queue, playback, panel, storage, metadata e cooldown

Arquivos principais atuais:

- package.json
- README.md
- .env.example
- src/main.ts
- src/discord/command-handler.ts
- src/discord/commands-registry.ts
- src/discord/panel/now-playing-panel.ts
- src/discord/interactions/buttons.ts
- src/music/catalog/*
- src/music/queue/*
- src/music/playback/*
- src/storage/db.ts
- src/storage/repositories/tracks-repo.ts
- src/storage/repositories/guild-settings-repo.ts
- tests/*.test.ts

Validacoes executadas com sucesso:

- npm run lint
- npm run typecheck
- npm run test

Comportamento validado:

- boot falha cedo quando variaveis criticas faltam
- scanner indexa catalogo local e ignora arquivos invalidos
- playback local avanca para a proxima faixa quando a atual falha
- painel acompanha o estado real do player e respeita cooldown/debounce
- volume e loop preferidos sobrevivem a reinicio

## Decisoes de arquitetura aplicadas

- Monolito modular como padrao de crescimento
- Separacao inicial por modulos em src/config e src/shared
- Nenhuma logica de musica, fila, playback ou catalogo iniciada antes da fase correta
- Nenhuma abstracao prematura de provider criada

## Proximo foco de execucao

## FASE 8 - Fechamento

Objetivo:

- concluir polimento de documentacao, operacao e release inicial

Entregaveis prioritarios restantes:

- README final completo com instalacao Linux/Windows
- checklist de setup do bot no Discord
- checklist de deploy/operacao
- limpeza fina de codigo e nomenclatura restante
- preparacao para release/tag quando desejado

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

Fechar a FASE 8 com:

1. revisao final da documentacao operacional
2. limpeza fina de trechos restantes do codigo
3. checklist de release
4. tag/empacotamento quando houver decisao de versao
