# Cloud-Shop Microservices - Claude.md

## プロジェクト概要

Express.jsベースのマイクロサービスアーキテクチャによるECShop（eコマース）プラットフォーム。

## 技術スタック

- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Keycloak
- **Messaging**: Apache Kafka
- **Container**: Docker & Docker Compose
- **Validation**: Zod
- **Testing**: Jest

## サービス構成

- **Gateway Service** (Port: 8072) - APIゲートウェイとルーティング
- **Auth Service** (Port: 8081) - Keycloak認証・認可
- **Users Service** (Port: 8082) - ユーザープロファイル管理
- **Products Service** (Port: 8083) - 商品カタログ管理
- **Cart Service** (Port: 8084) - ショッピングカート管理
- **Orders Service** (Port: 8085) - 注文管理
- **Payments Service** (Port: 8086) - 決済処理
- **Message Service** (Port: 9010) - イベント処理・通信

## 開発履歴

### 2025-01-22: Dockerfile修正（Alpine Linuxのlibssl問題解決）

#### 問題
Docker環境でのサービス起動時に以下の問題が発生：
- Alpine Linuxでのlibssl依存関係の問題
- BuildKitの権限エラー
- Keycloakの初期設定の調整が必要

#### 解決策

##### 1. Dockerfile修正（全サービス）
**変更内容**: `node:18-alpine` → `node:18-slim` に変更

**修正対象ファイル**:
- `services/auth/Dockerfile`
- `services/users/Dockerfile`
- `services/products/Dockerfile`
- `services/cart/Dockerfile`
- `services/orders/Dockerfile`
- `services/payments/Dockerfile`
- `services/gateway/Dockerfile`
- `services/message/Dockerfile`

**修正内容**:
```dockerfile
FROM node:18-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

**理由**:
- Alpine Linuxでは `libssl1.1` パッケージが利用できない問題
- `node:18-slim` ベースイメージで安定したSSL/TLSサポート
- 必要なパッケージを明示的にインストール

##### 2. docker-compose.yml修正
**Keycloak設定の改善**:
```yaml
keycloak:
  image: quay.io/keycloak/keycloak:23.0
  command: start-dev --db=postgres --db-url=jdbc:postgresql://postgres:5432/cloud_shop --db-username=${KC_DB_USERNAME:-cloud-shop} --db-password=${KC_DB_PASSWORD:-change_me_in_production} --hostname=localhost --hostname-port=8080 --hostname-strict=false --hostname-strict-https=false --log-level=info --metrics-enabled=true --health-enabled=true
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:8080/health/ready || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
```

**PostgreSQLポート修正**:
```yaml
postgres:
  ports:
    - "5432:5432"  # 5433:5432 から修正
```

##### 3. 起動スクリプト作成
**ファイル**: `scripts/start-services.sh`

**機能**:
- BuildKit無効化（`DOCKER_BUILDKIT=0`）
- 既存コンテナとネットワークのクリーンアップ
- インフラストラクチャサービスの段階的起動
- 各サービスの起動待機機能
- サービス起動状況の確認

##### 4. Makefile更新
**変更内容**:
```makefile
build: ## Build all Docker containers
	@export DOCKER_BUILDKIT=0 && docker-compose -f $(COMPOSE_FILE) build

up: ## Start all services with Docker Compose
	@./scripts/start-services.sh
```

##### 5. 環境変数サンプルファイル作成
**ファイル**: `env.example`

**主要設定**:
```env
# Docker BuildKit (BuildKit権限エラー回避)
DOCKER_BUILDKIT=0

# PostgreSQL Configuration
POSTGRES_DB=cloud_shop
POSTGRES_USER=cloud-shop
POSTGRES_PASSWORD=change_me_in_production

# Keycloak Configuration
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=change_me_in_production
```

#### 使用方法

```bash
# 1. 環境変数ファイルをコピー
cp env.example .env

# 2. 起動（推奨）
make up

# または直接スクリプト実行
./scripts/start-services.sh

# 3. 個別ビルド
make build

# 4. ログ確認
docker-compose logs -f
```

#### 解決された問題

- ✅ **BuildKit権限エラー**: `DOCKER_BUILDKIT=0` で回避
- ✅ **Alpine Linuxのlibssl問題**: `node:18-slim` ベースイメージで解決
- ✅ **Keycloak初期設定問題**: 明示的な起動コマンドで解決
- ✅ **ネットワーク接続問題**: 段階的起動とヘルスチェックで解決

## 今後の課題

- [ ] 本番環境でのセキュリティ強化
- [ ] パフォーマンス最適化
- [ ] 監視・ログ機能の充実
- [ ] CI/CDパイプラインの構築
- [ ] テストカバレッジの向上

## 参考資料

- [ECShop包括的実装プラン](./docs/ecshop-comprehensive-implementation-plan.md)
- [README.md](./README.md)
- [Makefile](./Makefile)
- [docker-compose.yml](./docker-compose.yml) 