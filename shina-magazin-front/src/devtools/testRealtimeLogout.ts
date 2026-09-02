/**
 * Real-Time Logout Notification Test
 *
 * Run in browser console to test WebSocket session notifications
 *
 * Usage:
 *   1. Open browser console (F12)
 *   2. Run: testRealtimeLogout()
 *   3. Follow instructions in console
 */

import { sessionsApi } from '../api/sessions.api';
import { useNotificationsStore } from '../store/notificationsStore';

export async function testRealtimeLogout() {
  console.log('%c🧪 Real-Time Logout Test', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
  console.log('%c========================================', 'color: #3b82f6;');
  console.log('');

  try {
    // Step 1: Check WebSocket connection
    console.log('%c📝 Step 1: Check WebSocket connection', 'font-weight: bold; color: #eab308;');

    const wsConnected = useNotificationsStore.getState().wsConnected;
    console.log(`WebSocket status: ${wsConnected ? '✅ Connected' : '❌ Not connected'}`);

    if (!wsConnected) {
      console.log('%c⚠️  WARNING: WebSocket not connected!', 'color: #ef4444;');
      console.log('');
      console.log('Troubleshooting:');
      console.log('1. Make sure you are logged in');
      console.log('2. WebSocket connects automatically on login');
      console.log('3. Check browser console for WebSocket errors');
      console.log('4. Try refreshing the page');
      console.log('');
      console.log('To manually check WebSocket:');
      console.log('  useNotificationsStore.getState().wsConnected');
      console.log('');
      return;
    }

    // Step 2: Get current sessions
    console.log('');
    console.log('%c📝 Step 2: Get active sessions', 'font-weight: bold; color: #eab308;');

    const sessions = await sessionsApi.getActiveSessions();
    console.log(`✅ Found ${sessions.length} active sessions:`);
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.browser} - ${s.os} ${s.isCurrent ? '(current)' : ''}`);
    });

    if (sessions.length < 2) {
      console.log('');
      console.log('%c⚠️  Need at least 2 sessions to test', 'color: #ef4444; font-weight: bold;');
      console.log('');
      console.log('Instructions:');
      console.log('1. Open another browser (Firefox, Edge, etc.)');
      console.log('2. Login with same credentials');
      console.log('3. Run this test again');
      return;
    }

    // Step 3: Setup event listener
    console.log('');
    console.log('%c📝 Step 3: Setup session update listener', 'font-weight: bold; color: #eab308;');

    let notificationReceived = false;

    const handleSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      notificationReceived = true;

      console.log('');
      console.log('%c✅ WebSocket Notification Received!', 'font-size: 16px; font-weight: bold; color: #10b981;');
      console.log('Data:', customEvent.detail);

      window.removeEventListener('session-update', handleSessionUpdate);
    };

    window.addEventListener('session-update', handleSessionUpdate);
    console.log('✅ Event listener registered');

    // Step 4: Instructions for user
    console.log('');
    console.log('%c📝 Step 4: Manual Test Instructions', 'font-weight: bold; color: #eab308;');
    console.log('');
    console.log('%c⚡ NOW DO THIS:', 'font-size: 16px; font-weight: bold; color: #f59e0b;');
    console.log('');
    console.log('1. Go to your OTHER browser (where you logged in)');
    console.log('2. Click logout (User dropdown → Chiqish)');
    console.log('3. Come back to THIS browser');
    console.log('4. Watch the console - you should see a notification within 3 seconds!');
    console.log('');
    console.log('Waiting for WebSocket notification...');

    // Wait up to 30 seconds
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (notificationReceived) {
        clearInterval(checkInterval);
        console.log('');
        console.log('%c========================================', 'color: #10b981;');
        console.log('%c✅ TEST PASSED!', 'font-size: 18px; font-weight: bold; color: #10b981;');
        console.log('%c========================================', 'color: #10b981;');
        console.log('');
        console.log('Real-time notification is working! 🎉');
        console.log(`Response time: ${elapsed} seconds`);
        console.log('');
      } else if (elapsed >= 30) {
        clearInterval(checkInterval);
        window.removeEventListener('session-update', handleSessionUpdate);

        console.log('');
        console.log('%c========================================', 'color: #ef4444;');
        console.log('%c❌ TEST FAILED', 'font-size: 18px; font-weight: bold; color: #ef4444;');
        console.log('%c========================================', 'color: #ef4444;');
        console.log('');
        console.log('No WebSocket notification received after 30 seconds');
        console.log('');
        console.log('Troubleshooting:');
        console.log('1. Check if you logged out from the other browser');
        console.log('2. Check WebSocket connection status');
        console.log('3. Check backend logs for errors');
        console.log('4. Try refreshing both browsers and test again');
        console.log('');
      } else if (elapsed % 5 === 0) {
        console.log(`⏳ Still waiting... (${elapsed}s / 30s)`);
      }
    }, 1000);

  } catch (error) {
    console.log('');
    console.log('%c❌ Test Error', 'font-weight: bold; color: #ef4444;');
    console.error(error);
  }
}

// Extend Window interface for console access
declare global {
  interface Window {
    testRealtimeLogout: typeof testRealtimeLogout;
  }
}

// Export for console usage
if (typeof window !== 'undefined') {
  window.testRealtimeLogout = testRealtimeLogout;
  console.log('🧪 Real-time logout test loaded!');
  console.log('Run: testRealtimeLogout()');
}
