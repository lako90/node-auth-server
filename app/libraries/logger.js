const config = require('config');
const { createLogger, format, transports } = require('winston');

const {
  colorize,
  combine,
  printf,
  timestamp,
} = format;

const { level, silent } = config.get('logger');

// Log levels:
// { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }

const logger = createLogger({
  level,
  silent,
  format: combine(
    colorize(),
    timestamp(),
    printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger;
