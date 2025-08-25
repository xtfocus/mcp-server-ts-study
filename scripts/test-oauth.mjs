#!/usr/bin/env node

/**
 * Test script for GitHub OAuth MCP Server
 * 
 * This script tests the OAuth-protected MCP server endpoints
 * using a GitHub Personal Access Token.
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const GITHUB_TOKEN = process.argv[3];

if (!GITHUB_TOKEN) {
  console.error('❌ Please provide a GitHub Personal Access Token as the second argument');
  console.error('Usage: node scripts/test-oauth.mjs [base-url] [github-token]');
  console.error('Example: node scripts/test-oauth.mjs http://localhost:3000 ghp_xxxxxxxxxxxxxxxxxxxx');
  process.exit(1);
}

async function testOAuthMetadata() {
  console.log('🔍 Testing OAuth Metadata Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource/mcp`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    console.log('✅ OAuth Metadata Endpoint:', JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('❌ OAuth Metadata Endpoint failed:', error.message);
    return false;
  }
}

async function testMcpConnection() {
  console.log('\n🔗 Testing MCP Connection...');
  
  try {
    const response = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ MCP Connection successful:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('❌ MCP Connection failed:', error.message);
    return false;
  }
}

async function testTools() {
  console.log('\n🛠️ Testing MCP Tools...');
  
  const tools = [
    {
      name: 'echo',
      params: { message: 'Hello from OAuth test!' }
    },
    {
      name: 'roll_dice',
      params: { sides: 6, count: 2 }
    },
    {
      name: 'githubUserInfo',
      params: {}
    }
  ];
  
  for (const tool of tools) {
    try {
      console.log(`\nTesting tool: ${tool.name}`);
      
      const response = await fetch(`${BASE_URL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: tool.params
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        console.error(`❌ Tool ${tool.name} failed:`, result.error);
      } else {
        console.log(`✅ Tool ${tool.name} successful:`, JSON.stringify(result.result, null, 2));
      }
    } catch (error) {
      console.error(`❌ Tool ${tool.name} failed:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Testing GitHub OAuth MCP Server');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Token: ${GITHUB_TOKEN.substring(0, 10)}...`);
  
  const metadataOk = await testOAuthMetadata();
  const connectionOk = await testMcpConnection();
  
  if (metadataOk && connectionOk) {
    await testTools();
  }
  
  console.log('\n✨ Test completed!');
}

main().catch(console.error);
