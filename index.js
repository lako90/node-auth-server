const HirisUAA = require('./app');

const logger = require('./app/libraries/logger');

const app = new HirisUAA();

try {
  app.listen();
} catch (error) {
  logger.error('Error while starting the application');
  logger.error(error);
}
