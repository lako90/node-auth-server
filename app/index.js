const fs = require('fs');
const http = require('http');
const path = require('path');
const config = require('config');
const morgan = require('morgan');
const express = require('express');
const socket = require('socket.io');
const passport = require('passport');
const bodyParser = require('body-parser');
const omit = require('lodash/omit');

const { sync } = require('./libraries/database');
const logger = require('./libraries/logger');

const User = require('./models/user');

const AbstractController = require('./controllers');

const environment = config.get('environment');
const adminUserConfig = config.get('databases.uaa.adminUser');

require('./libraries/passport');

class AuthServer {
  constructor() {
    this.initServer();
    this.initMiddlewares();
    this.initRoutes();
  }

  initServer() {
    this.app = express();
    this.server = http.Server(this.app);
    this.io = socket(this.server);

    this.server.on('error', error => AuthServer.handleServerError(error));

    logger.silly('Server initialized');
  }

  static handleServerError(error) {
    logger.error('Server error');
    logger.debug(error.message);
  }

  initMiddlewares() {
    this.app.use(morgan(config.get('server.logFormat'), {
      skip: (req, res) => res.statusCode >= 400,
      stream: { write: message => logger.info(message) },
    }));

    this.app.use(morgan(config.get('server.logFormat'), {
      skip: (req, res) => res.statusCode < 400,
      stream: { write: message => logger.warn(message) },
    }));

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));

    this.app.use(passport.initialize());

    passport.serializeUser((user, callback) => {
      callback(null, user);
    });

    logger.silly('Middlewares initialized');
  }

  importRoutesFromDirectory(controllersDir, basePath, firstImport = false) {
    const folderPath = path.join(controllersDir, basePath);

    fs
      .readdirSync(folderPath)
      .filter(filename => !firstImport || filename !== 'index.js')
      .forEach((filename) => {
        const filePath = path.join(folderPath, filename);
        const urlPath = `${basePath}/${filename.replace('.js', '')}`;

        if (fs.statSync(filePath).isDirectory()) {
          this.importRoutesFromDirectory(controllersDir, urlPath);

          return;
        }

        const controllerFile = path.join(folderPath, filename);
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const Controller = require(controllerFile);

        this.app.use(urlPath, new Controller(this.io).router);
      });
  }

  initRoutes() {
    const controllersDir = path.join(__dirname, 'controllers', 'api');

    this.importRoutesFromDirectory(controllersDir, '', true);

    this.app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

    this.app.use(AbstractController.handle404);
    this.app.use(AbstractController.handle500);

    logger.silly('Routes initialized');
  }

  async listen({ server: serverOptions, db: dbOptions } = {}) {
    // Admin seeder
    try {
      await sync(dbOptions);
      const { name, password, email } = adminUserConfig;

      if (!await User.findOne({ where: omit(adminUserConfig, 'password') })) {
        await User.create(adminUserConfig);
      }

      logger.info(`
        Admin user created.
          name: ${name}
          password: ${password}
          email: ${email}
      `);
    } catch (error) {
      logger.error(error);
      this.close();
    }

    // Server listening
    const port = (serverOptions && serverOptions.port) || config.get('server.port');

    await new Promise((resolve, reject) => {
      this.server.listen(port, () => resolve());
      this.server.once('error', error => reject(error));
    });

    // Logs is awesome
    logger.silly('Database synced');
    if (environment === 'development') {
      logger.silly('Global seeder');
    }
    logger.info(`Server listening on port ${port}`);
  }

  async close() {
    await new Promise((resolve, reject) =>
      this.server.close(err => (err ? reject(err) : resolve())));
  }
}

module.exports = AuthServer;
