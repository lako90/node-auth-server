const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../models/user');

const getTokensFromHeaders = (req) => {
  const {
    'access-token': accessBearerToken,
    'refresh-token': refreshToken,
  } = req.headers;

  const accessToken = accessBearerToken
    && accessBearerToken.split(' ')[0] === 'Bearer'
    && accessBearerToken.split(' ')[1];

  return { accessToken, refreshToken };
};

const refreshTokens = async (refreshToken, res) => {
  const { secret: refreshSecret } = config.get('jwt.refreshToken');

  try {
    const { id } = await jwt.decode(refreshToken);
    const foundUser = await User.findById(id);

    if (foundUser) {
      await jwt.verify(refreshToken, refreshSecret + foundUser.password);

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      } = await foundUser.generateTokens();

      return {
        newAccessToken,
        newRefreshToken,
        refreshUser: foundUser,
      };
    }

    return res.status(403).send({ message: 'User not found' });
  } catch (error) {
    return res.status(403).send(error);
  }
};

const refreshTokenAuthentication = async (req, res, next) => {
  const { accessToken, refreshToken } = getTokensFromHeaders(req);
  const { secret: accessSecret } = config.get('jwt.accessToken');

  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, accessSecret);

      res.locals.user = await User.findById(decoded.id); // eslint-disable-line no-param-reassign

      return next();
    } catch (error) {
      try {
        const {
          newAccessToken,
          newRefreshToken,
          refreshUser,
        } = await refreshTokens(refreshToken, res);

        if (newAccessToken && newRefreshToken) {
          res.set('Access-Control-Expose-Headers', 'Access-Token, Refresh-Token');
          res.set('Access-Token', newAccessToken);
          res.set('Refresh-Token', newRefreshToken);
        }

        res.locals.user = refreshUser; // eslint-disable-line no-param-reassign

        return next();
      } catch (err) {
        return res.status(403).send(err);
      }
    }
  } else {
    return res.status(403).send({
      error: 'No token provided',
    });
  }
};

module.exports = refreshTokenAuthentication;
