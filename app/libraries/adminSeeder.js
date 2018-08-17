const config = require('config');

const User = require('../models/user');

const adminUser = config.get('databases.uaa.adminUser');

const adminSeeder = async () => await User.create(adminUser);

adminSeeder();
