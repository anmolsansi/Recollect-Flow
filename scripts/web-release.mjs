/* global process, console */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultDist = join(root, 'apps/web/dist');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function collectFiles(directory, base = directory) {
  if (!existsSync(directory)) throw new Error('Missing Web build: ' + directory);
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const full = join(directory, entry.name);
      if (lstatSync(full).isSymbolicLink()) {
        throw new Error('Release assets must not contain symlinks: ' + full);
      }
      if (entry.isDirectory()) return collectFiles(full, base);
      if (!entry.isFile()) throw new Error('Unsupported asset entry: ' + full);
      return [relative(base, full).split(sep).join('/')];
    })
    .sort();
}

/** Verify build output references before Wrangler can deploy it. */
export function inspectWebOutput(directory) {
  const index = join(directory, 'index.html');
  if (!existsSync(index)) throw new Error('Missing Web index.html, run the Web build first');
  const html = readFileSync(index, 'utf8');
  if (!html.includes('id="root"')) throw new Error('Invalid Web entry: root element absent');
  const references = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  if (!references.some((name) => name.endsWith('.js'))) {
    throw new Error('Web entry has no referenced hashed JavaScript bundle');
  }
  const files = collectFiles(directory);
  for (const file of files) {
    if (/(^|\/)(?:\.env(?:\..*)?|\.dev\.vars|.*\.map|.*\.pem|.*\.key)$/i.test(file)) {
      throw new Error('Forbidden file in public Web assets: ' + file);
    }
  }
  for (const reference of references) {
    const normalized = reference.slice(1);
    if (!/^assets\/[A-Za-z0-9._/-]+$/.test(normalized) || !files.includes(normalized)) {
      throw new Error('Web entry references missing or unsafe asset: ' + reference);
    }
    if (!/[-][A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(normalized)) {
      throw new Error('Entry references unversioned JS/CSS: ' + reference);
    }
  }
  return files;
}

export function manifestFor(directory, repositoryRoot = root, sourceRevision = 'unknown') {
  const files = inspectWebOutput(directory);
  const lockfile = join(repositoryRoot, 'package-lock.json');
  const config = join(repositoryRoot, 'wrangler.toml');
  const worker = join(repositoryRoot, 'apps/worker-api/src/index.ts');
  const manifest = {
    schema_version: 1,
    source_revision: sourceRevision,
    worker_entry_sha256: sha256(readFileSync(worker)),
    worker_config_sha256: sha256(readFileSync(config)),
    lockfile_sha256: sha256(readFileSync(lockfile)),
    web_files: files.map((path) => ({
      path,
      bytes: readFileSync(join(directory, path)).length,
      sha256: sha256(readFileSync(join(directory, path))),
    })),
  };
  return { ...manifest, release_id: sha256(JSON.stringify(manifest)) };
}

export function finalizeWebRelease(directory = defaultDist) {
  let revision = 'unknown';
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Explicitly unknown in a source export without a Git checkout.
  }
  const manifest = manifestFor(directory, root, revision);
  writeFileSync(join(directory, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const command = process.argv[2];
  if (command === 'clean') {
    rmSync(defaultDist, { recursive: true, force: true });
    mkdirSync(defaultDist, { recursive: true });
  } else if (command === 'finalize') {
    const manifest = finalizeWebRelease();
    console.log('BG-21 release candidate: ' + manifest.release_id);
    console.log('Source revision: ' + manifest.source_revision);
    console.log('Bundled public files: ' + manifest.web_files.length);
  } else {
    console.error('Usage: node scripts/web-release.mjs clean|finalize');
    process.exitCode = 2;
  }
}
