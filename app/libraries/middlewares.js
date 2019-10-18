const isEqual = require('lodash/isEqual');
const Group = require('../models/group');

const checkAdministrator = async user => await user.get('superadmin');

const checkTenant = async (user) => {
  try {
    return await user.getTenant() || false;
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
   * Administrator
   */
  if (requiredPermissions.includes('administrator')) {
    if (await checkAdministrator(user)) {
      checkPermissions.push('administrator');
    }
  }

  /**
   * Tenant
   */
  if (requiredPermissions.includes('tenant')) {
    const tenant = await checkTenant(user);

    if (tenant) {
      res.locals.tenant = tenant; // eslint-disable-line no-param-reassign
      checkPermissions.push('tenant');
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
  const { tenant } = res.locals;

  const group = await Group.findById(groupId);

  if (group && await tenant.hasGroup(group)) {
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
