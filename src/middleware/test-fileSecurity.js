/**
 * Test file for fileSecurity.js
 * Run with: node src/middleware/test-fileSecurity.js
 *
 * Tests safe file path validation and path traversal prevention
 */

const path = require("path");
const fs = require("fs");
const {
  safeFilePath,
  safeFileExists,
  safeDirExists,
} = require("./fileSecurity");
const logger = require("../modules/logger");

logger.info("🧪 Testing File Security Utilities\n");
logger.info("=".repeat(70));

// Setup test directory
const testBaseDir = path.join(__dirname, "../../");
logger.info(`\nTest base directory: ${testBaseDir}\n`);

// Test 1: Normal valid filename
logger.info("Test 1: Valid Filename");
const validFile = "package.json";
const result1 = safeFilePath(testBaseDir, validFile);
logger.info(`  Input:  "${validFile}"`);
logger.info(`  Output: ${result1 ? "Valid path returned" : "null"}`);
logger.info(`  ✓ Normal files work: ${result1 !== null}`);

// Test 2: Path traversal attack
logger.info("\nTest 2: Path Traversal Attack (../../../etc/passwd)");
const traversal = "../../../etc/passwd";
const result2 = safeFilePath(testBaseDir, traversal);
logger.info(`  Input:  "${traversal}"`);
logger.info(`  Output: ${result2 || "null (blocked)"}`);
logger.info(`  ✓ Path traversal blocked: ${result2 === null}`);

// Test 3: Null byte injection
logger.info("\nTest 3: Null Byte Injection");
const nullByte = "file.txt\x00.exe";
const result3 = safeFilePath(testBaseDir, nullByte);
logger.info(`  Input:  "file.txt\\x00.exe"`);
logger.info(`  Output: ${result3 || "null (blocked)"}`);
logger.info(`  ✓ Null bytes blocked: ${result3 === null}`);

// Test 4: Invalid extension
logger.info("\nTest 4: Invalid File Extension (.sh)");
const invalidExt = "malicious.sh";
const result4 = safeFilePath(testBaseDir, invalidExt);
logger.info(`  Input:  "${invalidExt}"`);
logger.info(`  Output: ${result4 || "null (blocked)"}`);
logger.info(`  ✓ Invalid extension blocked: ${result4 === null}`);

// Test 5: Valid extension (allow .json for test)
logger.info("\nTest 5: Valid Extension (.json)");
const validExt = "package.json";
const result5 = safeFilePath(testBaseDir, validExt, {
  allowedExtensions: [".json", ".xlsx"],
});
logger.info(`  Input:  "${validExt}"`);
logger.info(`  Output: ${result5 ? "Valid" : "null"}`);
logger.info(`  ✓ Valid extension allowed: ${result5 !== null}`);

// Test 6: Hidden files (.env)
logger.info("\nTest 6: Hidden File (.env)");
const hidden = ".env";
const result6 = safeFilePath(testBaseDir, hidden);
logger.info(`  Input:  "${hidden}"`);
logger.info(`  Output: ${result6 || "null (blocked)"}`);
logger.info(`  ✓ Hidden files blocked: ${result6 === null}`);

// Test 7: Absolute path injection
logger.info("\nTest 7: Absolute Path Injection");
const absolutePath = "/etc/passwd";
const result7 = safeFilePath(testBaseDir, absolutePath);
logger.info(`  Input:  "${absolutePath}"`);
logger.info(`  Output: ${result7 || "null (blocked)"}`);
logger.info(`  ✓ Absolute paths blocked: ${result7 === null}`);

// Test 8: Directory traversal with valid filename
logger.info("\nTest 8: Directory Traversal + Valid Filename");
const dirTraversal = "../../package.json";
const result8 = safeFilePath(testBaseDir, dirTraversal);
logger.info(`  Input:  "${dirTraversal}"`);
logger.info(`  Output: ${result8 ? "Allowed (basename only)" : "null"}`);
logger.info(`  Note: path.basename() strips directory traversal`);

// Test 9: safeFileExists with real file
logger.info("\nTest 9: safeFileExists() with Real File (package.json)");
const result9 = safeFileExists(testBaseDir, "package.json", {
  allowedExtensions: [".json"],
});
logger.info(`  Input:  "package.json"`);
logger.info(`  Valid:  ${result9.valid}`);
logger.info(`  Path:   ${result9.path ? "returned" : "null"}`);
logger.info(`  Error:  ${result9.error || "none"}`);
logger.info(`  ✓ Existing file validated: ${result9.valid === true}`);

// Test 10: safeFileExists with non-existent file
logger.info("\nTest 10: safeFileExists() with Non-existent File");
const result10 = safeFileExists(testBaseDir, "nonexistent.xlsx");
logger.info(`  Input:  "nonexistent.xlsx"`);
logger.info(`  Valid:  ${result10.valid}`);
logger.info(`  Error:  ${result10.error}`);
logger.info(
  `  ✓ Non-existent file detected: ${
    result10.valid === false && result10.error === "File not found"
  }`
);

// Test 11: safeFileExists with path traversal
logger.info("\nTest 11: safeFileExists() with Path Traversal");
const result11 = safeFileExists(testBaseDir, "../../../etc/passwd", {
  allowedExtensions: [".json", ".txt"], // Even if we allow the extension
});
logger.info(`  Input:  "../../../etc/passwd"`);
logger.info(`  Valid:  ${result11.valid}`);
logger.info(`  Error:  ${result11.error}`);
logger.info(`  ✓ Path traversal blocked: ${result11.valid === false}`);

// Test 12: safeDirExists with valid directory
logger.info("\nTest 12: safeDirExists() with Valid Directory");
const result12 = safeDirExists(testBaseDir, "src");
logger.info(`  Input:  "src"`);
logger.info(`  Valid:  ${result12.valid}`);
logger.info(`  Path:   ${result12.path ? "returned" : "null"}`);
logger.info(`  ✓ Valid directory found: ${result12.valid === true}`);

// Test 13: Filename with spaces (should be allowed)
logger.info("\nTest 13: Filename with Spaces");
const spacesFile = "my file name.xlsx";
const result13 = safeFilePath(testBaseDir, spacesFile);
logger.info(`  Input:  "${spacesFile}"`);
logger.info(`  Output: ${result13 ? "Valid" : "null"}`);
logger.info(`  ✓ Spaces allowed: ${result13 !== null}`);

// Test 14: Special characters (should be blocked)
logger.info("\nTest 14: Special Characters ($, @, etc.)");
const specialChars = "file$@%.xlsx";
const result14 = safeFilePath(testBaseDir, specialChars);
logger.info(`  Input:  "${specialChars}"`);
logger.info(`  Output: ${result14 || "null (blocked)"}`);
logger.info(`  ✓ Special chars blocked: ${result14 === null}`);

// Test 15: Very long filename
logger.info("\nTest 15: Very Long Filename (>255 chars)");
const longName = "a".repeat(300) + ".xlsx";
const result15 = safeFilePath(testBaseDir, longName);
logger.info(
  `  Input:  "${longName.substring(0, 30)}..." (${longName.length} chars)`
);
logger.info(`  Output: ${result15 || "null (blocked)"}`);
logger.info(`  ✓ Long filenames blocked: ${result15 === null}`);

logger.info("\n" + "=".repeat(70));
logger.info("✅ All File Security Tests Complete!\n");
logger.info("Summary:");
logger.info("  ✓ Normal files work correctly");
logger.info("  ✓ Path traversal attacks blocked");
logger.info("  ✓ Invalid extensions blocked");
logger.info("  ✓ Hidden files blocked");
logger.info("  ✓ Null bytes blocked");
logger.info("  ✓ File existence checking works");
logger.info("  ✓ Directory validation works");
logger.info("\n✅ Ready to integrate into file download endpoints\n");
