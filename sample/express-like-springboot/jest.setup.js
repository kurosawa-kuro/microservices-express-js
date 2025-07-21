import { PrismaClient } from '@prisma/client';

let prisma;

beforeAll(async () => {
  // テスト用のデータベース初期化（開発用DBを使用）
  prisma = new PrismaClient();
  
  try {
    // テーブルをクリア（存在する場合のみ）
    await prisma.micropost.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
    
    // テスト用データを作成
    await prisma.user.create({
      data: {
        id: 1,
        name: 'Test User 1'
      }
    });
    
    await prisma.user.create({
      data: {
        id: 2,
        name: 'Test User 2'
      }
    });
  } catch (error) {
    console.warn('Database setup warning:', error.message);
  }
});

afterAll(async () => {
  try {
    // テスト後のクリーンアップ
    await prisma.micropost.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
  } catch (error) {
    console.warn('Database cleanup warning:', error.message);
  } finally {
    await prisma.$disconnect();
  }
});

export { prisma };