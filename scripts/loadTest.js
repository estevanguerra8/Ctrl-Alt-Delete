"use strict";
// Simple load-testing script (stub)
// TODO: Implement load testing for API endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
async function loadTest() {
    console.log('Load testing StatCard service...');
    console.log('TODO: Implement load testing');
    // Example: Test statcard endpoint
    try {
        const response = await axios_1.default.get(`${BASE_URL}/api/statcard/user1`);
        console.log('StatCard endpoint response:', response.status);
    }
    catch (error) {
        console.error('Error:', error.message);
    }
}
loadTest().catch(console.error);
//# sourceMappingURL=loadTest.js.map