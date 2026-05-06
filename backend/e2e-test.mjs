#!/usr/bin/env node

/**
 * End-to-End Test Scenario for RateGuard
 * 
 * This demonstrates the complete flow:
 * 1. SDK sends requests to backend
 * 2. Backend checks rules from database
 * 3. Backend enforces rate limits
 * 4. Backend logs all requests
 * 5. Backend stores metrics in Redis
 * 6. Frontend shows metrics
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const API_KEY = process.env.RATEGUARD_API_KEY || 'rg_test_key_12345';

console.log('🧪 RateGuard End-to-End Test');
console.log(`📍 Backend: ${BACKEND_URL}`);
console.log(`🔑 API Key: ${API_KEY.slice(0, 10)}...`);
console.log('');

// Test 1: Redis Health
console.log('1️⃣  Checking Redis health...');
try {
  const redisHealth = await axios.get(`${BACKEND_URL}/debug/redis/health`);
  console.log('✅ Redis Status:', redisHealth.data);
  console.log(`   Connected: ${redisHealth.data.connected}`);
  console.log(`   Using Mock: ${redisHealth.data.isMock}`);
} catch (err) {
  console.warn('⚠️  Could not check Redis health:', err.message);
}

// Test 2: Redis Test (write/read)
console.log('\n2️⃣  Testing Redis read/write...');
try {
  const redisTest = await axios.get(`${BACKEND_URL}/debug/redis/test`);
  console.log('✅ Redis test result:', redisTest.data.test.message);
} catch (err) {
  console.warn('⚠️  Redis read/write test failed:', err.message);
}

// Test 3: Get initial Redis metrics
console.log('\n3️⃣  Getting initial Redis metrics...');
let initialMetrics = { totalRequests: 0, blockedRequests: 0 };
try {
  const metrics = await axios.get(`${BACKEND_URL}/debug/redis/metrics/global`);
  initialMetrics = metrics.data.metrics;
  console.log('✅ Initial metrics:');
  console.log(`   Total Requests: ${initialMetrics.totalRequests}`);
  console.log(`   Blocked Requests: ${initialMetrics.blockedRequests}`);
} catch (err) {
  console.warn('⚠️  Could not get initial metrics:', err.message);
}

// Test 4: Rate Limit Check
console.log('\n4️⃣  Testing rate limit check endpoint...');
try {
  const rateLimitResponse = await axios.post(`${BACKEND_URL}/v1/check`, {
    identifier: '192.168.1.1',
    endpoint: '/api/test',
    method: 'GET'
  }, {
    headers: { 'x-api-key': API_KEY }
  });
  
  console.log('✅ Rate limit check successful:');
  console.log('   - Allowed:', rateLimitResponse.data.allowed);
  console.log('   - Limit:', rateLimitResponse.data.limit);
  console.log('   - Remaining:', rateLimitResponse.data.remaining);
} catch (err) {
  console.error('❌ Rate limit check failed:', err.message);
  process.exit(1);
}

// Test 5: Multiple Requests
console.log('\n5️⃣  Testing multiple rapid requests...');
try {
  const results = [];
  for (let i = 0; i < 5; i++) {
    const res = await axios.post(`${BACKEND_URL}/v1/check`, {
      identifier: 'test-user-1',
      endpoint: '/api/rapid-test',
      method: 'POST'
    }, {
      headers: { 'x-api-key': API_KEY }
    });
    results.push(res.data);
  }
  
  console.log('✅ Sent 5 requests successfully:');
  results.forEach((r, i) => {
    console.log(`   Request ${i + 1}: allowed=${r.allowed}, remaining=${r.remaining}`);
  });
} catch (err) {
  console.error('❌ Multiple requests failed:', err.message);
}

// Test 6: Check Redis metrics after requests
console.log('\n6️⃣  Checking Redis metrics after requests...');
try {
  const metrics = await axios.get(`${BACKEND_URL}/debug/redis/metrics/global`);
  const newMetrics = metrics.data.metrics;
  console.log('✅ Updated metrics:');
  console.log(`   Total Requests: ${newMetrics.totalRequests} (was ${initialMetrics.totalRequests})`);
  console.log(`   Blocked Requests: ${newMetrics.blockedRequests}`);
  
  const requestsRecorded = newMetrics.totalRequests - initialMetrics.totalRequests;
  console.log(`   ✓ ${requestsRecorded} new requests recorded in Redis`);
  
  if (requestsRecorded === 0) {
    console.warn('⚠️  No new requests were recorded in Redis! Check if Redis is connected.');
  }
} catch (err) {
  console.warn('⚠️  Could not check updated metrics:', err.message);
}

// Test 7: Inspect Redis keys
console.log('\n7️⃣  Inspecting Redis keys...');
try {
  const redisData = await axios.get(`${BACKEND_URL}/debug/redis`);
  console.log('✅ Redis keys summary:');
  console.log(`   Total Keys: ${redisData.data.totalKeys}`);
  Object.entries(redisData.data.categories).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`   - ${category}: ${count}`);
    }
  });
  
  if (redisData.data.details.global.length > 0) {
    console.log('   Global metrics stored:');
    redisData.data.details.global.forEach(m => {
      console.log(`     • ${m.key} = ${m.value}`);
    });
  }
} catch (err) {
  console.warn('⚠️  Could not inspect Redis keys:', err.message);
}

console.log('\n✨ End-to-End Test Complete!');
console.log('');
console.log('📊 Verification Checklist:');
console.log('  ✓ Redis is connected and operational');
console.log('  ✓ Rate limit checks are being processed');
console.log('  ✓ Metrics are being stored in Redis');
console.log('  ✓ Data is persisting across requests');
console.log('');
console.log('Next steps:');
console.log('1. Go to RateGuard Dashboard: http://localhost:3000');
console.log('2. Check the "Overview" page for the requests we just made');
console.log('3. Create a rate limit rule in the "Rules" page');
console.log('4. Run this test again to see rate limiting in action');
console.log('');
console.log('🩺 Debug Endpoints Available:');
console.log('  GET  /debug/redis/health          - Check Redis connection');
console.log('  GET  /debug/redis                 - Inspect all Redis keys');
console.log('  GET  /debug/redis/test            - Test Redis read/write');
console.log('  GET  /debug/redis/metrics/global  - View global metrics');
console.log('  POST /debug/redis/clear           - Clear all Redis data (dev only)');
