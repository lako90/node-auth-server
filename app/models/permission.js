const { Sequelize, sequelize } = require('../libraries/database');

const Permission = sequelize.define('permission', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },

  consent: {
    type: Sequelize.ENUM,
    values: ['read', 'edit', 'create'],
    allowNull: false,
  },

  limit: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
});

Permission.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const Tenant = require('./tenant');
  const ResourceType = require('./resourceType');
  const Authorization = require('./authorization');
  /* eslint-enable import/no-dynamic-require, global-require */

  Permission.belongsTo(Tenant);
  Permission.belongsTo(ResourceType);
  Permission.belongsToMany(Authorization, { through: 'PermissionAuthorization' });
};


module.exports = Permission;
