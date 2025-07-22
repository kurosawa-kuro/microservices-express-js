# Keycloak + PostgreSQL 認証認可システム導入手順書

## 概要

本手順書では、KuroBankマイクロサービスプロジェクトにKeycloakとPostgreSQLを使用した認証認可システムを導入する方法を説明します。

## アーキテクチャ概要

- **Keycloak**: OAuth 2.0/OpenID Connect認証サーバー
- **PostgreSQL**: Keycloakの設定・ユーザー情報保存用データベース
- **Gateway Service**: JWT トークン検証とルーティング
- **各マイクロサービス**: Keycloakトークンベースの認証

## 前提条件

- Docker & Docker Compose
- 既存のKuroBankマイクロサービス環境
- Node.js (v18以上)

## 1. Docker Compose設定の更新

### 1.1 PostgreSQLサービスの追加

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

### 1.2 既存サービスの環境変数更新

Gateway Serviceに以下の環境変数を追加：

```yaml
gateway-service:
  # ... 既存設定 ...
  environment:
    - KEYCLOAK_URL=http://keycloak:8080
    - KEYCLOAK_REALM=kurobank
    - KEYCLOAK_CLIENT_ID=kurobank-gateway
```

## 2. Keycloak初期設定

### 2.1 サービス起動

```bash
# PostgreSQLとKeycloakを起動
docker-compose up -d postgres keycloak

# 起動確認
docker-compose logs keycloak
```

### 2.2 管理コンソールへアクセス

1. ブラウザで `http://localhost:8181` にアクセス
2. 管理コンソール（Administration Console）をクリック
3. ユーザー名: `admin`, パスワード: `admin123` でログイン

### 2.3 Realmの作成

1. 左上のマスターレルム横のドロップダウンから「Create realm」
2. Realm name: `kurobank`
3. 「Create」をクリック

### 2.4 クライアントの作成

1. 左メニューから「Clients」
2. 「Create client」をクリック
3. 以下を設定：
   - Client type: `OpenID Connect`
   - Client ID: `kurobank-gateway`
   - Name: `KuroBank Gateway`
4. 「Next」をクリック
5. Capability config:
   - Client authentication: `On`
   - Authorization: `Off`
   - Authentication flow: `Standard flow`, `Direct access grants`
6. 「Next」→「Save」

### 2.5 クライアントの詳細設定

作成したクライアントの設定画面で：

1. **Settings**タブ:
   - Valid redirect URIs: `http://localhost:8072/*`
   - Valid post logout redirect URIs: `http://localhost:8072/*`
   - Web origins: `http://localhost:8072`

2. **Credentials**タブ:
   - Client secret をコピー（後で使用）

### 2.6 ロールの作成

1. 左メニューから「Realm roles」
2. 「Create role」をクリック
3. 以下のロールを作成：
   - `bank-customer` (銀行の顧客)
   - `bank-employee` (銀行員)
   - `bank-admin` (管理者)

### 2.7 テストユーザーの作成

1. 左メニューから「Users」
2. 「Create new user」をクリック
3. ユーザー情報を入力：
   ```
   Username: testuser
   Email: test@kurobank.com
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

## 3. Gateway Service認証ミドルウェアの更新

### 3.1 必要なパッケージのインストール

```bash
cd services/gateway
npm install jwks-rsa jsonwebtoken axios
```

### 3.2 認証ミドルウェアの更新

`services/gateway/src/middleware/authMiddleware.js`を以下のように更新：

```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const logger = require('../../../../shared/utils/logger');

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

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    
    // Keycloakトークンの検証
    jwt.verify(token, getKey, {
      audience: process.env.KEYCLOAK_CLIENT_ID,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        logger.error('Token verification error:', err);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
          timestamp: new Date().toISOString()
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

      logger.info(`User authenticated: ${req.user.preferred_username}`);
      next();
    });

  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = authMiddleware;
```

### 3.3 環境変数の設定

`docker-compose.yml`のgateway-serviceセクションを更新：

```yaml
gateway-service:
  # ... 既存設定 ...
  environment:
    - NODE_ENV=development
    - PORT=8072
    - JWT_SECRET=your-secret-key-here
    - KEYCLOAK_URL=http://keycloak:8080
    - KEYCLOAK_REALM=kurobank
    - KEYCLOAK_CLIENT_ID=kurobank-gateway
    # ... 他の既存環境変数 ...
  depends_on:
    - keycloak
    # ... 他の依存関係 ...
```

## 4. 認可機能の実装

### 4.1 ロールベースアクセス制御ミドルウェア

`services/gateway/src/middleware/roleMiddleware.js`を作成：

```javascript
const logger = require('../../../../shared/utils/logger');

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

### 4.2 Gateway Serviceでのルート保護

`services/gateway/src/app.js`を更新：

```javascript
const authMiddleware = require('./middleware/authMiddleware');
const { requireRole } = require('./middleware/roleMiddleware');

// 認証が必要なルート
app.use('/api/accounts', authMiddleware, requireRole(['bank-customer', 'bank-employee', 'bank-admin']));
app.use('/api/cards', authMiddleware, requireRole(['bank-customer', 'bank-employee', 'bank-admin']));
app.use('/api/loans', authMiddleware, requireRole(['bank-customer', 'bank-employee', 'bank-admin']));

// 管理者限定ルート
app.use('/api/admin', authMiddleware, requireRole(['bank-admin']));
```

## 5. システム起動と確認

### 5.1 全システムの起動

```bash
# 全サービス起動
docker-compose up -d

# 起動状況確認
docker-compose ps
```

### 5.2 認証テスト

#### トークン取得

```bash
# 直接認証でトークン取得
curl -X POST "http://localhost:8181/realms/kurobank/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=kurobank-gateway" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=testuser" \
  -d "password=test123" \
  -d "grant_type=password"
```

#### API呼び出しテスト

```bash
# 取得したトークンでAPI呼び出し
curl -X GET "http://localhost:8072/api/accounts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 6. トラブルシューティング

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

### 6.2 ログ確認

```bash
# 全サービスのログ確認
docker-compose logs -f

# 特定サービスのログ確認
docker-compose logs -f keycloak
docker-compose logs -f gateway-service
```

## 7. 本番環境への移行

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

## 8. 参考情報

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/) - JWT トークンデバッグツール
- [JWKS Specification](https://tools.ietf.org/html/rfc7517)

## 9. 付録

### 9.1 Keycloak管理タスク

```bash
# Keycloakクライアント作成（Admin CLI使用）
docker exec -it keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master --user admin --password admin123

docker exec -it keycloak /opt/keycloak/bin/kcadm.sh create clients \
  -r kurobank -s clientId=kurobank-api -s enabled=true -s serviceAccountsEnabled=true
```

### 9.2 データベーステーブル構成

Keycloakが使用する主要なPostgreSQLテーブル：
- `USER_ENTITY` - ユーザー情報
- `REALM` - レルム設定
- `CLIENT` - クライアント設定
- `USER_ROLE_MAPPING` - ユーザーロール関連付け