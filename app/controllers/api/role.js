const AbstractController = require('../');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations, groupSelected } = require('../../libraries/middlewares');

const Role = require('../../models/role');

class RoleController extends AbstractController {
  initRouter() {
    const {
      getRoles,
      postRole,
      putRole,
      deleteRoles,
      getAllRoles,
    } = RoleController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      groupSelected,
      getRoles,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      groupSelected,
      postRole,
    );

    this.router.put(
      '/:roleId',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      putRole,
    );

    this.router.delete(
      '/:roleId?',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      deleteRoles,
    );

    this.router.get(
      '/all',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      getAllRoles,
    );
  }

  /**
   * Get Roles
   */
  static async getRoles(req, res) {
    const { group } = res.locals;

    const roles = group && await group.getRoles({
      attributes: ['id', 'name', 'admin'],
    });

    return res.json({ roles });
  }

  /**
   * Insert Role
   */
  static async postRole(req, res) {
    const { role } = req.body;
    const { group } = res.locals;

    if (!role.name) {
      return res.status(422).json({
        errors: {
          name: 'is required',
        },
      });
    }

    try {
      const newRole = await Role.create(role);

      return res.status(200).json({
        role: await newRole.setGroup(group),
      });
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit Role
   */
  static async putRole(req, res) {
    const {
      body: { role },
      params: { roleId },
    } = req;
    const { tenant } = res.locals;

    const foundRole = await Role.findById(roleId);
    const group = await foundRole.getGroup();

    if (foundRole && group && await tenant.hasGroup(group.id)) {
      await foundRole.update(role);

      return res.status(200).send(foundRole);
    }

    return res.status(400).send({
      error: true,
      message: 'Permission denied',
    });
  }

  /**
   * Delete Roles
   */
  static async deleteRoles(req, res) {
    const {
      body: { rolesId },
      params: { roleId },
    } = req;
    const { tenant } = res.locals;

    const selectedRoles = roleId || rolesId;

    const foundRole = await Role.findOne({ where: { id: selectedRoles } });
    const group = await foundRole.getGroup();

    if (group && await tenant.hasGroup(group.id)) {
      await Role.destroy({ where: { id: selectedRoles } });

      return res.status(200).send(selectedRoles);
    }

    return res.status(403).send({
      error: 'Permission denied',
    });
  }

  /**
   * Get all Roles ignoring Group
   */
  static async getAllRoles(req, res) {
    const { tenant } = res.locals;

    const groups = await tenant.getGroups();

    const roles = await Promise.all(
      groups.map(group => group.getRoles({
        attributes: ['id', 'name', 'admin'],
      })),
    );

    return res.json({
      roles: roles.reduce(
        (accumulator, groupedRoles) => {
          accumulator.push(...groupedRoles);

          return accumulator;
        },
        [],
      ),
    });
  }
}

module.exports = RoleController;
