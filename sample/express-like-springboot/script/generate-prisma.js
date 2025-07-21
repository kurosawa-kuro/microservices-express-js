import fs from 'fs';
import yaml from 'js-yaml';

// OpenAPIスキーマを読み込み
const openApiContent = fs.readFileSync('./openapi.yaml', 'utf8');
const openApiSchema = yaml.load(openApiContent);

// Prismaスキーマの基本構造
let prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

`;

// OpenAPIスキーマからPrismaモデルを生成
const schemas = openApiSchema.components.schemas;

// Userモデルの生成
if (schemas.User) {
  prismaSchema += `model User {
  id         Int         @id @default(autoincrement())
  name       String
  microposts Micropost[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

`;
}

// Micropostモデルの生成
if (schemas.Micropost) {
  prismaSchema += `model Micropost {
  id        Int      @id @default(autoincrement())
  title     String
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
}

// Prismaスキーマファイルに書き込み
fs.writeFileSync('./prisma/schema.prisma', prismaSchema, 'utf8');
console.log('Prisma schema generated from OpenAPI successfully!'); 