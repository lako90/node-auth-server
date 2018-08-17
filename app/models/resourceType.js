const { Sequelize, sequelize } = require('../libraries/database');

const ResourceType = sequelize.define('resourceType', {
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

ResourceType.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const Permission = require('./permission');
  /* eslint-enable import/no-dynamic-require, global-require */

  ResourceType.hasMany(Permission);
};


module.exports = ResourceType;
