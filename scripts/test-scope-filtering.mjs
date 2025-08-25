#!/usr/bin/env node

/**
 * Test script to verify scope filtering is working
 */

import { filterScopes, OAUTH_CONFIG } from '../lib/oauth-config.js';

console.log('🧪 Testing Scope Filtering\n');

// Test cases
const testCases = [
  'read:user',
  'read:user user:email',
  'read:user public_repo repo admin:org admin:user',
  'public_repo repo admin:org admin:user',
  'invalid_scope',
  null,
  undefined,
  '',
];

console.log('OAUTH_CONFIG.ALLOWED_SCOPES:', OAUTH_CONFIG.ALLOWED_SCOPES);
console.log('OAUTH_CONFIG.DEFAULT_SCOPE:', OAUTH_CONFIG.DEFAULT_SCOPE);
console.log('');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase}"`);
  const result = filterScopes(testCase);
  console.log(`  Input:  ${testCase}`);
  console.log(`  Output: ${result}`);
  console.log(`  Valid:  ${result === 'read:user' ? '✅' : '❌'}`);
  console.log('');
});

console.log('🎯 Expected behavior: All tests should output "read:user"');
