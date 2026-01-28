#!/usr/bin/env node

/**
 * Real-Time WebSocket Notification Test
 *
 * Tests WebSocket session notification by:
 * 1. Logging in from 2 sessions
 * 2. Revoking one session
 * 3. Verifying WebSocket notification received
 *
 * Usage:
 *   node test-websocket-realtime.js
 */

const SockJS = require('sockjs-client');
const Stomp = require('@stomp/stompjs');

const API_BASE = 'http://localhost:8080/api';
const WS_URL = 'http://localhost:8080/api/v1/ws';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login(username, password) {
  const response = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data.accessToken;
}

async function getSessions(token) {
  const response = await fetch(`${API_BASE}/v1/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Get sessions failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

async function revokeSession(sessionId, token) {
  const response = await fetch(`${API_BASE}/v1/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: 'Automated test' }),
  });

  if (!response.ok) {
    throw new Error(`Revoke session failed: ${response.status}`);
  }

  return await response.json();
}

function connectWebSocket(token) {
  return new Promise((resolve, reject) => {
    const client = new Stomp.Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        if (str.includes('connected')) {
          log('blue', `[WS] ${str}`);
        }
      },
      onConnect: () => {
        log('green', '✅ WebSocket connected');
        resolve(client);
      },
      onStompError: (frame) => {
        log('red', `❌ WebSocket error: ${frame.headers['message']}`);
        reject(new Error(frame.headers['message']));
      },
      reconnectDelay: 0, // Disable auto-reconnect for test
    });

    client.activate();
  });
}

async function testRealtimeLogout() {
  log('blue', '\n========================================');
  log('blue', '🧪 Real-Time Logout Notification Test');
  log('blue', '========================================\n');

  try {
    // Step 1: Login from Session A
    log('yellow', '📝 Step 1: Login as Session A...');
    const tokenA = await login('admin', 'admin123');
    log('green', `✅ Session A token: ${tokenA.substring(0, 30)}...`);

    // Step 2: Login from Session B
    log('yellow', '\n📝 Step 2: Login as Session B...');
    const tokenB = await login('admin', 'admin123');
    log('green', `✅ Session B token: ${tokenB.substring(0, 30)}...`);

    // Step 3: Get sessions list
    log('yellow', '\n📝 Step 3: Get active sessions...');
    const sessions = await getSessions(tokenA);
    log('green', `✅ Found ${sessions.length} active sessions`);

    if (sessions.length < 2) {
      log('red', '❌ FAIL: Expected at least 2 sessions');
      process.exit(1);
    }

    // Step 4: Connect WebSocket for Session A
    log('yellow', '\n📝 Step 4: Connect WebSocket for Session A...');
    const clientA = await connectWebSocket(tokenA);

    // Step 5: Subscribe to session updates
    log('yellow', '\n📝 Step 5: Subscribe to session updates...');
    let notificationReceived = false;
    let notificationData = null;

    clientA.subscribe('/user/queue/sessions', (message) => {
      notificationReceived = true;
      notificationData = JSON.parse(message.body);
      log('green', `✅ WebSocket notification received!`);
      log('blue', `   Type: ${notificationData.type}`);
      log('blue', `   Reason: ${notificationData.reason}`);
    });

    log('green', '✅ Subscribed to /user/queue/sessions');

    // Step 6: Revoke Session B
    log('yellow', '\n📝 Step 6: Revoke Session B...');
    const sessionB = sessions.find((s) => !s.isCurrent);

    if (!sessionB) {
      log('red', '❌ FAIL: No other session found to revoke');
      clientA.deactivate();
      process.exit(1);
    }

    await revokeSession(sessionB.id, tokenA);
    log('green', `✅ Session ${sessionB.id} revoked`);

    // Step 7: Wait for notification
    log('yellow', '\n📝 Step 7: Wait for WebSocket notification (max 5 seconds)...');

    await new Promise((resolve) => {
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 100;

        if (notificationReceived) {
          clearInterval(interval);
          resolve();
        } else if (elapsed >= 5000) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });

    // Step 8: Verify notification
    log('yellow', '\n📝 Step 8: Verify notification...');

    if (notificationReceived) {
      log('green', '✅ PASS: WebSocket notification received!');
      log('green', `✅ Type: ${notificationData.type}`);
      log('green', `✅ Real-time notification is working!\n`);

      clientA.deactivate();

      log('blue', '\n========================================');
      log('green', '✅ All Tests Passed!');
      log('blue', '========================================\n');

      process.exit(0);
    } else {
      log('red', '❌ FAIL: No WebSocket notification received within 5 seconds');
      log('red', '❌ Real-time notification is NOT working\n');

      clientA.deactivate();

      log('blue', '\n========================================');
      log('red', '❌ Test Failed!');
      log('blue', '========================================\n');

      process.exit(1);
    }

  } catch (error) {
    log('red', `\n❌ Test Error: ${error.message}`);
    process.exit(1);
  }
}

// Run test
testRealtimeLogout();
