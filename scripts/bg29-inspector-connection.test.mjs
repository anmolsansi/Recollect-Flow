import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { createLoopbackInspectorSocket } from './bg29-inspector-connection.mjs';

test('BG-29 inspector rejects non-loopback connections', () => {
  assert.throws(
    () => createLoopbackInspectorSocket('wss://example.com/ws'),
    /loopback ws/,
  );
  assert.throws(
    () => createLoopbackInspectorSocket('ws://example.com/ws'),
    /loopback ws/,
  );
});

test('BG-29 inspector sends an allowed Origin during the upgrade', async () => {
  let upgradedSocket;
  let receivedOrigin;
  const server = createServer();
  server.on('upgrade', (request, socket) => {
    upgradedSocket = socket;
    receivedOrigin = request.headers.origin;
    const accept = createHash('sha1')
      .update(
        `${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`,
      )
      .digest('base64');
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const ws = createLoopbackInspectorSocket(
      `ws://127.0.0.1:${server.address().port}/ws`,
    );
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('upgrade timed out')),
        2500,
      );
      ws.addEventListener(
        'open',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      ws.addEventListener(
        'error',
        (event) => {
          clearTimeout(timer);
          reject(new Error(event.message));
        },
        { once: true },
      );
    });
    assert.equal(receivedOrigin, 'http://localhost');
  } finally {
    upgradedSocket?.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});
