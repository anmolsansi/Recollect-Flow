import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: './apps/worker-api/src/index.ts',
      miniflare: {
        d1Databases: [
          'DB',
          'MIGRATION_DB',
          'OPE222_MIGRATION_DB',
          'OPE248_MIGRATION_DB',
          'OPE226_MIGRATION_DB',
        ],
        r2Buckets: ['ATTACHMENTS'],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations('./migrations'),
          CAPTURE_TOKEN: 'test-capture-token',
          ADMIN_TOKEN: 'test-admin-token',
          LOCAL_WORKER_TOKEN: 'test-local-worker-token',
          NOTION_ACCESS_TOKEN: 'test-notion-token',
          NOTION_DATABASE_ID: 'test-notion-database',
          TELEGRAM_BOT_TOKEN: 'test-telegram-token',
          TELEGRAM_CHAT_ID: 'test-telegram-chat',
          WEB_INBOX_BASE_URL: 'https://inbox.example.test/',
          DIGEST_AI_ENABLED: 'false',
          MAX_ATTACHMENT_BYTES: '25000000',
          UPLOAD_TTL_SECONDS: '3600',
          MOCK_AI_ENABLED: 'true',
          AI_PROVIDER_DEFAULT: 'openrouter',
          AI_PROVIDERS_ENABLED: 'openrouter,cloudflare',
          AI_PROVIDER_IMPLEMENTATIONS:
            '{"openrouter":"mock","cloudflare":"mock"}',
        },
      },
    })),
  ],
  test: {
    include: ['apps/worker-api/test/**/*.d1.spec.ts'],
  },
});
