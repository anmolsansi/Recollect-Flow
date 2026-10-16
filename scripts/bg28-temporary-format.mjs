import console from 'node:console';
import { readFile } from 'node:fs/promises';
import prettier from 'prettier';

const file = 'apps/worker-api/test/restore-originals.d1.spec.ts';
const before = await readFile(file, 'utf8');
const config = (await prettier.resolveConfig(file)) ?? {};
const after = await prettier.format(before, { ...config, filepath: file });
let start = 0;
while (start < before.length && start < after.length && before[start] === after[start]) {
  start += 1;
}
let end = 0;
while (
  end < before.length - start &&
  end < after.length - start &&
  before[before.length - 1 - end] === after[after.length - 1 - end]
) {
  end += 1;
}
console.log('BG28_FORMAT_PATCH ' + JSON.stringify({
  file,
  start,
  end,
  replacement: after.slice(start, after.length - end),
}));
