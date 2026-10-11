import { readFileSync } from 'node:fs';

const files = [
  'apps/web/src/App.tsx',
  'apps/web/src/capture-follow-up.test.ts',
  'apps/web/src/capture-follow-up.ts',
  'apps/web/src/capture-model.ts',
  'apps/web/src/capture-recovery.ts',
  'apps/web/src/CaptureFollowUp.tsx',
  'apps/web/src/CaptureForm.tsx',
  'apps/web/src/FileCaptureForm.tsx',
  'apps/web/src/follow-up-date.ts',
  'apps/web/src/follow-up-date.test.ts',
  'apps/web/src/follow-up-recovery.ts',
  'apps/web/src/index.css',
];

for (const path of files) {
  const base64 = readFileSync(path).toString('base64');
  for (let index = 0; index < base64.length; index += 1000) {
    console.log(`BG19FMT|${path}|${index / 1000}|${base64.slice(index, index + 1000)}`);
  }
}
