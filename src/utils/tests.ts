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
import { obfuscateJavaCode, deobfuscateJavaCode } from './javaObfuscator';
import { createSamplePdf, getPdfMetadata, signPdfDocument } from './pdfSigner';
import { convertPdfDocument, extractPdfContent } from './pdfConverter';
import { formatJavaCode, sampleUnformattedJavaCode } from './javaFormatter';
import { TestSuiteSummary, UnitTestResult } from '../types';

export async function runAllUnitTests(): Promise<TestSuiteSummary> {
  const results: UnitTestResult[] = [];
  const startTime = performance.now();

  async function testAsync(suiteName: string, testName: string, fn: () => Promise<void> | void) {
    const start = performance.now();
    try {
      await fn();
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

  // --- Suite 9: Java Code Obfuscator & De-Obfuscator ---
  test('Java Code Obfuscator', 'Obfuscates class, method, variable & custom package names', () => {
    const javaCode = `package com.acme.financial.service;
import java.util.List;
public class PaymentProcessor {
    private double totalAmount;
    public void executePayment(double amount) {
        this.totalAmount = amount * 1.05;
    }
}`;

    const res = obfuscateJavaCode(javaCode, {
      namingStyle: 'alphabetical',
      obfuscateClasses: true,
      obfuscateMethods: true,
      obfuscateVariables: true,
      obfuscatePackages: true,
      preserveGettersSetters: false,
    });

    assertTrue(!res.obfuscatedCode.includes('PaymentProcessor'), 'Class name should be obfuscated');
    assertTrue(!res.obfuscatedCode.includes('executePayment'), 'Method name should be obfuscated');
    assertTrue(res.obfuscatedCode.includes('import java.util.List;'), 'Framework import java.util.List should be preserved');
    assertTrue(res.stats.classesRenamed > 0, 'Class renamed stat should be > 0');
  });

  test('Java Code Obfuscator', 'Preserves main() entry point & framework annotations', () => {
    const javaCode = `package com.example.app;
public class AppRunner {
    public static void main(String[] args) {
        System.out.println("Started");
    }
}`;

    const res = obfuscateJavaCode(javaCode, { preserveMain: true });
    assertTrue(res.obfuscatedCode.includes('public static void main('), 'main() method signature should be preserved');
  });

  test('Java Code Obfuscator', 'Obfuscates class names used in field types and variable declarations', () => {
    const javaCode = `package com.acme.financial.controller;
import com.acme.financial.service.PaymentService;
public class PaymentController {
    private PaymentService paymentService;
}`;

    const res = obfuscateJavaCode(javaCode, {
      obfuscateClasses: true,
      obfuscateVariables: true,
    });

    assertTrue(!res.obfuscatedCode.includes('PaymentService'), 'Field class type PaymentService should be obfuscated');
    assertTrue(!res.obfuscatedCode.includes('paymentService'), 'Field variable paymentService should be obfuscated');
    assertTrue(Boolean(res.mapping.classes['PaymentService']), 'PaymentService mapping should exist in classes');
    assertTrue(Boolean(res.mapping.variables['paymentService']), 'paymentService mapping should exist in variables');
  });

  test('Java Code Obfuscator & De-Obfuscator', 'Round-trip obfuscation and de-obfuscation', () => {
    const sampleCode = `package com.acme.service;
public class OrderService {
    public void processOrder(String orderId) {
        System.out.println("Processing " + orderId);
    }
}`;

    const obfRes = obfuscateJavaCode(sampleCode);
    const restoredCode = deobfuscateJavaCode(obfRes.obfuscatedCode, obfRes.mapping);

    assertTrue(restoredCode.includes('OrderService'), 'De-obfuscation should restore original Class name');
    assertTrue(restoredCode.includes('processOrder'), 'De-obfuscation should restore original Method name');
    assertTrue(restoredCode.includes('com.acme.service'), 'De-obfuscation should restore original package name');
  });

  test('Java Code Obfuscator & De-Obfuscator', 'De-obfuscates stack traces and supports flat dictionary mappings', () => {
    const stackTrace = `java.lang.NullPointerException: Cannot invoke paymentService because it is null
    at com.a.a.A.a(A.java:24)
    at com.a.b.B.main(B.java:15)`;

    const flatMapping = {
      'com.a.a': 'com.acme.financial.controller',
      'com.a.b': 'com.acme.financial.service',
      'A': 'PaymentController',
      'B': 'PaymentService',
      'a': 'executePayment',
    };

    const deobfuscated = deobfuscateJavaCode(stackTrace, flatMapping);

    assertTrue(deobfuscated.includes('com.acme.financial.controller.PaymentController.executePayment(PaymentController.java:24)'), 'Stack trace should be de-obfuscated accurately');
    assertTrue(deobfuscated.includes('com.acme.financial.service.PaymentService.main(PaymentService.java:15)'), 'Package and class in stack trace should be restored');
  });

  // --- Suite 10: PDF Signer & Annotator ---
  await testAsync('PDF Signer', 'Generates sample PDF & parses page metadata', async () => {
    const pdfBytes = await createSamplePdf();
    assertTrue(pdfBytes.length > 100, 'Sample PDF should generate valid bytes');

    const meta = await getPdfMetadata(pdfBytes);
    assertEqual(meta.pageCount, 2, 'Sample PDF should have 2 pages');
    assertTrue(meta.pagesDimensions[0].width > 0, 'Page width should be positive');
  });

  await testAsync('PDF Signer', 'Embeds signature image and metadata onto PDF', async () => {
    const pdfBytes = await createSamplePdf();

    // 1x1 transparent PNG data url
    const dummyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSU5ErkJggg==';

    const signedBytes = await signPdfDocument({
      pdfBuffer: pdfBytes,
      signatureDataUrl: dummyPng,
      pagesToSign: 'first',
      position: 'bottom-right',
      printedName: 'Alex Morgan',
      signDate: '2026-08-11',
      signReason: 'Approved',
      showBorder: true,
    });

    assertTrue(signedBytes.length > pdfBytes.length, 'Signed PDF byte length should increase after embedding signature & metadata');
  });

  // --- Suite 11: PDF to Docx & Docs Converter ---
  await testAsync('PDF Converter', 'Extracts text content and pages from PDF', async () => {
    const pdfBytes = await createSamplePdf();
    const content = await extractPdfContent(pdfBytes);
    assertEqual(content.pageCount, 2, 'Should extract 2 pages');
    assertTrue(content.fullText.length > 50, 'Full text should contain extracted lines');
  });

  await testAsync('PDF Converter', 'Converts PDF to Word (.docx) format blob', async () => {
    const pdfBytes = await createSamplePdf();
    const res = await convertPdfDocument({
      pdfBuffer: pdfBytes,
      targetFormat: 'docx',
      title: 'Agreement_Test',
      author: 'Test Suite',
      fontFamily: 'Calibri',
    });

    assertTrue(res.blob.size > 500, 'Docx blob should be generated with valid binary length');
    assertTrue(res.filename.endsWith('.docx'), 'Filename should have .docx extension');
  });

  await testAsync('PDF Converter', 'Converts PDF to HTML, TXT, ODT, RTF & EPUB formats', async () => {
    const pdfBytes = await createSamplePdf();

    const txtRes = await convertPdfDocument({ pdfBuffer: pdfBytes, targetFormat: 'txt', title: 'Test' });
    assertTrue(txtRes.filename.endsWith('.txt'), 'Should output .txt filename');

    const htmlRes = await convertPdfDocument({ pdfBuffer: pdfBytes, targetFormat: 'html', title: 'Test' });
    assertTrue(htmlRes.filename.endsWith('.html'), 'Should output .html filename');

    const odtRes = await convertPdfDocument({ pdfBuffer: pdfBytes, targetFormat: 'odt', title: 'Test' });
    assertTrue(odtRes.blob.size > 200, 'ODT zip blob should have valid size');

    const epubRes = await convertPdfDocument({ pdfBuffer: pdfBytes, targetFormat: 'epub', title: 'Test' });
    assertTrue(epubRes.blob.size > 200, 'EPUB zip blob should have valid size');
  });

  // --- Suite 12: Java Code Formatter ---
  test('Java Formatter', 'Formats raw Java code with Google Java Style', () => {
    const formatted = formatJavaCode(sampleUnformattedJavaCode, {
      indentType: 'spaces',
      indentSize: 2,
      braceStyle: 'same-line',
      sortImports: true,
      groupImports: true,
      removeDuplicateImports: true,
      spaceBeforeControlParentheses: true,
      spaceAroundOperators: true,
      spaceInsideParentheses: false,
      spaceAfterComma: true,
      breakMultipleStatements: true,
      breakInlineBraces: true,
      breakAnnotations: true,
      maxConsecutiveBlankLines: 1,
      blankLinesBetweenMethods: 1,
      normalizeModifiers: true,
      alignSingleLineComments: false,
      trimTrailingWhitespace: true,
      ensureFinalNewline: true,
    });

    assertTrue(formatted.includes('  public UserService'), 'Indentation should use 2 spaces');
    assertTrue(formatted.includes('public static final User findUserById'), 'Modifiers should be normalized');
    assertTrue(!formatted.includes('import java.util.List; // duplicate'), 'Duplicate imports should be removed');
  });

  test('Java Formatter', 'Splits compressed single-line Java code into readable statements with proper indents', () => {
    const compressed = 'public class Test { public void run() { int a=1; int b=2; if(a<b){ System.out.println("Hello"); } } }';
    const formatted = formatJavaCode(compressed, {
      indentType: 'spaces',
      indentSize: 4,
      braceStyle: 'same-line',
      sortImports: true,
      groupImports: true,
      removeDuplicateImports: true,
      spaceBeforeControlParentheses: true,
      spaceAroundOperators: true,
      spaceInsideParentheses: false,
      spaceAfterComma: true,
      breakMultipleStatements: true,
      breakInlineBraces: true,
      breakAnnotations: true,
      maxConsecutiveBlankLines: 1,
      blankLinesBetweenMethods: 1,
      normalizeModifiers: true,
      alignSingleLineComments: false,
      trimTrailingWhitespace: true,
      ensureFinalNewline: true,
    });

    assertTrue(formatted.includes('    int a = 1;'), 'Should break statements and indent correctly (4 spaces)');
    assertTrue(formatted.includes('    int b = 2;'), 'Should place second statement on a new line with 4 space indent');
    assertTrue(formatted.includes('        System.out.println("Hello");'), 'Should indent nested statements inside if block (8 spaces)');
  });

  test('Java Formatter', 'Formats Java code with Allman (next-line) brace style', () => {
    const formatted = formatJavaCode(sampleUnformattedJavaCode, {
      indentType: 'spaces',
      indentSize: 4,
      braceStyle: 'next-line',
      sortImports: true,
      groupImports: false,
      removeDuplicateImports: true,
      spaceBeforeControlParentheses: true,
      spaceAroundOperators: true,
      spaceInsideParentheses: false,
      spaceAfterComma: true,
      breakMultipleStatements: true,
      breakInlineBraces: true,
      breakAnnotations: true,
      maxConsecutiveBlankLines: 1,
      blankLinesBetweenMethods: 1,
      normalizeModifiers: true,
      alignSingleLineComments: false,
      trimTrailingWhitespace: true,
      ensureFinalNewline: true,
    });

    assertTrue(formatted.includes('{\n'), 'Braces should be placed on separate lines in Allman style');
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
