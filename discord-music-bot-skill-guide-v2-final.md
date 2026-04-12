# DISCORD MUSIC BOT — SKILL GUIDE v2

## Objetivo deste documento

Este é o guia mestre do projeto. Ele conduz o desenvolvimento do bot do zero até uma versão sólida, estável, limpa e expansível.

Este documento define:

- como pensar a arquitetura
- em que ordem construir
- o que fazer e o que não fazer em cada fase
- quando e como refatorar
- como evitar código morto, imports inúteis, duplicação e acoplamento
- como manter o projeto legível depois de crescer
- como testar de verdade
- como operar em produção

A meta não é “fazer funcionar”. A meta é construir um bot que continue saudável após dezenas de mudanças.

-----

# 1. Escopo do projeto

## 1.1 O que este projeto é

Um bot de música para Discord com:

- comandos em português
- reprodução de arquivos de áudio locais
- fila robusta por servidor (guild)
- painel visual apenas enquanto houver música tocando
- arquitetura pronta para futuras integrações por provider, sem ativá-las prematuramente
- compatibilidade com Linux e Windows
- base limpa para manutenção e evolução
- logging estruturado e observável desde o início
- pipeline de CI mínimo garantindo qualidade contínua

## 1.2 O que este projeto NÃO é na v1

- microserviços ou bot separado de player separado de API
- sistema distribuído
- dashboard web
- sistema de permissões hipercomplexo
- integração Spotify/YouTube ativa desde o primeiro dia
- catálogo com organização manual pesada
- produto dependente de gambiarra em mensagens de texto comuns

## 1.3 Filosofia central

**Monólito modular, responsabilidade clara, fluxo previsível, crescimento controlado.**

Isso significa:

- um repositório, um processo principal
- uma base de dados simples
- módulos bem definidos com fronteiras claras
- pouca mágica, pouca duplicação
- zero arquitetura inflada cedo demais
- abstrações nascem de dor real, nunca de especulação

-----

# 2. Stack oficial

## 2.1 Tecnologias

- **Runtime:** Node.js 22.12+; preferencialmente LTS atual em produção
- **Linguagem:** TypeScript (strict mode)
- **Discord:** discord.js + @discordjs/voice
- **Áudio:** FFmpeg
- **Banco:** SQLite (via better-sqlite3)
- **Logger:** pino (JSON estruturado)
- **Testes:** Vitest
- **CI:** GitHub Actions

## 2.2 Por que esse stack

- Ecossistema maduro e consolidado para bots Discord
- Boa ergonomia para slash commands e interactions
- Camada de voz estável com @discordjs/voice
- Tipagem forte reduz bugs em runtime
- SQLite é suficiente para v1 e elimina dependência de servidor de banco
- pino é rápido, estruturado e facilita debug em produção
- Vitest é compatível com o ecossistema TypeScript sem configuração pesada
- GitHub Actions fecha o ciclo de qualidade com custo zero

## 2.3 Quando SQLite deixa de servir

SQLite serve bem enquanto:

- o bot roda como processo único
- o catálogo tem até ~100k faixas
- não há escrita concorrente pesada (múltiplos workers)

Considerar migração para PostgreSQL quando:

- o bot precisar de múltiplas instâncias com estado compartilhado
- o catálogo crescer além do razoável para SQLite
- surgir necessidade de queries complexas com joins pesados
- o uso de WAL mode não for mais suficiente para a concorrência

## 2.4 Regras de ambiente

O projeto deve ser tratado como multiplataforma desde o início.

### Regras obrigatórias

- nunca assumir separador de caminho fixo (usar `path.join` / `path.resolve`)
- nunca assumir case-sensitive ou case-insensitive no filesystem
- nunca hardcodar caminho absoluto do FFmpeg
- nunca depender de comportamento exclusivo do Linux ou Windows

### O projeto deve aceitar

- FFmpeg via PATH
- FFmpeg via variável de ambiente (`FFMPEG_PATH`)
- caminho raiz de mídia configurável (`MEDIA_ROOT`)
- banco configurável por ambiente (`DB_PATH`)

-----

# 3. Arquitetura

## 3.1 Modelo: monólito modular

O projeto segue um modelo de monólito modular com fronteiras claras entre domínios.

### Estrutura de alto nível

```text
bot-musica-discord/
├─ src/
│  ├─ main.ts
│  ├─ config/
│  ├─ discord/
│  ├─ music/
│  ├─ storage/
│  └─ shared/
├─ media/
├─ data/
├─ tests/
├─ .github/workflows/
├─ .env.example
├─ package.json
├─ tsconfig.json
├─ vitest.config.ts
└─ README.md
```

## 3.2 Responsabilidade de cada módulo

### `config/`

Variáveis de ambiente, paths, flags e defaults. Tudo que o sistema precisa saber sobre o ambiente em que roda.

### `discord/`

Client, commands, interactions, embeds e tudo que toca a API do Discord. Nenhuma regra de negócio vive aqui — apenas orquestração de entrada/saída.

### `music/`

Catálogo, fila, playback e conexões de voz. O coração do domínio. Deve funcionar sem saber que Discord existe.

### `storage/`

Banco, migrations, repositories e persistência. Camada fina entre o domínio e o SQLite.

### `shared/`

Logger, erros tipados, validators e tipos utilitários. Pequeno e estável — se cresce demais, algo está errado.

## 3.3 Nomes de módulos proibidos

Não criar módulos com nomes vagos como:

- `core`, `engine`, `base`, `common`, `super-utils`, `manager-global`, `services`

Se o nome não indica responsabilidade clara, o módulo não deveria existir.

## 3.4 Regra de dependência entre módulos

```text
config  ←── qualquer módulo pode importar
shared  ←── qualquer módulo pode importar
storage ←── music pode importar
music   ←── discord pode importar
discord ←── ninguém importa (é a camada de entrada)
```

Fluxo sempre de fora para dentro. `music/` nunca importa `discord/`. `storage/` nunca importa `music/`.

-----

# 4. Estrutura interna recomendada

A estrutura abaixo é uma referência, não um contrato rígido. Os arquivos devem surgir conforme as fases avançam. Se durante o desenvolvimento um arquivo não fizer sentido ou dois arquivos quiserem se fundir, permita isso.

```text
src/
├─ main.ts
├─ config/
│  ├─ env.ts
│  ├─ paths.ts
│  └─ constants.ts
├─ discord/
│  ├─ client.ts
│  ├─ register-commands.ts
│  ├─ commands/
│  │  └─ (surgem conforme as fases)
│  ├─ interactions/
│  │  ├─ buttons.ts
│  │  ├─ select-menus.ts
│  │  └─ guards.ts
│  └─ embeds/
│     ├─ now-playing.ts
│     ├─ queue.ts
│     └─ errors.ts
├─ music/
│  ├─ catalog/
│  │  ├─ scanner.ts
│  │  ├─ metadata.ts
│  │  └─ search.ts
│  ├─ queue/
│  │  ├─ queue-manager.ts
│  │  ├─ queue-state.ts
│  │  └─ history.ts
│  └─ playback/
│     ├─ player-manager.ts
│     ├─ audio-resource.ts
│     ├─ connection-manager.ts
│     └─ idle-handler.ts
├─ storage/
│  ├─ db.ts
│  ├─ migrations/
│  └─ repositories/
│     ├─ tracks-repo.ts
│     └─ guild-settings-repo.ts
└─ shared/
   ├─ logger.ts
   ├─ errors.ts
   ├─ validators.ts
   └─ types.ts
```

### Observações

- Não existe pasta `providers/` na v1. Quando e se um provider externo for necessário, a abstração nasce nesse momento, não antes.
- A pasta `commands/` começa vazia. Cada fase adiciona os comandos que fazem sentido naquele momento.
- Não existe `panel-state-repo.ts` na v1. O painel é efêmero e derivado do estado, não estado persistido.

-----

# 5. Princípios de engenharia

## 5.1 Responsabilidade única por arquivo

Cada arquivo deve ter uma responsabilidade principal e respondível em uma frase.

**Errado:** command que busca dados, faz playback, persiste banco, monta embed, trata botão e loga erro.

**Certo:** command recebe a interação, chama o serviço correto, recebe o resultado e responde ao usuário.

## 5.2 Estado centralizado e explícito

O estado de playback e fila não pode existir em múltiplos lugares ao mesmo tempo.

Fonte de verdade:

- Fila ativa por guild: `QueueManager`
- Reprodução ativa: `PlayerManager`
- Catálogo: `storage` + scanner
- Painel: reflexo do estado, **nunca** fonte de verdade

## 5.3 Interface não manda na regra

Embeds, botões e select menus não carregam lógica de domínio. A interface apenas dispara ações. A decisão sempre acontece no domínio interno.

## 5.4 Nomes orientados a responsabilidade

**Evitar:** `helper`, `managerHelper`, `coreService`, `botUtils2`, `finalServiceNew`, `discordThing`

**Usar:** `QueueManager`, `ConnectionManager`, `CatalogScanner`, `GuildSettingsRepository`, `NowPlayingEmbed`

Se o nome precisa de explicação, provavelmente é o nome errado.

## 5.5 Código temporário exige documentação

Nunca escrever “provisório” sem:

- motivo registrado
- impacto esperado
- condição de remoção
- tag `// TODO(motivo): descrição — remover quando X`

## 5.6 Fail fast, fail loud

Erros não devem ser engolidos silenciosamente. Um `try/catch` sem log ou sem re-throw é um bug escondido. Erros de configuração devem impedir o boot. Erros de runtime devem ser logados com contexto (guild, command, track) e tratados de forma que o bot se recupere sem estado corrompido.

## 5.7 Abstrações nascem de dor, não de especulação

Não criar interface genérica “porque talvez no futuro”. Extrair abstração quando a terceira repetição concreta surgir ou quando um teste ficar impossível sem ela.

-----

# 6. Logging

## 6.1 Logger estruturado desde o dia 1

O projeto usa pino com output JSON. Isso permite:

- grep e filtragem por campo
- ingestão em ferramentas de observabilidade
- contexto máquina-legível (guildId, command, trackId)

## 6.2 Níveis de log

- **fatal:** processo vai encerrar (boot falhou, erro irrecuperável)
- **error:** algo falhou mas o bot continua (arquivo corrompido, FFmpeg crash por faixa)
- **warn:** situação inesperada mas tratada (timeout de reconexão, faixa pulada)
- **info:** eventos de negócio normais (bot online, faixa tocando, fila limpa)
- **debug:** detalhes de diagnóstico (queries, estado interno, transitions)

## 6.3 Regras de logging

- Todo log deve ter contexto estruturado: `logger.info({ guildId, trackId }, 'Playback started')`
- Nunca logar objetos inteiros do discord.js (são enormes e circulares)
- Nunca logar tokens, secrets ou dados sensíveis
- Log de erro deve incluir o erro original: `logger.error({ err, guildId }, 'Playback failed')`
- Em produção, nível mínimo `info`. Em dev, `debug`.

-----

# 7. Testes

## 7.1 Filosofia de testes

Testes são cidadãos de primeira classe, não coadjuvantes. O investimento em testes deve ser proporcional ao risco do módulo.

## 7.2 Pirâmide de testes do projeto

### Testes unitários (maioria)

- `QueueManager`: enqueue, dequeue, skip, remove, move, shuffle, loop, clear
- `QueueState`: invariantes de estado, transitions válidas e inválidas
- `CatalogSearch`: busca por nome, fuzzy match, normalização
- `metadata.ts`: parsing de tags, fallback para nome de arquivo
- validators: inputs de commands
- `audio-resource.ts`: criação de resource a partir de path

### Testes de integração (poucos, focados)

- `scanner.ts` + filesystem real (pasta temporária com arquivos de teste)
- `tracks-repo.ts` + SQLite in-memory
- `guild-settings-repo.ts` + SQLite in-memory
- `PlayerManager` + `QueueManager` (fluxo de play/skip/stop sem Discord)

### Testes manuais documentados (checklist)

- entrar em canal de voz e tocar uma faixa
- pular para a próxima
- parar reprodução e verificar cleanup
- comportamento com fila vazia
- painel atualizando e sumindo corretamente
- erro de FFmpeg ausente
- arquivo removido do disco após indexação
- usuário tenta controlar player fora do canal correto
- duas pessoas clicando painel quase ao mesmo tempo
- reinício do bot com catálogo existente

## 7.3 Mocking do discord.js

O discord.js não deve ser mockado por inteiro. A estratégia é:

- Isolar a lógica de domínio (`music/`) para que ela não precise do Discord para ser testada
- Nos commands, mockar apenas `ChatInputCommandInteraction` com os métodos usados (`reply`, `deferReply`, `followUp`, `editReply`)
- Usar factory functions para criar mocks tipados: `createMockInteraction(overrides)`
- Nunca testar o discord.js em si — testar o comportamento do command dado uma interação

## 7.4 Quando escrever testes

- `QueueManager` e `QueueState`: testes escritos **junto com a implementação** (fase 3)
- `CatalogSearch`: testes escritos junto com a implementação (fase 2)
- Validators: testes escritos quando o validator é criado
- Commands: testes escritos na fase de hardening (fase 7), depois que o fluxo estabilizou
- Integrações storage: testes escritos quando o repositório é criado

## 7.5 Configuração do Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/music/**', 'src/storage/**', 'src/shared/**'],
      exclude: ['src/discord/**']
    }
  }
});
```

Coverage focado nos módulos de domínio e storage. A camada Discord é testada manualmente.

-----

# 8. CI/CD

## 8.1 Pipeline mínimo (GitHub Actions)

O pipeline roda em todo push e pull request:

1. **Lint:** `eslint` com regras de imports não usados, `any` explícito e organização
1. **Type check:** `tsc --noEmit`
1. **Testes:** `vitest run`
1. **Build:** `tsc` (garante que compila)

## 8.2 Configuração

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

## 8.3 Regra

Nenhum merge acontece com CI vermelho. Isso é inegociável.

-----

# 9. Fases de desenvolvimento

O projeto é construído em **8 fases**. Não pular etapas. Não começar por UI antes do núcleo. Não começar por integrações futuras antes do provider local estar sólido.

Cada fase tem:

- objetivo claro
- entregáveis concretos
- o que fazer e o que NÃO fazer
- critério de saída

-----

## FASE 0 — Fundação

### Objetivo

Criar a base do projeto sem lógica de negócio.

### Entregáveis

- Repositório com Git inicializado
- TypeScript strict configurado
- ESLint + Prettier configurados
- Scripts no package.json: `dev`, `build`, `start`, `lint`, `typecheck`, `test`
- Estrutura inicial de pastas (apenas o necessário)
- `.env.example` com todas as variáveis documentadas
- `src/shared/logger.ts` com pino configurado (JSON, níveis, contexto)
- `src/config/env.ts` com validação de variáveis obrigatórias no boot
- `src/config/paths.ts` com resolução cross-platform
- `src/main.ts` com bootstrap e graceful shutdown
- CI pipeline configurado no GitHub Actions

### Fazer

- tsconfig com `strict: true`, `noUncheckedIndexedAccess: true`
- ESLint com regras para unused imports, explicit `any`, e organização
- Logger que falha se não conseguir inicializar
- Validação de env que impede boot se TOKEN ou MEDIA_ROOT faltarem
- `process.on('SIGINT')` e `process.on('SIGTERM')` para shutdown limpo
- Definir baseline explícito de runtime: Node.js 22.12+; preferencialmente LTS atual em produção
- Configurar CI para validar compatibilidade pelo menos em Node 22 e 24

### NÃO fazer

- Lógica de fila, playback ou catálogo
- Scanner, painel ou providers
- Mais de 3 arquivos na pasta `config/`

### Critério de saída

- `npm run build` compila sem erros
- `npm run lint` passa sem warnings
- CI pipeline verde
- Boot falha com mensagem clara se `.env` estiver incompleto
- Logger produz output JSON com contexto

-----

## FASE 1 — Camada Discord mínima

### Objetivo

Ter o bot conectado e respondendo slash commands básicos.

### Entregáveis

- `src/discord/client.ts` com inicialização do Client
- `src/discord/register-commands.ts` com registro dinâmico
- Command handler genérico que roteia interactions
- `src/discord/commands/ping.ts` (healthcheck)
- `src/discord/commands/status.ts` (info do bot: uptime, guilds, memória)
- Padrão de tipagem para commands
- Resposta padrão para erros de command

### Fazer

- Separar bootstrap do Client da definição de handlers
- Padronizar tipo de retorno dos handlers
- Criar error boundary no command handler (nenhum erro de command derruba o processo)
- Log estruturado por interaction (`guildId`, `userId`, `commandName`)
- Tratamento de `InteractionAlreadyReplied`

### NÃO fazer

- Botões, select menus ou embeds complexos
- Painel ativo
- Qualquer interação com banco

### Critério de saída

- Bot conecta e responde `/ping` e `/status`
- Erros em commands são logados e respondidos ao usuário com mensagem genérica
- Nenhum erro derruba o processo
- Logs mostram guildId e commandName em toda interaction

-----

## FASE 2 — Catálogo local de mídia

### Objetivo

O bot consegue enxergar, validar e indexar músicas locais.

### Entregáveis

- `src/storage/db.ts` com inicialização do SQLite
- Migrations iniciais (tabela de tracks)
- `src/storage/repositories/tracks-repo.ts`
- `src/music/catalog/scanner.ts` (varre pasta recursivamente)
- `src/music/catalog/metadata.ts` (lê tags ID3, fallback para nome de arquivo)
- `src/music/catalog/search.ts` (busca por nome, fuzzy)
- `src/discord/commands/catalogo.ts`
- Testes unitários de `search.ts` e `metadata.ts`
- Testes de integração de `tracks-repo.ts` com SQLite in-memory

### Fazer

- Definir extensões aceitas (`.mp3`, `.flac`, `.ogg`, `.wav`, `.m4a`, `.opus`)
- Normalizar nomes para busca (lowercase, sem acentos, sem caracteres especiais)
- Gerar ID interno por faixa (hash do path relativo)
- Salvar duração quando possível
- Tratar arquivos inválidos sem quebrar o scan inteiro (log + skip)
- Evitar reindexação duplicada (checar por hash antes de inserir)
- Reindexação incremental: detectar arquivos novos, removidos e alterados
- Diferenciar desde já configuração persistente de estado efêmero operacional: catálogo e metadados podem persistir; fila, playback e painel não

### NÃO fazer

- Tocar música
- Provider do Spotify ativo
- Organização manual por álbum/artista obrigatória

### Critério de saída

- Scanner varre pasta e indexa corretamente
- `/catalogo` mostra faixas indexadas com paginação
- Arquivos problemáticos são logados e ignorados
- Testes de search e metadata passam
- CI verde

-----

## FASE 3 — Fila por guild

### Objetivo

Construir a fila como domínio central do sistema, testada e isolada.

### Entregáveis

- `src/music/queue/queue-state.ts` (estrutura de dados da fila)
- `src/music/queue/queue-manager.ts` (operações sobre a fila)
- `src/music/queue/history.ts` (histórico recente in-memory)
- Testes unitários completos do QueueManager

### Modelo de item de fila

Cada item deve conter:

- `id`: identificador único do item na fila (UUID)
- `trackId`: referência à faixa no catálogo
- `title`: título para exibição
- `duration`: duração em segundos (opcional)
- `filePath`: caminho do arquivo
- `requestedBy`: userId de quem solicitou
- `addedAt`: timestamp de entrada na fila

### Operações obrigatórias

- `enqueue(item)`: adiciona ao final
- `dequeue()`: remove e retorna o próximo
- `current()`: retorna a faixa atual sem remover
- `skip()`: avança para próxima
- `removeAt(position)`: remove por posição
- `moveTo(from, to)`: reordena
- `shuffle()`: embaralha apenas o restante (não a atual)
- `clear()`: limpa tudo
- `setLoopMode(mode)`: none, track, queue
- `size()`: tamanho da fila
- `isEmpty()`: checagem rápida
- `toArray()`: snapshot para exibição

### Regras

- Fila é isolada por guild (um Map de guildId para QueueState)
- Current track é modelada explicitamente (não é `queue[0]`)
- Histórico não é a fila — é um buffer circular separado
- Repetição de track não duplica na fila, apenas reusa o current
- Repetição de queue reinsere ao final quando dequeue acontece
- Operações inválidas (remover de fila vazia, posição inexistente) retornam erro tipado, não lançam exceção

### Fazer

- Definir tipos fortes para `QueueItem`, `LoopMode`, `QueueOperationResult`
- Garantir que todas as operações são puras e testáveis
- Criar pelo menos 20 testes cobrindo todos os casos de borda
- Testar: fila vazia, fila com 1 item, shuffle com 1 item, loop modes, move para mesma posição

### NÃO fazer

- Acoplar fila ao Discord (nenhum import de discord.js)
- Acoplar fila ao embed ou ao painel
- Persistir fila em banco na v1

### Critério de saída

- Todas as operações implementadas e testadas
- Zero dependência do Discord
- Testes passam no CI
- Operações inválidas falham de forma previsível e tipada

-----

## FASE 4 — Playback e conexão de voz

### Objetivo

Tocar arquivos locais com segurança e previsibilidade.

### Entregáveis

- `src/music/playback/connection-manager.ts`
- `src/music/playback/audio-resource.ts`
- `src/music/playback/player-manager.ts`
- `src/music/playback/idle-handler.ts`

### Responsabilidades

**ConnectionManager:** entrar, sair, reconectar e observar a conexão de voz. Trata lifecycle events (ready, disconnected, destroyed). Implementa reconnect com backoff.

**AudioResource:** criação de AudioResource a partir de um path. Validação de existência do arquivo antes de criar. Detecção de FFmpeg.

**PlayerManager:** tocar, pausar, retomar, parar. Observa eventos do AudioPlayer (idle, error). Quando idle, pede a próxima faixa ao QueueManager. Quando erro, loga, notifica e tenta a próxima.

**IdleHandler:** monitora inatividade. Se o bot ficar sem reproduzir por X minutos (configurável, default 5), desconecta automaticamente e limpa estado.

### Fazer

- Separar claramente conexão e playback (são lifecycles diferentes)
- Tratar erro de arquivo individual sem matar a fila inteira (log + skip)
- Skip automático em erro reproduzível (arquivo corrompido, FFmpeg crash)
- Limite de skips consecutivos por erro (evitar loop infinito de faixas ruins)
- Cleanup completo ao desconectar (destroy player, limpar fila, cancelar timers)
- Log estruturado em toda transição de estado
- Evitar operações síncronas pesadas nas rotas quentes de interação e reprodução; qualquer trabalho custoso deve acontecer fora do fluxo crítico do player

### NÃO fazer

- Painel completo
- Controles visuais antes da estabilidade do playback
- Volume control complexo (apenas volume simples do AudioPlayer)

### Critério de saída

- Bot toca uma faixa local
- Avança automaticamente para a próxima
- Sai do canal após timeout de inatividade
- Lida com falhas de arquivo sem travar
- Log mostra toda transição de estado do player

-----

## FASE 5 — Commands de música

### Objetivo

Entregar a primeira versão funcional para uso real.

### Commands desta fase

**Núcleo:**

- `/tocar [busca]` — busca no catálogo, enfileira e toca
- `/fila` — mostra a fila atual com paginação
- `/agora` — mostra a faixa tocando
- `/pausar` — pausa reprodução
- `/retomar` — retoma reprodução
- `/pular` — pula para próxima
- `/parar` — para reprodução e limpa fila
- `/sair` — desconecta do canal de voz

**Secundários:**

- `/remover [posição]` — remove faixa da fila
- `/mover [de] [para]` — reordena faixa na fila
- `/embaralhar` — embaralha o restante da fila
- `/repetir [modo]` — alterna loop mode (nenhum/faixa/fila)
- `/volume [valor]` — ajusta volume (0-100)
- `/catalogo [busca?]` — lista/busca no catálogo
- `/historico` — mostra últimas faixas tocadas

### Regras gerais de commands

- Nome curto e sem ambiguidade
- Resposta previsível e consistente
- Validação clara antes de agir (usuário está em canal de voz? bot está tocando?)
- Sem efeitos colaterais ocultos
- `deferReply()` se a operação pode demorar
- Mensagens de erro amigáveis e informativas
- Guards compartilhados para validações comuns

### Guards reutilizáveis

Criar funções de validação compartilhadas:

- `requireVoiceChannel(interaction)`: usuário deve estar em canal de voz
- `requireSameChannel(interaction)`: usuário deve estar no mesmo canal que o bot
- `requirePlaying(guildId)`: bot deve estar tocando algo
- `requireQueue(guildId)`: fila não pode estar vazia

### Fazer

- Ligar command handler ao QueueManager e PlayerManager
- Padronizar respostas de sucesso e erro (mensagem + emoji consistente)
- Guards como funções que retornam `Result<void, string>`, não que lançam exceções
- Autocomplete no `/tocar` usando CatalogSearch

### NÃO fazer

- UI excessiva, filtros cosméticos ou subcomandos desnecessários
- Persistência de guild settings antes da fase 6

### Critério de saída

- Usuário consegue tocar música e controlar fila por commands
- Fluxo principal estável
- Erros comuns cobertos
- Autocomplete funciona no `/tocar`
- CI verde

-----

## FASE 6 — Painel e persistência

### Objetivo

Painel visual durante reprodução + persistência das informações que realmente importam.

### Painel

**Entregáveis:**

- Embed de now playing (título, duração, quem pediu, próxima na fila)
- Botões: pausar/retomar, pular, parar, repetir, embaralhar, ver fila
- Select menu opcional para ações na fila
- Atualização controlada do painel (debounce, rate limit de edits)
- Encerramento do painel quando reprodução termina

**Fazer:**

- Criar factories de embed reutilizáveis
- Handlers específicos para buttons e select menus
- Validar `customId` com namespace (`music:pause`, `music:skip`)
- Validar contexto do usuário (está no canal? bot está tocando?)
- Debounce de updates (Discord tem rate limit de edits por mensagem)
- Painel é efêmero e derivado do estado — se o bot reiniciar, o painel antigo é ignorado

**NÃO fazer:**

- Painel como fonte de verdade
- Persistir estado do painel em banco
- Painel carregando regras de negócio

### Persistência

**Entregáveis:**

- `src/storage/repositories/guild-settings-repo.ts`
- Migration para tabela de guild settings
- Persistir: volume padrão por guild, loop mode preferido

**O que NÃO persistir na v1:**

- Fila ativa (é efêmera por natureza)
- Estado exato de reprodução mid-track
- Estado do painel

**Regra de modelagem:**

Persistir apenas configuração durável e intencional do sistema. Estado operacional efêmero continua somente em memória.

### Critério de saída

- Painel aparece com música tocando e reflete estado real
- Painel some ou desativa quando reprodução termina
- Botões funcionam e validam contexto
- Volume e loop mode sobrevivem a reinício
- Catálogo sobrevive a reinício

-----

## FASE 7 — Hardening

### Objetivo

Endurecer o sistema para uso contínuo e confiável.

### Entregáveis

- Tratamento robusto de exceções em todo o fluxo
- Logs melhorados com contexto em todo ponto crítico
- Testes unitários dos módulos que ainda não tinham
- Testes manuais documentados como checklist no README
- Rate limiting de commands por usuário (cooldown)
- Proteção contra spam de botões
- Normalização de respostas de erro (mensagens consistentes)
- Graceful degradation: bot funciona mesmo com catálogo vazio

### Cenários obrigatórios de teste

- Arquivo inválido ou corrompido
- Arquivo removido do disco após indexação
- FFmpeg ausente ou com versão incompatível
- Usuário fora do canal de voz
- Usuário em canal diferente do bot
- Fila vazia em operação que exige fila
- Duas interações simultâneas no mesmo guild
- Reinício do bot com catálogo existente
- Bot em múltiplos guilds simultaneamente
- Teste em Linux e Windows

### Fazer

- Revisar todo `try/catch` — nenhum deve engolir erro sem log
- Adicionar métricas simples ao `/status` (tracks indexadas, guilds ativas, uptime)
- Documentar todos os cenários de teste manual no README
- Adicionar `--max-old-space-size` no script de start se necessário

### Critério de saída

- Principais cenários de erro previsíveis e tratados
- Bot não entra em estado zumbi
- Nenhum erro não-tratado no log após 1h de uso contínuo
- Testes unitários com cobertura >80% em `music/` e `storage/`
- CI verde, lint limpo, zero `any` explícito no código

-----

## FASE 8 — Polimento e release

### Objetivo

Preparar o projeto para uma primeira release utilizável.

### Entregáveis

- README completo: o que é, como instalar, como configurar, como rodar
- Instruções de instalação para Linux e Windows
- Checklist de deploy
- Checklist de configuração do bot no Discord (permissões, intents, scopes)
- Scripts de start (`npm start`) e dev (`npm run dev` com hot reload)
- Revisão geral: lint, imports, nomes, responsabilidades
- Limpeza de código morto
- Tag de release no Git

### Preparação para expansão futura

Nesta fase, e somente nesta fase, considerar se faz sentido extrair uma interface `Provider` para o sistema de reprodução. **A decisão depende de haver plano concreto** de adicionar Spotify ou YouTube em breve.

Se sim: criar a interface e refatorar `LocalFileProvider` para implementá-la.

Se não: não criar. O código já está modular o suficiente para essa extração ser trivial quando necessária.

A regra é: **não criar abstração sem consumidor real**.

### Critério final

O projeto está pronto para release quando:

- Fluxo principal estável em uso real
- Boot falha cedo e claro quando algo crítico falta
- Commands principais padronizados e documentados
- Sem duplicação estrutural óbvia
- Sem módulo sem propósito claro
- README permite que alguém novo rode o bot do zero
- CI verde, testes passando, lint limpo

-----

# 10. DOs — Faça

### Arquitetura

- Mantenha responsabilidades separadas por módulo e por arquivo
- Use a regra de dependência (seção 3.4) como lei
- Deixe o domínio (`music/`) independente do Discord
- Trate o painel como reflexo do estado, nunca como fonte de verdade

### Qualidade de código

- Valide env no boot — fail fast
- Trate erros cedo e com contexto
- Nomeie coisas pelo que fazem, não pelo que são
- Escreva funções pequenas com intenção clara
- Use tipos fortes — `strict: true`, sem `any` explícito
- Prefira composição a herança
- Prefira clareza a esperteza

### Logging e observabilidade

- Use logging estruturado (JSON, contexto de guild/command/track)
- Logue toda transição de estado do player
- Logue erros com o erro original (`{ err }`)
- Defina níveis de log consistentes

### Testes

- Escreva testes junto com a implementação dos módulos de domínio
- Teste todos os casos de borda da fila
- Mantenha testes rápidos (< 5s para a suite inteira)
- Documente cenários de teste manual como checklist

### Manutenção

- Remova código morto no mesmo commit em que ele morre
- Centralize regras importantes em um único lugar
- Documente workarounds com motivo e condição de remoção
- Rode CI em todo push

-----

# 11. DON’Ts — Não faça

### Arquitetura

- Não crie abstração sem consumidor real (sem provider genérico na v1)
- Não crie módulos com nomes vagos (`core`, `engine`, `base`, `common`)
- Não faça command falar direto com banco e player ao mesmo tempo
- Não deixe embed decidir regra de fila ou playback
- Não carregue dependência de provider futuro na rota principal da v1
- Não persista estado efêmero (fila, painel)

### Qualidade de código

- Não duplique lógica de validação em vários commands — extraia guards
- Não deixe `try/catch` gigante engolindo erro sem contexto
- Não retorne `any` onde um tipo claro pode existir
- Não deixe comentários desatualizados
- Não crie helper genérico demais (se serve pra tudo, não serve pra nada)
- Não deixe TODO sem prazo e sem condição de remoção
- Não esconda bug com fallback silencioso
- Não use `as any` para “resolver” erro de tipo

### Performance e segurança

- Não indexe catálogo inteiro a cada `/tocar` — use cache em memória
- Não permita que botão aja sem validação de contexto
- Não permita que qualquer usuário controle o bot de outro canal
- Não faça operações síncronas pesadas na thread principal em rotas quentes/interativas

### Organização

- Não crie barrel files (`index.ts`) prematuramente
- Não crie import circular
- Não instale lib para resolver problema que 10 linhas de código resolvem
- Não pule fase do roadmap

-----

# 12. Política de refatoração

## 12.1 Quando refatorar

Refatore quando houver pelo menos um destes sinais:

- arquivo grande com múltiplas responsabilidades
- duplicação real de lógica (mesma regra em 3+ lugares)
- nomes confusos que dificultam leitura
- regra importante espalhada em vários pontos
- command conhecendo detalhes internos de voice connection
- embed precisando entender domínio
- ifs excessivos cobrindo casos que deveriam estar modelados
- teste impossível de escrever sem refatorar

## 12.2 Quando NÃO refatorar

- “Parece mais bonito” sem dor real
- “Talvez no futuro” sem necessidade atual
- Feature ainda não foi terminada
- Código está simples e claro, só não está “sofisticado”
- Refatoração não reduz risco, acoplamento ou duplicação

## 12.3 Regra de ouro

**Primeiro estabilize o fluxo, depois reorganize o que doeu.**

-----

# 13. Política contra código morto

## 13.1 O que é código morto

- função nunca chamada
- import não usado
- enum nunca consumido
- classe que sobrou de refatoração
- flag que nunca muda
- caminho alternativo que não pode mais acontecer
- arquivo sem referência

## 13.2 Regra operacional

Quando uma feature nova matar uma antiga, remova a antiga no mesmo commit. O controle de histórico é Git, não arquivo morto no projeto.

## 13.3 Checklist periódico

Revisar a cada fase:

- imports sem uso
- arquivos órfãos
- handlers não registrados
- repos não utilizados
- comandos não expostos
- tipos antigos sem referência

ESLint com `no-unused-vars` e `no-unused-imports` pega a maioria automaticamente.

-----

# 14. Política contra duplicação

## 14.1 Nem toda semelhança é duplicação ruim

Não extraia cedo demais só porque dois blocos parecem parecidos.

Duplicação ruim é quando a mesma regra de negócio aparece em mais de um lugar, o mesmo fluxo de validação existe em vários commands, ou a mesma transformação é refeita com diferenças inúteis.

## 14.2 Regra dos três

Duplicação aceitável: dois lugares. Na terceira repetição, pare e extraia.

-----

# 15. Política de imports e dependências

## 15.1 Imports

- sem import não usado (ESLint garante)
- sem import circular (criar regra de lint ou usar `madge`)
- sem barrel file prematuro só por estética
- respeitar a regra de dependência entre módulos (seção 3.4)

## 15.2 Dependências externas

Antes de instalar uma nova lib, pergunte:

- resolve dor real?
- está madura e mantida?
- o ganho justifica o peso?
- 20 linhas de código próprio resolveriam?

Preferir menos dependências, mas boas. Não lotar o projeto de libs para problemas pequenos.

-----

# 16. Modelagem da fila — referência rápida

```typescript
interface QueueItem {
  id: string;           // UUID
  trackId: string;      // referência ao catálogo
  title: string;        // para exibição
  duration?: number;    // segundos
  filePath: string;     // path do arquivo
  requestedBy: string;  // userId
  addedAt: number;      // timestamp
}

type LoopMode = 'none' | 'track' | 'queue';

interface QueueState {
  current: QueueItem | null;
  items: QueueItem[];
  loopMode: LoopMode;
  history: QueueItem[];  // buffer circular, max ~50
}
```

Regras: fila por guild, current explícito, histórico separado, loop não bagunça posições.

-----

# 17. Sinais de arquitetura saudável

Você está no caminho certo quando:

- adicionar um command novo não exige mexer em 10 arquivos
- fila e playback podem ser testados sem Discord real
- o painel pode quebrar e o player continuar íntegro
- o scanner pode reindexar sem afetar playback atual
- cada módulo tem fronteira clara
- bugs são localizáveis rapidamente
- CI está verde e a suite de testes roda em menos de 10s
- um desenvolvedor novo entende a estrutura em 15 minutos

-----

# 18. Sinais de arquitetura se degradando

Você está indo mal quando:

- tudo importa tudo (dependência circular)
- command conhece detalhes internos de voice connection
- embed decide regra de fila
- handlers de botão viram mini aplicações caóticas
- lógica repetida em 3+ commands
- corrigir um bug exige editar 5+ arquivos
- ninguém sabe quem é a fonte de verdade do estado
- CI está quebrado há mais de um dia
- testes novos não são escritos há semanas

-----

# 19. Prioridade oficial do projeto

1. **Funcionamento correto** — faz o que deveria fazer
1. **Previsibilidade** — se comporta de forma consistente
1. **Clareza** — é legível e compreensível
1. **Testabilidade** — pode ser verificado automaticamente
1. **Manutenibilidade** — pode ser modificado com confiança
1. **Expansibilidade** — pode crescer sem reescrever
1. **Sofisticação** — refinamentos estéticos e de UX

Nunca inverter essa ordem. Projeto bom não é o que parece complexo. Projeto bom é o que continua íntegro depois de crescer.

-----

# 20. Mandamento operacional

Sempre que surgir dúvida entre fazer rápido e bagunçado ou fazer um pouco mais devagar e estruturalmente correto, escolha o segundo — desde que não vire perfeccionismo paralisante.

A construção ideal deste projeto não é caótica nem excessivamente acadêmica. Ela é disciplinada.

E disciplina inclui saber quando parar de planejar e começar a codar.
