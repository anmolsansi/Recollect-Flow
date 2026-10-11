import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = [
  'apps/worker-api/src/attachments/attachment.schema.ts',
  'apps/worker-api/src/attachments/attachment.routes.ts',
  'apps/worker-api/test/attachment.test.ts',
  'apps/web/src/file-upload.ts',
  'apps/web/src/file-upload.test.ts',
  'apps/web/src/FileCaptureForm.tsx',
];
execFileSync('./node_modules/.bin/prettier', ['--write', ...files], { stdio: 'inherit' });
for (const path of files) {
  console.log('BG18_FORMAT:' + path + ':' + readFileSync(path).toString('base64'));
}
