const bcrypt = require('bcrypt');
const config = require('config');
const jwt = require('jsonwebtoken');

const { Sequelize, sequelize } = require('../libraries/database');

const ResourceType = require('./resourceType');
const Permission = require('./permission');
const Authorization = require('./authorization');
const Group = require('./group');

const User = sequelize.define('user', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },

  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },

  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  superadmin: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
}, {
  hooks: {
    beforeCreate: async user => (
      user.set(
        'password',
        await bcrypt.hash(user.password, bcrypt.genSaltSync(8)),
      )
    ),
  },
});


User.associate = () => {
  /* eslint-disable import/no-dynamic-require, global-require */
  const Role = require('./role');
  const Client = require('./client');
  /* eslint-enable import/no-dynamic-require, global-require */

  User.belongsTo(Role);
  User.belongsTo(Client); // User is client
  User.belongsTo(Client, { as: 'owned', foreignKey: 'ownerId' }); // Which client owned
};


User.prototype.validatePassword = function validatePassword(password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.generateTokens = function generateTokens() {
  const {
    accessToken: {
      expiresIn: accessExpiresIn,
      secret: accessSecret,
    },
    refreshToken: {
      expiresIn: refreshExpiresIn,
      secret: refreshSecret,
    },
  } = config.get('jwt');

  return {
    accessToken: jwt.sign({
      email: this.email,
      id: this.id,
    }, accessSecret, { expiresIn: accessExpiresIn }),
    refreshToken: jwt.sign({
      email: this.email,
      id: this.id,
    }, refreshSecret + this.password, { expiresIn: refreshExpiresIn }),
  };
};

User.prototype.toAuthJSON = async function toAuthJSON() {
  const { accessToken, refreshToken } = this.generateTokens();

  const [client, role] = await Promise.all([
    this.getClient({
      attributes: ['name'],
    }),
    this.getRole({
      attributes: ['name', 'admin'],
      include: [
        {
          model: Group,
          attributes: ['name'],
        },
        {
          model: Authorization,
          attributes: ['name'],
          include: [
            {
              model: Permission,
              attributes: ['consent', 'limit'],
              include: [
                {
                  model: ResourceType,
                  attributes: ['name'],
                },
              ],
            },
          ],
        },
      ],
    }),
  ]);

  return {
    id: this.id,
    name: this.name,
    email: this.email,
    accessToken,
    refreshToken,
    role,
    client,
  };
};

module.exports = User;
