import { env } from '../env'

type Level = 'debug' | 'info' | 'warn' | 'error'

type Fields = Record<string, unknown>

function emit(level: Level, msg: string, fields?: Fields) {
  const record = {
    level,
    time: new Date().toISOString(),
    msg,
    env: env.NODE_ENV,
    ...fields,
  }
  const line = JSON.stringify(record)
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit('debug', msg, fields),
  info: (msg: string, fields?: Fields) => emit('info', msg, fields),
  warn: (msg: string, fields?: Fields) => emit('warn', msg, fields),
  error: (msg: string, fields?: Fields) => emit('error', msg, fields),
}

export type Logger = typeof logger
