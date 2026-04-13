import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

import { DEFAULT_LOG_LEVEL } from './constants';

loadDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN e obrigatorio'),
  DISCORD_GUILD_ID: z.string().optional(),
  MEDIA_ROOT: z.string().min(1, 'MEDIA_ROOT e obrigatorio'),
  DB_PATH: z.string().default('./data/bot.db'),
  FFMPEG_PATH: z.string().optional(),
  PLAYER_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default(DEFAULT_LOG_LEVEL)
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Falha ao validar variaveis de ambiente: ${details}`);
  }

  return parsed.data;
}
