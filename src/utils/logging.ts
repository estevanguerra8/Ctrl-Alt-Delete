const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

const currentLevel = process.env.LOG_LEVEL === 'DEBUG' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, message: string, ...args: any[]): string {
  const timestamp = formatTimestamp();
  const argsStr = args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
  return `[${timestamp}] [${level}] ${message}${argsStr}`;
}

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', message, ...args));
    }
  },
  info: (message: string, ...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, ...args));
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, ...args));
    }
  },
  error: (message: string, ...args: any[]) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, ...args));
    }
  },
};

