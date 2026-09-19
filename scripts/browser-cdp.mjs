/* global WebSocket, setTimeout, clearTimeout */

export function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitUntil(
  check,
  { timeoutMs = 10_000, intervalMs = 100, description = 'condition' } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  const suffix =
    lastError instanceof Error ? ` Last error: ${lastError.message}` : '';
  throw new Error(`Timed out waiting for ${description}.${suffix}`);
}

export class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(
            new Error(
              `CDP ${pending.method} failed: ${message.error.message ?? 'unknown error'}`,
            ),
          );
        } else {
          pending.resolve(message.result ?? {});
        }
        return;
      }

      const listeners = this.listeners.get(message.method) ?? [];
      for (const listener of listeners) listener(message);
    });

    socket.addEventListener('close', () => {
      const error = new Error('Chrome DevTools Protocol socket closed.');
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  static async connect(webSocketUrl, timeoutMs = 10_000) {
    if (typeof WebSocket !== 'function') {
      throw new Error('Node.js WebSocket support is required for BG-07 browser acceptance.');
    }

    const socket = new WebSocket(webSocketUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out connecting to Chrome DevTools Protocol.')),
        timeoutMs,
      );
      socket.addEventListener(
        'open',
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
      socket.addEventListener(
        'error',
        () => {
          clearTimeout(timeout);
          reject(new Error('Failed to connect to Chrome DevTools Protocol.'));
        },
        { once: true },
      );
    });
    return new CdpClient(socket);
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
    return () => {
      const current = this.listeners.get(method) ?? [];
      this.listeners.set(
        method,
        current.filter((candidate) => candidate !== listener),
      );
    };
  }

  waitForEvent(
    method,
    predicate = () => true,
    { timeoutMs = 10_000, description = method } = {},
  ) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for CDP event ${description}.`));
      }, timeoutMs);
      const unsubscribe = this.on(method, (message) => {
        if (!predicate(message)) return;
        clearTimeout(timeout);
        unsubscribe();
        resolve(message);
      });
    });
  }

  async evaluate(sessionId, expression) {
    const result = await this.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      },
      sessionId,
    );
    if (result.exceptionDetails) {
      throw new Error(
        `Browser evaluation failed: ${result.exceptionDetails.text ?? 'unknown exception'}`,
      );
    }
    return result.result?.value;
  }

  async waitForExpression(
    sessionId,
    expression,
    { timeoutMs = 10_000, description = expression } = {},
  ) {
    return waitUntil(
      async () => Boolean(await this.evaluate(sessionId, expression)),
      { timeoutMs, description },
    );
  }

  close() {
    this.socket.close();
  }
}
