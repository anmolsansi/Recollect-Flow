import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = ['scripts/verify-browser-file-upload.mjs'];
execFileSync('./node_modules/.bin/prettier', ['--write', ...files], { stdio: 'inherit' });
for (const path of files) {
  console.log('BG18_FORMAT:' + path + ':' + readFileSync(path).toString('base64'));
}
