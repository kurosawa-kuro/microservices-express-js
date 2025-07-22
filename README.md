# Cloud-Shop マイクロサービスアーキテクチャ

Express.jsベースのマイクロサービスアーキテクチャによるECShop（eコマース）プラットフォーム。

## アーキテクチャ概要

本プロジェクトは、スケーラブルで保守性の高いeコマースプラットフォームを実現するためのマイクロサービスアーキテクチャです。

### サービス構成

- **Gateway Service** (Port: 8072) - APIゲートウェイとルーティング
- **Auth Service** (Port: 8081) - Keycloak認証・認可
- **Users Service** (Port: 8082) - ユーザープロファイル管理
- **Products Service** (Port: 8083) - 商品カタログ管理
- **Cart Service** (Port: 8084) - ショッピングカート管理
- **Orders Service** (Port: 8085) - 注文管理
- **Payments Service** (Port: 8086) - 決済処理
- **Message Service** (Port: 9010) - イベント処理・通信

### インフラストラクチャ

- **Apache Kafka** - メッセージング（Zookeeper付属）
- **PostgreSQL** - 各サービスのデータストレージ
- **Keycloak** - 認証・認可サービス
- **Docker & Docker Compose** - コンテナ化

## 技術スタック

### Runtime
- Node.js + Express.js

### 主要ライブラリ
- **Express** - Webフレームワーク
- **Prisma** - ORM
- **OpenAPI Backend** - API定義ベースルーティング
- **Zod** - バリデーション
- **KafkaJS** - Kafka クライアント
- **Jest** - テスティング

### DevOps
- Docker
- Docker Compose

## セットアップ

### 前提条件
- Node.js (v18以上)
- Docker & Docker Compose
- npm

### 1. プロジェクトクローン
```bash
git clone <repository-url>
cd microservices-express-js
```

### 2. 依存関係インストール
```bash
# 全サービスの依存関係をインストール
npm run install-all
```

### 3. データベース初期化
```bash
# 全サービスのPrismaマイグレーション実行
make migrate-all
```

### 4. 起動
```bash
# Docker Composeで全サービス起動
docker-compose up -d

# または開発モードで起動
make dev
```

## サービス詳細

### Gateway Service (8072)
- JWT認証機能
- 各サービスへのプロキシ機能
- CORS設定
- レート制限

### Auth Service (8081)
- JWT認証・認可機能
- Keycloak統合
- ロールベースアクセス制御（Customer/Admin）
- トークン管理

### Users Service (8082)
- ユーザープロファイル管理API
- 住所・配送先管理
- ユーザー設定管理

### Products Service (8083)
- 商品CRUD機能
- カテゴリー管理
- 商品検索・フィルタリング
- 商品画像管理

### Cart Service (8084)
- カート操作API（追加/削除/更新）
- セッション管理
- 在庫チェック連携

### Orders Service (8085)
- 注文作成・管理
- 注文履歴表示
- 注文ステータス管理

### Payments Service (8086)
- 決済処理（Stripe統合）
- 決済履歴管理
- 返金・キャンセル処理

### Message Service (9010)
- Kafkaメッセージ処理
- イベント駆動アーキテクチャ
- サービス間通信

## API仕様

各サービスはOpenAPI 3.0仕様に基づいています。
- Swagger UIは各サービス個別に提供
- 共通レスポンス形式とエラーハンドリング

## 開発ガイド

### ローカル開発
```bash
# 特定サービスの開発モード起動
cd services/users
npm run dev

# テスト実行
npm test

# Prismaスキーマ更新
npx prisma generate
npx prisma migrate dev
```

### 共通設定
`shared/`ディレクトリにミドルウェアと共通ユーティリティを配置：
- エラーハンドリング
- バリデーション
- ログ出力
- CORS設定
- サーキットブレーカー
- ヘルスチェック

### Makefile利用
```bash
make help          # 利用可能コマンド表示
make build         # 全サービスビルド
make up            # 全サービス起動
make down          # 全サービス停止
make test          # 全テスト実行
make migrate-all   # 全DBマイグレーション
make dev           # 開発モード起動
```

## 環境変数

各サービスの主要環境変数：

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://cloud-shop:change_me_in_production@localhost:5432/cloud_shop
BUILD_VERSION=1.0.0
KAFKA_BROKERS=kafka:29092
JWT_SECRET=your-secret-key-here
KEYCLOAK_URL=http://localhost:8181
KEYCLOAK_REALM=cloud-shop
```

## データベース設計

### サービス別データベース
各マイクロサービスは独立したPostgreSQLスキーマを持ち、データの完全分離を実現：

- `auth_schema` - 認証関連データ
- `users_schema` - ユーザープロファイルデータ
- `products_schema` - 商品カタログデータ
- `cart_schema` - ショッピングカートデータ
- `orders_schema` - 注文データ
- `payments_schema` - 決済データ

### イベント駆動アーキテクチャ
Kafkaを使用したサービス間通信により、疎結合なアーキテクチャを実現：

```javascript
// イベント例
{
  eventType: "USER_REGISTERED",
  data: { userId, email, displayName },
  timestamp: "2025-01-22T10:00:00Z"
}

{
  eventType: "ORDER_CREATED",
  data: { orderId, userId, items, totalAmount },
  timestamp: "2025-01-22T10:00:00Z"
}

{
  eventType: "PAYMENT_COMPLETED",
  data: { paymentId, orderId, amount },
  timestamp: "2025-01-22T10:00:00Z"
}
```

## テスト

```bash
# 全サービステスト実行
make test

# 特定サービステスト
cd services/users
npm test

# 統合テスト
make test-integration
```

## デプロイメント

### 開発環境
```bash
make dev
```

### ステージング環境
```bash
docker-compose -f docker-compose.stg.yml up -d
```

### 本番環境
```bash
docker-compose -f docker-compose.prd.yml up -d
```

## 監視・ログ

- **ヘルスチェック**: 各サービス `/health` エンドポイント
- **メトリクス**: Prometheus + Grafana
- **ログ**: ELK Stack
- **トレーシング**: Jaeger/Zipkin

## セキュリティ

- **認証**: Keycloak統合
- **認可**: JWT トークンベース
- **データ保護**: 決済情報の暗号化
- **ネットワーク**: サービス間通信の暗号化

## ライセンス

MIT License

## サポート

Issue作成やプルリクエストは歓迎します。
