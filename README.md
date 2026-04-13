# gbala-bot

Bot de musica para Discord em TypeScript com catalogo local, fila por guild, playback em canal de voz, painel de reproducao e persistencia leve em SQLite.

## Estado atual

Fase atual: `FASE 8 - Polimento e release`.

O projeto ja entrega:

- catalogo local indexado em SQLite
- busca e listagem com `/catalogo`
- fila por guild com mover, remover, embaralhar, loop e historico
- playback local com `@discordjs/voice` e FFmpeg
- comandos de musica em portugues
- painel "now playing" com botoes e debounce nas atualizacoes
- persistencia de volume padrao e loop preferido por guild
- cooldown anti-spam em comandos e botoes
- cobertura automatizada para `music/`, `storage/`, cooldown e painel

## Requisitos

- Node.js 22.12+
- npm 10+
- FFmpeg no `PATH` ou configurado em `FFMPEG_PATH`
- bot do Discord com token valido

## Instalacao

### Windows

1. Instale Node.js 22.12+ e FFmpeg
2. Garanta que `ffmpeg` responde no terminal ou configure `FFMPEG_PATH`
3. Clone o projeto
4. Rode `npm install`
5. Copie `.env.example` para `.env`
6. Configure as variaveis de ambiente
7. Rode `npm run dev`

### Linux

1. Instale Node.js 22.12+, npm e FFmpeg
2. Clone o projeto
3. Rode `npm install`
4. Copie `.env.example` para `.env`
5. Configure as variaveis de ambiente
6. Rode `npm run dev`

## Configuracao

Variaveis principais:

- `DISCORD_TOKEN`: token do bot
- `DISCORD_GUILD_ID`: opcional, registra comandos mais rapido em uma guild de teste
- `MEDIA_ROOT`: raiz da biblioteca local
- `DB_PATH`: caminho do banco SQLite
- `FFMPEG_PATH`: opcional, caminho explicito do binario do FFmpeg
- `PLAYER_IDLE_TIMEOUT_MS`: timeout de inatividade antes de desconectar
- `LOG_LEVEL`: `fatal`, `error`, `warn`, `info`, `debug` ou `trace`
- `NODE_ENV`: `development`, `test` ou `production`

Extensoes suportadas:

- `.mp3`
- `.flac`
- `.ogg`
- `.wav`
- `.m4a`
- `.opus`

## Scripts

- `npm run dev`: inicia em watch
- `npm run build`: compila o projeto
- `npm start`: executa a build compilada
- `npm run lint`: valida estilo e imports
- `npm run typecheck`: verifica tipagem
- `npm run test`: roda a suite do Vitest

## Comandos

- `/ping`: healthcheck simples
- `/status`: uptime, memoria, catalogo e playback ativo
- `/catalogo`: lista ou busca faixas indexadas
- `/tocar`: busca, enfileira e inicia reproducao
- `/agora`: mostra a faixa atual
- `/fila`: mostra a fila atual
- `/historico`: mostra as ultimas faixas tocadas
- `/pausar`, `/retomar`, `/pular`, `/parar`, `/sair`
- `/remover`, `/mover`, `/embaralhar`, `/repetir`, `/volume`

## Setup Discord

Checklist do bot no Discord Developer Portal:

- criar uma application e um bot
- copiar o token para `DISCORD_TOKEN`
- habilitar o escopo `bot`
- habilitar o escopo `applications.commands`
- conceder permissoes de conectar e falar em canais de voz
- conceder permissoes basicas para ler/enviar mensagens no canal de texto do painel

Permissoes recomendadas:

- `View Channels`
- `Send Messages`
- `Embed Links`
- `Read Message History`
- `Connect`
- `Speak`

## Deploy

Checklist de deploy:

- `npm install`
- `.env` presente com `DISCORD_TOKEN` e `MEDIA_ROOT`
- `MEDIA_ROOT` apontando para biblioteca valida
- FFmpeg instalado ou `FFMPEG_PATH` configurado
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm start`

Checklist de operacao:

- logs estruturados em `info` ou `debug`
- banco SQLite persistido em volume/disco adequado
- biblioteca de audio montada em caminho estavel
- porta de saida liberada para a API do Discord
- processo supervisionado por systemd, pm2 ou equivalente

## Checklist Manual

- bot inicia com `npm run dev` sem erro de ambiente
- `/ping` e `/status` respondem
- `/catalogo` lista faixas indexadas
- `/tocar` entra no canal e inicia reproducao
- `/fila` mostra atual e pendencias
- `/pular` avanca para a proxima faixa
- `/pausar` e `/retomar` alteram o estado do player
- `/parar` limpa a fila
- `/sair` desconecta do canal
- painel aparece durante a reproducao
- botoes do painel respeitam o mesmo canal de voz
- volume e repeticao sobrevivem ao reinicio
- remover arquivo do disco nao derruba playback nem o bot
- faixa corrompida e pulada sem poluir o historico
- sem FFmpeg o problema aparece claramente em log/boot

## Qualidade

- TypeScript `strict` e `noUncheckedIndexedAccess`
- ESLint e Prettier configurados
- logger estruturado com pino
- CI em Node 22 e 24
- suite automatizada com 50+ testes
