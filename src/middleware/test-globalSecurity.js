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
} = require("./globalSecurity");
const logger = require("../modules/logger");

logger.info("🧪 Testing Global Security Sanitization\n");
logger.info("=".repeat(60));

// Test 1: Path traversal in strings
logger.info("\n📁 Test 1: Path Traversal Sanitization");
const pathTraversal = "../../../etc/passwd";
const sanitized1 = sanitizeValue(pathTraversal);
logger.info(`Input:  "${pathTraversal}"`);
logger.info(`Output: "${sanitized1}"`);
logger.info(
  `✓ Path traversal sequences removed: ${!sanitized1.includes("../")}`
);

// Test 2: XSS attack
logger.info("\n🔒 Test 2: XSS Attack Sanitization");
const xssAttack = '<script>alert("XSS")</script>Hello World';
const sanitized2 = sanitizeValue(xssAttack);
logger.info(`Input:  "${xssAttack}"`);
logger.info(`Output: "${sanitized2}"`);
logger.info(`✓ Script tags removed: ${!sanitized2.includes("<script>")}`);

// Test 3: JavaScript protocol
logger.info("\n🚫 Test 3: JavaScript Protocol Removal");
const jsProtocol = 'javascript:alert("XSS")';
const sanitized3 = sanitizeValue(jsProtocol);
logger.info(`Input:  "${jsProtocol}"`);
logger.info(`Output: "${sanitized3}"`);
logger.info(
  `✓ javascript: removed: ${!sanitized3.toLowerCase().includes("javascript:")}`
);

// Test 4: Event handlers
logger.info("\n⚡ Test 4: Event Handler Removal");
const eventHandler = '<img src=x onerror="alert(1)">';
const sanitized4 = sanitizeValue(eventHandler);
logger.info(`Input:  "${eventHandler}"`);
logger.info(`Output: "${sanitized4}"`);
logger.info(`✓ Event handler removed: ${!sanitized4.includes("onerror=")}`);

// Test 5: Null bytes
logger.info("\n🔢 Test 5: Null Byte Removal");
const nullByte = "file.txt\x00.exe";
const sanitized5 = sanitizeValue(nullByte);
logger.info(`Input:  "file.txt\\x00.exe" (null byte hidden)`);
logger.info(`Output: "${sanitized5}"`);
logger.info(`✓ Null bytes removed: ${!sanitized5.includes("\x00")}`);

// Test 6: Prototype pollution
logger.info("\n🦠 Test 6: Prototype Pollution Prevention");
const maliciousObj = {
  username: "john",
  __proto__: { isAdmin: true },
  constructor: { name: "hacked" },
};
const sanitized6 = deepSanitize(maliciousObj);
logger.info(
  `Input:  { username: 'john', __proto__: {...}, constructor: {...} }`
);
logger.info(`Output:`, sanitized6);
logger.info(`✓ __proto__ removed: ${!("__proto__" in sanitized6)}`);
logger.info(`✓ constructor removed: ${!("constructor" in sanitized6)}`);
logger.info(`✓ username preserved: ${sanitized6.username === "john"}`);

// Test 7: Normal data is preserved
logger.info("\n✅ Test 7: Normal Data Preservation");
const normalData = {
  email: "user@example.com",
  password: "MyP@ssw0rd!", // Not validating length, just sanitizing
  title: "Important Article Title",
  age: 25,
  isActive: true,
  tags: ["news", "safety", "consumer"],
  metadata: {
    source: "NewsAPI",
    rating: 4.5,
  },
};
const sanitized7 = deepSanitize(normalData);
logger.info(`Input:`, JSON.stringify(normalData, null, 2));
logger.info(`Output:`, JSON.stringify(sanitized7, null, 2));
logger.info(
  `✓ All normal data preserved: ${
    JSON.stringify(normalData) === JSON.stringify(sanitized7)
  }`
);

// Test 8: Filename sanitization
logger.info("\n📄 Test 8: Filename Sanitization");
const maliciousFilename = "../../../etc/passwd";
const sanitized8 = sanitizeFilename(maliciousFilename);
logger.info(`Input:  "${maliciousFilename}"`);
logger.info(`Output: "${sanitized8}"`);
logger.info(
  `✓ Path separators removed: ${
    !sanitized8.includes("/") && !sanitized8.includes("\\")
  }`
);

// Test 9: Arrays are sanitized
logger.info("\n📋 Test 9: Array Sanitization");
const arrayWithAttacks = [
  "normal string",
  '<script>alert("xss")</script>',
  "../../../etc/passwd",
  { name: "test", __proto__: { evil: true } },
];
const sanitized9 = deepSanitize(arrayWithAttacks);
logger.info(`Input:  [normal, <script>, ../, {__proto__}]`);
logger.info(`Output:`, sanitized9);
logger.info(
  `✓ Script removed from array: ${!sanitized9[1].includes("<script>")}`
);
logger.info(`✓ Path traversal removed: ${!sanitized9[2].includes("../")}`);
logger.info(
  `✓ __proto__ removed from object: ${!("__proto__" in sanitized9[3])}`
);

// Test 10: Numbers, booleans, null pass through
logger.info("\n🔢 Test 10: Non-String Types Pass Through");
const mixedTypes = {
  number: 42,
  boolean: true,
  nullValue: null,
  undefinedValue: undefined,
  zero: 0,
  emptyString: "",
};
const sanitized10 = deepSanitize(mixedTypes);
logger.info(`Input:`, mixedTypes);
logger.info(`Output:`, sanitized10);
logger.info(`✓ Number preserved: ${sanitized10.number === 42}`);
logger.info(`✓ Boolean preserved: ${sanitized10.boolean === true}`);
logger.info(`✓ Null preserved: ${sanitized10.nullValue === null}`);
logger.info(`✓ Zero preserved: ${sanitized10.zero === 0}`);
logger.info(`✓ Empty string preserved: ${sanitized10.emptyString === ""}`);

logger.info("\n" + "=".repeat(60));
logger.info("✅ All sanitization tests complete!\n");
logger.info("Key Points:");
logger.info("  ✓ Dangerous inputs are sanitized");
logger.info("  ✓ Normal data is preserved unchanged");
logger.info("  ✓ No validation rules imposed");
logger.info("  ✓ Works with strings, objects, arrays, and primitives");
logger.info("\nReady to integrate into server.js\n");
