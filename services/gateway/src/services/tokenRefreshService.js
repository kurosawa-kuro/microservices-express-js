const axios = require('axios');
const logger = require('../../../../shared/utils/logger');

class TokenRefreshService {
  constructor() {
    this.keycloakUrl = process.env.KEYCLOAK_URL;
    this.realm = process.env.KEYCLOAK_REALM;
    this.clientId = process.env.KEYCLOAK_CLIENT_ID;
    this.clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
    this.tokenEndpoint = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
  }

  async refreshToken(refreshToken, correlationId) {
    try {
      logger.debug('Attempting token refresh', { correlationId });

      const response = await axios.post(this.tokenEndpoint, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'kurobank-correlation-id': correlationId
        },
        timeout: 10000
      });

      const tokenData = response.data;
      
      logger.tokenRefresh({ sub: 'unknown', preferred_username: 'unknown' }, {
        correlationId,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      });

      return {
        success: true,
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope
        }
      };

    } catch (error) {
      logger.securityError('Token refresh failed', {
        correlationId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        keycloakError: error.response?.data?.error,
        keycloakErrorDescription: error.response?.data?.error_description
      });

      return {
        success: false,
        error: {
          message: 'Token refresh failed',
          details: error.response?.data?.error_description || error.message,
          status: error.response?.status || 500
        }
      };
    }
  }

  async validateRefreshToken(refreshToken, correlationId) {
    try {
      const response = await axios.post(`${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`, 
        new URLSearchParams({
          token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token_type_hint: 'refresh_token'
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'kurobank-correlation-id': correlationId
          },
          timeout: 5000
        }
      );

      return response.data.active === true;
    } catch (error) {
      logger.securityError('Refresh token validation failed', {
        correlationId,
        error: error.message
      });
      return false;
    }
  }

  async revokeRefreshToken(refreshToken, correlationId) {
    try {
      await axios.post(`${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`, 
        new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'kurobank-correlation-id': correlationId
          },
          timeout: 5000
        }
      );

      logger.securityInfo('Refresh token revoked', { correlationId });
      return { success: true };
    } catch (error) {
      logger.securityError('Refresh token revocation failed', {
        correlationId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TokenRefreshService();
