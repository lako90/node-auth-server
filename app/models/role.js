const { Sequelize, sequelize } = require('../libraries/database');

const Role = sequelize.define('role', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },

  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  admin: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

Role.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const User = require('./user');
  const Group = require('./group');
  const Authorization = require('./authorization');
  /* eslint-enable import/no-dynamic-require, global-require */

  Role.hasMany(User);

  Role.belongsTo(Group);
  Role.belongsToMany(Authorization, { through: 'AuthorizationRole' });
};


module.exports = Role;
