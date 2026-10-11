/* global console */
import { readFileSync } from 'node:fs';
const content = readFileSync('apps/web/src/capture-follow-up.ts').toString('base64');
for (let i = 0; i < content.length; i += 1000) {
  console.log('BG19FORMAT|' + (i / 1000) + '|' + content.slice(i, i + 1000));
}
