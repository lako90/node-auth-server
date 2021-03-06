const { Sequelize, sequelize } = require('../libraries/database');

const Authorization = sequelize.define('authorization', {
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

Authorization.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const Tenant = require('./tenant');
  const Role = require('./role');
  const Permission = require('./permission');
  /* eslint-enable import/no-dynamic-require, global-require */

  Authorization.belongsTo(Tenant);
  Authorization.belongsToMany(Role, { through: 'AuthorizationRole' });
  Authorization.belongsToMany(Permission, { through: 'PermissionAuthorization' });
};


module.exports = Authorization;
