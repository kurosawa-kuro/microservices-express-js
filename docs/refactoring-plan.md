# マイクロサービス コードリファクタリング計画書

## 概要

本文書は、Cloud-Shop マイクロサービスアーキテクチャの包括的なコードリファクタリング計画をまとめたものです。現在の7つのマイクロサービス（auth, users, gateway, products, cart, orders, message）の品質向上、保守性の改善、パフォーマンス最適化を目的としています。

## 現在のアーキテクチャ分析結果

### 📊 サービス構成
- **7つのマイクロサービス**: auth, users, gateway, products, cart, orders, message
- **共有ライブラリ**: shared/ フォルダに共通コンポーネントを配置
- **インフラ**: Docker Compose、Kafka、PostgreSQL、Keycloak
- **イベント駆動**: Kafka によるメッセージング

### ✅ 現在の強み
- 適切なサービス分離とドメイン境界
- 共有コンポーネントによる重複コード削減
- 包括的な OpenAPI 仕様書
- イベント駆動アーキテクチャの実装
- セキュリティ中心の設計

## 🚨 重要な問題点

### 1. 依存関係の不整合

**実際のバージョン不整合（重要度順）:**

```json
// 深刻なバージョン不整合
{
  "@prisma/client": {
    "auth/users": "^5.7.0",
    "products/cart/orders": "^5.7.1", 
    "shared": "^6.12.0"  // メジャーバージョン差異
  },
  "jest": {
    "products/cart/orders": "^29.7.0",
    "auth/users/gateway/message": "^30.0.4"  // メジャーバージョン差異
  },
  "helmet": {
    "most_services": "^7.1.0",
    "gateway/message": "^8.1.0"  // メジャーバージョン差異
  },
  "supertest": {
    "auth/users/gateway/message": "^7.1.3",
    "products/cart/orders": "^6.3.3"  // メジャーバージョン差異
  },
  "swagger-ui-express": {
    "most_services": "^5.0.0",
    "gateway/message": "^4.6.3"  // メジャーバージョン差異
  },
  "winston": {
    "gateway/message": "^3.11.0",
    "others": "^3.17.0"  // マイナーバージョン差異
  }
}
```

**サービスグループ別依存関係パターン:**
- **Group 1** (auth, users, gateway, message): 新しいアプローチ、Jest v30
- **Group 2** (products, cart, orders): 従来のアプローチ、Jest v29、nodemon使用

### 2. 設定管理の不整合
```javascript
// 異なる開発サーバー設定
"dev": "node --watch server.js"     // 一部のサービス
"dev": "nodemon server.js"          // 他のサービス

// Prisma スクリプトの命名不統一
"prisma:generate" vs "db:generate"
"prisma:migrate" vs "db:migrate"
```

### 3. API レスポンス形式の不統一

**現状の実際のレスポンス形式：**

```javascript
// 🟢 成功レスポンス（統一されていない）
return res.status(200).json(user);              // 生のオブジェクト
return res.status(201).json(product);           // 生のオブジェクト  
return res.status(200).json({                   // カスタム形式
  message: 'User deleted successfully' 
});

// 🟡 Auth サービス（独自形式）
return res.status(200).json({
  valid: true,
  user: user
});

// 🟢 エラーレスポンス（部分的に標準化済み）
// shared/middleware/errorHandler.js の createStandardError を使用
const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create user', req.url);
return res.status(500).json(errorResponse);
// 結果: { timestamp, status, error, message, path }

// ❌ 一部で簡単なエラー形式も混在
return res.status(404).json({ error: 'User not found' });
```

**既存の共有インフラ（活用可能）:**
- ✅ `createStandardError()` - 標準化されたエラー形式
- ✅ `correlationId` ミドルウェア - リクエストトレーシング  
- ✅ ヘルスチェックユーティリティ - 統一されたヘルス形式
- ❌ 未使用: `shared/utils/constants.js` のサービス定数

### 4. データベース統合パターンの問題

**実際の問題（`shared/database/prismaClient.js`）:**

```javascript
// ❌ 削除されたサービスの参照が残存
module.exports = {
  getAuthClient: () => databaseConnection.getClient('auth'),
  getUsersClient: () => databaseConnection.getClient('users'),
  getCardsClient: () => databaseConnection.getClient('cards'),    // 🚨 削除済み
  getLoansClient: () => databaseConnection.getClient('loans'),    // 🚨 削除済み
  getProductsClient: () => databaseConnection.getClient('products'),
  getCartClient: () => databaseConnection.getClient('cart'),
  getOrdersClient: () => databaseConnection.getClient('orders'),
  closeAllConnections: () => databaseConnection.closeAll()
};
```

**追加の問題点:**
- サービス個別でPrismaクライアントを作成している場合との重複
- 接続プール設定が全サービスで統一されていない可能性
- 環境変数命名規則の不統一（`DATABASE_URL_AUTH` vs `DATABASE_URL`）

## 📋 リファクタリング計画

## Phase 1: 基盤整備 (高優先度) - 2週間

### 1.1 依存関係の標準化

**段階的アプローチ：**

#### Step 1: 互換性のある統一（今週）
```bash
# 既存のルート package.json を更新してワークスペース設定追加
cat > package.json << 'EOF'
{
  "name": "cloud-shop-microservices",
  "private": true,
  "workspaces": [
    "services/auth",
    "services/users", 
    "services/gateway",
    "services/products",
    "services/cart",
    "services/orders",
    "services/message",
    "shared"
  ],
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=services/*\"",
    "test": "npm run test --workspaces",
    "install-all": "npm install --workspaces"
  }
}
EOF

# マイナーな不整合から修正（互換性リスク低）
npm install winston@3.17.0 --workspace=services/gateway
npm install winston@3.17.0 --workspace=services/message
npm install axios@1.6.2 --workspace=services/gateway
```

#### Step 2: メジャーバージョン統一（来週）
```bash
# Group2 サービスの Jest 更新（要テスト）
npm install jest@30.0.4 --workspace=services/products
npm install jest@30.0.4 --workspace=services/cart  
npm install jest@30.0.4 --workspace=services/orders

# supertest も同時更新
npm install supertest@7.1.3 --workspace=services/products
npm install supertest@7.1.3 --workspace=services/cart
npm install supertest@7.1.3 --workspace=services/orders

# helmet 統一（セキュリティ機能確認後）
npm install helmet@8.1.0 --workspace=services/auth
npm install helmet@8.1.0 --workspace=services/users
npm install helmet@8.1.0 --workspace=services/products
npm install helmet@8.1.0 --workspace=services/cart
npm install helmet@8.1.0 --workspace=services/orders
```

#### Step 3: Prisma 統一（慎重に実施）
```bash
# ⚠️ 重要: 事前にデータベースバックアップ必須
# Prisma v6.12.0 は破壊的変更の可能性があるため段階的に実施

# テスト環境でまず確認
npm install @prisma/client@6.12.0 --workspace=services/auth
npx prisma generate --schema=services/auth/prisma/schema.prisma

# 動作確認後、順次適用
npm install @prisma/client@6.12.0 --workspace=services/users
npm install @prisma/client@6.12.0 --workspace=services/products
npm install @prisma/client@6.12.0 --workspace=services/cart
npm install @prisma/client@6.12.0 --workspace=services/orders
```

### 1.2 設定管理の統一

**現状**: 各サービスで`process.env`を直接使用、デフォルト値が分散

**改善計画:**
- [ ] 既存パターンを活かした設定ユーティリティ作成
- [ ] 環境変数検証の追加
- [ ] サービス設定の型安全性向上

**拡張ファイル（既存の shared 構造を活用）:**
```
shared/config/
  ├── serviceConfig.js        // 設定取得・検証ユーティリティ
  ├── validators.js           // 環境変数バリデーション
  └── defaults.js             // デフォルト値管理
```

**実装アプローチ:**
```javascript
// shared/config/serviceConfig.js - 既存パターンを拡張
const getConfig = (serviceName, customDefaults = {}) => {
  return {
    port: process.env.PORT || customDefaults.port || 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,
    // 既存パターンを保持しつつ検証追加
  };
};
```

### 1.3 API レスポンス形式の標準化

**現状活用アプローチ**: 既存の`createStandardError`を基盤に成功レスポンスも統一

**段階的実装:**
- [ ] 既存エラーハンドラの一貫した使用徹底
- [ ] 成功レスポンス用ヘルパー関数追加  
- [ ] 未使用のconstantsファイル活用

**拡張実装（既存インフラ活用）:**
```javascript
// shared/utils/responseHelpers.js - 新規作成
const createStandardResponse = (data, statusCode = 200, message = null) => ({
  timestamp: new Date().toISOString(),
  status: statusCode,
  data: data,
  message: message,
  correlationId: req.correlationId // 既存のcorrelationIdミドルウェア活用
});

// 既存のcreateStandardErrorは継続使用（変更なし）
// 全サービスで簡単なエラーレスポンスを標準化関数に移行
```

**移行計画:**
```javascript
// Before: 生のオブジェクト返却
return res.status(200).json(user);

// After: 標準化レスポンス使用  
return res.status(200).json(createStandardResponse(user, 200, 'User retrieved successfully'));
```

### 1.4 データベースパターンの標準化

**即座に修正:**
- [ ] cards/loans クライアント参照の削除
- [ ] 実際の使用状況確認と整合性調査
- [ ] コネクションプール設定の統一

**修正手順:**
```javascript
// shared/database/prismaClient.js の修正
module.exports = {
  getAuthClient: () => databaseConnection.getClient('auth'),
  getUsersClient: () => databaseConnection.getClient('users'),
  // getCardsClient: () => databaseConnection.getClient('cards'),    // 削除
  // getLoansClient: () => databaseConnection.getClient('loans'),    // 削除
  getProductsClient: () => databaseConnection.getClient('products'),
  getCartClient: () => databaseConnection.getClient('cart'),
  getOrdersClient: () => databaseConnection.getClient('orders'),
  closeAllConnections: () => databaseConnection.closeAll()
};
```

**調査項目:**
- [ ] 各サービスが実際に共有クライアントを使用しているか確認
- [ ] 個別Prismaクライアント作成パターンとの重複確認
- [ ] 接続プール設定の実効性検証

## Phase 2: 機能強化 (中優先度) - 3週間

### 2.1 共有ライブラリの完成
- [ ] 共通 Zod バリデーションスキーマの追加
- [ ] リトライ機能付き標準 HTTP クライアント
- [ ] Kafka パターンの共通化
- [ ] メトリクス収集ミドルウェア

**新規共有コンポーネント:**
```
shared/
  ├── validation/
  │   ├── schemas/
  │   └── middleware/
  ├── http-client/
  │   ├── client.js
  │   └── retry.js
  ├── kafka/
  │   ├── producer.js
  │   ├── consumer.js
  │   └── patterns/
  └── metrics/
      ├── collector.js
      └── middleware/
```

### 2.2 セキュリティ改善
- [ ] Eコマース向けロールベースアクセス制御の更新
- [ ] CORS 設定の統一
- [ ] サービスレベルでのレート制限実装
- [ ] 適切なシークレット管理の実装

**新しいロール定義:**
```javascript
const roles = {
  customer: ['read:products', 'manage:cart', 'create:orders'],
  vendor: ['manage:products', 'read:orders'],
  admin: ['manage:users', 'manage:orders', 'manage:products']
};
```

### 2.3 テスト戦略の実装
- [ ] 全サービスにユニットテスト追加
- [ ] 統合テストの実装
- [ ] 共有テストユーティリティの作成
- [ ] コントラクトテストの追加

**テスト構造:**
```
services/[service]/
  ├── __tests__/
  │   ├── unit/
  │   ├── integration/
  │   └── contracts/
  └── jest.config.js

shared/testing/
  ├── fixtures/
  ├── mocks/
  └── utilities/
```

## Phase 3: パフォーマンス最適化 (低優先度) - 2週間

### 3.1 パフォーマンス最適化
- [ ] 分散キャッシュ戦略の実装
- [ ] クエリ最適化パターンの追加
- [ ] Kafka コネクション管理の改善
- [ ] データベースクエリ監視の追加

### 3.2 DevOps 改善
- [ ] Docker 設定の標準化
- [ ] マルチステージビルドの実装
- [ ] ログ集約の適切な実装
- [ ] 監視ダッシュボードの作成

## 🎯 即座に対応すべき項目

### 1. 緊急対応 (今週中)
- [ ] **Prisma クライアントバージョン統一**: 6.12.0 に統一
- [ ] **未使用データベースクライアント参照削除**: cards/loans 参照を完全除去
- [ ] **package.json スクリプト統一**: 開発サーバー起動方法の統一
- [ ] **Gateway ロール更新**: banking ドメインから e-commerce ドメインに変更

### 2. 重要な修正 (来週中)
- [ ] **重要なパス テスト追加**: orders と auth サービスの重要機能テスト
- [ ] **エラーハンドリング統一**: 全サービスで standardError 使用
- [ ] **ヘルスチェック標準化**: `/actuator/health` エンドポイント統一
- [ ] **環境変数検証**: サービス起動時の設定検証追加

## 📈 品質メトリクス目標

### コードカバレッジ
- **現在**: orders のみテスト存在 (≈15%)
- **目標**: 全サービス 80%+ カバレッジ

### パフォーマンス
- **現在**: レスポンス時間測定なし
- **目標**: API レスポンス 95%ile < 500ms

### 保守性
- **現在**: 依存関係の不整合多数
- **目標**: 全依存関係統一、自動更新

### セキュリティ
- **現在**: 基本的なセキュリティ実装
- **目標**: OWASP Top 10 対応完了

## 🛠 実装順序

### Week 1-2: 基盤整備
1. 依存関係統一とワークスペース設定
2. 設定管理システム実装
3. API レスポンス形式標準化
4. データベースパターン修正

### Week 3-4: 共通コンポーネント
1. バリデーション層実装
2. HTTP クライアント作成
3. Kafka パターン統一
4. メトリクス収集開始

### Week 5-6: セキュリティ&テスト
1. ロールベースアクセス制御更新
2. セキュリティ強化
3. テスト基盤構築
4. ユニットテスト追加

### Week 7: 最適化&監視
1. パフォーマンス監視実装
2. キャッシュ戦略適用
3. DevOps 改善
4. 文書化完了

## 📋 チェックリスト

### 完了基準
- [ ] 全サービス同一依存関係バージョン使用
- [ ] 統一 API レスポンス形式採用
- [ ] 80%+ テストカバレッジ達成
- [ ] セキュリティスキャン 0 クリティカル
- [ ] パフォーマンス目標達成
- [ ] 文書化完了

### 検証項目
- [ ] `docker-compose up` でエラーなし起動
- [ ] 全 API エンドポイント正常動作
- [ ] 負荷テスト通過
- [ ] セキュリティテスト通過
- [ ] E2E テスト完全動作

## 📚 参考資料

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Microservices Patterns](https://microservices.io/patterns/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

---

**作成日**: 2025-01-22  
**更新日**: 2025-01-22  
**バージョン**: v1.0  
**ステータス**: 計画段階