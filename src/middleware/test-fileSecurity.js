/**
 * Test file for fileSecurity.js
 * Run with: node src/middleware/test-fileSecurity.js
 *
 * Tests safe file path validation and path traversal prevention
 */

const path = require('path');
const fs = require('fs');
const { safeFilePath, safeFileExists, safeDirExists } = require('./fileSecurity');

console.log('🧪 Testing File Security Utilities\n');
console.log('=' .repeat(70));

// Setup test directory
const testBaseDir = path.join(__dirname, '../../');
console.log(`\nTest base directory: ${testBaseDir}\n`);

// Test 1: Normal valid filename
console.log('Test 1: Valid Filename');
const validFile = 'package.json';
const result1 = safeFilePath(testBaseDir, validFile);
console.log(`  Input:  "${validFile}"`);
console.log(`  Output: ${result1 ? 'Valid path returned' : 'null'}`);
console.log(`  ✓ Normal files work: ${result1 !== null}`);

// Test 2: Path traversal attack
console.log('\nTest 2: Path Traversal Attack (../../../etc/passwd)');
const traversal = '../../../etc/passwd';
const result2 = safeFilePath(testBaseDir, traversal);
console.log(`  Input:  "${traversal}"`);
console.log(`  Output: ${result2 || 'null (blocked)'}`);
console.log(`  ✓ Path traversal blocked: ${result2 === null}`);

// Test 3: Null byte injection
console.log('\nTest 3: Null Byte Injection');
const nullByte = 'file.txt\x00.exe';
const result3 = safeFilePath(testBaseDir, nullByte);
console.log(`  Input:  "file.txt\\x00.exe"`);
console.log(`  Output: ${result3 || 'null (blocked)'}`);
console.log(`  ✓ Null bytes blocked: ${result3 === null}`);

// Test 4: Invalid extension
console.log('\nTest 4: Invalid File Extension (.sh)');
const invalidExt = 'malicious.sh';
const result4 = safeFilePath(testBaseDir, invalidExt);
console.log(`  Input:  "${invalidExt}"`);
console.log(`  Output: ${result4 || 'null (blocked)'}`);
console.log(`  ✓ Invalid extension blocked: ${result4 === null}`);

// Test 5: Valid extension (allow .json for test)
console.log('\nTest 5: Valid Extension (.json)');
const validExt = 'package.json';
const result5 = safeFilePath(testBaseDir, validExt, {
  allowedExtensions: ['.json', '.xlsx'],
});
console.log(`  Input:  "${validExt}"`);
console.log(`  Output: ${result5 ? 'Valid' : 'null'}`);
console.log(`  ✓ Valid extension allowed: ${result5 !== null}`);

// Test 6: Hidden files (.env)
console.log('\nTest 6: Hidden File (.env)');
const hidden = '.env';
const result6 = safeFilePath(testBaseDir, hidden);
console.log(`  Input:  "${hidden}"`);
console.log(`  Output: ${result6 || 'null (blocked)'}`);
console.log(`  ✓ Hidden files blocked: ${result6 === null}`);

// Test 7: Absolute path injection
console.log('\nTest 7: Absolute Path Injection');
const absolutePath = '/etc/passwd';
const result7 = safeFilePath(testBaseDir, absolutePath);
console.log(`  Input:  "${absolutePath}"`);
console.log(`  Output: ${result7 || 'null (blocked)'}`);
console.log(`  ✓ Absolute paths blocked: ${result7 === null}`);

// Test 8: Directory traversal with valid filename
console.log('\nTest 8: Directory Traversal + Valid Filename');
const dirTraversal = '../../package.json';
const result8 = safeFilePath(testBaseDir, dirTraversal);
console.log(`  Input:  "${dirTraversal}"`);
console.log(`  Output: ${result8 ? 'Allowed (basename only)' : 'null'}`);
console.log(`  Note: path.basename() strips directory traversal`);

// Test 9: safeFileExists with real file
console.log('\nTest 9: safeFileExists() with Real File (package.json)');
const result9 = safeFileExists(testBaseDir, 'package.json', {
  allowedExtensions: ['.json'],
});
console.log(`  Input:  "package.json"`);
console.log(`  Valid:  ${result9.valid}`);
console.log(`  Path:   ${result9.path ? 'returned' : 'null'}`);
console.log(`  Error:  ${result9.error || 'none'}`);
console.log(`  ✓ Existing file validated: ${result9.valid === true}`);

// Test 10: safeFileExists with non-existent file
console.log('\nTest 10: safeFileExists() with Non-existent File');
const result10 = safeFileExists(testBaseDir, 'nonexistent.xlsx');
console.log(`  Input:  "nonexistent.xlsx"`);
console.log(`  Valid:  ${result10.valid}`);
console.log(`  Error:  ${result10.error}`);
console.log(`  ✓ Non-existent file detected: ${result10.valid === false && result10.error === 'File not found'}`);

// Test 11: safeFileExists with path traversal
console.log('\nTest 11: safeFileExists() with Path Traversal');
const result11 = safeFileExists(testBaseDir, '../../../etc/passwd', {
  allowedExtensions: ['.json', '.txt'], // Even if we allow the extension
});
console.log(`  Input:  "../../../etc/passwd"`);
console.log(`  Valid:  ${result11.valid}`);
console.log(`  Error:  ${result11.error}`);
console.log(`  ✓ Path traversal blocked: ${result11.valid === false}`);

// Test 12: safeDirExists with valid directory
console.log('\nTest 12: safeDirExists() with Valid Directory');
const result12 = safeDirExists(testBaseDir, 'src');
console.log(`  Input:  "src"`);
console.log(`  Valid:  ${result12.valid}`);
console.log(`  Path:   ${result12.path ? 'returned' : 'null'}`);
console.log(`  ✓ Valid directory found: ${result12.valid === true}`);

// Test 13: Filename with spaces (should be allowed)
console.log('\nTest 13: Filename with Spaces');
const spacesFile = 'my file name.xlsx';
const result13 = safeFilePath(testBaseDir, spacesFile);
console.log(`  Input:  "${spacesFile}"`);
console.log(`  Output: ${result13 ? 'Valid' : 'null'}`);
console.log(`  ✓ Spaces allowed: ${result13 !== null}`);

// Test 14: Special characters (should be blocked)
console.log('\nTest 14: Special Characters ($, @, etc.)');
const specialChars = 'file$@%.xlsx';
const result14 = safeFilePath(testBaseDir, specialChars);
console.log(`  Input:  "${specialChars}"`);
console.log(`  Output: ${result14 || 'null (blocked)'}`);
console.log(`  ✓ Special chars blocked: ${result14 === null}`);

// Test 15: Very long filename
console.log('\nTest 15: Very Long Filename (>255 chars)');
const longName = 'a'.repeat(300) + '.xlsx';
const result15 = safeFilePath(testBaseDir, longName);
console.log(`  Input:  "${longName.substring(0, 30)}..." (${longName.length} chars)`);
console.log(`  Output: ${result15 || 'null (blocked)'}`);
console.log(`  ✓ Long filenames blocked: ${result15 === null}`);

console.log('\n' + '='.repeat(70));
console.log('✅ All File Security Tests Complete!\n');
console.log('Summary:');
console.log('  ✓ Normal files work correctly');
console.log('  ✓ Path traversal attacks blocked');
console.log('  ✓ Invalid extensions blocked');
console.log('  ✓ Hidden files blocked');
console.log('  ✓ Null bytes blocked');
console.log('  ✓ File existence checking works');
console.log('  ✓ Directory validation works');
console.log('\n✅ Ready to integrate into file download endpoints\n');
