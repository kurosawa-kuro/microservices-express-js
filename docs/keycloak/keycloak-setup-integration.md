# Keycloak + PostgreSQL 認証認可システム セットアップ・統合ガイド

## 概要

本ガイドでは、Cloud-ShopマイクロサービスプロジェクトにKeycloakとPostgreSQLを使用した認証認可システムの導入から統合、テストまでを包括的に説明します。

## アーキテクチャ概要

- **Keycloak**: OAuth 2.0/OpenID Connect認証サーバー
- **PostgreSQL**: Keycloakの設定・ユーザー情報保存用データベース
- **Gateway Service**: JWT トークン検証とルーティング
- **各マイクロサービス**: Keycloakトークンベースの認証

## 前提条件

- Docker & Docker Compose
- 既存のCloud-Shopマイクロサービス環境
- Node.js (v18以上)

---

## Part 1: システムセットアップ

### 1. Docker Compose設定の更新

#### 1.1 PostgreSQLサービスの追加

`docker-compose.yml`に以下を追加：

```yaml
services:
  # PostgreSQL for Keycloak
  postgres:
    image: postgres:15
    container_name: keycloak-postgres
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak123
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Keycloak Server
  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    container_name: keycloak
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak123
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HOSTNAME_STRICT: false
      KC_HOSTNAME_STRICT_HTTPS: false
      KC_LOG_LEVEL: info
      KC_METRICS_ENABLED: true
      KC_HEALTH_ENABLED: true
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin123
    ports:
      - "8181:8080"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres-data:
```

#### 1.2 既存サービスの環境変数更新

Gateway Serviceに以下の環境変数を追加：

```yaml
gateway-service:
  # ... 既存設定 ...
  environment:
    - KEYCLOAK_URL=http://keycloak:8080
    - KEYCLOAK_REALM=cloud-shop
    - KEYCLOAK_CLIENT_ID=cloud-shop-gateway
```

### 2. サービス起動

```bash
# PostgreSQLとKeycloakを起動
docker-compose up -d postgres keycloak

# 起動確認
docker-compose logs keycloak
```

---

## Part 2: Keycloak初期設定

### 2.1 管理コンソールへアクセス

1. ブラウザで `http://localhost:8181` にアクセス
2. 管理コンソール（Administration Console）をクリック
3. ユーザー名: `admin`, パスワード: `admin123` でログイン

### 2.2 Realmの作成

1. 左上のマスターレルム横のドロップダウンから「Create realm」
2. Realm name: `cloud-shop`
3. 「Create」をクリック

### 2.3 クライアントの作成

1. 左メニューから「Clients」
2. 「Create client」をクリック
3. 以下を設定：
   - Client type: `OpenID Connect`
   - Client ID: `cloud-shop-gateway`
   - Name: `Cloud-Shop Gateway`
4. 「Next」をクリック
5. Capability config:
   - Client authentication: `On`
   - Authorization: `Off`
   - Authentication flow: `Standard flow`, `Direct access grants`
6. 「Next」→「Save」

### 2.4 クライアントの詳細設定

作成したクライアントの設定画面で：

1. **Settings**タブ:
   - Valid redirect URIs: `http://localhost:8072/*`
   - Valid post logout redirect URIs: `http://localhost:8072/*`
   - Web origins: `http://localhost:8072`

2. **Credentials**タブ:
   - Client secret をコピー（後で使用）

### 2.5 ロールの作成

1. 左メニューから「Realm roles」
2. 「Create role」をクリック
3. 以下のロールを作成：
   - `bank-customer` (銀行の顧客)
   - `bank-employee` (銀行員)
   - `bank-admin` (管理者)

### 2.6 テストユーザーの作成

1. 左メニューから「Users」
2. 「Create new user」をクリック
3. ユーザー情報を入力：
   ```
   Username: testuser
   Email: test@cloud-shop.com
   First name: Test
   Last name: User
   Email verified: On
   ```
4. 「Create」をクリック

5. **Credentials**タブでパスワード設定：
   - Password: `test123`
   - Temporary: `Off`
   - 「Set password」をクリック

6. **Role mapping**タブでロール割り当て：
   - 「Assign role」をクリック
   - `bank-customer` を選択し、「Assign」

---

## Part 3: Gateway Service認証ミドルウェアの実装

### 3.1 必要なパッケージのインストール

```bash
cd services/gateway
npm install jwks-rsa jsonwebtoken axios node-cache rate-limiter-flexible crypto
```

### 3.2 高度な認証ミドルウェアの実装

`services/gateway/src/middleware/authMiddleware.js`を作成：

```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const NodeCache = require('node-cache');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const crypto = require('crypto');
const logger = require('../../../../shared/utils/logger');

// JWTトークンキャッシュ（TTL: 300秒）
const jwtCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

// レート制限設定
const authRateLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: process.env.AUTH_RATE_LIMIT_REQUESTS || 10, // リクエスト数
  duration: process.env.AUTH_RATE_LIMIT_WINDOW || 60, // 時間窓（秒）
  blockDuration: process.env.AUTH_RATE_LIMIT_BLOCK || 300, // ブロック時間（秒）
});

const generalRateLimiter = new RateLimiterMemory({
  keyPrefix: 'general',
  points: process.env.GENERAL_RATE_LIMIT_REQUESTS || 100,
  duration: process.env.GENERAL_RATE_LIMIT_WINDOW || 60,
  blockDuration: process.env.GENERAL_RATE_LIMIT_BLOCK || 60,
});

// JWKS クライアントの初期化
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

// セキュリティ監査ログ
const auditLogger = require('winston').createLogger({
  level: 'info',
  format: require('winston').format.combine(
    require('winston').format.timestamp(),
    require('winston').format.json()
  ),
  transports: [
    new require('winston').transports.File({ filename: 'security.log' })
  ]
});

const authMiddleware = async (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  try {
    // レート制限チェック
    const isAuthEndpoint = req.path.includes('/auth/');
    const rateLimiter = isAuthEndpoint ? authRateLimiter : generalRateLimiter;
    
    try {
      await rateLimiter.consume(clientIp);
    } catch (rateLimitRes) {
      auditLogger.warn({
        event: 'rate_limit_exceeded',
        ip: clientIp,
        userAgent,
        correlationId,
        endpoint: req.path,
        limit: isAuthEndpoint ? 'auth' : 'general'
      });
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: rateLimitRes.msBeforeNext,
        timestamp: new Date().toISOString()
      });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      auditLogger.warn({
        event: 'auth_missing_header',
        ip: clientIp,
        userAgent,
        correlationId,
        endpoint: req.path
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // キャッシュからトークン検証結果を取得
    let decoded = jwtCache.get(tokenHash);
    let cacheHit = !!decoded;
    
    if (!decoded) {
      // Keycloakトークンの検証
      await new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {
          audience: process.env.KEYCLOAK_CLIENT_ID,
          issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
          algorithms: ['RS256']
        }, (err, decodedToken) => {
          if (err) {
            reject(err);
          } else {
            decoded = decodedToken;
            // キャッシュに保存（TTLはトークンの有効期限または最大300秒）
            const ttl = Math.min(decoded.exp - Math.floor(Date.now() / 1000), 300);
            if (ttl > 0) {
              jwtCache.set(tokenHash, decoded, ttl);
            }
            resolve();
          }
        });
      });
    }

    // ユーザー情報をリクエストに設定
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      preferred_username: decoded.preferred_username,
      roles: decoded.realm_access?.roles || []
    };

    req.correlationId = correlationId;

    // 成功ログ
    auditLogger.info({
      event: 'auth_success',
      userId: req.user.sub,
      username: req.user.preferred_username,
      ip: clientIp,
      userAgent,
      correlationId,
      endpoint: req.path,
      cacheHit,
      roles: req.user.roles
    });

    logger.info(`User authenticated: ${req.user.preferred_username} (Cache: ${cacheHit ? 'HIT' : 'MISS'})`);
    next();

  } catch (error) {
    // 認証失敗ログ
    auditLogger.error({
      event: 'auth_failure',
      ip: clientIp,
      userAgent,
      correlationId,
      endpoint: req.path,
      error: error.message,
      tokenPresent: !!req.headers.authorization
    });

    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      correlationId,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = authMiddleware;
```

### 3.3 ロールベースアクセス制御ミドルウェア

`services/gateway/src/middleware/roleMiddleware.js`を作成：

```javascript
const logger = require('../../../../shared/utils/logger');
const winston = require('winston');

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      auditLogger.warn({
        event: 'auth_insufficient_permissions',
        userId: req.user.sub,
        username: req.user.preferred_username,
        requiredRoles,
        userRoles,
        ip: req.ip,
        correlationId: req.correlationId,
        endpoint: req.path
      });

      logger.warn(`Access denied for user ${req.user.preferred_username}. Required roles: ${requiredRoles.join(', ')}, User roles: ${userRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = { requireRole };
```

### 3.4 トークンリフレッシュ機能

`services/gateway/src/routes/auth.js`を作成：

```javascript
const express = require('express');
const axios = require('axios');
const logger = require('../../../../shared/utils/logger');

const router = express.Router();

// トークンリフレッシュエンドポイント
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
    }

    // Keycloakのトークンエンドポイントにリフレッシュトークンを送信
    const tokenResponse = await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in,
      refresh_token: tokenResponse.data.refresh_token,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token refresh failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token refresh failed',
      timestamp: new Date().toISOString()
    });
  }
});

// トークン取り消しエンドポイント
router.post('/revoke', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
    }

    // Keycloakのトークン取り消しエンドポイント
    await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/revoke`,
      new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        token: refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({
      message: 'Token revoked successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token revocation failed:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token revocation failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
```

### 3.5 Gateway Serviceでのルート保護

`services/gateway/src/app.js`を更新：

```javascript
const authMiddleware = require('./middleware/authMiddleware');
const { requireRole } = require('./middleware/roleMiddleware');
const authRoutes = require('./routes/auth');

// 認証ルート
app.use('/auth', authRoutes);

// 認証が必要なルート
app.use('/api/accounts', authMiddleware, requireRole(['bank-customer', 'bank-employee', 'bank-admin']));
app.use('/api/cards', authMiddleware, requireRole(['bank-customer', 'bank-employee', 'bank-admin']));
app.use('/api/loans', authMiddleware, requireRole(['bank-customer', 'bank-employee', 'bank-admin']));

// 管理者限定ルート
app.use('/api/admin', authMiddleware, requireRole(['bank-admin']));
```

---

## Part 4: テスト環境とヘルパー

### 4.1 テスト専用 Docker Compose

`docker-compose.test.yml`を作成：

```yaml
version: '3.8'

services:
  # Test PostgreSQL for Keycloak
  postgres-test:
    image: postgres:15
    container_name: keycloak-postgres-test
    environment:
      POSTGRES_DB: keycloak_test
      POSTGRES_USER: keycloak_test
      POSTGRES_PASSWORD: test123
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak_test"]
      interval: 5s
      timeout: 3s
      retries: 3

  # Test Keycloak Server
  keycloak-test:
    image: quay.io/keycloak/keycloak:23.0
    container_name: keycloak-test
    command: start-dev --import-realm
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres-test:5432/keycloak_test
      KC_DB_USERNAME: keycloak_test
      KC_DB_PASSWORD: test123
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8182
      KC_HOSTNAME_STRICT: false
      KC_HOSTNAME_STRICT_HTTPS: false
      KC_HTTP_ENABLED: true
      KC_LOG_LEVEL: warn
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin123
    ports:
      - "8182:8080"
    depends_on:
      postgres-test:
        condition: service_healthy
    volumes:
      - ./test/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health/ready"]
      interval: 10s
      timeout: 5s
      retries: 10
```

### 4.2 テスト用 Realm 設定

`test/keycloak/realm-export.json`を作成：

```json
{
  "realm": "cloud-shop-test",
  "enabled": true,
  "clients": [
    {
      "clientId": "cloud-shop-test",
      "enabled": true,
      "publicClient": false,
      "serviceAccountsEnabled": true,
      "directAccessGrantsEnabled": true,
      "secret": "test-client-secret",
      "redirectUris": ["http://localhost:3000/*"],
      "webOrigins": ["http://localhost:3000"]
    }
  ],
  "roles": {
    "realm": [
      {"name": "bank-customer"},
      {"name": "bank-employee"},
      {"name": "bank-admin"}
    ]
  },
  "users": [
    {
      "username": "customer1",
      "enabled": true,
      "email": "customer1@test.com",
      "firstName": "Test",
      "lastName": "Customer",
      "credentials": [
        {
          "type": "password",
          "value": "test123",
          "temporary": false
        }
      ],
      "realmRoles": ["bank-customer"]
    },
    {
      "username": "employee1",
      "enabled": true,
      "email": "employee1@test.com",
      "firstName": "Test",
      "lastName": "Employee",
      "credentials": [
        {
          "type": "password",
          "value": "test123",
          "temporary": false
        }
      ],
      "realmRoles": ["bank-employee"]
    },
    {
      "username": "admin1",
      "enabled": true,
      "email": "admin1@test.com",
      "firstName": "Test",
      "lastName": "Admin",
      "credentials": [
        {
          "type": "password",
          "value": "test123",
          "temporary": false
        }
      ],
      "realmRoles": ["bank-admin"]
    }
  ]
}
```

### 4.3 テストユーティリティクラス

`test/utils/KeycloakTestHelper.js`を作成：

```javascript
const axios = require('axios');
const jwt = require('jsonwebtoken');

class KeycloakTestHelper {
  constructor({
    keycloakUrl = 'http://localhost:8182',
    realm = 'cloud-shop-test',
    clientId = 'cloud-shop-test',
    clientSecret = 'test-client-secret'
  } = {}) {
    this.keycloakUrl = keycloakUrl;
    this.realm = realm;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenEndpoint = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;
  }

  /**
   * ユーザー認証でアクセストークンを取得
   */
  async getAccessToken(username, password) {
    try {
      const response = await axios.post(this.tokenEndpoint, new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: username,
        password: password,
        grant_type: 'password'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Token acquisition failed:', error.response?.data);
      throw new Error(`Failed to get access token for user: ${username}`);
    }
  }

  /**
   * ロール別トークン取得
   */
  async getTokenByRole(role) {
    const userMap = {
      'bank-customer': { username: 'customer1', password: 'test123' },
      'bank-employee': { username: 'employee1', password: 'test123' },
      'bank-admin': { username: 'admin1', password: 'test123' }
    };

    const user = userMap[role];
    if (!user) {
      throw new Error(`Unknown role: ${role}`);
    }

    return await this.getAccessToken(user.username, user.password);
  }

  /**
   * 認証ヘッダー作成
   */
  getAuthHeader(token) {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Keycloak接続確認
   */
  async isKeycloakReady() {
    try {
      const response = await axios.get(`${this.keycloakUrl}/health/ready`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = KeycloakTestHelper;
```

### 4.4 Jest セットアップファイル

`test/setup/jest.setup.js`を作成：

```javascript
const KeycloakTestHelper = require('../utils/KeycloakTestHelper');

// グローバルテストヘルパー
global.keycloakHelper = new KeycloakTestHelper();

// テスト開始前の待機
beforeAll(async () => {
  // Keycloakの起動待ち（最大30秒）
  let retries = 30;
  while (retries > 0) {
    if (await global.keycloakHelper.isKeycloakReady()) {
      console.log('✅ Keycloak is ready for testing');
      break;
    }
    console.log('⏳ Waiting for Keycloak...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries--;
  }

  if (retries === 0) {
    throw new Error('❌ Keycloak failed to start within timeout period');
  }
}, 35000);
```

---

## Part 5: テスト実行

### 5.1 基本テスト

```bash
# テスト環境起動
docker-compose -f docker-compose.test.yml up -d

# テスト実行
npm test
```

### 5.2 認証テスト

```bash
# トークン取得
curl -X POST "http://localhost:8181/realms/cloud-shop/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=cloud-shop-gateway" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=testuser" \
  -d "password=test123" \
  -d "grant_type=password"

# API呼び出しテスト
curl -X GET "http://localhost:8072/api/accounts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Part 6: トラブルシューティング

### 6.1 よくある問題

1. **Keycloak起動失敗**
   ```bash
   # ログ確認
   docker-compose logs keycloak
   
   # PostgreSQL接続確認
   docker-compose logs postgres
   ```

2. **トークン検証エラー**
   - Keycloak URL設定確認
   - Realm名とClient ID確認
   - JWKS エンドポイント確認

3. **CORS エラー**
   - Keycloakクライアント設定でWeb originsを確認
   - Gateway ServiceのCORS設定確認

### 6.2 デバッグ用コマンド

```bash
# Keycloakヘルスチェック
curl http://localhost:8181/health/ready

# JWKS エンドポイント確認
curl http://localhost:8181/realms/cloud-shop/protocol/openid-connect/certs

# Gateway Serviceヘルスチェック
curl http://localhost:8072/actuator/health
```

---

## Part 7: 本番環境への移行

### 7.1 セキュリティ設定

1. **環境変数の適切な管理**
   ```bash
   # .env ファイルでの管理
   KEYCLOAK_ADMIN_PASSWORD=strong_password_here
   POSTGRES_PASSWORD=strong_db_password_here
   ```

2. **HTTPS設定**
   - Keycloak前段にリバースプロキシ設置
   - SSL証明書の設定

3. **データベースセキュリティ**
   - PostgreSQL認証設定強化
   - データベース暗号化

### 7.2 パフォーマンス最適化

1. **Keycloakクラスタリング**
2. **PostgreSQL調整**
3. **JWTトークンキャッシング**

---

## 参考情報

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/) - JWT トークンデバッグツール
- [JWKS Specification](https://tools.ietf.org/html/rfc7517)