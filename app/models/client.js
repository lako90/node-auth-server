const { Sequelize, sequelize } = require('../libraries/database');

const Client = sequelize.define('client', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },

  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

Client.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const User = require('./user');
  const Group = require('./group');
  const Authorization = require('./authorization');
  const Permission = require('./permission');
  /* eslint-enable import/no-dynamic-require, global-require */

  Client.hasMany(User);
  Client.hasMany(User, { as: 'owner', foreignKey: 'ownerId' });

  // As owner
  Client.hasMany(Group);
  Client.hasMany(Authorization);
  Client.hasMany(Permission);
};


module.exports = Client;
