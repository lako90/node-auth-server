const passport = require('passport');
const LocalStrategy = require('passport-local');

const User = require('../models/user');

passport.use(new LocalStrategy({
  usernameField: 'user[email]',
  passwordField: 'user[password]',
}, async (email, password, done) => {
  const foundUser = await User.findOne({ where: { email } });
  const validateUser = foundUser && await foundUser.validatePassword(password);

  return validateUser
    ? done(null, foundUser)
    : done(null, false, { errors: { 'email or password': 'is invalid' } });
}));
