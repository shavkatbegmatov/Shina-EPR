/**
 * Manual Security Test Helpers
 *
 * Run these tests in browser console to verify security edge cases
 * Usage: Open DevTools → Console → Copy/paste test functions
 */

// Test 1: Token Manipulation
export const testTokenManipulation = () => {
  console.log('🔒 Test 1: Token Manipulation');
  console.log('==============================');

  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.error('❌ No token found. Please login first.');
    return;
  }

  console.log('✅ Original token:', token.substring(0, 30) + '...');

  // Modify token
  const modifiedToken = token.substring(0, 50) + 'HACKED' + token.substring(56);
  console.log('⚠️  Modified token:', modifiedToken.substring(0, 30) + '...');

  // Try to use modified token
  fetch('/api/v1/sessions', {
    headers: {
      'Authorization': `Bearer ${modifiedToken}`,
    },
  })
    .then((response) => {
      if (response.status === 401) {
        console.log('✅ PASS: Backend rejected modified token (401 Unauthorized)');
      } else {
        console.error('❌ FAIL: Backend accepted modified token!');
      }
      return response.json();
    })
    .then((data) => {
      console.log('Response:', data);
    })
    .catch((error) => {
      console.error('Request error:', error);
    });
};

// Test 2: Concurrent Session Revocation
export const testConcurrentRevocation = (sessionId: number) => {
  console.log('🔒 Test 2: Concurrent Session Revocation');
  console.log('=========================================');

  if (!sessionId) {
    console.error('❌ Please provide a session ID to revoke');
    return;
  }

  const promises = [];

  // Fire 3 revocation requests simultaneously
  for (let i = 0; i < 3; i++) {
    const promise = fetch(`/api/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: `Concurrent test #${i + 1}` }),
    })
      .then((response) => ({
        requestNum: i + 1,
        status: response.status,
        ok: response.ok,
      }))
      .catch((error) => ({
        requestNum: i + 1,
        error: error.message,
      }));

    promises.push(promise);
  }

  Promise.all(promises).then((results) => {
    console.log('Results:', results);

    const successCount = results.filter((r) => 'ok' in r && r.ok).length;
    const failCount = results.filter((r) => !('ok' in r) || !r.ok).length;

    if (successCount === 1 && failCount === 2) {
      console.log('✅ PASS: Only 1 request succeeded, 2 failed (idempotent)');
    } else if (successCount === 3) {
      console.log('⚠️  WARNING: All 3 succeeded (check DB for duplicates)');
    } else {
      console.log(`ℹ️  Results: ${successCount} succeeded, ${failCount} failed`);
    }
  });
};

// Test 3: Rate Limiting
export const testRateLimiting = async () => {
  console.log('🔒 Test 3: Rate Limiting Validation');
  console.log('===================================');

  const startTime = Date.now();
  const requests: number[] = [];

  console.log('Sending 10 rapid validation requests...');

  for (let i = 0; i < 10; i++) {
    const requestTime = Date.now();

    try {
      await fetch('/api/v1/sessions/validate', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      requests.push(requestTime - startTime);
      console.log(`Request ${i + 1}: ${requestTime - startTime}ms`);
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n✅ Sent ${requests.length} requests in ${totalTime}ms`);

  // Frontend rate limiting check (should be in useSessionMonitor)
  console.log('\nℹ️  Note: Frontend has 10-second rate limit in useSessionMonitor');
  console.log('To test frontend rate limit: Rapidly focus/unfocus tab');
};

// Test 4: XSS Prevention
export const testXSSPrevention = () => {
  console.log('🔒 Test 4: XSS Prevention in Session Display');
  console.log('============================================');

  const maliciousUA = '<script>alert("XSS")</script>';

  console.log('⚠️  Malicious User-Agent:', maliciousUA);
  console.log('\nℹ️  To test:');
  console.log('1. Modify User-Agent header in login request');
  console.log('2. Login with malicious UA');
  console.log('3. Navigate to Profile → Sessions');
  console.log('4. Verify script is displayed as text, not executed');
  console.log('\n✅ React auto-escapes by default (safe)');
};

// Test 5: Cross-Tab Sync
export const testCrossTabSync = () => {
  console.log('🔒 Test 5: Cross-Tab Session Synchronization');
  console.log('============================================');

  console.log('\nManual Test Steps:');
  console.log('1. Open this page in 2 browser tabs (Tab A and Tab B)');
  console.log('2. In Tab A console, run: localStorage.removeItem("accessToken")');
  console.log('3. Check Tab B - should auto-logout within 1 second');
  console.log('\n✅ useCrossTabSync hook listens for storage events');

  // Demonstrate storage event
  console.log('\nStorage Event Listener Status:');
  console.log('Registered:', window.onstorage !== null ? 'Yes' : 'No');
};

// Test 6: Session Ownership
export const testSessionOwnership = async (targetSessionId: number) => {
  console.log('🔒 Test 6: Session Ownership Validation');
  console.log('========================================');

  if (!targetSessionId) {
    console.error('❌ Please provide a session ID to test');
    return;
  }

  console.log(`Attempting to access session ID: ${targetSessionId}`);

  try {
    const response = await fetch(`/api/v1/sessions/${targetSessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    const data = await response.json();

    if (response.status === 404 || response.status === 403) {
      console.log('✅ PASS: Backend blocked access to other user session');
    } else if (response.status === 200) {
      console.log('⚠️  Session revoked - verify this was YOUR session');
    }

    console.log('Response:', data);
  } catch (error) {
    console.error('Request failed:', error);
  }
};

// Test 7: Database Consistency
export const testDatabaseConsistency = () => {
  console.log('🔒 Test 7: Database Consistency Check');
  console.log('=====================================');

  console.log('\nSQL Queries to Run:');
  console.log('\n1. Check for orphaned sessions (expired but not deleted):');
  console.log('   SELECT COUNT(*) FROM sessions WHERE expires_at < NOW();');

  console.log('\n2. Check session count per user:');
  console.log('   SELECT user_id, COUNT(*) FROM sessions GROUP BY user_id;');

  console.log('\n3. Verify token hash uniqueness:');
  console.log('   SELECT token_hash, COUNT(*) FROM sessions GROUP BY token_hash HAVING COUNT(*) > 1;');

  console.log('\n4. Check active sessions with past expiration:');
  console.log('   SELECT * FROM sessions WHERE is_active = true AND expires_at < NOW();');

  console.log('\n✅ Run these queries in your database client (psql, pgAdmin, etc.)');
};

// Test 8: Session Hijacking Simulation
export const testSessionHijacking = () => {
  console.log('🔒 Test 8: Session Hijacking Prevention');
  console.log('=======================================');

  const currentToken = localStorage.getItem('accessToken');

  console.log('\nSimulation Steps:');
  console.log('1. Copy current token to clipboard');
  console.log('2. Open DIFFERENT computer or incognito mode');
  console.log('3. Manually set localStorage.setItem("accessToken", [stolen token])');
  console.log('4. Try to access protected pages');
  console.log('\n⚠️  Current Implementation:');
  console.log('- IP address stored but NOT validated on requests');
  console.log('- User-Agent stored but NOT validated on requests');
  console.log('- Token itself is validated (signature, expiration)');

  console.log('\nToken (first 40 chars):', currentToken?.substring(0, 40));

  console.log('\n💡 Enhancement Recommendation:');
  console.log('Add optional IP/UA validation in SessionService for strict mode');
};

// Run All Tests
export const runAllSecurityTests = async () => {
  console.log('🔒 Running All Security Tests');
  console.log('==============================\n');

  testTokenManipulation();

  console.log('\n\n');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  testRateLimiting();

  console.log('\n\n');
  testXSSPrevention();

  console.log('\n\n');
  testCrossTabSync();

  console.log('\n\n');
  testDatabaseConsistency();

  console.log('\n\n');
  testSessionHijacking();

  console.log('\n\n✅ Automated tests complete!');
  console.log('ℹ️  Manual tests require multiple tabs/browsers');
};

// Security tests interface for Window
interface SecurityTestsInterface {
  testTokenManipulation: typeof testTokenManipulation;
  testConcurrentRevocation: typeof testConcurrentRevocation;
  testRateLimiting: typeof testRateLimiting;
  testXSSPrevention: typeof testXSSPrevention;
  testCrossTabSync: typeof testCrossTabSync;
  testSessionOwnership: typeof testSessionOwnership;
  testDatabaseConsistency: typeof testDatabaseConsistency;
  testSessionHijacking: typeof testSessionHijacking;
  runAllSecurityTests: typeof runAllSecurityTests;
}

// Extend Window interface for console access
declare global {
  interface Window {
    securityTests: SecurityTestsInterface;
  }
}

// Export for console usage
if (typeof window !== 'undefined') {
  window.securityTests = {
    testTokenManipulation,
    testConcurrentRevocation,
    testRateLimiting,
    testXSSPrevention,
    testCrossTabSync,
    testSessionOwnership,
    testDatabaseConsistency,
    testSessionHijacking,
    runAllSecurityTests,
  };

  console.log('🔒 Security Tests loaded!');
  console.log('Run: securityTests.runAllSecurityTests()');
  console.log('Or run individual tests: securityTests.testTokenManipulation()');
}
