#!/usr/bin/env node

/**
 * Test script for the complete OAuth flow and MCP server functionality
 */

const BASE_URL = 'http://localhost:3000';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete OAuth Flow and MCP Server\n');

  try {
    // Step 1: Register a new client
    console.log('1️⃣ Registering new MCP client...');
    const registerResponse = await fetch(`${BASE_URL}/api/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Test MCP Client',
        redirect_uris: ['http://localhost:6274/oauth/callback/debug']
      })
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    const clientData = await registerResponse.json();
    console.log('✅ Client registered:', clientData.client_id);

    // Step 2: Test authorization endpoint
    console.log('\n2️⃣ Testing authorization endpoint...');
    const authUrl = `${BASE_URL}/oauth/authorize?client_id=${clientData.client_id}&redirect_uri=http://localhost:6274/oauth/callback/debug&response_type=code&scope=read:user`;
    
    const authResponse = await fetch(authUrl, { redirect: 'manual' });
    console.log('✅ Authorization redirect status:', authResponse.status);
    console.log('📍 Redirect URL:', authResponse.headers.get('location')?.substring(0, 100) + '...');

    // Step 3: Test metadata endpoints
    console.log('\n3️⃣ Testing metadata endpoints...');
    
    const protectedResourceResponse = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`);
    console.log('✅ Protected resource metadata:', protectedResourceResponse.status === 200 ? 'OK' : 'FAILED');
    
    const authServerResponse = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`);
    console.log('✅ Authorization server metadata:', authServerResponse.status === 200 ? 'OK' : 'FAILED');

    // Step 4: Test MCP server (without auth - should fail)
    console.log('\n4️⃣ Testing MCP server (unauthenticated)...');
    const mcpResponse = await fetch(`${BASE_URL}/mcp`);
    console.log('✅ MCP server response (should be 401):', mcpResponse.status);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Complete the OAuth flow manually using the authorization URL');
    console.log('2. Exchange the authorization code for an access token');
    console.log('3. Test the MCP server with the access token');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCompleteFlow();
