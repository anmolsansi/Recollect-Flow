import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectWebOutput, manifestFor } from './web-release.mjs';

function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'recollect-bg21-release-'));
  const dist = join(base, 'dist');
  mkdirSync(join(dist, 'assets'), { recursive: true });
  mkdirSync(join(base, 'apps/worker-api/src'), { recursive: true });
  writeFileSync(join(base, 'package-lock.json'), '{}');
  writeFileSync(join(base, 'wrangler.toml'), '[assets]');
  writeFileSync(
    join(base, 'apps/worker-api/src/index.ts'),
    'export default {}',
  );
  writeFileSync(
    join(dist, 'index.html'),
    '<div id="root"></div><script src="/assets/index-AaBb1234.js"></script>',
  );
  writeFileSync(join(dist, 'assets/index-AaBb1234.js'), 'console.log("web")');
  return {
    base,
    dist,
    cleanup() {
      rmSync(base, { recursive: true, force: true });
    },
  };
}

test('release inventory binds Worker, lockfile and hashed Web assets to one ID', () => {
  const f = fixture();
  try {
    const one = manifestFor(f.dist, f.base, 'revision-one');
    const two = manifestFor(f.dist, f.base, 'revision-two');
    assert.equal(one.web_files.length, 2);
    assert.equal(one.source_revision, 'revision-one');
    assert.notEqual(one.release_id, two.release_id);
    assert.equal(
      manifestFor(f.dist, f.base, 'revision-one').release_id,
      one.release_id,
    );
  } finally {
    f.cleanup();
  }
});

test('missing static artifact fails packaging', () => {
  const f = fixture();
  try {
    rmSync(join(f.dist, 'assets/index-AaBb1234.js'));
    assert.throws(() => inspectWebOutput(f.dist), /missing or unsafe asset/);
  } finally {
    f.cleanup();
  }
});

test('unexpected unversioned bundle fails packaging', () => {
  const f = fixture();
  try {
    writeFileSync(
      join(f.dist, 'index.html'),
      '<div id="root"></div><script src="/assets/index.js"></script>',
    );
    writeFileSync(join(f.dist, 'assets/index.js'), 'console.log("unsafe")');
    assert.throws(() => inspectWebOutput(f.dist), /unversioned/);
  } finally {
    f.cleanup();
  }
});

test('release rejects accidental sourcemaps and environment files', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.dist, 'assets/index-AaBb1234.js.map'), '{}');
    assert.throws(() => inspectWebOutput(f.dist), /Forbidden file/);
    rmSync(join(f.dist, 'assets/index-AaBb1234.js.map'));
    writeFileSync(join(f.dist, '.env.production'), 'DO_NOT_SHIP=1');
    assert.throws(() => inspectWebOutput(f.dist), /Forbidden file/);
  } finally {
    f.cleanup();
  }
});

test('release rejects symlinks, including symlinks to private files', () => {
  const f = fixture();
  try {
    symlinkSync(
      join(f.base, 'package-lock.json'),
      join(f.dist, 'assets/lock.txt'),
    );
    assert.throws(() => inspectWebOutput(f.dist), /symlinks/);
  } finally {
    f.cleanup();
  }
});

test('missing entry and absent root fail packaging', () => {
  const f = fixture();
  try {
    rmSync(join(f.dist, 'index.html'));
    assert.throws(() => inspectWebOutput(f.dist), /Missing Web index/);
    writeFileSync(join(f.dist, 'index.html'), '<html></html>');
    assert.throws(() => inspectWebOutput(f.dist), /root element/);
  } finally {
    f.cleanup();
  }
});
