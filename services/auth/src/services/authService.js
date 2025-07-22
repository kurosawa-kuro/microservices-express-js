const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const axios = require('axios');
const { getAuthClient } = require('../../../../shared/database/prismaClient');
const logger = require('../../../../shared/utils/logger');

const tokenCache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  requestHeaders: {},
  timeout: 30000,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.publicKey || key?.rsaPublicKey;
    callback(null, signingKey);
  });
}

class AuthService {
  constructor() {
    this.prisma = getAuthClient();
  }

  async verifyToken(token) {
    return new Promise((resolve, reject) => {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const cachedUser = tokenCache.get(tokenHash);
      if (cachedUser) {
        return resolve(cachedUser);
      }
      
      jwt.verify(token, getKey, {
        audience: process.env.KEYCLOAK_CLIENT_ID,
        issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
        algorithms: ['RS256']
      }, async (err, decoded) => {
        if (err) {
          return reject(new Error('Invalid token'));
        }

        try {
          let authUser = await this.prisma.authUser.findUnique({
            where: { keycloakId: decoded.sub },
            include: {
              userRoles: {
                include: {
                  role: true
                }
              }
            }
          });

          if (!authUser) {
            authUser = await this.prisma.authUser.create({
              data: {
                id: decoded.sub,
                email: decoded.email,
                keycloakId: decoded.sub,
                emailVerified: decoded.email_verified || false,
                lastLoginAt: new Date()
              },
              include: {
                userRoles: {
                  include: {
                    role: true
                  }
                }
              }
            });
          } else {
            await this.prisma.authUser.update({
              where: { id: authUser.id },
              data: { lastLoginAt: new Date() }
            });
          }

          const user = {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            preferred_username: decoded.preferred_username,
            roles: authUser.userRoles.map(ur => ur.role.name)
          };

          const tokenTTL = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
          const cacheTTL = Math.min(tokenTTL, 300);
          
          if (cacheTTL > 0) {
            tokenCache.set(tokenHash, user, cacheTTL);
          }

          resolve(user);
        } catch (dbError) {
          logger.error('Database error during token verification:', dbError);
          reject(new Error('Authentication failed'));
        }
      });
    });
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(
        `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      logger.error('Keycloak token refresh failed:', error.response?.data || error.message);
      throw new Error('Token refresh failed');
    }
  }

  async revokeToken(token) {
    try {
      await axios.post(
        `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
        new URLSearchParams({
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
          refresh_token: token
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      tokenCache.del(tokenHash);
    } catch (error) {
      logger.error('Keycloak token revocation failed:', error.response?.data || error.message);
      throw new Error('Token revocation failed');
    }
  }

  async getUserRoles(userId) {
    const authUser = await this.prisma.authUser.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!authUser) {
      throw new Error('User not found');
    }

    return authUser.userRoles.map(ur => ur.role);
  }

  async assignRole(userId, roleId) {
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId
      }
    });
  }

  async removeRole(userId, roleId) {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });
  }
}

module.exports = AuthService;
