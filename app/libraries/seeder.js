/* eslint-disable no-console */
const readline = require('readline');
const faker = require('faker');
const config = require('config');
const camelCase = require('lodash/camelCase');
const random = require('lodash/random');

const seederConfiguration = config.get('seeder');
const resourceTypesConfig = config.get('resourceTypes');
const environment = config.get('environment');
const adminUser = config.get('databases.uaa.adminUser');

const ResourceType = require('../models/resourceType');
const Client = require('../models/client');
const Group = require('../models/group');
const Role = require('../models/role');
const User = require('../models/user');
const Permission = require('../models/permission');
const Authorization = require('../models/authorization');

const logger = require('./logger');
const { sync } = require('./database');

const modelsFields = (modelName, count = 1) => {
  const fields = [];
  for (let index = 0; index < count; index += 1) {
    faker.seed(Math.random() * 999);

    switch (modelName) {
      case 'user': {
        const {
          firstName: firstNameGenerator,
          lastName: lastNameGenerator,
        } = faker.name;

        const firstName = firstNameGenerator();
        const lastName = lastNameGenerator();

        fields.push({
          name: `${firstName} ${lastName}`,
          email: `${firstName}.${lastName}@user.com`,
          password: 'useruser',
        });

        break;
      }

      case 'group': {
        fields.push({ name: faker.commerce.productName() });
        break;
      }

      case 'role': {
        const { department, color } = faker.commerce;

        fields.push({
          name: camelCase(`${department()} ${color()}`),
          admin: false,
        });

        break;
      }

      case 'permission': {
        const { randomize } = faker.helpers;

        fields.push({
          consent: randomize(['read', 'edit', 'create']),
          limit: randomize([2, 4, 6, 8]),
        });

        break;
      }

      case 'authorization': {
        fields.push({ name: faker.commerce.department() });
        break;
      }

      default:
        return null;
    }
  }

  return fields.length === 1 ? fields[0] : fields;
};

const createModel = async (model, modelName, count = 1) => {
  const models = [];
  let index = 0;

  for (index = 0; index < count; index += 1) {
    const fields = modelsFields(modelName);
    models.push(await model.create(fields));
  }

  return models.length === 1 ? models[0] : models;
};

const developmentSeeder = async () => {
  const {
    roleUsersCount,
    groupsCount,
    rolesCount,
    authorizationsCount,
  } = seederConfiguration;

  ResourceType.bulkCreate(resourceTypesConfig.reduce(
    (accumulator, name) => {
      accumulator.push({ name });

      return accumulator;
    },
    [],
  ));

  const fakeClientUsers = await User.create({
    name: 'UserTheClient',
    email: 'user@client.com',
    password: 'client',
  });
  const seedClient = await Client.create({ name: 'TheClient' });
  const resourceTypes = await ResourceType.all();
  const fakeGroups = await createModel(Group, 'group', groupsCount);
  const fakeRoleUsers = await createModel(User, 'user', roleUsersCount);
  const fakeRoles = await createModel(Role, 'role', rolesCount);
  const permissionsCount = resourceTypes.length * 2;
  const fakePermissions = await createModel(Permission, 'permission', permissionsCount);
  const fakeAuthorizations = await createModel(Authorization, 'authorization', authorizationsCount);

  fakeAuthorizations.forEach(async (fakeAuthorization) => {
    const countPick = random(1, 4);
    const randomPermissionPick = random(0, permissionsCount - countPick);
    const randomRolePick = random(0, rolesCount - countPick);

    await fakeAuthorization.setPermissions(
      fakePermissions.slice(randomPermissionPick, randomPermissionPick + countPick),
    );
    await fakeAuthorization.setRoles(
      fakeRoles.slice(randomRolePick, randomRolePick + countPick),
    );
  });

  resourceTypes.forEach((resourceType) => {
    fakePermissions.forEach(async fakePermission => (
      await fakePermission.setResourceType(resourceType)
    ));
  });

  await Promise.all([
    seedClient.setUsers(fakeClientUsers),
    seedClient.setOwner(fakeRoleUsers),
    seedClient.setGroups(fakeGroups),
    seedClient.setPermissions(fakePermissions),
    seedClient.setAuthorizations(fakeAuthorizations),
  ]);

  await Promise.all(fakeGroups.reduce(
    (accumulator, group, index) => {
      const rolesPerGroup =
        rolesCount > groupsCount
        ? rolesCount / groupsCount
        : 1;

      accumulator.push(
        group.setRoles(
          fakeRoles.slice(
            rolesPerGroup * index,
            (index * rolesPerGroup) + rolesPerGroup,
          ),
        ),
      );

      return accumulator;
    },
    [],
  ));

  fakeRoles.forEach(async (role, index) => {
    await role.setUsers(fakeRoleUsers.slice(
      ((fakeRoles.length - 1) * 2) - (index * 2),
      (((fakeRoles.length - 1) * 2) - (index * 2)) + 2,
    ));
  });
};

const seeder = async () => {
  if (environment === 'development') {
    const readlineInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readlineInterface.question(
      '\n\nSeeding you\'ll destroy all data in database. Do you want to continue? [ y / n ] ',
      async (answer) => {
        if (
          answer === 'y'
          || answer === 'Y'
          || answer === 'yes'
          || answer === 'YES'
          || answer === 'Yes'
        ) {
          try {
            await sync({ force: true });
            await developmentSeeder();
            await User.create(adminUser);
            console.log('\n\n');
            logger.info('Seeder DONE');
            console.log('\n');
          } catch (error) {
            logger.error(error);
          }

          process.exit();
        }

        readlineInterface.close();
      },
    );
  }
};

seeder();
/* eslint-enable no-console */
