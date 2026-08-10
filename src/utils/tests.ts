import {
  beautifyJson,
  obfuscateCode,
  base64Encode,
  base64Decode,
  testRegex,
  decodeJwt,
  convertColor,
  generateUuid,
  parseCron,
} from './toolFunctions';
import { TestSuiteSummary, UnitTestResult } from '../types';

export function runAllUnitTests(): TestSuiteSummary {
  const results: UnitTestResult[] = [];
  const startTime = performance.now();

  function test(suiteName: string, testName: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      results.push({
        suiteName,
        testName,
        status: 'passed',
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      });
    } catch (err: any) {
      results.push({
        suiteName,
        testName,
        status: 'failed',
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        error: err?.message || String(err),
      });
    }
  }

  function assertEqual(actual: any, expected: any, msg?: string) {
    if (actual !== expected) {
      throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function assertTrue(condition: boolean, msg?: string) {
    if (!condition) {
      throw new Error(msg || 'Expected condition to be true');
    }
  }

  // --- Suite 1: JSON Beautifier ---
  test('JSON Beautifier', 'Valid JSON pretty printing', () => {
    const raw = '{"name":"DevHub","version":1}';
    const res = beautifyJson(raw, 2);
    assertTrue(res.isValid, 'Should be valid JSON');
    assertEqual(res.output, '{\n  "name": "DevHub",\n  "version": 1\n}');
  });

  test('JSON Beautifier', 'Handles syntax error gracefully', () => {
    const raw = '{"name": "DevHub"';
    const res = beautifyJson(raw);
    assertTrue(!res.isValid, 'Should mark invalid JSON');
    assertTrue(!!res.error, 'Should contain error message');
  });

  // --- Suite 2: Base64 Converter ---
  test('Base64 Encoder', 'Encodes string to Base64', () => {
    const encoded = base64Encode('Hello DevHub');
    assertEqual(encoded, 'SGVsbG8gRGV2SHVi');
  });

  test('Base64 Decoder', 'Decodes valid Base64 string', () => {
    const res = base64Decode('SGVsbG8gRGV2SHVi');
    assertEqual(res.decoded, 'Hello DevHub');
  });

  test('Base64 Decoder', 'Returns error on invalid payload', () => {
    const res = base64Decode('!!!invalid_b64!!!');
    assertTrue(!!res.error, 'Should report decode error');
  });

  // --- Suite 3: Code Obfuscator ---
  test('Code Obfuscator', 'Strips comments & minifies whitespace', () => {
    const input = '// comment\nfunction test() { return "hello"; }';
    const res = obfuscateCode(input, { compact: true });
    assertTrue(!res.obfuscated.includes('// comment'), 'Should strip comments');
    assertTrue(res.obfuscatedSize < res.originalSize, 'Should reduce byte count');
  });

  test('Code Obfuscator', 'Hex-encodes string literals when option set', () => {
    const input = 'const title = "DevHub";';
    const res = obfuscateCode(input, { hexEncodeStrings: true });
    assertTrue(res.obfuscated.includes('\\x'), 'Should contain hex string escapes');
  });

  // --- Suite 4: Regex Tester ---
  test('Regex Tester', 'Matches email pattern accurately', () => {
    const text = 'Contact support@devhub.io or admin@test.com';
    const pattern = '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
    const res = testRegex(pattern, 'g', text);
    assertEqual(res.matches.length, 2);
    assertEqual(res.matches[0].match, 'support@devhub.io');
    assertEqual(res.matches[1].match, 'admin@test.com');
  });

  test('Regex Tester', 'Reports invalid syntax error', () => {
    const res = testRegex('[a-z(', 'g', 'sample');
    assertTrue(!!res.error, 'Should catch regex syntax error');
  });

  // --- Suite 5: JWT Decoder ---
  test('JWT Decoder', 'Parses valid token header & payload', () => {
    const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldkh1YiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const res = decodeJwt(sampleJwt);
    assertEqual(res.header?.alg, 'HS256');
    assertEqual(res.payload?.name, 'DevHub User');
  });

  test('JWT Decoder', 'Fails on malformed JWT string', () => {
    const res = decodeJwt('not.a.jwt.token.extra');
    assertTrue(!!res.error, 'Should return error for invalid dot count');
  });

  // --- Suite 6: Color Converter ---
  test('Color Converter', 'Converts HEX to RGB and HSL', () => {
    const res = convertColor('#3B82F6');
    assertTrue(res.isValid, 'Should be valid HEX');
    assertEqual(res.rgb, 'rgb(59, 130, 246)');
    assertTrue(res.hsl.startsWith('hsl('));
  });

  // --- Suite 7: UUID Generator ---
  test('UUID Generator', 'Generates valid v4 UUID format', () => {
    const uuid = generateUuid();
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assertTrue(regex.test(uuid), 'Should match v4 UUID pattern');
  });

  // --- Suite 8: Cron Parser ---
  test('Cron Expression Parser', 'Translates standard expression', () => {
    assertEqual(parseCron('* * * * *'), 'Every minute');
    assertEqual(parseCron('0 0 * * *'), 'Every day at midnight (00:00)');
    assertEqual(parseCron('*/15 * * * *'), 'Every 15 minutes');
  });

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  return {
    total: results.length,
    passed,
    failed,
    durationMs,
    results,
  };
}
