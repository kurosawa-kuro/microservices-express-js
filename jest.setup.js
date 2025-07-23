// テスト環境のセットアップ
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
process.env.DATABASE_URL_AUTH = 'postgresql://user:password@localhost:5432/testdb?schema=auth';
process.env.DATABASE_URL_USERS = 'postgresql://user:password@localhost:5432/testdb?schema=users';
process.env.DATABASE_URL_PRODUCTS = 'postgresql://user:password@localhost:5432/testdb?schema=products';
process.env.DATABASE_URL_CART = 'postgresql://user:password@localhost:5432/testdb?schema=cart';
process.env.DATABASE_URL_ORDERS = 'postgresql://user:password@localhost:5432/testdb?schema=orders';
process.env.DATABASE_URL_PAYMENTS = 'postgresql://user:password@localhost:5432/testdb?schema=payments';
process.env.DATABASE_URL_ANALYTICS = 'postgresql://user:password@localhost:5432/testdb?schema=analytics';
process.env.DATABASE_URL_CONTENT = 'postgresql://user:password@localhost:5432/testdb?schema=content';