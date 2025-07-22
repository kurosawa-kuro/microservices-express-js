#!/bin/bash

# Cloud-Shop Microservices 起動スクリプト
# Docker環境での既知の問題を回避するためのスクリプト

set -e

echo "🚀 Cloud-Shop Microservices 起動スクリプト"
echo "=========================================="

# BuildKitを無効化（権限エラー回避）
export DOCKER_BUILDKIT=0
echo "✅ BuildKit無効化完了"

# 既存コンテナとネットワークをクリーンアップ
echo "🧹 既存コンテナとネットワークをクリーンアップ中..."
docker-compose down --remove-orphans 2>/dev/null || true
docker network prune -f 2>/dev/null || true
echo "✅ クリーンアップ完了"

# インフラストラクチャサービスのみ起動
echo "🏗️ インフラストラクチャサービスを起動中..."
docker-compose up -d postgres zookeeper kafka

# PostgreSQLの起動を待機
echo "⏳ PostgreSQLの起動を待機中..."
until docker-compose exec -T postgres pg_isready -U cloud-shop; do
  echo "PostgreSQL起動中..."
  sleep 5
done
echo "✅ PostgreSQL起動完了"

# Keycloakの起動を待機
echo "⏳ Keycloakの起動を待機中..."
until docker-compose exec -T keycloak curl -f http://localhost:8080/health/ready 2>/dev/null; do
  echo "Keycloak起動中..."
  sleep 10
done
echo "✅ Keycloak起動完了"

# Kafkaの起動を待機
echo "⏳ Kafkaの起動を待機中..."
until docker-compose exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092 2>/dev/null; do
  echo "Kafka起動中..."
  sleep 5
done
echo "✅ Kafka起動完了"

# 全サービスの起動
echo "🚀 全マイクロサービスを起動中..."
docker-compose up -d

# サービス起動の確認
echo "🔍 サービス起動状況を確認中..."
sleep 10
docker-compose ps

echo ""
echo "🎉 Cloud-Shop Microservices 起動完了！"
echo ""
echo "📊 サービス一覧:"
echo "  - Gateway Service: http://localhost:8072"
echo "  - Auth Service: http://localhost:8081"
echo "  - Users Service: http://localhost:8082"
echo "  - Products Service: http://localhost:8083"
echo "  - Cart Service: http://localhost:8084"
echo "  - Orders Service: http://localhost:8085"
echo "  - Payments Service: http://localhost:8086"
echo "  - Message Service: http://localhost:9010"
echo "  - Keycloak: http://localhost:8181"
echo ""
echo "📝 ログ確認: docker-compose logs -f [service-name]"
echo "🛑 停止: docker-compose down" 