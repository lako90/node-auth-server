const passport = require('passport');

const AbstractController = require('../');
const User = require('../../models/user');

const refreshTokenAuthentication = require('../../libraries/auth');

class AuthController extends AbstractController {
  initRouter() {
    const { signup, signin, check } = AuthController;

    this.router.post('/signup', signup);
    this.router.post('/login', passport.authenticate('local'), signin);
    this.router.post('/check', refreshTokenAuthentication, check);
  }

  static async signup(req, res) {
    const { user } = req.body;

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

    const newUser = await User.create(user);

    return res.status(200).json(newUser.toAuthJSON());
  }

  static async signin(req, res) {
    const { user } = req;

    return res.json({ user: await user.toAuthJSON() });
  }

  static async check(req, res) {
    const { user } = res.locals;

    return user
      ? res.json({ user: await user.toAuthJSON() })
      : res.sendStatus(400);
  }
}

module.exports = AuthController;
