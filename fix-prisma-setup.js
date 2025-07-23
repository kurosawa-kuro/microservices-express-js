#!/usr/bin/env node

/**
 * Prismaセットアップ修正スクリプト
 * 各マイクロサービスが独自のPrismaクライアントを使用するように修正
 */

const fs = require('fs');
const path = require('path');

// 各サービスのPrismaクライアントファイルテンプレート
const servicePrismaClientTemplate = `const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
`;

// 修正が必要なサービス
const services = [
  'analytics',
  'content',
  'auth',
  'users',
  'products',
  'cart',
  'orders',
  'payments'
];

console.log('=== Prismaセットアップ修正スクリプト ===\n');

// 各サービスにPrismaクライアントファイルを作成
services.forEach(service => {
  const servicePath = path.join(__dirname, 'services', service);
  const prismaClientPath = path.join(servicePath, 'src', 'prismaClient.js');
  
  // srcディレクトリが存在するか確認
  if (!fs.existsSync(path.join(servicePath, 'src'))) {
    console.log(`✗ ${service}: srcディレクトリが存在しません`);
    return;
  }
  
  // 既にprismaClient.jsが存在する場合はスキップ
  if (fs.existsSync(prismaClientPath)) {
    console.log(`✓ ${service}: prismaClient.jsは既に存在します`);
    return;
  }
  
  // prismaClient.jsを作成
  try {
    fs.writeFileSync(prismaClientPath, servicePrismaClientTemplate);
    console.log(`✓ ${service}: prismaClient.jsを作成しました`);
  } catch (error) {
    console.error(`✗ ${service}: エラー - ${error.message}`);
  }
});

console.log('\n=== 次のステップ ===');
console.log('1. 各サービスで prisma generate を実行してください:');
console.log('   npm run prisma:generate --workspaces\n');
console.log('2. 各サービスのコードを更新して、共有のprismaClientではなく');
console.log('   ローカルのprismaClientを使用するようにしてください。\n');
console.log('3. テスト用のpackage.jsonスクリプトを更新してください:');
console.log('   "test": "jest --passWithNoTests"');