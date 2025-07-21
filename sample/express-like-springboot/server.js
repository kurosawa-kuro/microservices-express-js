import dotenv from 'dotenv';
import { createExpressApp } from './config/express.js';
import { createOpenAPIBackend } from './config/openapi.js';
import { ApplicationContext } from './config/application.js';
import { closeDatabaseConnection } from './config/database.js';

// 警告を抑制
process.env.OPENAPI_BACKEND_QUIET = 'true';
process.env.AJV_QUIET = 'true';

// コンソールの警告を抑制
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('unknown format "date-time"')) {
    return; // date-timeフォーマットの警告を無視
  }
  originalWarn.apply(console, args);
};

dotenv.config();

const PORT = process.env.PORT || 3001;

// Application Context (Spring Boot's ApplicationContext equivalent)
const applicationContext = new ApplicationContext();

// Express アプリケーションの作成
const app = createExpressApp();

// OpenAPI バックエンドの作成
const api = createOpenAPIBackend(applicationContext.getHandlers());

api.init();

app.use((req, res) => api.handleRequest(req, req, res));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('beforeExit', async () => {
  await closeDatabaseConnection();
});
