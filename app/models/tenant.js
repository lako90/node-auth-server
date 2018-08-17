const { Sequelize, sequelize } = require('../libraries/database');

const Tenant = sequelize.define('tenant', {
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

Tenant.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const User = require('./user');
  const Group = require('./group');
  const Authorization = require('./authorization');
  const Permission = require('./permission');
  /* eslint-enable import/no-dynamic-require, global-require */

  Tenant.hasMany(User);
  Tenant.hasMany(User, { as: 'owner', foreignKey: 'ownerId' });

  // As owner
  Tenant.hasMany(Group);
  Tenant.hasMany(Authorization);
  Tenant.hasMany(Permission);
};


module.exports = Tenant;
