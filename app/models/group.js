const { Sequelize, sequelize } = require('../libraries/database');

const Group = sequelize.define('group', {
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

Group.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const Role = require('./role');
  const Tenant = require('./tenant');
  /* eslint-enable import/no-dynamic-require, global-require */

  Group.hasMany(Role);

  Group.belongsTo(Tenant);
};


module.exports = Group;
