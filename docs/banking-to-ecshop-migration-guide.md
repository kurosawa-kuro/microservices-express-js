# 銀行カードローンシステムからECショップアプリケーションへの移行手順書

## 目次

1. [概要](#1-概要)
2. [移行前の準備](#2-移行前の準備)
3. [アーキテクチャ変更計画](#3-アーキテクチャ変更計画)
4. [データベーススキーマ移行](#4-データベーススキーマ移行)
5. [認証システムの移行（Keycloak → Cognito）](#5-認証システムの移行keycloak--cognito)
6. [マイクロサービスの変換](#6-マイクロサービスの変換)
7. [API仕様の更新](#7-api仕様の更新)
8. [データ移行戦略](#8-データ移行戦略)
9. [テスト計画](#9-テスト計画)
10. [段階的移行スケジュール](#10-段階的移行スケジュール)

## 1. 概要

### 1.1 移行の目的

銀行カードローンシステムをECショップアプリケーションに変換し、以下を実現します：

- 金融サービスからeコマースプラットフォームへの転換
- AWS Cognitoを使用したモダンな認証システム
- 機械学習対応のデータ構造（推薦システム、需要予測など）
- スケーラブルなマイクロサービスアーキテクチャの維持

### 1.2 主な変更点

| 項目 | 現在（銀行システム） | 移行後（ECショップ） |
|------|---------------------|---------------------|
| 認証 | Keycloak + PostgreSQL | AWS Cognito |
| データベース | SQLite（各サービス） | PostgreSQL（統合） |
| 主要エンティティ | Customer, Account, Card, Loan | User, Product, Order, Cart |
| ビジネスロジック | 金融取引処理 | 商品購入・在庫管理 |
| メッセージング | Kafka（アカウントイベント） | Kafka（注文・在庫イベント） |

## 2. 移行前の準備

### 2.1 現行システムのバックアップ

```bash
# 全データベースのバックアップ
mkdir -p backup/$(date +%Y%m%d)
cd backup/$(date +%Y%m%d)

# 各サービスのデータベースをバックアップ
docker cp accounts-service:/app/accounts_dev.db ./
docker cp cards-service:/app/cards_dev.db ./
docker cp loans-service:/app/loans_dev.db ./

# Keycloakデータのエクスポート
docker exec keycloak /opt/keycloak/bin/kc.sh export \
  --file /tmp/keycloak-backup.json \
  --realm kurobank

# 設定ファイルのバックアップ
cp -r ../../docker-compose.yml ./
cp -r ../../services ./services-backup
```

### 2.2 移行環境の準備

```bash
# 新しいブランチ作成
git checkout -b feature/ecshop-migration

# 必要なツールのインストール
npm install -g aws-cdk
npm install -g @aws-amplify/cli

# PostgreSQLクライアントツール
brew install postgresql # macOS
sudo apt-get install postgresql-client # Ubuntu
```

### 2.3 AWS環境の準備

```bash
# AWS CLIの設定
aws configure

# Cognitoユーザープールの作成準備
aws cognito-idp list-user-pools --max-results 10
```

## 3. アーキテクチャ変更計画

### 3.1 サービス構成の変更

```
現在のサービス構成:
├── gateway-service (8072)
├── accounts-service (8080)
├── cards-service (9000)
├── loans-service (8090)
└── message-service (9010)

↓

新しいサービス構成:
├── api-gateway (8072)
├── user-service (8080)
├── product-service (8081)
├── order-service (8082)
├── cart-service (8083)
├── payment-service (9000)
├── notification-service (9010)
└── recommendation-service (9011)
```

### 3.2 技術スタックの更新

```yaml
# 新しい docker-compose.yml の構成
version: '3.8'

services:
  # PostgreSQL（統合データベース）
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ecshop
      POSTGRES_USER: ecshop_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  # API Gateway（既存のgateway-serviceを更新）
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "8072:8072"
    environment:
      - NODE_ENV=development
      - COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
      - COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
      - COGNITO_REGION=${AWS_REGION}
    depends_on:
      - postgres

  # User Service（accounts-serviceから変換）
  user-service:
    build: ./services/user-service
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://ecshop_user:${DB_PASSWORD}@postgres:5432/ecshop
      - COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
    depends_on:
      - postgres

  # Product Service（新規作成）
  product-service:
    build: ./services/product-service
    ports:
      - "8081:8081"
    environment:
      - DATABASE_URL=postgresql://ecshop_user:${DB_PASSWORD}@postgres:5432/ecshop
    depends_on:
      - postgres

  # その他のサービス...
```

## 4. データベーススキーマ移行

### 4.1 Prismaスキーマの設定

`prisma/schema.prisma`を作成：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model（Customerから変換）
model User {
  id              String    @id
  email           String    @unique
  cognitoId       String    @unique
  emailVerified   Boolean   @default(false)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  status          UserStatus @default(ACTIVE)
  
  // 旧システムからの移行フィールド
  legacyCustomerId String?   @unique // 旧customer_idを保持
  
  userRoles       UserRole[]
  viewHistories   ViewHistory[]
  cartItems       CartItem[]
  orders          Order[]
  returns         Return[]
}

// 以下、提供されたスキーマの実装...
```

### 4.2 データ移行スクリプト

`scripts/migrate-data.js`を作成：

```javascript
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function migrateCustomersToUsers() {
  console.log('Starting customer to user migration...');
  
  // SQLiteデータベースを開く
  const db = await open({
    filename: './backup/accounts_dev.db',
    driver: sqlite3.Database
  });
  
  // 既存の顧客データを取得
  const customers = await db.all('SELECT * FROM Customer');
  
  for (const customer of customers) {
    try {
      // Cognitoユーザーの作成（実際のCognito APIコール）
      const cognitoId = await createCognitoUser({
        email: customer.email,
        name: customer.name,
        phoneNumber: customer.mobileNumber
      });
      
      // Prismaでユーザー作成
      await prisma.user.create({
        data: {
          id: cognitoId,
          email: customer.email,
          cognitoId: cognitoId,
          emailVerified: true,
          status: 'ACTIVE',
          legacyCustomerId: customer.customer_id.toString(),
          createdAt: new Date(customer.createdOn),
          updatedAt: new Date(customer.updatedOn || customer.createdOn)
        }
      });
      
      console.log(`Migrated customer ${customer.customer_id} -> User ${cognitoId}`);
    } catch (error) {
      console.error(`Failed to migrate customer ${customer.customer_id}:`, error);
    }
  }
  
  await db.close();
}

async function migrateCardsToPaymentMethods() {
  console.log('Starting cards to payment methods migration...');
  
  const db = await open({
    filename: './backup/cards_dev.db',
    driver: sqlite3.Database
  });
  
  const cards = await db.all('SELECT * FROM Cards');
  
  // カード情報を注文の支払い方法として保存
  // 実際のカード番号は保存せず、トークン化して保存
  
  await db.close();
}

async function createInitialProducts() {
  console.log('Creating initial product catalog...');
  
  const categories = [
    { name: 'Electronics' },
    { name: 'Clothing' },
    { name: 'Books' },
    { name: 'Home & Garden' },
    { name: 'Sports & Outdoors' }
  ];
  
  // カテゴリー作成
  for (const category of categories) {
    await prisma.category.create({ data: category });
  }
  
  // サンプル商品作成
  const sampleProducts = [
    {
      name: 'Laptop Computer',
      price: 999.99,
      rating: 4.5,
      image: '/images/laptop.jpg',
      categories: ['Electronics']
    },
    {
      name: 'Running Shoes',
      price: 79.99,
      rating: 4.2,
      image: '/images/shoes.jpg',
      categories: ['Clothing', 'Sports & Outdoors']
    },
    // 他の商品...
  ];
  
  for (const product of sampleProducts) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        price: product.price,
        rating: product.rating,
        image: product.image
      }
    });
    
    // カテゴリー関連付け
    for (const categoryName of product.categories) {
      const category = await prisma.category.findUnique({
        where: { name: categoryName }
      });
      
      if (category) {
        await prisma.productCategory.create({
          data: {
            productId: created.id,
            categoryId: category.id
          }
        });
      }
    }
  }
}

// メイン実行関数
async function main() {
  try {
    await migrateCustomersToUsers();
    await migrateCardsToPaymentMethods();
    await createInitialProducts();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

## 5. 認証システムの移行（Keycloak → Cognito）

### 5.1 Cognito User Poolの作成

`infrastructure/cognito-setup.js`:

```javascript
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

async function createUserPool() {
  const params = {
    PoolName: 'ecshop-users',
    
    // パスワードポリシー
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true
      }
    },
    
    // 自動検証属性
    AutoVerifiedAttributes: ['email'],
    
    // ユーザー属性
    Schema: [
      {
        Name: 'email',
        AttributeDataType: 'String',
        Required: true,
        Mutable: true
      },
      {
        Name: 'name',
        AttributeDataType: 'String',
        Required: false,
        Mutable: true
      },
      {
        Name: 'phone_number',
        AttributeDataType: 'String',
        Required: false,
        Mutable: true
      },
      {
        Name: 'legacy_customer_id',
        AttributeDataType: 'String',
        DeveloperOnlyAttribute: false,
        Mutable: false,
        Required: false
      }
    ],
    
    // MFA設定
    MfaConfiguration: 'OPTIONAL',
    EnabledMfas: ['SMS_MFA', 'SOFTWARE_TOKEN_MFA']
  };
  
  const result = await cognito.createUserPool(params).promise();
  console.log('User Pool created:', result.UserPool.Id);
  
  return result.UserPool;
}

async function createUserPoolClient(userPoolId) {
  const params = {
    ClientName: 'ecshop-web-client',
    UserPoolId: userPoolId,
    
    // 認証フロー
    ExplicitAuthFlows: [
      'ALLOW_USER_PASSWORD_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
      'ALLOW_USER_SRP_AUTH'
    ],
    
    // トークン有効期限
    AccessTokenValidity: 1, // 1時間
    IdTokenValidity: 1,     // 1時間
    RefreshTokenValidity: 30, // 30日
    
    // OAuth設定
    AllowedOAuthFlows: ['code', 'implicit'],
    AllowedOAuthScopes: ['email', 'openid', 'profile'],
    CallbackURLs: ['http://localhost:3000/callback'],
    LogoutURLs: ['http://localhost:3000/logout']
  };
  
  const result = await cognito.createUserPoolClient(params).promise();
  console.log('User Pool Client created:', result.UserPoolClient.ClientId);
  
  return result.UserPoolClient;
}

// 実行
async function setupCognito() {
  try {
    const userPool = await createUserPool();
    const client = await createUserPoolClient(userPool.Id);
    
    console.log('\nCognito設定完了:');
    console.log(`User Pool ID: ${userPool.Id}`);
    console.log(`Client ID: ${client.ClientId}`);
    console.log('\n環境変数に設定してください:');
    console.log(`COGNITO_USER_POOL_ID=${userPool.Id}`);
    console.log(`COGNITO_CLIENT_ID=${client.ClientId}`);
    console.log(`COGNITO_REGION=${AWS.config.region}`);
    
  } catch (error) {
    console.error('Cognito setup failed:', error);
  }
}

setupCognito();
```

### 5.2 認証ミドルウェアの更新

`services/api-gateway/src/middleware/cognitoAuth.js`:

```javascript
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const logger = require('../utils/logger');

// Cognito JWT Verifierの設定
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
});

const cognitoAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    
    // トークン検証
    const payload = await verifier.verify(token);
    
    // ユーザー情報をリクエストに追加
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      groups: payload['cognito:groups'] || []
    };
    
    logger.info(`User authenticated: ${req.user.email}`);
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
};

// ロールベースアクセス制御
const requireRole = (roles) => {
  return (req, res, next) => {
    const userGroups = req.user?.groups || [];
    const hasRole = roles.some(role => userGroups.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

module.exports = { cognitoAuthMiddleware, requireRole };
```

### 5.3 ユーザー移行バッチ

`scripts/migrate-keycloak-users.js`:

```javascript
const AWS = require('aws-sdk');
const axios = require('axios');

const cognito = new AWS.CognitoIdentityServiceProvider();

async function getKeycloakUsers() {
  // Keycloak Admin APIからユーザー取得
  const token = await getKeycloakAdminToken();
  
  const response = await axios.get(
    'http://localhost:8181/admin/realms/kurobank/users',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
}

async function migrateUserToCognito(keycloakUser) {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: keycloakUser.username,
    
    UserAttributes: [
      { Name: 'email', Value: keycloakUser.email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: `${keycloakUser.firstName} ${keycloakUser.lastName}` }
    ],
    
    // 一時パスワード設定（ユーザーに通知必要）
    TemporaryPassword: generateTempPassword(),
    MessageAction: 'SUPPRESS' // 通知メールを送らない
  };
  
  try {
    const result = await cognito.adminCreateUser(params).promise();
    
    // グループ（ロール）の割り当て
    if (keycloakUser.realmRoles) {
      for (const role of keycloakUser.realmRoles) {
        await assignUserToGroup(result.User.Username, role);
      }
    }
    
    return result.User;
  } catch (error) {
    console.error(`Failed to migrate user ${keycloakUser.username}:`, error);
    throw error;
  }
}

async function assignUserToGroup(username, groupName) {
  // グループが存在しない場合は作成
  try {
    await cognito.getGroup({
      GroupName: groupName,
      UserPoolId: process.env.COGNITO_USER_POOL_ID
    }).promise();
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      await cognito.createGroup({
        GroupName: groupName,
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Description: `Migrated from Keycloak role: ${groupName}`
      }).promise();
    }
  }
  
  // ユーザーをグループに追加
  await cognito.adminAddUserToGroup({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    GroupName: groupName
  }).promise();
}

// メイン実行
async function main() {
  console.log('Starting Keycloak to Cognito user migration...');
  
  const keycloakUsers = await getKeycloakUsers();
  console.log(`Found ${keycloakUsers.length} users in Keycloak`);
  
  const migrationResults = [];
  
  for (const user of keycloakUsers) {
    try {
      const cognitoUser = await migrateUserToCognito(user);
      migrationResults.push({
        success: true,
        keycloakId: user.id,
        cognitoId: cognitoUser.Username,
        email: user.email
      });
    } catch (error) {
      migrationResults.push({
        success: false,
        keycloakId: user.id,
        email: user.email,
        error: error.message
      });
    }
  }
  
  // 移行結果をファイルに保存
  const fs = require('fs');
  fs.writeFileSync(
    'migration-results.json',
    JSON.stringify(migrationResults, null, 2)
  );
  
  console.log('Migration completed!');
  console.log(`Success: ${migrationResults.filter(r => r.success).length}`);
  console.log(`Failed: ${migrationResults.filter(r => !r.success).length}`);
}

main().catch(console.error);
```

## 6. マイクロサービスの変換

### 6.1 Accounts Service → User Service

`services/user-service/src/index.js`:

```javascript
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { cognitoAuthMiddleware } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cognitoAuthMiddleware);

// ユーザープロフィール取得
app.get('/api/users/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ユーザー更新
app.put('/api/users/profile', async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        // Cognitoと同期が必要なフィールドは除外
        updatedAt: new Date()
      }
    });
    
    res.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 購入履歴取得（ローンの代わり）
app.get('/api/users/:userId/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.userId },
      include: {
        orderItems: {
          include: { product: true }
        }
      },
      orderBy: { orderedAt: 'desc' }
    });
    
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`User Service running on port ${PORT}`);
});
```

### 6.2 Cards Service → Payment Service

`services/payment-service/src/index.js`:

```javascript
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('./utils/logger');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// 支払い処理
app.post('/api/payments/process', async (req, res) => {
  try {
    const { orderId, paymentMethodId, amount } = req.body;
    
    // Stripeで支払い処理
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // セント単位
      currency: 'jpy',
      payment_method: paymentMethodId,
      confirm: true
    });
    
    // 注文の更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentId: paymentIntent.id
      }
    });
    
    // Kafkaに支払い完了イベント送信
    await sendPaymentEvent({
      orderId,
      paymentId: paymentIntent.id,
      amount,
      status: 'completed'
    });
    
    res.json({
      success: true,
      paymentId: paymentIntent.id
    });
    
  } catch (error) {
    logger.error('Payment processing error:', error);
    res.status(400).json({
      error: 'Payment failed',
      message: error.message
    });
  }
});

// 支払い方法の登録
app.post('/api/payments/methods', async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    // Stripeで顧客作成または取得
    let customer = await getOrCreateStripeCustomer(userId);
    
    // 支払い方法を追加
    const paymentMethod = await stripe.paymentMethods.attach(
      token,
      { customer: customer.id }
    );
    
    res.json({
      paymentMethodId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand
    });
    
  } catch (error) {
    logger.error('Error adding payment method:', error);
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});
```

### 6.3 新規Product Serviceの作成

`services/product-service/src/index.js`:

```javascript
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { ElasticsearchClient } = require('@elastic/elasticsearch');
const logger = require('./utils/logger');

const app = express();
const prisma = new PrismaClient();
const esClient = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

app.use(express.json());

// 商品検索
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort } = req.query;
    
    // Elasticsearchクエリ構築
    const query = {
      bool: {
        must: [],
        filter: []
      }
    };
    
    if (q) {
      query.bool.must.push({
        multi_match: {
          query: q,
          fields: ['name^2', 'description']
        }
      });
    }
    
    if (category) {
      query.bool.filter.push({
        term: { 'categories.name': category }
      });
    }
    
    if (minPrice || maxPrice) {
      query.bool.filter.push({
        range: {
          price: {
            gte: minPrice || 0,
            lte: maxPrice || 999999
          }
        }
      });
    }
    
    // Elasticsearch検索実行
    const result = await esClient.search({
      index: 'products',
      body: {
        query,
        sort: getSortOption(sort),
        size: 20
      }
    });
    
    // 検索ログ記録
    await prisma.userActionLog.create({
      data: {
        userId: req.user?.id || 'anonymous',
        actionType: 'SEARCH_BY_KEYWORD',
        searchKeyword: q,
        metadata: {
          category,
          minPrice,
          maxPrice,
          resultCount: result.hits.total.value
        }
      }
    });
    
    res.json({
      products: result.hits.hits.map(hit => hit._source),
      total: result.hits.total.value
    });
    
  } catch (error) {
    logger.error('Product search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 商品詳細取得
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        productCategories: {
          include: { category: true }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // 閲覧履歴記録
    if (req.user) {
      await prisma.viewHistory.create({
        data: {
          userId: req.user.id,
          productId: product.id
        }
      });
    }
    
    res.json(product);
    
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// カテゴリ一覧取得
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { productCategories: true }
        }
      }
    });
    
    res.json(categories);
    
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// トップページ表示データ取得
app.get('/api/products/top-page', async (req, res) => {
  try {
    const displays = await prisma.topPageDisplay.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      orderBy: { priority: 'desc' }
    });
    
    // 表示タイプ別にグループ化
    const grouped = displays.reduce((acc, display) => {
      if (!acc[display.displayType]) {
        acc[display.displayType] = [];
      }
      acc[display.displayType].push(display);
      return acc;
    }, {});
    
    res.json(grouped);
    
  } catch (error) {
    logger.error('Error fetching top page data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getSortOption(sort) {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }];
    case 'price_desc':
      return [{ price: 'desc' }];
    case 'rating':
      return [{ rating: 'desc' }];
    case 'newest':
      return [{ createdAt: 'desc' }];
    default:
      return [{ _score: 'desc' }];
  }
}

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  logger.info(`Product Service running on port ${PORT}`);
});
```

## 7. API仕様の更新

### 7.1 OpenAPI仕様の変更

`api-specs/ecshop-api.yaml`:

```yaml
openapi: 3.0.0
info:
  title: EC Shop API
  version: 1.0.0
  description: E-commerce platform API (migrated from banking system)

servers:
  - url: http://localhost:8072
    description: Development server

security:
  - CognitoAuth: []

paths:
  # User endpoints
  /api/users/profile:
    get:
      summary: Get user profile
      tags:
        - Users
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    
  # Product endpoints
  /api/products:
    get:
      summary: Search products
      tags:
        - Products
      parameters:
        - name: q
          in: query
          schema:
            type: string
          description: Search query
        - name: category
          in: query
          schema:
            type: string
        - name: minPrice
          in: query
          schema:
            type: number
        - name: maxPrice
          in: query
          schema:
            type: number
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                type: object
                properties:
                  products:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  total:
                    type: integer
    
  /api/products/{id}:
    get:
      summary: Get product details
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
    
  # Cart endpoints
  /api/cart:
    get:
      summary: Get user's cart
      tags:
        - Cart
      responses:
        '200':
          description: Cart contents
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cart'
    
    post:
      summary: Add item to cart
      tags:
        - Cart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                productId:
                  type: integer
                quantity:
                  type: integer
      responses:
        '201':
          description: Item added to cart
    
  # Order endpoints
  /api/orders:
    post:
      summary: Create order
      tags:
        - Orders
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      productId:
                        type: integer
                      quantity:
                        type: integer
                shippingAddress:
                  $ref: '#/components/schemas/Address'
                paymentMethodId:
                  type: string
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'

components:
  securitySchemes:
    CognitoAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: AWS Cognito JWT token
  
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        emailVerified:
          type: boolean
        status:
          type: string
          enum: [ACTIVE, DISABLED, DELETED]
        createdAt:
          type: string
          format: date-time
    
    Product:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        price:
          type: number
        rating:
          type: number
        image:
          type: string
        categories:
          type: array
          items:
            $ref: '#/components/schemas/Category'
    
    Category:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
    
    Cart:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/CartItem'
        totalAmount:
          type: number
    
    CartItem:
      type: object
      properties:
        id:
          type: integer
        product:
          $ref: '#/components/schemas/Product'
        quantity:
          type: integer
        addedAt:
          type: string
          format: date-time
    
    Order:
      type: object
      properties:
        id:
          type: integer
        userId:
          type: string
        totalAmount:
          type: number
        status:
          type: string
        orderedAt:
          type: string
          format: date-time
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
    
    OrderItem:
      type: object
      properties:
        id:
          type: integer
        product:
          $ref: '#/components/schemas/Product'
        quantity:
          type: integer
        price:
          type: number
    
    Address:
      type: object
      properties:
        street:
          type: string
        city:
          type: string
        state:
          type: string
        zipCode:
          type: string
        country:
          type: string
```

### 7.2 API Gateway設定の更新

`services/api-gateway/src/routes.js`:

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');
const { cognitoAuthMiddleware, requireRole } = require('./middleware/auth');

module.exports = (app) => {
  // ヘルスチェック（認証不要）
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'api-gateway' });
  });
  
  // 認証エンドポイント（Cognitoへのプロキシ）
  app.use('/api/auth', createProxyMiddleware({
    target: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': ''
    }
  }));
  
  // User Service
  app.use('/api/users', cognitoAuthMiddleware, createProxyMiddleware({
    target: 'http://user-service:8080',
    changeOrigin: true
  }));
  
  // Product Service（一部認証不要）
  app.use('/api/products/search', createProxyMiddleware({
    target: 'http://product-service:8081',
    changeOrigin: true
  }));
  
  app.use('/api/products/:id', createProxyMiddleware({
    target: 'http://product-service:8081',
    changeOrigin: true
  }));
  
  app.use('/api/categories', createProxyMiddleware({
    target: 'http://product-service:8081',
    changeOrigin: true
  }));
  
  // Cart Service（認証必須）
  app.use('/api/cart', cognitoAuthMiddleware, createProxyMiddleware({
    target: 'http://cart-service:8083',
    changeOrigin: true
  }));
  
  // Order Service（認証必須）
  app.use('/api/orders', cognitoAuthMiddleware, createProxyMiddleware({
    target: 'http://order-service:8082',
    changeOrigin: true
  }));
  
  // Payment Service（認証必須）
  app.use('/api/payments', cognitoAuthMiddleware, createProxyMiddleware({
    target: 'http://payment-service:9000',
    changeOrigin: true
  }));
  
  // Admin endpoints（管理者権限必須）
  app.use('/api/admin', cognitoAuthMiddleware, requireRole(['admin']), createProxyMiddleware({
    target: 'http://admin-service:8084',
    changeOrigin: true
  }));
  
  // Recommendation Service
  app.use('/api/recommendations', createProxyMiddleware({
    target: 'http://recommendation-service:9011',
    changeOrigin: true
  }));
};
```

## 8. データ移行戦略

### 8.1 段階的データ移行

```mermaid
graph LR
    A[Banking System] --> B[Data Export]
    B --> C[Transform]
    C --> D[Validate]
    D --> E[EC Shop System]
    
    subgraph "Phase 1: User Data"
        F[Customers] --> G[Users]
        H[Accounts] --> I[User Profiles]
    end
    
    subgraph "Phase 2: Transaction Data"
        J[Cards] --> K[Payment Methods]
        L[Loans] --> M[Order History]
    end
    
    subgraph "Phase 3: New Data"
        N[Products]
        O[Categories]
        P[Inventory]
    end
```

### 8.2 移行スクリプト実行手順

```bash
#!/bin/bash
# migration-runner.sh

echo "Starting EC Shop Migration..."

# 1. 環境変数の設定
export DATABASE_URL="postgresql://ecshop_user:password@localhost:5432/ecshop"
export COGNITO_USER_POOL_ID="ap-northeast-1_xxxxx"
export COGNITO_CLIENT_ID="xxxxxxxxxxxxx"

# 2. データベースのセットアップ
echo "Setting up database..."
npx prisma migrate deploy
npx prisma generate

# 3. 基礎データの作成
echo "Creating base data..."
node scripts/create-base-data.js

# 4. ユーザーデータの移行
echo "Migrating users..."
node scripts/migrate-customers-to-users.js

# 5. 取引データの変換
echo "Converting transaction data..."
node scripts/convert-transactions.js

# 6. Cognitoユーザーの作成
echo "Creating Cognito users..."
node scripts/migrate-keycloak-users.js

# 7. Elasticsearchインデックスの作成
echo "Setting up search indices..."
node scripts/setup-elasticsearch.js

# 8. 初期商品データの投入
echo "Loading initial products..."
node scripts/load-products.js

# 9. データ検証
echo "Validating migration..."
node scripts/validate-migration.js

echo "Migration completed!"
```

### 8.3 データ検証スクリプト

`scripts/validate-migration.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const AWS = require('aws-sdk');

const prisma = new PrismaClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

async function validateMigration() {
  const results = {
    users: { total: 0, valid: 0, errors: [] },
    products: { total: 0, valid: 0, errors: [] },
    categories: { total: 0, valid: 0, errors: [] },
    cognito: { total: 0, valid: 0, errors: [] }
  };
  
  // ユーザーデータ検証
  console.log('Validating user data...');
  const users = await prisma.user.findMany();
  results.users.total = users.length;
  
  for (const user of users) {
    try {
      // 必須フィールドチェック
      if (!user.email || !user.cognitoId) {
        throw new Error(`Missing required fields for user ${user.id}`);
      }
      
      // Cognitoユーザー存在確認
      await cognito.adminGetUser({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: user.cognitoId
      }).promise();
      
      results.users.valid++;
    } catch (error) {
      results.users.errors.push({
        userId: user.id,
        error: error.message
      });
    }
  }
  
  // 商品データ検証
  console.log('Validating product data...');
  const products = await prisma.product.findMany({
    include: { productCategories: true }
  });
  results.products.total = products.length;
  
  for (const product of products) {
    try {
      if (!product.name || product.price <= 0) {
        throw new Error(`Invalid product data for ${product.id}`);
      }
      
      if (product.productCategories.length === 0) {
        throw new Error(`Product ${product.id} has no categories`);
      }
      
      results.products.valid++;
    } catch (error) {
      results.products.errors.push({
        productId: product.id,
        error: error.message
      });
    }
  }
  
  // カテゴリデータ検証
  console.log('Validating category data...');
  const categories = await prisma.category.findMany();
  results.categories.total = categories.length;
  results.categories.valid = categories.length;
  
  // レポート生成
  console.log('\n=== Migration Validation Report ===');
  console.log(`Users: ${results.users.valid}/${results.users.total} valid`);
  console.log(`Products: ${results.products.valid}/${results.products.total} valid`);
  console.log(`Categories: ${results.categories.valid}/${results.categories.total} valid`);
  
  if (results.users.errors.length > 0) {
    console.log('\nUser Errors:');
    results.users.errors.forEach(err => {
      console.log(`  - ${err.userId}: ${err.error}`);
    });
  }
  
  if (results.products.errors.length > 0) {
    console.log('\nProduct Errors:');
    results.products.errors.forEach(err => {
      console.log(`  - ${err.productId}: ${err.error}`);
    });
  }
  
  // 検証結果をファイルに保存
  const fs = require('fs');
  fs.writeFileSync(
    'validation-report.json',
    JSON.stringify(results, null, 2)
  );
  
  // 検証失敗時は異常終了
  const hasErrors = results.users.errors.length > 0 || 
                   results.products.errors.length > 0;
  
  if (hasErrors) {
    console.error('\nValidation failed! Check validation-report.json for details.');
    process.exit(1);
  }
  
  console.log('\nValidation passed!');
}

validateMigration().catch(console.error);
```

## 9. テスト計画

### 9.1 単体テスト

`services/user-service/__tests__/user.test.js`:

```javascript
const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');
const { mockCognitoAuth } = require('./mocks/cognito');

jest.mock('@prisma/client');
jest.mock('../src/middleware/auth', () => ({
  cognitoAuthMiddleware: mockCognitoAuth
}));

const prisma = new PrismaClient();

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        emailVerified: true,
        status: 'ACTIVE',
        userRoles: []
      };
      
      prisma.user.findUnique.mockResolvedValue(mockUser);
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer mock-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
    });
    
    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer mock-token');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
  
  describe('GET /api/users/:userId/orders', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        {
          id: 1,
          userId: 'test-user-id',
          totalAmount: 1000,
          orderedAt: new Date(),
          orderItems: []
        }
      ];
      
      prisma.order.findMany.mockResolvedValue(mockOrders);
      
      const response = await request(app)
        .get('/api/users/test-user-id/orders')
        .set('Authorization', 'Bearer mock-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            totalAmount: 1000
          })
        ])
      );
    });
  });
});
```

### 9.2 統合テスト

`tests/integration/user-flow.test.js`:

```javascript
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const AWS = require('aws-sdk');

const prisma = new PrismaClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

describe('User Flow Integration', () => {
  let testUser;
  let authToken;
  
  beforeAll(async () => {
    // テストユーザー作成
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.username, 'Test123!');
  });
  
  afterAll(async () => {
    // クリーンアップ
    await cleanupTestUser(testUser);
    await prisma.$disconnect();
  });
  
  test('Complete user registration and shopping flow', async () => {
    // 1. ユーザープロフィール取得
    const profileRes = await request(process.env.API_GATEWAY_URL)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.email).toBe(testUser.email);
    
    // 2. 商品検索
    const searchRes = await request(process.env.API_GATEWAY_URL)
      .get('/api/products/search?q=laptop');
    
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.products).toBeInstanceOf(Array);
    
    const product = searchRes.body.products[0];
    
    // 3. カートに追加
    const cartRes = await request(process.env.API_GATEWAY_URL)
      .post('/api/cart')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId: product.id,
        quantity: 1
      });
    
    expect(cartRes.status).toBe(201);
    
    // 4. 注文作成
    const orderRes = await request(process.env.API_GATEWAY_URL)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{
          productId: product.id,
          quantity: 1
        }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Tokyo',
          state: 'Tokyo',
          zipCode: '100-0001',
          country: 'Japan'
        }
      });
    
    expect(orderRes.status).toBe(201);
    expect(orderRes.body).toHaveProperty('id');
    expect(orderRes.body.totalAmount).toBe(product.price);
  });
});

async function createTestUser() {
  const username = `test-${Date.now()}`;
  const email = `${username}@test.com`;
  
  // Cognitoユーザー作成
  const cognitoUser = await cognito.adminCreateUser({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' }
    ],
    TemporaryPassword: 'TempPass123!',
    MessageAction: 'SUPPRESS'
  }).promise();
  
  // パスワード設定
  await cognito.adminSetUserPassword({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    Password: 'Test123!',
    Permanent: true
  }).promise();
  
  // データベースにユーザー作成
  await prisma.user.create({
    data: {
      id: cognitoUser.User.Username,
      email: email,
      cognitoId: cognitoUser.User.Username,
      emailVerified: true,
      status: 'ACTIVE'
    }
  });
  
  return { username, email, cognitoId: cognitoUser.User.Username };
}

async function getAuthToken(username, password) {
  const response = await cognito.initiateAuth({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password
    }
  }).promise();
  
  return response.AuthenticationResult.AccessToken;
}

async function cleanupTestUser(user) {
  // Cognitoユーザー削除
  await cognito.adminDeleteUser({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: user.username
  }).promise();
  
  // データベースユーザー削除
  await prisma.user.delete({
    where: { id: user.cognitoId }
  });
}
```

### 9.3 負荷テスト

`tests/load/k6-script.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // 100ユーザーまで増加
    { duration: '5m', target: 100 }, // 100ユーザーで維持
    { duration: '2m', target: 200 }, // 200ユーザーまで増加
    { duration: '5m', target: 200 }, // 200ユーザーで維持
    { duration: '2m', target: 0 },   // 0まで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以内
    errors: ['rate<0.1'],             // エラー率10%未満
  },
};

const BASE_URL = 'http://localhost:8072';

export default function () {
  // 商品検索
  const searchRes = http.get(`${BASE_URL}/api/products/search?q=laptop`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search has results': (r) => JSON.parse(r.body).products.length > 0,
  });
  errorRate.add(searchRes.status !== 200);
  
  sleep(1);
  
  // 商品詳細
  const products = JSON.parse(searchRes.body).products;
  if (products.length > 0) {
    const productId = products[0].id;
    const detailRes = http.get(`${BASE_URL}/api/products/${productId}`);
    check(detailRes, {
      'detail status is 200': (r) => r.status === 200,
    });
    errorRate.add(detailRes.status !== 200);
  }
  
  sleep(1);
}
```

## 10. 段階的移行スケジュール

### 10.1 フェーズ1: 基盤準備（1-2週間）

```mermaid
gantt
    title フェーズ1: 基盤準備
    dateFormat  YYYY-MM-DD
    
    section 環境構築
    AWS環境セットアップ           :a1, 2024-01-01, 2d
    Cognito設定                   :a2, after a1, 1d
    PostgreSQL構築                :a3, after a1, 1d
    
    section データ準備
    バックアップ作成              :b1, 2024-01-02, 1d
    スキーマ設計                  :b2, after b1, 2d
    移行スクリプト作成            :b3, after b2, 3d
```

### 10.2 フェーズ2: サービス移行（2-3週間）

```mermaid
gantt
    title フェーズ2: サービス移行
    dateFormat  YYYY-MM-DD
    
    section 認証システム
    Keycloak→Cognito移行         :a1, 2024-01-08, 3d
    認証ミドルウェア更新          :a2, after a1, 2d
    
    section サービス変換
    User Service開発              :b1, 2024-01-08, 3d
    Product Service開発           :b2, after b1, 3d
    Order/Cart Service開発        :b3, after b2, 3d
    Payment Service開発           :b4, after b3, 2d
```

### 10.3 フェーズ3: データ移行（1週間）

```mermaid
gantt
    title フェーズ3: データ移行
    dateFormat  YYYY-MM-DD
    
    section データ移行
    ユーザーデータ移行            :a1, 2024-01-22, 1d
    商品マスタ投入                :a2, after a1, 1d
    トランザクションデータ変換    :a3, after a2, 2d
    
    section 検証
    データ整合性確認              :b1, after a3, 1d
    機能テスト                    :b2, after b1, 1d
```

### 10.4 フェーズ4: 切り替え（1週間）

```mermaid
gantt
    title フェーズ4: 切り替え
    dateFormat  YYYY-MM-DD
    
    section 移行作業
    最終データ同期                :a1, 2024-01-29, 1d
    DNSルーティング切り替え       :a2, after a1, 1d
    
    section 監視
    システム監視                  :b1, after a2, 3d
    問題対応                      :b2, after a2, 3d
```

### 10.5 チェックリスト

#### 移行前チェックリスト

- [ ] 全データのバックアップ完了
- [ ] AWS環境の準備完了
- [ ] Cognito User Pool作成完了
- [ ] PostgreSQLデータベース作成完了
- [ ] 移行スクリプトのテスト完了
- [ ] ロールバック手順の確認
- [ ] 関係者への通知完了

#### 移行中チェックリスト

- [ ] ユーザーデータ移行完了
- [ ] 認証システム切り替え完了
- [ ] 各サービスの動作確認
- [ ] データ整合性の確認
- [ ] パフォーマンステスト実施
- [ ] セキュリティ監査実施

#### 移行後チェックリスト

- [ ] 全機能の動作確認
- [ ] ユーザーアクセス確認
- [ ] 監視アラートの設定
- [ ] バックアップジョブの設定
- [ ] ドキュメントの更新
- [ ] 旧システムの停止スケジュール確定

## まとめ

この移行手順書に従って、銀行カードローンシステムからECショップアプリケーションへの移行を安全かつ効率的に実施できます。各フェーズで十分なテストを行い、問題が発生した場合は速やかにロールバックできる体制を整えておくことが重要です。

移行完了後は、新しいEC機能の追加や機械学習モデルの実装など、ビジネス価値を高める開発に注力できるようになります。