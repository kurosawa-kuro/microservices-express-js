# マイクロサービス アーキテクチャ実装計画

## 現状分析

### 現在の構成
- **Banking System**: accounts, cards, loans サービス
- **Gateway Service**: API ゲートウェイとして機能
- **Message Service**: Kafka による非同期メッセージング
- **共通**: cache, circuit-breaker, middleware, health check等

### 新規要件
EC サイトの統合データベーススキーマを実装し、AI/ML 機能を含む EC プラットフォームを構築する。

## マイクロサービス境界の設計

### 1. Authentication Service
**責任範囲**: 認証・認可・トークン管理

```prisma
// Authentication Service Schema
model AuthUser {
  id              String    @id           // KeycloakのUser IDを使用
  email           String    @unique
  keycloakId     String    @unique      // Keycloak User IDとの紐付け
  emailVerified   Boolean   @default(false)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  status          UserStatus @default(ACTIVE)
  
  userRoles       UserRole[]
}

model Role {
  id              Int       @id @default(autoincrement())
  name            String    @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  userRoles       UserRole[]
}

model UserRole {
  userId          String
  roleId          Int
  assignedAt      DateTime  @default(now())
  
  user            AuthUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
  role            Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

enum UserStatus {
  ACTIVE
  DISABLED
  DELETED
}
```

### 2. User Profile Service
**責任範囲**: ユーザープロフィール・設定管理

```prisma
// User Profile Service Schema
model User {
  id              String    @id           // Authentication Serviceと同じID
  email           String    @unique       // 冗長データ（頻繁アクセス用）
  displayName     String?
  firstName       String?
  lastName        String?
  phoneNumber     String?
  address         Json?                   // 住所情報
  preferences     Json?                   // ユーザー設定
  avatar          String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // 他サービスとの関連は参照IDのみ
}
```

### 3. Product Catalog Service
**責任範囲**: 商品・カテゴリー管理、商品情報提供

```prisma
// Product Catalog Service Schema
model Product {
  id              Int       @id @default(autoincrement())
  name            String
  price           Float
  rating          Float
  image           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  productCategories ProductCategory[]
}

model Category {
  id                Int       @id @default(autoincrement())
  name              String    @unique
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  productCategories ProductCategory[]
}

model ProductCategory {
  productId       Int
  categoryId      Int
  assignedAt      DateTime  @default(now())
  
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  category        Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([productId, categoryId])
}
```

### 4. Shopping Cart Service
**責任範囲**: カート操作、セッション管理

```prisma
// Shopping Cart Service Schema
model CartItem {
  id          Int       @id @default(autoincrement())
  userId      String    // User Management Serviceからの参照
  productId   Int       // Product Catalog Serviceからの参照
  quantity    Int       @default(1)
  addedAt     DateTime  @default(now())
  
  // 冗長データ（パフォーマンス向上）
  productName String?
  productPrice Float?
  productImage String?
}
```

### 5. Payment Service
**責任範囲**: 決済処理、決済履歴管理、外部決済サービス連携

```prisma
// Payment Service Schema
model Payment {
  id              String      @id @default(uuid())
  orderId         Int         // Order Management Serviceからの参照
  userId          String      // User Profile Serviceからの参照
  amount          Float
  currency        String      @default("JPY")
  paymentMethod   PaymentMethod
  status          PaymentStatus @default(PENDING)
  
  // 外部決済サービス連携
  externalPaymentId String?   // Stripe, PayPal等のID
  paymentIntentId   String?   // Stripe Payment Intent ID
  
  // 決済詳細
  paymentDetails  Json?       // カード情報、銀行口座等の暗号化データ
  failureReason   String?
  processedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  refunds         Refund[]
}

model Refund {
  id              String      @id @default(uuid())
  paymentId       String
  amount          Float
  reason          String
  status          RefundStatus @default(PENDING)
  externalRefundId String?    // 外部決済サービスの返金ID
  processedAt     DateTime?
  createdAt       DateTime    @default(now())
  
  payment         Payment     @relation(fields: [paymentId], references: [id])
}

enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PAYPAL
  BANK_TRANSFER
  AMAZON_PAY
  APPLE_PAY
  GOOGLE_PAY
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}

enum RefundStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 6. Order Management Service
**責任範囲**: 注文処理、注文履歴管理

```prisma
// Order Management Service Schema
model Order {
  id          Int       @id @default(autoincrement())
  userId      String    // User Profile Serviceからの参照
  totalAmount Float
  status      OrderStatus @default(PENDING)
  shippingAddress Json? // 配送先住所
  orderedAt   DateTime  @default(now())
  
  orderItems  OrderItem[]
  returns     Return[]
}

model OrderItem {
  id          Int       @id @default(autoincrement())
  orderId     Int
  productId   Int       // Product Catalog Serviceからの参照
  quantity    Int
  price       Float     // 購入時の価格を保存
  
  // 冗長データ
  productName String?
  
  order       Order     @relation(fields: [orderId], references: [id])
}

model Return {
  id           Int       @id @default(autoincrement())
  orderId      Int
  userId       String
  returnedAt   DateTime  @default(now())
  status       ReturnStatus @default(REQUESTED)
  reason       String
  
  order        Order     @relation(fields: [orderId], references: [id])
  returnItems  ReturnItem[]
}

model ReturnItem {
  id          Int       @id @default(autoincrement())
  returnId    Int
  productId   Int
  quantity    Int
  
  return      Return    @relation(fields: [returnId], references: [id])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  COMPLETED
}
```

### 7. Analytics & Personalization Service
**責任範囲**: ユーザー行動分析、レコメンデーション、AI/ML機能

```prisma
// Analytics & Personalization Service Schema
model ViewHistory {
  id          Int       @id @default(autoincrement())
  userId      String    // User Management Serviceからの参照
  productId   Int       // Product Catalog Serviceからの参照
  viewedAt    DateTime  @default(now())
  
  // 冗長データ（分析用）
  productName String?
  productPrice Float?
  categoryId  Int?
  categoryName String?
}

model UserActionLog {
  id          Int       @id @default(autoincrement())
  requestID   String?   
  userId      String
  actionType  ActionType
  
  productId   Int?
  productName String?
  productPrice Float?
  categoryId  Int?
  categoryName String?
  
  cartItemId  Int?
  orderId     Int?
  returnId    Int?
  quantity    Int?
  
  searchKeyword   String?
  searchCategoryId Int?
  searchCategoryName String?
  
  reviewText    String?
  rating        Float?
  actionReason  String?
  errorDetails  String?
  
  metadata    Json?
  createdAt   DateTime   @default(now())
}

enum ActionType {
  CART_ADD
  CART_REMOVE
  CART_UPDATE
  CART_READD
  ORDER_COMPLETE
  ORDER_CANCEL
  ORDER_RETURN_REQUEST
  ORDER_RETURN_COMPLETE
  SEARCH_BY_KEYWORD
  SEARCH_BY_CATEGORY
  REVIEW_START
  REVIEW_SUBMIT
  USER_REGISTER_START
  USER_REGISTER_COMPLETE
  USER_UPDATE
  USER_LOGIN
  USER_LOGOUT
  USER_DELETE
}
```

### 8. Content Management Service
**責任範囲**: トップページ表示管理、プロモーション管理

```prisma
// Content Management Service Schema
model TopPageDisplay {
  id              Int         @id @default(autoincrement())
  displayType     DisplayType
  productId       Int?
  productName     String?
  productPrice    Float?
  rating          Float?
  image           String?
  categoryId      Int?
  categoryName    String?
  priority        Int         @default(0)
  specialPrice    Float?
  startDate       DateTime    @default(now())
  endDate         DateTime?
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum DisplayType {
  SALE
  RECOMMENDED
  REPURCHASE
  DAILY_DEAL
  RECOMMENDED_CATEGORY
  CONTINUE_SHOPPING
}
```

## データ戦略

### 1. データ分散戦略

#### 1.1 サービス間データアクセス
- **直接データベースアクセス禁止**: 各サービスは自分のデータベースのみアクセス
- **API経由のデータ取得**: 他サービスのデータは REST API または GraphQL で取得
- **イベント駆動アーキテクチャ**: 重要な状態変更はイベントで他サービスに通知

#### 1.2 冗長データ戦略
- **パフォーマンス重視**: 頻繁にアクセスされるデータは冗長化
- **整合性管理**: イベントソーシングで最終的整合性を保証
- **データ同期**: Kafka イベントでリアルタイム同期

### 2. サービス間通信

#### 2.1 同期通信 (REST API)
- ユーザー認証・認可 (Authentication Service → Gateway)
- ユーザー情報取得 (各サービス → User Profile Service)
- 商品情報取得 (Shopping Cart → Product Catalog)
- 決済処理 (Payment Service → 外部決済API)
- 注文処理 (Order Management → Product Catalog, User Profile Service, Payment Service)

#### 2.2 非同期通信 (Kafka Events)
```javascript
// イベント例
{
  eventType: "USER_AUTHENTICATED",
  data: { userId, email, Id },
  timestamp: "2025-07-22T10:00:00Z"
}

{
  eventType: "USER_PROFILE_CREATED",
  data: { userId, displayName, email },
  timestamp: "2025-07-22T10:00:00Z"
}

{
  eventType: "PAYMENT_COMPLETED",
  data: { paymentId, orderId, userId, amount },
  timestamp: "2025-07-22T10:00:00Z"
}

{
  eventType: "ORDER_COMPLETED",
  data: { orderId, userId, items, totalAmount },
  timestamp: "2025-07-22T10:00:00Z"
}

{
  eventType: "PRODUCT_VIEWED",
  data: { userId, productId, timestamp },
  timestamp: "2025-07-22T10:00:00Z"
}
```

### 3. データベース設計

#### 3.1 PostgreSQL インスタンス分離
- 各マイクロサービスに専用PostgreSQLインスタンス
- 接続文字列を環境変数で管理
- データベース レベルでの完全分離

#### 3.2 共有データの扱い
- **参照データ**: 商品ID、ユーザーIDなど
- **冗長化**: 必要に応じて商品名、価格など
- **キャッシュ**: Redis で頻繁アクセスデータをキャッシュ

# ECShop実装プラン（三段階）

## 前提条件
AccountはAuthとUserに分離済み

---

## 🛍️ 段階1: ECShop主要機能 (4-6週間)

### 目標
基本的なECサイト機能を実装し、顧客がショッピングできる環境を構築

### 実装サービス

#### 1.1 Authentication Service (認証基盤)
**期間**: 1-2週間
- **AuthUser**モデル実装
- 既存キークロークの継続利用
- JWT トークン管理
- ロール・権限管理（Customer/Admin）
- **注**: AWS Cognito移行はCognitoの複雑さとセキュリティリスクを考慮して廃止

#### 1.2 User Profile Service (ユーザー管理)
**期間**: 1週間  
- ユーザープロフィール管理
- 住所・配送先管理
- ユーザー設定管理

#### 1.3 Product Catalog Service (商品カタログ)
**期間**: 1-2週間
- 商品CRUD機能
- カテゴリー管理
- 商品検索・フィルタリング
- 商品画像管理

#### 1.4 Shopping Cart Service (ショッピングカート)
**期間**: 1週間
- カート操作API（追加/削除/更新）
- セッション管理
- 在庫チェック連携

#### 1.5 Order Management Service (注文管理)
**期間**: 1週間
- 注文作成・管理
- 注文履歴表示
- 注文ステータス管理

### 段階1の成果物
- 顧客登録・ログイン機能
- 商品閲覧・検索機能
- ショッピングカート機能
- 基本的な注文機能（決済は手動処理）

---

## 💳 段階2: 決済機能 (2-3週間)

### 目標
本格的な決済処理とビジネスクリティカルな機能を実装

### 実装サービス

#### 2.1 Payment Service (決済処理)
**期間**: 2週間
- **外部決済API連携**
  - Stripe統合
  - PayPal統合
  - クレジットカード処理
- **決済フロー実装**
  - 決済処理の自動化
  - 失敗時のリトライ機構
  - PCI DSS準拠のセキュリティ
- **返金・キャンセル処理**
  - 自動/手動返金機能
  - 部分返金対応

#### 2.2 Kafka Event System (イベント駆動)
**期間**: 1週間
- 決済完了イベント
- 注文完了イベント  
- ユーザー行動イベント
- サービス間データ同期

#### 2.3 Order Management Service 拡張
**期間**: 0.5週間
- Payment Service連携
- 決済完了後の自動注文確定
- 配送ステータス管理

### 段階2の成果物
- 完全自動化された決済処理
- リアルタイムな注文・決済ステータス更新
- 返金・キャンセル処理
- イベント駆動によるサービス間連携

---

## 📊 段階3: データ分析系機能 (3-4週間)

### 目標
AIと機械学習を活用した高度な分析・パーソナライゼーション機能を実装

### 実装サービス

#### 3.1 Analytics & Personalization Service (分析・個人化)
**期間**: 2週間
- **ユーザー行動分析**
  - 商品閲覧履歴収集
  - 購買行動分析
  - セッション分析
- **レコメンデーションエンジン**
  - 協調フィルタリング
  - コンテンツベースフィルタリング
  - リアルタイムレコメンデーション
- **顧客セグメンテーション**
  - RFM分析
  - 行動ベースセグメント
  - パーソナライズされた価格設定

#### 3.2 Content Management Service (コンテンツ管理)
**期間**: 1週間
- **トップページ最適化**
  - 動的コンテンツ表示
  - A/Bテスト機能
  - パーソナライズされた商品表示
- **プロモーション管理**
  - 特別価格・セール管理
  - タイムセール機能
  - クーポン・割引システム

#### 3.3 Advanced Analytics (高度分析)
**期間**: 1週間
- **ビジネスインテリジェンス**
  - 売上分析ダッシュボード
  - 商品パフォーマンス分析
  - 顧客満足度分析
- **予測分析**
  - 需要予測
  - 在庫最適化
  - 顧客生涯価値予測
- **機械学習パイプライン**
  - データパイプライン自動化
  - モデル学習・デプロイ自動化

### 段階3の成果物
- AIレコメンデーション機能
- リアルタイムパーソナライゼーション
- 高度な分析ダッシュボード
- 予測分析とビジネス最適化

---

## 各段階の検証ポイント

### 段階1終了時
- [ ] ユーザー登録・ログインが正常動作
- [ ] 商品検索・カート機能が正常動作
- [ ] 基本注文フローが完了（手動決済）
- [ ] 全APIのレスポンス時間 < 500ms

### 段階2終了時  
- [ ] 自動決済処理が99.5%成功率
- [ ] 決済失敗時の適切なエラーハンドリング
- [ ] 返金処理が正常動作
- [ ] イベント駆動システムの安定性確認

### 段階3終了時
- [ ] レコメンデーション精度 > 15%クリック率向上
- [ ] パーソナライゼーション機能の効果測定
- [ ] 分析ダッシュボードでの意思決定支援
- [ ] 機械学習パイプラインの自動運用

---

## リソース・技術要件

### 開発チーム構成（推奨）
- **段階1**: フルスタック開発者 2-3名
- **段階2**: 決済専門開発者 1名 + フルスタック開発者 1名  
- **段階3**: データサイエンティスト 1名 + フルスタック開発者 1名

### インフラ要件
- **段階1**: 基本インフラ（DB、Redis、API Gateway）
- **段階2**: 決済サービス連携、高可用性構成
- **段階3**: データウェアハウス、機械学習基盤

## 従来の実装段階

### Phase 1: 基盤構築 (2-3週間)
1. **Authentication Service** 実装
   -  連携
   - JWT トークン管理
   - ロール・権限管理

2. **User Profile Service** 実装
   - ユーザープロフィール管理
   - 設定・住所管理
   - Authentication Serviceとの連携

3. **Product Catalog Service** 実装
   - 商品・カテゴリー CRUD
   - 検索機能
   - 商品画像管理

4. **Gateway Service** 拡張
   - Authentication Service 連携
   - ルーティング設定
   - レート制限

### Phase 2: コア機能実装 (3-4週間)
1. **Shopping Cart Service** 実装
   - セッション管理
   - カート操作 API
   - 在庫チェック連携

2. **Payment Service** 実装
   - 外部決済API連携 (Stripe/PayPal)
   - 決済処理フロー
   - 返金・キャンセル処理
   - PCI DSS準拠のセキュリティ

3. **Order Management Service** 実装
   - 注文処理フロー
   - Payment Service連携
   - 注文履歴管理

4. **Kafka イベント** 実装
   - イベントスキーマ定義
   - プロデューサー・コンシューマー実装

### Phase 3: 分析・パーソナライゼーション (4-5週間)
1. **Analytics Service** 実装
   - ユーザー行動ログ収集
   - データウェアハウス連携準備
   - 基本的な分析API

2. **Content Management Service** 実装
   - トップページ管理
   - プロモーション管理
   - A/Bテスト準備

3. **AI/ML 機能** 実装準備
   - レコメンデーションエンジン基盤
   - データパイプライン構築

### Phase 4: 高度な機能 (3-4週間)
1. **レコメンデーション機能**
   - 協調フィルタリング
   - コンテンツベースフィルタリング

2. **検索・フィルタリング強化**
   - Elasticsearch 導入検討
   - 高度な検索機能

3. **パフォーマンス最適化**
   - キャッシング戦略
   - データベース最適化

## 課題と対応策

### 1. データ整合性の課題
**課題**: 分散環境での整合性管理  
**対応**: 
- Saga パターンによる分散トランザクション
- イベントソーシングによる最終的整合性
- 補償トランザクションによるロールバック

### 2. パフォーマンスの課題
**課題**: サービス間通信のレイテンシ  
**対応**:
- 適切なキャッシング戦略 (Redis)
- 冗長データによる結合の削減
- 非同期処理の活用

### 3. 運用・監視の課題
**課題**: 分散システムの監視・デバッグ  
**対応**:
- 分散トレーシング (Jaeger/Zipkin)
- 集約ログ管理 (ELK Stack)
- ヘルスチェック・メトリクス収集

### 4. セキュリティの課題
**課題**: マイクロサービス間の認証・認可、決済情報の保護  
**対応**:
- JWT トークンによるサービス間認証
- API Gateway での統一認証
- ネットワーク レベルでの分離
- Payment Service での PCI DSS 準拠
- 決済情報の暗号化・トークン化

## 技術スタック

### バックエンド
- **言語**: Node.js (TypeScript)
- **フレームワーク**: Express.js
- **データベース**: PostgreSQL
- **ORM**: Prisma
- **メッセージング**: Apache Kafka
- **キャッシュ**: Redis
- **認証**: Keycloak (**非Cognito**)
- **決済**: Stripe, PayPal

### インフラストラクチャ
- **コンテナ**: Docker
- **オーケストレーション**: Docker Compose (開発), Kubernetes (本番)
- **API Gateway**: 既存 Gateway Service
- **監視**: Prometheus + Grafana
- **ログ**: ELK Stack

### CI/CD
- **バージョン管理**: Git
- **CI/CD**: GitHub Actions
- **テスト**: Jest + Supertest
- **コード品質**: ESLint, Prettier

## まとめ

この計画は、現在の banking システムのマイクロサービス アーキテクチャを活用しつつ、EC サイトの要件に対応する包括的な設計です。**8つのマイクロサービス**に分散することで、以下を実現します：

### アーキテクチャの利点
1. **関心の分離**: Authentication/User Profile/Payment を独立化
2. **スケーラビリティ**: 各サービスの独立スケーリング
3. **保守性**: 単一責任原則による明確な境界
4. **セキュリティ**: 決済処理の分離による PCI DSS 準拠
5. **可用性**: 一部サービス障害の影響範囲限定

### 段階的実装のメリット
- **Phase 1**: 認証基盤とカタログの確立
- **Phase 2**: 決済・注文処理のコア機能
- **Phase 3**: AI/ML による高度な機能
- **Phase 4**: パフォーマンス最適化

各フェーズでの成果物と検証ポイントを明確にし、継続的な改善を通じてスケーラブルで保守性の高いシステムを実現します。