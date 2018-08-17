const AbstractController = require('../');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations } = require('../../libraries/middlewares');

const Permission = require('../../models/permission');
const ResourceType = require('../../models/resourceType');

class PermissionController extends AbstractController {
  initRouter() {
    const {
      getPermissions,
      postPermission,
      putPermission,
      deletePermissions,
    } = PermissionController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      getPermissions,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      postPermission,
    );

    this.router.put(
      '/:permissionId',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      putPermission,
    );

    this.router.delete(
      '/:permissionId?',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      deletePermissions,
    );
  }

  /**
   * Get Permissions
   */
  static async getPermissions(req, res) {
    const { tenant } = res.locals;

    const permissions = await tenant.getPermissions({
      attributes: ['id', 'consent', 'limit'],
      include: {
        model: ResourceType,
        attributes: ['id', 'name'],
      },
    });

    return res.json({ permissions });
  }

  /**
   * Insert Permission
   */
  static async postPermission(req, res) {
    const { permission, resourceType } = req.body;
    const { tenant } = res.locals;

    if (!permission.consent) {
      return res.status(422).json({
        errors: {
          name: 'is required',
        },
      });
    }

    try {
      const newPermission = await Permission.create(permission);
      const selectedResourceType = await ResourceType.findOne({ where: resourceType });
      await newPermission.setResourceType(selectedResourceType);

      return res.status(200).json({
        role: await newPermission.setTenant(tenant),
      });
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit Permission
   */
  static async putPermission(req, res) {
    const {
      body: { permission },
      params: { permissionId },
    } = req;
    const { tenant } = res.locals;

    const foundPermission = await Permission.findById(permissionId);

    if (foundPermission && await tenant.hasPermission(permissionId)) {
      await foundPermission.update(permission);

      return res.status(200).send(foundPermission);
    }

    return res.status(400).send({
      error: 'Permission denied',
    });
  }

  /**
   * Delete Permissions
   */
  static async deletePermissions(req, res) {
    const {
      body: { permissionsId },
      params: { permissionId },
    } = req;
    const { tenant } = res.locals;

    const selectedPermissions = permissionId || permissionsId;

    if (await tenant.hasPermission(selectedPermissions)) {
      await Permission.destroy({ where: { id: selectedPermissions } });

      return res.status(200).send(selectedPermissions);
    }

    return res.status(400).send({
      error: 'Permission denied',
    });
  }
}

module.exports = PermissionController;
