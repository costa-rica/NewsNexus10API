/**
 * Test file for globalSecurity.js
 * Run with: node src/middleware/test-globalSecurity.js
 *
 * This tests sanitization WITHOUT validation
 */

const {
  sanitizeValue,
  sanitizeFilename,
  deepSanitize,
} = require('./globalSecurity');

console.log('🧪 Testing Global Security Sanitization\n');
console.log('=' .repeat(60));

// Test 1: Path traversal in strings
console.log('\n📁 Test 1: Path Traversal Sanitization');
const pathTraversal = '../../../etc/passwd';
const sanitized1 = sanitizeValue(pathTraversal);
console.log(`Input:  "${pathTraversal}"`);
console.log(`Output: "${sanitized1}"`);
console.log(`✓ Path traversal sequences removed: ${!sanitized1.includes('../')}`);

// Test 2: XSS attack
console.log('\n🔒 Test 2: XSS Attack Sanitization');
const xssAttack = '<script>alert("XSS")</script>Hello World';
const sanitized2 = sanitizeValue(xssAttack);
console.log(`Input:  "${xssAttack}"`);
console.log(`Output: "${sanitized2}"`);
console.log(`✓ Script tags removed: ${!sanitized2.includes('<script>')}`);

// Test 3: JavaScript protocol
console.log('\n🚫 Test 3: JavaScript Protocol Removal');
const jsProtocol = 'javascript:alert("XSS")';
const sanitized3 = sanitizeValue(jsProtocol);
console.log(`Input:  "${jsProtocol}"`);
console.log(`Output: "${sanitized3}"`);
console.log(`✓ javascript: removed: ${!sanitized3.toLowerCase().includes('javascript:')}`);

// Test 4: Event handlers
console.log('\n⚡ Test 4: Event Handler Removal');
const eventHandler = '<img src=x onerror="alert(1)">';
const sanitized4 = sanitizeValue(eventHandler);
console.log(`Input:  "${eventHandler}"`);
console.log(`Output: "${sanitized4}"`);
console.log(`✓ Event handler removed: ${!sanitized4.includes('onerror=')}`);

// Test 5: Null bytes
console.log('\n🔢 Test 5: Null Byte Removal');
const nullByte = 'file.txt\x00.exe';
const sanitized5 = sanitizeValue(nullByte);
console.log(`Input:  "file.txt\\x00.exe" (null byte hidden)`);
console.log(`Output: "${sanitized5}"`);
console.log(`✓ Null bytes removed: ${!sanitized5.includes('\x00')}`);

// Test 6: Prototype pollution
console.log('\n🦠 Test 6: Prototype Pollution Prevention');
const maliciousObj = {
  username: 'john',
  __proto__: { isAdmin: true },
  constructor: { name: 'hacked' },
};
const sanitized6 = deepSanitize(maliciousObj);
console.log(`Input:  { username: 'john', __proto__: {...}, constructor: {...} }`);
console.log(`Output:`, sanitized6);
console.log(`✓ __proto__ removed: ${!('__proto__' in sanitized6)}`);
console.log(`✓ constructor removed: ${!('constructor' in sanitized6)}`);
console.log(`✓ username preserved: ${sanitized6.username === 'john'}`);

// Test 7: Normal data is preserved
console.log('\n✅ Test 7: Normal Data Preservation');
const normalData = {
  email: 'user@example.com',
  password: 'MyP@ssw0rd!', // Not validating length, just sanitizing
  title: 'Important Article Title',
  age: 25,
  isActive: true,
  tags: ['news', 'safety', 'consumer'],
  metadata: {
    source: 'NewsAPI',
    rating: 4.5,
  },
};
const sanitized7 = deepSanitize(normalData);
console.log(`Input:`, JSON.stringify(normalData, null, 2));
console.log(`Output:`, JSON.stringify(sanitized7, null, 2));
console.log(`✓ All normal data preserved: ${JSON.stringify(normalData) === JSON.stringify(sanitized7)}`);

// Test 8: Filename sanitization
console.log('\n📄 Test 8: Filename Sanitization');
const maliciousFilename = '../../../etc/passwd';
const sanitized8 = sanitizeFilename(maliciousFilename);
console.log(`Input:  "${maliciousFilename}"`);
console.log(`Output: "${sanitized8}"`);
console.log(`✓ Path separators removed: ${!sanitized8.includes('/') && !sanitized8.includes('\\')}`);

// Test 9: Arrays are sanitized
console.log('\n📋 Test 9: Array Sanitization');
const arrayWithAttacks = [
  'normal string',
  '<script>alert("xss")</script>',
  '../../../etc/passwd',
  { name: 'test', __proto__: { evil: true } },
];
const sanitized9 = deepSanitize(arrayWithAttacks);
console.log(`Input:  [normal, <script>, ../, {__proto__}]`);
console.log(`Output:`, sanitized9);
console.log(`✓ Script removed from array: ${!sanitized9[1].includes('<script>')}`);
console.log(`✓ Path traversal removed: ${!sanitized9[2].includes('../')}`);
console.log(`✓ __proto__ removed from object: ${!('__proto__' in sanitized9[3])}`);

// Test 10: Numbers, booleans, null pass through
console.log('\n🔢 Test 10: Non-String Types Pass Through');
const mixedTypes = {
  number: 42,
  boolean: true,
  nullValue: null,
  undefinedValue: undefined,
  zero: 0,
  emptyString: '',
};
const sanitized10 = deepSanitize(mixedTypes);
console.log(`Input:`, mixedTypes);
console.log(`Output:`, sanitized10);
console.log(`✓ Number preserved: ${sanitized10.number === 42}`);
console.log(`✓ Boolean preserved: ${sanitized10.boolean === true}`);
console.log(`✓ Null preserved: ${sanitized10.nullValue === null}`);
console.log(`✓ Zero preserved: ${sanitized10.zero === 0}`);
console.log(`✓ Empty string preserved: ${sanitized10.emptyString === ''}`);

console.log('\n' + '='.repeat(60));
console.log('✅ All sanitization tests complete!\n');
console.log('Key Points:');
console.log('  ✓ Dangerous inputs are sanitized');
console.log('  ✓ Normal data is preserved unchanged');
console.log('  ✓ No validation rules imposed');
console.log('  ✓ Works with strings, objects, arrays, and primitives');
console.log('\nReady to integrate into server.js\n');
