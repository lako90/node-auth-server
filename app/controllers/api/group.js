const AbstractController = require('../');

const refreshTokenAuthentication = require('../../libraries/auth');
const { checkAuthorizations } = require('../../libraries/middlewares');

const Group = require('../../models/group');
const Role = require('../../models/role');

class GroupController extends AbstractController {
  initRouter() {
    const {
      getGroups,
      postGroup,
      putGroup,
      deleteGroup,
    } = GroupController;

    this.router.get(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      getGroups,
    );

    this.router.post(
      '/',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      postGroup,
    );

    this.router.put(
      '/:groupId',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      putGroup,
    );

    this.router.delete(
      '/:groupId',
      refreshTokenAuthentication,
      checkAuthorizations('tenant'),
      deleteGroup,
    );
  }

  /**
   * Get Groups
   */
  static async getGroups(req, res) {
    const { tenant } = res.locals;

    const groups = await tenant.getGroups({
      attributes: ['id', 'name'],
    });

    return res.json({ groups });
  }

  /**
   * Insert Group
   */
  static async postGroup(req, res) {
    const { group } = req.body;
    const { tenant } = res.locals;

    if (!group.name) {
      return res.status(422).json({
        errors: {
          name: 'is required',
        },
      });
    }

    try {
      const newGroup = await Group.create(group);

      return res.status(200).json({
        group: await newGroup.setTenant(tenant),
      });
    } catch (err) {
      return res.status(400).send(err);
    }
  }

  /**
   * Edit Group
   */
  static async putGroup(req, res) {
    const {
      body: { group },
      params: { groupId },
    } = req;
    const { tenant } = res.locals;

    const foundGroup = await Group.findById(groupId);

    if (foundGroup && group && await tenant.hasGroup(groupId)) {
      await foundGroup.update(group);

      return res.status(200).send(foundGroup);
    }

    return res.status(400).send({
      error: true,
      message: 'Permission denied',
    });
  }

  /**
   * Delete Group
   */
  static async deleteGroup(req, res) {
    const { groupId } = req.params;
    const { tenant } = res.locals;

    if (await tenant.hasGroup(groupId)) {
      const group = await Group.findById(groupId);
      const roles = await group.getRoles();

      await Role.destroy({ where: { id: roles.map(role => role.id) } });
      await group.destroy();

      return res.status(200).send(groupId);
    }

    return res.status(400).send({
      error: true,
      message: 'Permission denied',
    });
  }
}

module.exports = GroupController;
