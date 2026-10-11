// Temporary BG-18 formatting bridge. The normal CI format check still runs.
// This file is removed before the final validation branch is merged.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = [
  'apps/web/src/capture-recovery.ts',
  'apps/web/src/CaptureForm.tsx',
  'apps/web/src/file-upload.test.ts',
  'apps/web/src/file-upload.ts',
  'apps/web/src/FileCaptureForm.tsx',
  'apps/worker-api/src/attachments/attachment.routes.ts',
  'apps/worker-api/test/attachment.test.ts',
];
execFileSync('./node_modules/.bin/prettier', ['--write', ...files], { stdio: 'inherit' });
for (const path of files) {
  console.log('BG18_FORMAT:' + path + ':' + readFileSync(path).toString('base64'));
}
