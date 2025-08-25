#!/usr/bin/env node

/**
 * Test script for the web login flow using OAuth proxy
 */

const BASE_URL = 'http://localhost:3000';

async function testWebLogin() {
  console.log('🧪 Testing Web Login Flow with OAuth Proxy\n');

  try {
    // Step 1: Register a client for web login
    console.log('1️⃣ Registering client for web login...');
    const registerResponse = await fetch(`${BASE_URL}/api/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Web Login Test Client',
        redirect_uris: [`${BASE_URL}/api/auth/callback/github`]
      })
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    const clientData = await registerResponse.json();
    console.log('✅ Client registered:', clientData.client_id);

    // Step 2: Test authorization endpoint for web login
    console.log('\n2️⃣ Testing authorization endpoint for web login...');
    const authUrl = `${BASE_URL}/oauth/authorize?client_id=${clientData.client_id}&redirect_uri=${encodeURIComponent(`${BASE_URL}/api/auth/callback/github`)}&response_type=code&scope=read:user`;
    
    const authResponse = await fetch(authUrl, { redirect: 'manual' });
    console.log('✅ Authorization redirect status:', authResponse.status);
    console.log('📍 Redirect URL:', authResponse.headers.get('location')?.substring(0, 100) + '...');

    // Step 3: Test the web login page
    console.log('\n3️⃣ Testing web login page...');
    const pageResponse = await fetch(`${BASE_URL}/`);
    console.log('✅ Web login page status:', pageResponse.status);

    console.log('\n🎉 Web login flow test completed!');
    console.log('\n📋 To test the complete flow:');
    console.log('1. Visit http://localhost:3000');
    console.log('2. Click "Sign in with GitHub"');
    console.log('3. Complete the OAuth flow');
    console.log('4. You should be redirected back and see your GitHub info');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testWebLogin();
