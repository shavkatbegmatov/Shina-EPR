import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // Initialize i18n for customer portal

// Load security tests in development mode
if (import.meta.env.DEV) {
  import('./utils/securityTests').then(() => {
    console.log('🔒 Security test suite loaded (Development Mode)');
    console.log('Run: securityTests.runAllSecurityTests()');
  });

  import('./utils/testRealtimeLogout').then(() => {
    console.log('🧪 Real-time logout test loaded (Development Mode)');
    console.log('Run: testRealtimeLogout()');
  });

  import('./utils/debugWebSocket').then(() => {
    console.log('🔍 WebSocket debug helper loaded (Development Mode)');
    console.log('Run: debugWebSocket()');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
