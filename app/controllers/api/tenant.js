const AbstractController = require('..');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations } = require('../../libraries/middlewares');

const Tenant = require('../../models/tenant');
const Role = require('../../models/role');
const User = require('../../models/user');
const Permission = require('../../models/permission');

class TenantController extends AbstractController {
  initRouter() {
    const {
      getTenants,
      postTenant,
      putTenant,
      deleteTenant,
    } = TenantController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      getTenants,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      postTenant,
    );

    this.router.put(
      '/:tenantId',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      putTenant,
    );

    this.router.delete(
      '/:tenantId',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      deleteTenant,
    );
  }

  /**
   * Get Tenants
   */
  static async getTenants(req, res) {
    const tenants = await Tenant.findAll({
      attributes: ['id', 'name'],
    });

    return res.json({ tenants });
  }

  /**
   * Insert Tenant
   */
  static async postTenant(req, res) {
    const { tenant, usersId } = req.body;

    if (!tenant.name) {
      return res.status(422).json({
        errors: {
          name: 'is required',
        },
      });
    }

    try {
      const newTenant = await Tenant.create(tenant);
      TenantController.setTenantUsers(newTenant, usersId);

      return res.status(200).json({
        tenant: newTenant,
      });
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit Tenant
   */
  static async putTenant(req, res) {
    const {
      body: { tenant, ownedId, usersId },
      params: { tenantId },
    } = req;

    const foundTenant = await Tenant.findById(tenantId);

    if (foundTenant) {
      if (tenant) {
        await foundTenant.update(tenant);
      }

      TenantController.setTenantUsers(foundTenant, usersId);
      TenantController.setTenantOwned(foundTenant, ownedId);

      return res.status(200).send(foundTenant);
    }

    return res.status(400).send({
      error: 'Permission denied',
    });
  }

  /**
   * Delete Tenant
   */
  static async deleteTenant(req, res) {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId);
    const [
      authorizations,
      groups,
      users,
      owned,
    ] = await Promise.all([
      tenant.getAuthorizations(),
      tenant.getGroups(),
      tenant.getUsers(),
      tenant.getOwner(),
    ]);

    try {
      await Promise.all([
        groups.forEach(async (group) => {
          const roles = await group.getRoles();
          await Promise.all([
            Role.destroy({ where: { id: roles.map(role => role.id) } }),
            group.destroy(),
          ]);
        }),
        authorizations.forEach(async (authorization) => {
          const permissions = await authorization.getPermissions();
          await Promise.all([
            Permission.destroy({ where: { id: permissions.map(permission => permission.id) } }),
            authorization.destroy(),
          ]);
        }),
        users.forEach(async user => await user.destroy()),
        owned.forEach(async singleOwned => await singleOwned.destroy()),
      ]);

      await tenant.destroy();
    } catch (err) {
      return res.status(500).send(err);
    }

    return res.status(200).send(tenantId);
  }

  /**
   * Set Users
   * With 'users' is mean the tenant administrator
   */
  static async setTenantUsers(tenant, usersId) {
    if (usersId) {
      const selectedUsers = await User.findAll({ where: { id: usersId } });
      selectedUsers.forEach(async (user) => {
        await user.setUser(tenant);
      });
    }
  }

  /**
   * Set owned
   * With 'owned' is mean the users who belong at the tenant
   */
  static async setTenantOwned(tenant, ownedId) {
    if (ownedId) {
      const selectedUsers = await User.findAll({ where: { id: ownedId } });
      selectedUsers.forEach(async (user) => {
        await user.setOwned(tenant);
      });
    }
  }
}

module.exports = TenantController;
