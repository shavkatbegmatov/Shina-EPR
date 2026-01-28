/**
 * WebSocket Debug Helper
 *
 * Run in browser console to debug WebSocket connection issues
 *
 * Usage: debugWebSocket()
 */

import { useNotificationsStore } from '../store/notificationsStore';
import { useAuthStore } from '../store/authStore';
import { webSocketService } from '../services/websocket';

export function debugWebSocket() {
  console.log('%c🔍 WebSocket Debug Information', 'font-size: 18px; font-weight: bold; color: #3b82f6;');
  console.log('%c========================================', 'color: #3b82f6;');
  console.log('');

  // 1. Check Auth Status
  console.log('%c1️⃣ Authentication Status', 'font-weight: bold; color: #eab308;');
  const authState = useAuthStore.getState();
  const token = localStorage.getItem('accessToken');

  console.log('User logged in:', authState.user !== null);
  console.log('User:', authState.user?.username || 'Not logged in');
  console.log('Access token exists:', token !== null);
  console.log('Token length:', token?.length || 0);
  console.log('');

  // 2. Check WebSocket Service
  console.log('%c2️⃣ WebSocket Service Status', 'font-weight: bold; color: #eab308;');
  console.log('Service connected:', webSocketService.isConnected());
  console.log('');

  // 3. Check Notification Store
  console.log('%c3️⃣ Notification Store Status', 'font-weight: bold; color: #eab308;');
  const notifState = useNotificationsStore.getState();
  console.log('wsConnected flag:', notifState.wsConnected);
  console.log('Notifications count:', notifState.notifications.length);
  console.log('Unread count:', notifState.unreadCount);
  console.log('');

  // 4. Try manual connection
  console.log('%c4️⃣ Manual Connection Test', 'font-weight: bold; color: #eab308;');

  if (!token) {
    console.log('%c❌ Cannot test connection: No access token', 'color: #ef4444;');
    console.log('Please login first.');
    console.log('');
    return;
  }

  if (webSocketService.isConnected()) {
    console.log('%c✅ WebSocket already connected!', 'color: #10b981;');
    console.log('');
  } else {
    console.log('%c⚠️  WebSocket not connected. Attempting to connect...', 'color: #f59e0b;');
    console.log('');

    try {
      const { connectWebSocket } = useNotificationsStore.getState();
      connectWebSocket(token);

      console.log('%c✅ Connection attempt initiated', 'color: #10b981;');
      console.log('Wait a few seconds and run debugWebSocket() again to verify.');
      console.log('');
    } catch (error) {
      console.log('%c❌ Connection failed:', 'color: #ef4444;');
      console.error(error);
      console.log('');
    }
  }

  // 5. Recommendations
  console.log('%c5️⃣ Troubleshooting Steps', 'font-weight: bold; color: #eab308;');
  console.log('');

  if (!authState.user) {
    console.log('❌ Not logged in');
    console.log('   → Login first: http://localhost:5173/login');
  } else if (!token) {
    console.log('❌ No access token');
    console.log('   → Try logging out and logging in again');
  } else if (!webSocketService.isConnected()) {
    console.log('❌ WebSocket not connected');
    console.log('   → Check browser console for connection errors');
    console.log('   → Verify backend is running: http://localhost:8080');
    console.log('   → Try refreshing the page');
    console.log('   → Check Network tab for WebSocket connection');
  } else {
    console.log('✅ Everything looks good!');
    console.log('   → WebSocket is connected and ready');
    console.log('   → You can run: testRealtimeLogout()');
  }

  console.log('');
  console.log('%c========================================', 'color: #3b82f6;');
}

// Extend Window interface for console access
declare global {
  interface Window {
    debugWebSocket: typeof debugWebSocket;
  }
}

// Export for console usage
if (typeof window !== 'undefined') {
  window.debugWebSocket = debugWebSocket;
  console.log('🔍 WebSocket debug helper loaded!');
  console.log('Run: debugWebSocket()');
}
