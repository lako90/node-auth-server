const AbstractController = require('..');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations } = require('../../libraries/middlewares');

const Client = require('../../models/client');
const Role = require('../../models/role');
const User = require('../../models/user');
const Permission = require('../../models/permission');

class ClientController extends AbstractController {
  initRouter() {
    const {
      getClients,
      postClient,
      putClient,
      deleteClient,
    } = ClientController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      getClients,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      postClient,
    );

    this.router.put(
      '/:clientId',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      putClient,
    );

    this.router.delete(
      '/:clientId',
      refreshTokenAuthentication,
      checkAuthorizations('administrator'),
      deleteClient,
    );
  }

  /**
   * Get Clients
   */
  static async getClients(req, res) {
    const clients = await Client.findAll({
      attributes: ['id', 'name'],
    });

    return res.json({ clients });
  }

  /**
   * Insert Client
   */
  static async postClient(req, res) {
    const { client, usersId } = req.body;

    if (!client.name) {
      return res.status(422).json({
        errors: {
          name: 'is required',
        },
      });
    }

    try {
      const newClient = await Client.create(client);
      ClientController.setClientUsers(newClient, usersId);

      return res.status(200).json({
        client: newClient,
      });
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit Client
   */
  static async putClient(req, res) {
    const {
      body: { client, ownedId, usersId },
      params: { clientId },
    } = req;

    const foundClient = await Client.findById(clientId);

    if (foundClient) {
      if (client) {
        await foundClient.update(client);
      }

      ClientController.setClientUsers(foundClient, usersId);
      ClientController.setClientOwned(foundClient, ownedId);

      return res.status(200).send(foundClient);
    }

    return res.status(400).send({
      error: 'Permission denied',
    });
  }

  /**
   * Delete Client
   */
  static async deleteClient(req, res) {
    const { clientId } = req.params;
    const client = await Client.findById(clientId);
    const [
      authorizations,
      groups,
      users,
      owned,
    ] = await Promise.all([
      client.getAuthorizations(),
      client.getGroups(),
      client.getUsers(),
      client.getOwner(),
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

      await client.destroy();
    } catch (err) {
      return res.status(500).send(err);
    }

    return res.status(200).send(clientId);
  }

  /**
   * Set Users
   * With 'users' is mean the client administrator
   */
  static async setClientUsers(client, usersId) {
    if (usersId) {
      const selectedUsers = await User.findAll({ where: { id: usersId } });
      selectedUsers.forEach(async (user) => {
        await user.setUser(client);
      });
    }
  }

  /**
   * Set owned
   * With 'owned' is mean the users who belong at the client
   */
  static async setClientOwned(client, ownedId) {
    if (ownedId) {
      const selectedUsers = await User.findAll({ where: { id: ownedId } });
      selectedUsers.forEach(async (user) => {
        await user.setOwned(client);
      });
    }
  }
}

module.exports = ClientController;
