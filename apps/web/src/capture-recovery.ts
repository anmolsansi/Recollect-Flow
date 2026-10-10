import { CAPTURE_CATEGORIES, type CaptureDraft, type CapturePayload } from './capture-model';

// Only an explicit owner choice enables persistent content. No tokens or cookies are stored.
export const RECOVERY_PREFERENCE = 'recollect:capture-recovery-enabled-v1';
export const RECOVERY_MAX_COUNT = 3;
export const RECOVERY_MAX_BYTES = 256_000;
export const RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DB_NAME = 'recollect-capture-recovery';
const STORE = 'operations';
const DRAFT_STORE = 'drafts';
const DB_VERSION = 2;
const RECORD_VERSION = 1;

export type CaptureStage = 'prepared' | 'uncertain' | 'auth_required';
export interface CaptureOperation {
  version: 1;
  id: string;
  payload: CapturePayload;
  createdAt: string;
  stage: CaptureStage;
  lastError?: string;
  // BG-18 will add finalized upload references. Never persist original file bytes here.
  attachment?: {
    name: string;
    byteLength: number;
    sha256: string;
    attachmentId?: string;
  };
}

export function newCaptureOperation(payload: CapturePayload): CaptureOperation {
  return {
    version: RECORD_VERSION,
    id: payload.idempotency_key,
    payload: structuredClone(payload),
    createdAt: new Date().toISOString(),
    stage: 'prepared',
  };
}

export function isRecoveryEnabled(): boolean {
  try {
    return localStorage.getItem(RECOVERY_PREFERENCE) === 'yes';
  } catch {
    return false;
  }
}

export function setRecoveryEnabled(enabled: boolean): void {
  if (enabled) localStorage.setItem(RECOVERY_PREFERENCE, 'yes');
  else localStorage.removeItem(RECOVERY_PREFERENCE);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseCaptureOperation(
  value: unknown,
  now = Date.now(),
): CaptureOperation | null {
  if (
    !isObject(value) ||
    value.version !== RECORD_VERSION ||
    typeof value.id !== 'string' ||
    !isObject(value.payload)
  )
    return null;
  const payload = value.payload;
  if (
    payload.idempotency_key !== value.id ||
    value.id.length < 12 ||
    value.id.length > 200 ||
    !['url', 'note', 'text'].includes(String(payload.source_type)) ||
    payload.source_app !== 'recollect-web' ||
    typeof payload.captured_at !== 'string' ||
    !Number.isFinite(Date.parse(payload.captured_at)) ||
    !isObject(payload.client) ||
    payload.client.name !== 'recollect-web' ||
    typeof payload.client.version !== 'string' ||
    payload.client.version.length > 40 ||
    !['unknown', 'public', 'personal', 'sensitive'].includes(
      String(payload.privacy_level),
    ) ||
    (payload.source_type === 'url' &&
      (typeof payload.url !== 'string' ||
        payload.url.length > 2048 ||
        !(
          payload.url.toLowerCase().startsWith('http://') ||
          payload.url.toLowerCase().startsWith('https://')
        ))) ||
    (payload.source_type !== 'url' &&
      (typeof payload.shared_text !== 'string' ||
        !payload.shared_text.trim() ||
        payload.shared_text.length > 100000)) ||
    (payload.user_reason !== undefined &&
      (typeof payload.user_reason !== 'string' ||
        payload.user_reason.length > 2000)) ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    Date.parse(value.createdAt) > now + 60_000 ||
    now - Date.parse(value.createdAt) >= RECOVERY_TTL_MS ||
    !['prepared', 'uncertain', 'auth_required'].includes(String(value.stage))
  )
    return null;
  if (value.attachment !== undefined) {
    const f = value.attachment;
    if (
      !isObject(f) ||
      typeof f.name !== 'string' ||
      typeof f.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(f.sha256) ||
      !Number.isSafeInteger(f.byteLength) ||
      (f.byteLength as number) < 0 ||
      (f.attachmentId !== undefined && typeof f.attachmentId !== 'string')
    )
      return null;
  }
  // Copy approved fields only. Unknown or obsolete fields never reach a subsequent request.
  const restoredPayload: CapturePayload = {
    idempotency_key: value.id,
    source_type: payload.source_type as CapturePayload['source_type'],
    source_app: 'recollect-web',
    captured_at: payload.captured_at,
    client: {
      name: 'recollect-web',
      version: payload.client.version as string,
    },
    privacy_level: payload.privacy_level as CapturePayload['privacy_level'],
    ...(payload.source_type === 'url'
      ? { url: payload.url as string }
      : { shared_text: payload.shared_text as string }),
    ...(typeof payload.user_reason === 'string'
      ? { user_reason: payload.user_reason }
      : {}),
    ...(typeof payload.quick_category === 'string'
      ? {
          quick_category:
            payload.quick_category as CapturePayload['quick_category'],
        }
      : {}),
  };
  return {
    version: 1,
    id: value.id,
    payload: restoredPayload,
    createdAt: value.createdAt,
    stage: value.stage as CaptureStage,
    ...(typeof value.lastError === 'string'
      ? { lastError: value.lastError.slice(0, 300) }
      : {}),
    ...(value.attachment
      ? {
          attachment:
            value.attachment as unknown as CaptureOperation['attachment'],
        }
      : {}),
  };
}

export function ensureRecoveryBudget(
  existing: CaptureOperation[],
  next: CaptureOperation,
): void {
  const records = [...existing.filter((entry) => entry.id !== next.id), next];
  if (records.length > RECOVERY_MAX_COUNT) {
    throw new Error(
      'Only three unfinished captures can be kept on this device. Retry or discard one first.',
    );
  }
  if (
    new TextEncoder().encode(JSON.stringify(records)).byteLength >
    RECOVERY_MAX_BYTES
  ) {
    throw new Error(
      'Local recovery storage is full. Retry or discard an unfinished capture.',
    );
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(
        new Error('This browser does not support offline recovery storage.'),
      );
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DRAFT_STORE))
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to open recovery storage.'));
    request.onblocked = () =>
      reject(new Error('Recovery storage is blocked by another tab.'));
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (
    store: IDBObjectStore,
    done: (result: T) => void,
    fail: (error: Error) => void,
  ) => void,
  storeName = STORE,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let value: T;
    let failed: Error | null = null;
    const tx = db.transaction(storeName, mode);
    const fail = (error: Error) => {
      failed = error;
      tx.abort();
    };
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onerror = () => {
      db.close();
      reject(failed ?? tx.error ?? new Error('Recovery storage failed.'));
    };
    tx.onabort = () => {
      db.close();
      reject(
        failed ?? tx.error ?? new Error('Recovery storage was not saved.'),
      );
    };
    try {
      action(
        tx.objectStore(storeName),
        (result) => {
          value = result;
        },
        fail,
      );
    } catch (error) {
      fail(
        error instanceof Error ? error : new Error('Recovery storage failed.'),
      );
    }
  });
}

export async function listCaptureOperations(
  now = Date.now(),
): Promise<CaptureOperation[]> {
  const raw = await runTransaction<unknown[]>('readonly', (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result);
  });
  const valid = raw
    .map((item) => parseCaptureOperation(item, now))
    .filter((item): item is CaptureOperation => !!item);
  if (valid.length !== raw.length) {
    const validIds = new Set(valid.map((entry) => entry.id));
    await runTransaction<void>('readwrite', (store) => {
      for (const item of raw) {
        if (
          isObject(item) &&
          typeof item.id === 'string' &&
          !validIds.has(item.id)
        )
          store.delete(item.id);
      }
    });
  }
  return valid.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveCaptureOperation(
  operation: CaptureOperation,
): Promise<void> {
  if (operation.payload.privacy_level === 'sensitive') {
    throw new Error('Sensitive captures cannot be stored in browser recovery.');
  }
  if (!parseCaptureOperation(operation))
    throw new Error('Capture recovery record is invalid or expired.');
  await runTransaction<void>('readwrite', (store, _done, fail) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const existing = (request.result as unknown[])
        .map((item) => parseCaptureOperation(item))
        .filter((item): item is CaptureOperation => !!item);
      try {
        ensureRecoveryBudget(existing, operation);
        store.put(operation);
      } catch (error) {
        fail(
          error instanceof Error
            ? error
            : new Error('Local recovery storage is full.'),
        );
      }
    };
  });
}

export async function deleteCaptureOperation(id: string): Promise<void> {
  await runTransaction<void>('readwrite', (store) => {
    store.delete(id);
  });
}

export async function clearCaptureOperations(): Promise<void> {
  await runTransaction<void>('readwrite', (store) => {
    store.clear();
  });
}

/** Editable, unsubmitted fields are independent of immutable submitted operations. */
export function parseSavedCaptureDraft(value: unknown, now = Date.now()): CaptureDraft | null {
  if (!isObject(value) || value.version !== 1 || value.id !== 'capture-form' ||
      !Number.isFinite(Date.parse(String(value.updatedAt))) ||
      now - Date.parse(String(value.updatedAt)) >= RECOVERY_TTL_MS ||
      Date.parse(String(value.updatedAt)) > now + 60_000 ||
      !isObject(value.draft)) return null;
  const draft = value.draft;
  if (!['url', 'text', 'note'].includes(String(draft.mode)) ||
      !['unknown', 'public', 'personal'].includes(String(draft.privacy)) ||
      typeof draft.url !== 'string' || draft.url.length > 2048 ||
      typeof draft.sharedText !== 'string' || draft.sharedText.length > 100000 ||
      typeof draft.reason !== 'string' || draft.reason.length > 2000 ||
      typeof draft.category !== 'string' ||
      (draft.category !== '' && !CAPTURE_CATEGORIES.includes(draft.category as CaptureDraft['category'] & typeof CAPTURE_CATEGORIES[number])))
    return null;
  return { mode: draft.mode as CaptureDraft['mode'], url: draft.url,
    sharedText: draft.sharedText, reason: draft.reason,
    category: draft.category as CaptureDraft['category'], privacy: draft.privacy as CaptureDraft['privacy'] };
}

export async function saveCaptureDraft(draft: CaptureDraft): Promise<void> {
  if (draft.privacy === 'sensitive') {
    throw new Error('Sensitive draft content cannot be stored on this device.');
  }
  const record = { version: 1, id: 'capture-form', updatedAt: new Date().toISOString(),
    draft: { mode: draft.mode, url: draft.url, sharedText: draft.sharedText, reason: draft.reason,
      category: draft.category, privacy: draft.privacy } };
  if (!parseSavedCaptureDraft(record) ||
      new TextEncoder().encode(JSON.stringify(record)).byteLength > RECOVERY_MAX_BYTES)
    throw new Error('Editable draft exceeds local recovery limits.');
  await runTransaction<void>('readwrite', (store) => { store.put(record); }, DRAFT_STORE);
}

export async function getCaptureDraft(now = Date.now()): Promise<CaptureDraft | null> {
  const raw = await runTransaction<unknown>('readonly', (store, done) => {
    const req = store.get('capture-form');
    req.onsuccess = () => done(req.result);
  }, DRAFT_STORE);
  const draft = parseSavedCaptureDraft(raw, now);
  if (raw !== undefined && !draft) await clearCaptureDraft();
  return draft;
}

export async function clearCaptureDraft(): Promise<void> {
  await runTransaction<void>('readwrite', (store) => { store.delete('capture-form'); }, DRAFT_STORE);
}

export async function forgetCaptureRecovery(): Promise<void> {
  await clearCaptureOperations();
  await clearCaptureDraft();
  setRecoveryEnabled(false);
}
