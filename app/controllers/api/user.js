const AbstractController = require('../');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations } = require('../../libraries/middlewares');

const Role = require('../../models/role');
const User = require('../../models/user');

class UserController extends AbstractController {
  initRouter() {
    const {
      getUsers,
      postUser,
      putUser,
      deleteUsers,
    } = UserController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      getUsers,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      postUser,
    );

    this.router.put(
      '/:userId',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      putUser,
    );

    this.router.delete(
      '/:userId?',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      deleteUsers,
    );
  }

  /**
   * Get Users
   */
  static async getUsers(req, res) {
    const { tenant } = res.locals;

    const owned = await tenant.getOwner({
      attributes: ['id', 'name', 'email'],
      include: {
        model: Role,
        attributes: ['id', 'name'],
      },
    });

    return res.json({ users: owned });
  }

  /**
   * Insert User
   */
  static async postUser(req, res) {
    const { user } = req.body;
    const { tenant } = res.locals;

    if (!user.email) {
      return res.status(422).json({
        errors: {
          email: 'is required',
        },
      });
    }

    if (!user.password) {
      return res.status(422).json({
        errors: {
          password: 'is required',
        },
      });
    }

    try {
      const newUser = await User.create(user);

      await tenant.addOwner(newUser);

      return res.status(200).json(await newUser.toAuthJSON());
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit User
   */
  static async putUser(req, res) {
    const {
      body: { user },
      params: { userId },
    } = req;
    const { tenant } = res.locals;

    const foundUser = await User.findById(userId);

    if (foundUser && await tenant.hasOwner(userId)) {
      await foundUser.update(user);

      return res.status(200).send(foundUser);
    }

    return res.status(400).send({
      error: true,
      message: 'Permission denied',
    });
  }

  /**
   * Delete Users
   */
  static async deleteUsers(req, res) {
    const {
      body: { usersId },
      params: { userId },
    } = req;
    const { tenant } = res.locals;

    const selectedUsers = userId || usersId;

    if (await tenant.hasOwner(selectedUsers)) {
      await User.destroy({ where: { id: selectedUsers } });

      return res.status(200).send(selectedUsers);
    }

    return res.status(400).send({
      error: true,
      message: 'Permission denied',
    });
  }
}

module.exports = UserController;
