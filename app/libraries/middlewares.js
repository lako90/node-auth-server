const isEqual = require('lodash/isEqual');
const Group = require('../models/group');

const checkAdministrator = async user => await user.get('superadmin');

const checkClient = async (user) => {
  try {
    return await user.getClient() || false;
  } catch (err) {
    return false;
  }
};

const checkAuthorizations = permissions => async (req, res, next) => {
  const { user } = res.locals;
  const checkPermissions = [];
  const requiredPermissions = Array.isArray(permissions)
    ? permissions
    : [permissions];

  /**
   * Administrator (CircleGarage)
   */
  if (requiredPermissions.includes('administrator')) {
    if (await checkAdministrator(user)) {
      checkPermissions.push('administrator');
    }
  }

  /**
   * Client
   */
  if (requiredPermissions.includes('client')) {
    const client = await checkClient(user);

    if (client) {
      res.locals.client = client; // eslint-disable-line no-param-reassign
      checkPermissions.push('client');
    }
  }

  return isEqual(requiredPermissions, checkPermissions)
    ? next()
    : res.status(403).send({
      error: 'Permission denied',
    });
};

const groupSelected = async (req, res, next) => {
  const { 'group-id': groupId } = req.headers;
  const { client } = res.locals;

  const group = await Group.findById(groupId);

  if (group && await client.hasGroup(group)) {
    res.locals.group = group; // eslint-disable-line no-param-reassign

    return next();
  }

  return res.status(403).send({
    error: 'Valid Group ID required in header',
  });
};

module.exports = {
  checkAuthorizations,
  groupSelected,
};
