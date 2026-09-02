import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initialLanguageReady } from './i18n';

// Dev-only diagnostika yordamchilari (window.* ga ulanadi). Prod bundle'ga kirmaydi.
if (import.meta.env.DEV) {
  import('./devtools/securityTests').then(() => {
    console.log('🔒 Security test suite loaded (Development Mode)');
    console.log('Run: securityTests.runAllSecurityTests()');
  });

  import('./devtools/testRealtimeLogout').then(() => {
    console.log('🧪 Real-time logout test loaded (Development Mode)');
    console.log('Run: testRealtimeLogout()');
  });

  import('./devtools/debugWebSocket').then(() => {
    console.log('🔍 WebSocket debug helper loaded (Development Mode)');
    console.log('Run: debugWebSocket()');
  });
}

// Saqlangan til (masalan 'ru') lazy yuklanadi — birinchi render kalitlar bilan chiqmasin
initialLanguageReady.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
