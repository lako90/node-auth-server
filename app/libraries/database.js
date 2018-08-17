const fs = require('fs');
const path = require('path');
const config = require('config');
const Sequelize = require('sequelize');

const logger = require('./logger');

const configDatabase = Object.assign({}, config.get('databases.uaa'));

configDatabase.logging = logger.debug;

let { url } = configDatabase;

if (
  url
  && configDatabase.dialect === 'postgres'
  && configDatabase.dialectOptions
  && configDatabase.dialectOptions.ssl
  && !url.includes('?ssl=')
) {
  url += '?ssl=true';
}

if (configDatabase.dialect === 'postgres') {
  configDatabase.operatorsAliases = false;
}

const sequelize = url ? new Sequelize(url, configDatabase) : new Sequelize(configDatabase);

const sync = async (options) => {
  const modelsFolder = path.join(__dirname, '..', 'models');

  fs
    .readdirSync(modelsFolder)
    .filter(filename => filename !== 'index.js' && filename.substr(-3) === '.js')
    // eslint-disable-next-line import/no-dynamic-require, global-require
    .map(filename => require(path.join(modelsFolder, filename)))
    .map(Model => Model.associate && Model.associate());

  const syncOptions = options || {};

  return sequelize.sync(syncOptions);
};

module.exports = { Sequelize, sequelize, sync };
