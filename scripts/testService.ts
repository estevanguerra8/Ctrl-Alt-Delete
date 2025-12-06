import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('❌ Health check failed: Service is not running!');
      console.error('   💡 Start the service first: npm start');
    } else {
      console.error('❌ Health check failed:', error.message);
    }
    return false;
  }
}

async function testStatCardAPI() {
  console.log('\n📊 Testing StatCard API...');
  
  // Test with non-existent user
  try {
    const response = await axios.get(`${BASE_URL}/api/statcard/testuser123`, { timeout: 2000 });
    console.log('❌ Should have returned 404, got:', response.status);
    return false;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('❌ Service is not running! Start it with: npm start');
      return false;
    } else if (error.response?.status === 404) {
      console.log('✅ Correctly returns 404 for non-existent user');
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  }
  
  // Test with invalid endpoint
  try {
    await axios.get(`${BASE_URL}/api/statcard/`, { timeout: 2000 });
    console.log('❌ Should have failed');
    return false;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return false;
    }
    console.log('✅ API validation working');
  }
  
  return true;
}

async function testDuelAPI() {
  console.log('\n⚔️ Testing Duel API...');
  
  // Test with non-existent duel
  try {
    const response = await axios.get(`${BASE_URL}/duel/invalid-id-123`, { timeout: 2000 });
    console.log('❌ Should have returned 404, got:', response.status);
    return false;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('❌ Service is not running! Start it with: npm start');
      return false;
    } else if (error.response?.status === 404) {
      console.log('✅ Correctly returns 404 for non-existent duel');
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  }
  
  return true;
}

async function testKafkaEventSimulation() {
  console.log('\n📨 Testing Kafka Event Format...');
  
  // Simulate a Series message.received event
  const sampleEvent = {
    api_version: 'v2',
    created_at: new Date().toISOString(),
    event_id: 'test-event-' + Date.now(),
    event_type: 'message.received',
    data: {
      attachments: [],
      chat_handles: [
        { display_name: 'You', identifier: '+16463458837', is_me: true },
        { display_name: 'Test User', identifier: '+1234567890', is_me: false }
      ],
      chat_id: '12345',
      from_phone: '+1234567890',
      id: 'test-msg-' + Date.now(),
      is_read: false,
      reaction_id: null,
      sent_at: new Date().toISOString(),
      service: 'iMessage',
      text: '!card'
    }
  };
  
  console.log('📝 Sample event structure:');
  console.log(JSON.stringify(sampleEvent, null, 2));
  console.log('\n💡 This is the format your Kafka consumer expects');
  
  return true;
}

async function runAllTests() {
  console.log('🧪 Starting Service Tests...\n');
  console.log('='.repeat(50));
  
  const results = {
    health: await testHealthCheck(),
    statcard: await testStatCardAPI(),
    duel: await testDuelAPI(),
    kafka: await testKafkaEventSimulation(),
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`  Health Check: ${results.health ? '✅' : '❌'}`);
  console.log(`  StatCard API: ${results.statcard ? '✅' : '❌'}`);
  console.log(`  Duel API: ${results.duel ? '✅' : '❌'}`);
  console.log(`  Kafka Format: ${results.kafka ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '⚠️  Some tests failed'}`);
  
  if (!results.health) {
    console.log('\n⚠️  IMPORTANT: Service is not running!');
    console.log('   📋 To fix this:');
    console.log('   1. Open a NEW terminal window');
    console.log('   2. Run: npm start');
    console.log('   3. Wait for "Service ready and waiting for events"');
    console.log('   4. Then run: npm test (in this terminal)');
  } else {
    console.log('\n💡 Next Steps:');
    console.log('  1. Send a message in Series chat starting with !card');
    console.log('  2. Check the service logs to see if it processes the message');
  }
}

runAllTests().catch(console.error);

