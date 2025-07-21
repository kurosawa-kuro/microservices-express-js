# Keycloak + PostgreSQL 認証認可システム導入手順書

## 概要

本手順書では、KuroBankマイクロサービスプロジェクトにKeycloakとPostgreSQLを使用した認証認可システムを導入する方法を説明します。

## 🔒 セキュリティ機能

このシステムには以下の高度なセキュリティ機能が含まれています：

### 1. JWTトークンキャッシング
- **目的**: JWT検証のパフォーマンス向上
- **実装**: メモリ内キャッシュ（node-cache）を使用
- **TTL**: トークンの有効期限または最大300秒
- **キャッシュキー**: トークンのSHA256ハッシュ（セキュリティ確保）

### 2. レート制限
- **認証エンドポイント**: 10リクエスト/分、ブロック時間5分
- **一般エンドポイント**: 100リクエスト/分、ブロック時間1分
- **実装**: `rate-limiter-flexible`パッケージ使用
- **設定**: 環境変数で調整可能

### 3. 監査ログ
- **ログファイル**: `security.log`（専用セキュリティログ）
- **記録イベント**: 
  - 認証成功/失敗
  - 認可失敗
  - レート制限違反
  - トークンリフレッシュ
- **構造化ログ**: JSON形式、相関ID付き

### 4. トークンリフレッシュ機能
- **エンドポイント**: `POST /auth/refresh`
- **機能**: Keycloakリフレッシュトークンによる自動更新
- **検証**: リフレッシュトークンの有効性確認
- **取り消し**: `POST /auth/revoke`でトークン無効化

## アーキテクチャ概要

- **Keycloak**: OAuth 2.0/OpenID Connect認証サーバー
- **PostgreSQL**: Keycloakの設定・ユーザー情報保存用データベース
- **Gateway Service**: JWT トークン検証とルーティング
- **各マイクロサービス**: Keycloakトークンベースの認証

## 前提条件

- Docker & Docker Compose
- 既存のKuroBankマイクロサービス環境
- Node.js (v18以上)

## 1. システム起動

### 1.1 PostgreSQLとKeycloakの起動

```bash
# PostgreSQLとKeycloakを起動
docker-compose up -d postgres keycloak

# 起動確認
docker-compose logs keycloak
docker-compose logs postgres
```

### 1.2 全サービスの起動

```bash
# 全サービス起動
docker-compose up -d

# 起動状況確認
docker-compose ps
```

## 2. Keycloak初期設定

### 2.1 管理コンソールへアクセス

1. ブラウザで `http://localhost:8181` にアクセス
2. 管理コンソール（Administration Console）をクリック
3. ユーザー名: `admin`, パスワード: `admin123` でログイン

### 2.2 Realmの作成

1. 左上のマスターレルム横のドロップダウンから「Create realm」
2. Realm name: `kurobank`
3. 「Create」をクリック

### 2.3 クライアントの作成

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

## 3. 認証テスト

### 3.1 トークン取得

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

### 3.2 API呼び出しテスト

```bash
# 取得したトークンでAPI呼び出し
curl -X GET "http://localhost:8072/kurobank/accounts/api/contact-info" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

curl -X GET "http://localhost:8072/kurobank/cards/api/contact-info" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

curl -X GET "http://localhost:8072/kurobank/loans/api/contact-info" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 4. 設定詳細

### 4.1 Docker Compose設定

システムには以下のサービスが含まれています：

- **postgres**: Keycloak用PostgreSQLデータベース (ポート: 5432)
- **keycloak**: Keycloak認証サーバー (ポート: 8181)
- **gateway-service**: API Gateway (ポート: 8072)

### 4.2 環境変数

Gateway Serviceで使用される主要な環境変数：

```yaml
- KEYCLOAK_URL=http://keycloak:8080
- KEYCLOAK_REALM=kurobank
- KEYCLOAK_CLIENT_ID=kurobank-gateway
```

### 4.3 認証フロー

1. クライアントがGateway Serviceにリクエスト送信
2. Gateway ServiceがKeycloakでJWTトークンを検証
3. トークンが有効な場合、ユーザー情報と役割を抽出
4. 必要な役割を持つ場合、対象マイクロサービスにプロキシ
5. マイクロサービスがレスポンスを返却

### 4.4 役割ベースアクセス制御

各エンドポイントには以下の役割が必要：

- `/kurobank/accounts/**`: `bank-customer`, `bank-employee`, `bank-admin`
- `/kurobank/cards/**`: `bank-customer`, `bank-employee`, `bank-admin`
- `/kurobank/loans/**`: `bank-customer`, `bank-employee`, `bank-admin`

## 5. セキュリティ機能の使用方法

### 5.1 トークンリフレッシュ

```bash
# リフレッシュトークンを使用してアクセストークンを更新
curl -X POST "http://localhost:8072/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5.2 トークン取り消し

```bash
# リフレッシュトークンを無効化
curl -X POST "http://localhost:8072/auth/revoke" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5.3 監査ログの確認

```bash
# セキュリティイベントログの確認
tail -f security.log | grep "securityEvent"

# 特定のイベントタイプでフィルタ
grep "auth_failure" security.log
grep "rate_limit_exceeded" security.log
```

### 5.4 レート制限の設定

環境変数で調整可能：

```yaml
# docker-compose.yml
environment:
  - AUTH_RATE_LIMIT_REQUESTS=10      # 認証エンドポイント: リクエスト数/分
  - AUTH_RATE_LIMIT_WINDOW=60        # 認証エンドポイント: 時間窓（秒）
  - AUTH_RATE_LIMIT_BLOCK=300        # 認証エンドポイント: ブロック時間（秒）
  - GENERAL_RATE_LIMIT_REQUESTS=100  # 一般エンドポイント: リクエスト数/分
  - GENERAL_RATE_LIMIT_WINDOW=60     # 一般エンドポイント: 時間窓（秒）
  - GENERAL_RATE_LIMIT_BLOCK=60      # 一般エンドポイント: ブロック時間（秒）
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
   - JWKS エンドポイント確認: `http://localhost:8181/realms/kurobank/protocol/openid-connect/certs`

3. **CORS エラー**
   - Keycloakクライアント設定でWeb originsを確認
   - Gateway ServiceのCORS設定確認

4. **認証失敗**
   - クライアントシークレットの確認
   - ユーザーの役割割り当て確認
   - トークンの有効期限確認

4. **レート制限エラー**
   ```bash
   # レート制限状況の確認
   curl -v "http://localhost:8072/kurobank/accounts"
   # Retry-Afterヘッダーを確認
   ```

5. **トークンキャッシュ問題**
   ```bash
   # キャッシュ統計の確認（ログで確認）
   grep "cache_hit\|cache_miss" combined.log
   ```

### 6.2 ログ確認

```bash
# 全サービスのログ確認
docker-compose logs -f

# 特定サービスのログ確認
docker-compose logs -f keycloak
docker-compose logs -f gateway-service
docker-compose logs -f postgres
```

### 6.3 デバッグ用コマンド

```bash
# Keycloakヘルスチェック
curl http://localhost:8181/health/ready

# JWKS エンドポイント確認
curl http://localhost:8181/realms/kurobank/protocol/openid-connect/certs

# Gateway Serviceヘルスチェック
curl http://localhost:8072/actuator/health
```

## 7. セキュリティ考慮事項

### 7.1 本番環境での設定

1. **強力なパスワード設定**
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

### 7.2 トークン設定

- アクセストークンの有効期限: 15分（推奨）
- リフレッシュトークンの有効期限: 30日（推奨）
- セッションタイムアウト: 30分（推奨）

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

### 9.3 JWT トークン構造例

```json
{
  "exp": 1642781234,
  "iat": 1642780334,
  "jti": "12345678-1234-1234-1234-123456789012",
  "iss": "http://localhost:8181/realms/kurobank",
  "aud": "kurobank-gateway",
  "sub": "12345678-1234-1234-1234-123456789012",
  "typ": "Bearer",
  "azp": "kurobank-gateway",
  "session_state": "12345678-1234-1234-1234-123456789012",
  "realm_access": {
    "roles": [
      "bank-customer"
    ]
  },
  "scope": "openid profile email",
  "email_verified": true,
  "name": "Test User",
  "preferred_username": "testuser",
  "given_name": "Test",
  "family_name": "User",
  "email": "test@kurobank.com"
}
```
