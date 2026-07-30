import pino from 'pino';

const loggerOptions: pino.LoggerOptions = {
  level: process.env.AICR_LOG_LEVEL || 'info',
};

if (process.env.NODE_ENV !== 'production') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(loggerOptions);
