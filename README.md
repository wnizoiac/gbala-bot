# gbala-bot

Bot de musica para Discord em TypeScript, iniciado com arquitetura de monolito modular.

## Status atual

Fase 0 (Fundacao) concluida:

- TypeScript strict com noUncheckedIndexedAccess
- ESLint + Prettier configurados
- Scripts dev, build, start, lint, typecheck e test
- Validacao de ambiente no boot
- Logger estruturado em JSON com pino
- Bootstrap com graceful shutdown
- CI GitHub Actions em Node 22 e 24

## Requisitos

- Node.js 22.12+
- npm 10+

## Configuracao

1. Copie .env.example para .env
2. Preencha DISCORD_TOKEN
3. Ajuste MEDIA_ROOT e DB_PATH se necessario
4. Garanta que a pasta definida em MEDIA_ROOT exista

## Scripts

- npm run dev: inicia em modo watch
- npm run build: compila para dist
- npm start: executa build compilada
- npm run lint: valida estilo e boas praticas
- npm run typecheck: verifica tipagem sem emitir artefatos
- npm run test: executa testes com Vitest

## Estrutura inicial

- src/config: env, paths e constantes
- src/shared: logger
- src/main.ts: bootstrap do processo
- tests: testes iniciais
- .github/workflows/ci.yml: pipeline de qualidade
