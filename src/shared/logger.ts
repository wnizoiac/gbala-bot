import pino, { type Logger } from 'pino';

import { APP_NAME, APP_VERSION } from '../config/constants';
import type { AppEnv } from '../config/env';

export function createLogger(env: AppEnv): Logger {
  try {
    return pino({
      level: env.LOG_LEVEL,
      base: {
        app: APP_NAME,
        version: APP_VERSION,
        env: env.NODE_ENV,
        pid: process.pid
      },
      timestamp: pino.stdTimeFunctions.isoTime
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';
    throw new Error(`Falha ao inicializar logger: ${message}`);
  }
}
