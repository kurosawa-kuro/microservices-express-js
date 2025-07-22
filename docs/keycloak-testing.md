# Keycloak テスト支援ガイド

## 概要

本ガイドでは、KeycloakとPostgreSQLを使用した認証システムのテストを効率化するためのツールとヘルパー関数を提供します。

## 目次

1. [テスト環境セットアップ](#1-テスト環境セットアップ)
2. [Jest/Supertest ヘルパー関数](#2-jestsupertest-ヘルパー関数)
3. [テストユーティリティクラス](#3-テストユーティリティクラス)
4. [テスト用データ管理](#4-テスト用データ管理)
5. [CI/CD統合](#5-cicd統合)
6. [実際のテスト例](#6-実際のテスト例)

## 1. テスト環境セットアップ

### 1.1 テスト専用 Docker Compose

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

### 1.2 テスト用 Realm 設定

`test/keycloak/realm-export.json`を作成：

```json
{
  "realm": "kurobank-test",
  "enabled": true,
  "clients": [
    {
      "clientId": "kurobank-test",
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

## 2. Jest/Supertest ヘルパー関数

### 2.1 テストユーティリティクラス

`test/utils/KeycloakTestHelper.js`を作成：

```javascript
const axios = require('axios');
const jwt = require('jsonwebtoken');

class KeycloakTestHelper {
  constructor({
    keycloakUrl = 'http://localhost:8182',
    realm = 'kurobank-test',
    clientId = 'kurobank-test',
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
   * クライアント認証でアクセストークンを取得
   */
  async getClientToken() {
    try {
      const response = await axios.post(this.tokenEndpoint, new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Client token acquisition failed:', error.response?.data);
      throw new Error('Failed to get client access token');
    }
  }

  /**
   * トークンをデコードして内容確認
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * 認証ヘッダー作成
   */
  getAuthHeader(token) {
    return { Authorization: `Bearer ${token}` };
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
   * トークンの有効性確認
   */
  async validateToken(token) {
    try {
      const decoded = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch (error) {
      return false;
    }
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

  /**
   * テスト用ユーザー作成（Admin API使用）
   */
  async createTestUser(adminToken, userData) {
    try {
      const response = await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.headers.location?.split('/').pop();
    } catch (error) {
      console.error('User creation failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * テスト用ユーザー削除
   */
  async deleteTestUser(adminToken, userId) {
    try {
      await axios.delete(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`
          }
        }
      );
    } catch (error) {
      console.error('User deletion failed:', error.response?.data);
      throw error;
    }
  }
}

module.exports = KeycloakTestHelper;
```

### 2.2 Jest セットアップファイル

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

// テスト用のカスタムマッチャー
expect.extend({
  toHaveValidJWT(received) {
    const isValid = global.keycloakHelper.validateToken(received);
    if (isValid) {
      return {
        message: () => `Expected ${received} not to be a valid JWT`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid JWT`,
        pass: false
      };
    }
  },

  toHaveRole(received, expectedRole) {
    const decoded = global.keycloakHelper.decodeToken(received);
    const roles = decoded.realm_access?.roles || [];
    const hasRole = roles.includes(expectedRole);
    
    if (hasRole) {
      return {
        message: () => `Expected token not to have role ${expectedRole}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected token to have role ${expectedRole}, but got roles: ${roles.join(', ')}`,
        pass: false
      };
    }
  }
});
```

## 3. テストユーティリティクラス

### 3.1 Supertest 統合ヘルパー

`test/utils/ApiTestHelper.js`を作成：

```javascript
const request = require('supertest');
const KeycloakTestHelper = require('./KeycloakTestHelper');

class ApiTestHelper {
  constructor(app) {
    this.app = app;
    this.keycloak = new KeycloakTestHelper();
    this.tokens = new Map();
  }

  /**
   * 認証付きGETリクエスト
   */
  async authenticatedGet(path, role = 'bank-customer') {
    const token = await this.getTokenForRole(role);
    return request(this.app)
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }

  /**
   * 認証付きPOSTリクエスト
   */
  async authenticatedPost(path, data, role = 'bank-customer') {
    const token = await this.getTokenForRole(role);
    return request(this.app)
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  /**
   * 認証付きPUTリクエスト
   */
  async authenticatedPut(path, data, role = 'bank-customer') {
    const token = await this.getTokenForRole(role);
    return request(this.app)
      .put(path)
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  /**
   * 認証付きDELETEリクエスト
   */
  async authenticatedDelete(path, role = 'bank-admin') {
    const token = await this.getTokenForRole(role);
    return request(this.app)
      .delete(path)
      .set('Authorization', `Bearer ${token}`);
  }

  /**
   * ロール別トークンキャッシュ取得
   */
  async getTokenForRole(role) {
    if (!this.tokens.has(role)) {
      const token = await this.keycloak.getTokenByRole(role);
      this.tokens.set(role, token);
    }
    return this.tokens.get(role);
  }

  /**
   * 認証なしリクエスト（401テスト用）
   */
  unauthenticatedGet(path) {
    return request(this.app).get(path);
  }

  /**
   * 無効トークンテスト
   */
  invalidTokenGet(path) {
    return request(this.app)
      .get(path)
      .set('Authorization', 'Bearer invalid-token-here');
  }

  /**
   * 期限切れトークンテスト
   */
  expiredTokenGet(path) {
    const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJyUVZfWnNxR3Q4TlE3eDJEVk5RY1Q3Z0JzOEVCWl9TQUVnNzZiWkpmcXRrIn0.eyJleHAiOjE2MzA0NjQwMDAsImlhdCI6MTYzMDQ2MDQwMH0.expired';
    return request(this.app)
      .get(path)
      .set('Authorization', `Bearer ${expiredToken}`);
  }

  /**
   * トークンキャッシュクリア
   */
  clearTokenCache() {
    this.tokens.clear();
  }
}

module.exports = ApiTestHelper;
```

## 4. テスト用データ管理

### 4.1 データベースリセットヘルパー

`test/utils/DatabaseHelper.js`を作成：

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DatabaseHelper {
  constructor({
    postgresUrl = 'postgresql://keycloak_test:test123@localhost:5433/keycloak_test'
  } = {}) {
    this.postgresUrl = postgresUrl;
  }

  /**
   * テストデータベースリセット
   */
  async resetTestDatabase() {
    try {
      // PostgreSQL接続確認
      await execAsync(`pg_isready -h localhost -p 5433 -U keycloak_test`);
      
      console.log('🔄 Resetting test database...');
      
      // Keycloak関連テーブルのクリーンアップクエリ
      const cleanupQueries = [
        'DELETE FROM user_session WHERE 1=1;',
        'DELETE FROM user_role_mapping WHERE 1=1;',
        'DELETE FROM user_attribute WHERE 1=1;',
        'DELETE FROM credential WHERE 1=1;',
        'DELETE FROM user_entity WHERE username LIKE \'test_%\';',
        // 必要に応じて他のテーブルも追加
      ];

      for (const query of cleanupQueries) {
        await execAsync(`PGPASSWORD=test123 psql -h localhost -p 5433 -U keycloak_test -d keycloak_test -c "${query}"`);
      }

      console.log('✅ Test database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
      throw error;
    }
  }

  /**
   * テスト用Keycloakコンテナリスタート
   */
  async restartKeycloakContainer() {
    try {
      console.log('🔄 Restarting Keycloak test container...');
      await execAsync('docker-compose -f docker-compose.test.yml restart keycloak-test');
      
      // 起動待ち
      let retries = 20;
      while (retries > 0) {
        try {
          await execAsync('curl -f http://localhost:8182/health/ready');
          break;
        } catch {
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        }
      }
      
      if (retries === 0) {
        throw new Error('Keycloak restart timeout');
      }
      
      console.log('✅ Keycloak container restarted');
    } catch (error) {
      console.error('❌ Container restart failed:', error.message);
      throw error;
    }
  }
}

module.exports = DatabaseHelper;
```

## 5. CI/CD統合

### 5.1 GitHub Actions設定

`.github/workflows/test.yml`を作成：

```yaml
name: Run Tests with Keycloak

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: keycloak_test
          POSTGRES_USER: keycloak_test
          POSTGRES_PASSWORD: test123
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm ci
        cd shared && npm ci
        cd ../services/gateway && npm ci
        cd ../accounts && npm ci

    - name: Start Keycloak
      run: |
        docker run -d \
          --name keycloak-test \
          -p 8182:8080 \
          -e KC_DB=postgres \
          -e KC_DB_URL=jdbc:postgresql://localhost:5433/keycloak_test \
          -e KC_DB_USERNAME=keycloak_test \
          -e KC_DB_PASSWORD=test123 \
          -e KC_HOSTNAME_STRICT=false \
          -e KC_HOSTNAME_STRICT_HTTPS=false \
          -e KC_HTTP_ENABLED=true \
          -e KEYCLOAK_ADMIN=admin \
          -e KEYCLOAK_ADMIN_PASSWORD=admin123 \
          -v ${{ github.workspace }}/test/keycloak:/opt/keycloak/data/import \
          quay.io/keycloak/keycloak:23.0 start-dev --import-realm
        
        # Keycloak起動待ち
        timeout 60 bash -c 'until curl -f http://localhost:8182/health/ready; do sleep 2; done'

    - name: Run tests
      run: |
        npm test
      env:
        KEYCLOAK_URL: http://localhost:8182
        KEYCLOAK_REALM: kurobank-test
        KEYCLOAK_CLIENT_ID: kurobank-test

    - name: Cleanup
      if: always()
      run: |
        docker stop keycloak-test || true
        docker rm keycloak-test || true
```

### 5.2 Package.json テストスクリプト

各サービスの`package.json`に追加：

```json
{
  "scripts": {
    "test": "jest",
    "test:integration": "jest --testMatch='**/integration/**/*.test.js'",
    "test:auth": "jest --testMatch='**/auth/**/*.test.js'",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "setupFilesAfterEnv": ["<rootDir>/test/setup/jest.setup.js"],
    "testEnvironment": "node",
    "testTimeout": 10000
  }
}
```

## 6. 実際のテスト例

### 6.1 認証テスト

`services/gateway/__tests__/auth/authentication.test.js`を作成：

```javascript
const app = require('../../src/app');
const ApiTestHelper = require('../../../test/utils/ApiTestHelper');

describe('Authentication Tests', () => {
  let apiHelper;

  beforeAll(() => {
    apiHelper = new ApiTestHelper(app);
  });

  afterEach(() => {
    apiHelper.clearTokenCache();
  });

  describe('Token Validation', () => {
    test('should accept valid token', async () => {
      const response = await apiHelper.authenticatedGet('/api/accounts');
      expect(response.status).not.toBe(401);
    });

    test('should reject missing token', async () => {
      const response = await apiHelper.unauthenticatedGet('/api/accounts');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject invalid token', async () => {
      const response = await apiHelper.invalidTokenGet('/api/accounts');
      expect(response.status).toBe(401);
    });
  });

  describe('Role-based Access', () => {
    test('customer can access customer endpoints', async () => {
      const response = await apiHelper.authenticatedGet('/api/accounts', 'bank-customer');
      expect(response.status).not.toBe(403);
    });

    test('customer cannot access admin endpoints', async () => {
      const response = await apiHelper.authenticatedGet('/api/admin/users', 'bank-customer');
      expect(response.status).toBe(403);
    });

    test('admin can access all endpoints', async () => {
      const adminResponse = await apiHelper.authenticatedGet('/api/admin/users', 'bank-admin');
      expect(adminResponse.status).not.toBe(403);
    });
  });

  describe('Token Claims', () => {
    test('token should contain expected user info', async () => {
      const token = await apiHelper.getTokenForRole('bank-customer');
      expect(token).toHaveValidJWT();
      expect(token).toHaveRole('bank-customer');
    });

    test('different roles have different permissions', async () => {
      const customerToken = await apiHelper.getTokenForRole('bank-customer');
      const employeeToken = await apiHelper.getTokenForRole('bank-employee');
      
      expect(customerToken).toHaveRole('bank-customer');
      expect(employeeToken).toHaveRole('bank-employee');
    });
  });
});
```

### 6.2 統合テスト

`services/accounts/__tests__/integration/accounts-auth.test.js`を作成：

```javascript
const app = require('../../src/app');
const ApiTestHelper = require('../../../test/utils/ApiTestHelper');

describe('Accounts Service Authentication Integration', () => {
  let apiHelper;

  beforeAll(() => {
    apiHelper = new ApiTestHelper(app);
  });

  describe('Account Management', () => {
    test('authenticated customer can view own accounts', async () => {
      const response = await apiHelper.authenticatedGet(
        '/api/accounts/customer/12345678',
        'bank-customer'
      );
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accounts');
    });

    test('employee can create new account', async () => {
      const newAccount = {
        customerId: '12345678',
        accountType: 'SAVINGS',
        branchAddress: 'Test Branch'
      };

      const response = await apiHelper.authenticatedPost(
        '/api/accounts',
        newAccount,
        'bank-employee'
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accountNumber');
    });

    test('admin can delete accounts', async () => {
      const response = await apiHelper.authenticatedDelete(
        '/api/accounts/1234567890',
        'bank-admin'
      );

      expect(response.status).toBe(200);
    });
  });
});
```

## 7. テスト実行スクリプト

### 7.1 テスト環境起動スクリプト

`scripts/start-test-env.sh`を作成：

```bash
#!/bin/bash

echo "🚀 Starting Keycloak test environment..."

# テスト用Docker Composeの起動
docker-compose -f docker-compose.test.yml up -d

# Keycloak起動待ち
echo "⏳ Waiting for Keycloak to be ready..."
timeout 60 bash -c 'until curl -f http://localhost:8182/health/ready 2>/dev/null; do sleep 2; done'

if [ $? -eq 0 ]; then
  echo "✅ Keycloak test environment is ready!"
  echo "🔗 Admin Console: http://localhost:8182"
  echo "👤 Admin credentials: admin / admin123"
else
  echo "❌ Failed to start Keycloak test environment"
  exit 1
fi
```

### 7.2 テストクリーンアップスクリプト

`scripts/cleanup-test-env.sh`を作成：

```bash
#!/bin/bash

echo "🧹 Cleaning up test environment..."

# テストコンテナ停止・削除
docker-compose -f docker-compose.test.yml down -v

# テストデータボリューム削除
docker volume prune -f

echo "✅ Test environment cleanup completed"
```

## 8. 使用方法

### 8.1 テスト環境の起動

```bash
# 実行権限付与
chmod +x scripts/start-test-env.sh
chmod +x scripts/cleanup-test-env.sh

# テスト環境起動
./scripts/start-test-env.sh

# テスト実行
npm test

# 環境クリーンアップ
./scripts/cleanup-test-env.sh
```

### 8.2 開発時のテストワークフロー

```bash
# 1. テスト環境起動
./scripts/start-test-env.sh

# 2. 開発中のテスト実行（ウォッチモード）
npm run test:watch

# 3. 統合テスト実行
npm run test:integration

# 4. 認証関連テストのみ実行
npm run test:auth

# 5. カバレッジ付きテスト実行
npm run test:coverage
```

このテスト支援環境により、Keycloakを使用した認証・認可機能の開発とテストが大幅に効率化されます。