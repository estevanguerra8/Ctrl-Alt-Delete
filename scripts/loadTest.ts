// Simple load-testing script (stub)
// TODO: Implement load testing for API endpoints

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function loadTest() {
  console.log('Load testing StatCard service...');
  console.log('TODO: Implement load testing');
  
  // Example: Test statcard endpoint
  try {
    const response = await axios.get(`${BASE_URL}/api/statcard/user1`);
    console.log('StatCard endpoint response:', response.status);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

loadTest().catch(console.error);

