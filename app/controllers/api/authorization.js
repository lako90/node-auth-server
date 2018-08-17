const AbstractController = require('../');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations } = require('../../libraries/middlewares');

const Authorization = require('../../models/authorization');
const Permission = require('../../models/permission');
const ResourceType = require('../../models/resourceType');

class AuthorizationController extends AbstractController {
  initRouter() {
    const {
      getAuthorizations,
      postAuthorization,
      putAuthorization,
      deleteAuthorizations,
    } = AuthorizationController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('client'),
      getAuthorizations,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('client'),
      postAuthorization,
    );

    this.router.put(
      '/:authorizationId',
      refreshTokenAuthentication,
      checkAuthorizations('client'),
      putAuthorization,
    );

    this.router.delete(
      '/:authorizationId?',
      refreshTokenAuthentication,
      checkAuthorizations('client'),
      deleteAuthorizations,
    );
  }

  /**
   * Get Authorizations
   */
  static async getAuthorizations(req, res) {
    const { client } = res.locals;

    const authorizations = await client.getAuthorizations({
      attributes: ['id', 'name'],
      include: {
        model: Permission,
        attributes: ['id', 'consent', 'limit'],
        include: {
          model: ResourceType,
          attributes: ['id', 'name'],
        },
      },
    });

    return res.json({ authorizations });
  }

  /**
   * Insert Authorization
   */
  static async postAuthorization(req, res) {
    const { authorization, permissionsId } = req.body;
    const { client } = res.locals;

    if (!authorization.name) {
      return res.status(422).json({
        errors: {
          name: 'is required',
        },
      });
    }

    try {
      const newAuthorization = await Authorization.create(authorization);

      AuthorizationController.setAuthorizationPermissions(newAuthorization, permissionsId);

      return res.status(200).json({
        authorization: await newAuthorization.setClient(client),
      });
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit Auhtorization
   */
  static async putAuthorization(req, res) {
    const {
      body: { authorization, permissionsId },
      params: { authorizationId },
    } = req;
    const { client } = res.locals;

    const foundAuthorization = await Authorization.findById(authorizationId);

    if (foundAuthorization && await client.hasAuthorization(authorizationId)) {
      if (authorization) {
        await foundAuthorization.update(authorization);
      }
      AuthorizationController.setAuthorizationPermissions(foundAuthorization, permissionsId);

      return res.status(200).send(foundAuthorization);
    }

    return res.status(400).send({
      error: 'Permission denied',
    });
  }

  /**
   * Delete Authorizations
   */
  static async deleteAuthorizations(req, res) {
    const {
      body: { authorizationsId },
      params: { authorizationId },
    } = req;
    const { client } = res.locals;

    const selectedAuthorizations = authorizationId || authorizationsId;

    if (await client.hasAuthorization(selectedAuthorizations)) {
      await Authorization.destroy({ where: { id: selectedAuthorizations } });

      return res.status(200).send(selectedAuthorizations);
    }

    return res.status(400).send({
      error: 'Permission denied',
    });
  }

  /**
   * Set Permissions
   */
  static async setAuthorizationPermissions(authorization, permissionsId) {
    if (permissionsId) {
      const selectedPermissions = await Permission.findAll({ where: { id: permissionsId } });
      selectedPermissions.forEach(async (permission) => {
        await permission.setAuthorizations(authorization);
      });
    }
  }
}

module.exports = AuthorizationController;
