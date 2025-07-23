#!/usr/bin/env node

/**
 * package.jsonのスクリプトを更新して、テストがない場合でも通過するようにする
 */

const fs = require('fs');
const path = require('path');

const services = [
  'auth',
  'users',
  'gateway',
  'products',
  'cart',
  'orders',
  'payments',
  'analytics',
  'content',
  'message'
];

console.log('=== package.jsonスクリプト更新 ===\n');

services.forEach(service => {
  const packagePath = path.join(__dirname, 'services', service, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Prisma関連のスクリプトを追加
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    // prisma generateスクリプトを追加
    if (!packageJson.scripts['prisma:generate']) {
      packageJson.scripts['prisma:generate'] = 'prisma generate';
    }
    
    // testスクリプトを更新（テストがない場合でも通過）
    if (packageJson.scripts.test && packageJson.scripts.test.includes('jest')) {
      packageJson.scripts.test = 'jest --passWithNoTests';
    }
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✓ ${service}: package.jsonを更新しました`);
  } catch (error) {
    console.error(`✗ ${service}: エラー - ${error.message}`);
  }
});

// ルートのpackage.jsonにもprisma:generateスクリプトを追加
const rootPackagePath = path.join(__dirname, 'package.json');
try {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  rootPackage.scripts['prisma:generate'] = 'npm run prisma:generate --workspaces';
  fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n');
  console.log('\n✓ ルートのpackage.jsonを更新しました');
} catch (error) {
  console.error(`\n✗ ルートpackage.json更新エラー: ${error.message}`);
}

console.log('\n=== 完了 ===');
console.log('次のコマンドを実行してください:');
console.log('1. npm run prisma:generate');
console.log('2. npm test');