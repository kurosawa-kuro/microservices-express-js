# Microservices Express.js - Cloud-Shop

Express.jsベースのマイクロサービスアーキテクチャによる銀行システムのデモプロジェクト。

## アーキテクチャ概要

本プロジェクトはSpring Boot JavaプロジェクトからExpress.jsに移行したマイクロサービス実装です。

### サービス構成

- **Gateway Service** (Port: 8072) - APIゲートウェイとルーティング
- **Auth Service** (Port: 8081) - Keycloak認証・認可
- **Users Service** (Port: 8082) - ユーザープロファイル・アカウント管理
- **Cards Service** (Port: 9000) - カード管理
- **Loans Service** (Port: 8090) - ローン管理
- **Message Service** (Port: 9010) - 通信・イベント処理

### インフラストラクチャ

- **Apache Kafka** - メッセージング（Zookeeper付属）
- **SQLite** - 各サービスのデータストレージ
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
# 各サービスの依存関係をインストール
npm run install:all
```

### 3. データベース初期化
```bash
# 各サービスのPrismaマイグレーション実行
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

### Auth Service (8081)
- JWT認証・認可機能
- Keycloak統合
- ロールベースアクセス制御
- トークン管理

### Users Service (8082)
- ユーザープロファイル管理API
- アカウント管理API
- 外部サービス連携（Cards/Loans）

### Cards Service (9000)
- カード発行・管理API
- カード情報CRUD操作

### Loans Service (8090)
- ローン申込・管理API
- ローン情報CRUD操作

### Message Service (9010)
- Kafkaメッセージ処理
- 通信イベントの処理

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

### Makefile利用
```bash
make help          # 利用可能コマンド表示
make build         # 全サービスビルド
make up            # 全サービス起動
make down          # 全サービス停止
make test          # 全テスト実行
make migrate-all   # 全DBマイグレーション
```

## 環境変数

各サービスの主要環境変数：

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=file:./data/app.db
BUILD_VERSION=1.0.0
KAFKA_BROKERS=kafka:29092
JWT_SECRET=your-secret-key-here
```

## 移行情報

### Spring Boot → Express.js 対応表
- `@RestController` → Express Router
- `@Service` → Service Layer
- `@Repository` → Prisma Repository Pattern
- `application.yml` → .env files
- Spring Validation → Zod Schema Validation

## テスト

```bash
# 全サービステスト実行
make test

# 特定サービステスト
cd services/users
npm test
```

## ライセンス

ISC License

## サポート

Issue作成やプルリクエストは歓迎します。
