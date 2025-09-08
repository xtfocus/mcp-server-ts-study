#!/usr/bin/env node

/**
 * Test script for the notification system
 * This script helps debug the notification system by testing various scenarios
 */

import { EventSource } from 'eventsource';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SSE_URL = `${BASE_URL}/api/notifications/sse`;

console.log('🧪 Testing Notification System');
console.log('==============================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`SSE URL: ${SSE_URL}`);
console.log('');

// Test SSE connection
async function testSSEConnection() {
  console.log('📡 Testing SSE Connection...');
  
  return new Promise((resolve, reject) => {
    const clientId = `test-client-${Date.now()}`;
    const eventSource = new EventSource(`${SSE_URL}?clientId=${clientId}`);
    
    let messageCount = 0;
    const timeout = setTimeout(() => {
      eventSource.close();
      reject(new Error('SSE connection timeout'));
    }, 10000);
    
    eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
    };
    
    eventSource.onmessage = (event) => {
      messageCount++;
      const data = JSON.parse(event.data);
      console.log(`📨 Received message ${messageCount}:`, {
        type: data.type,
        clientId: data.clientId,
        message: data.message,
        timestamp: data.timestamp
      });
      
      if (data.type === 'connection') {
        console.log('✅ Connection message received');
        clearTimeout(timeout);
        setTimeout(() => {
          eventSource.close();
          resolve();
        }, 2000);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      clearTimeout(timeout);
      reject(error);
    };
  });
}

// Test MCP tool call with progress
async function testMCPToolCall() {
  console.log('🎲 Testing MCP Tool Call with Progress...');
  
  const toolCall = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'roll_dice',
      arguments: {
        sides: 6,
        count: 3,
        showProgress: true
      },
      _meta: {
        progressToken: `test-token-${Date.now()}`
      }
    }
  };
  
  console.log('📤 Sending tool call:', JSON.stringify(toolCall, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toolCall)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.text();
    console.log('📥 Tool call response:', result);
    console.log('✅ Tool call completed');
  } catch (error) {
    console.error('❌ Tool call failed:', error.message);
  }
}

// Main test function
async function runTests() {
  try {
    console.log('Starting notification system tests...\n');
    
    // Test 1: SSE Connection
    await testSSEConnection();
    console.log('');
    
    // Test 2: MCP Tool Call
    await testMCPToolCall();
    console.log('');
    
    console.log('🎉 All tests completed!');
    console.log('');
    console.log('💡 Debug Tips:');
    console.log('- Check the server console for detailed logs');
    console.log('- Look for [SSE], [ProgressTracker], [roll_dice] log prefixes');
    console.log('- Monitor the SSE endpoint in browser: ' + SSE_URL);
    console.log('- Use browser dev tools to see real-time notifications');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testSSEConnection, testMCPToolCall };
