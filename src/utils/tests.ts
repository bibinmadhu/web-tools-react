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
import {
  createSamplePdf,
  getPdfMetadata,
  signPdfDocument,
  calculateBoxPosition,
  computeSignatureBoxMetrics,
  parsePageRange,
  resolveTargetPageNumbers,
  getDefaultSignatureDate,
  formatSignatureDate,
} from './pdfSigner';
import { convertPdfDocument, extractPdfContent } from './pdfConverter';
import { formatJavaCode, sampleUnformattedJavaCode } from './javaFormatter';
import { parseCurlCommand, tokenizeCurlCommand } from './curlParser';
import { generatePythonCode, generateTypeScriptCode } from './curlToCode';
import { flattenCurlCommand, beautifyCurlCommand, normalizeSmartChars } from './curlFlattener';
import {
  calculateInvoiceTotals,
  formatInvoiceCurrency,
  createDefaultInvoice,
  generateInvoicePdf,
  SAMPLE_INVOICES,
  POPULAR_CURRENCIES,
} from './invoiceGenerator';
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
    assertEqual(meta.pageCount, 3, 'Sample PDF should have 3 pages');
    assertTrue(meta.pagesDimensions[0].width > 0, 'Page width should be positive');
  });

  await testAsync('PDF Signer', 'Embeds signature image and metadata across all pages or selected pages', async () => {
    const pdfBytes = await createSamplePdf();

    // 1x1 transparent PNG data url
    const dummyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSU5ErkJggg==';

    // Test signing first page
    const signedFirstPage = await signPdfDocument({
      pdfBuffer: pdfBytes,
      signatureDataUrl: dummyPng,
      pagesToSign: 'first',
      position: 'bottom-right',
      printedName: 'Alex Morgan',
      signDate: '2026-08-11',
      signReason: 'Approved',
      showBorder: true,
    });
    assertTrue(signedFirstPage.length > pdfBytes.length, 'Signed first page PDF should have increased byte size');

    // Test signing all pages
    const signedAllPages = await signPdfDocument({
      pdfBuffer: pdfBytes,
      signatureDataUrl: dummyPng,
      pagesToSign: 'all',
      position: 'bottom-center',
      printedName: 'Alex Morgan',
      showBorder: true,
    });
    assertTrue(signedAllPages.length > signedFirstPage.length, 'All-pages signed PDF should embed signature across all 3 pages');

    // Test signing selected pages [1, 3]
    const signedSelected = await signPdfDocument({
      pdfBuffer: pdfBytes,
      signatureDataUrl: dummyPng,
      pagesToSign: 'selected',
      selectedPages: [1, 3],
      position: 'center',
    });
    assertTrue(signedSelected.length > pdfBytes.length, 'Selected pages signed PDF should generate valid bytes');
  });

  test('PDF Signer', 'Parses page ranges and resolves target page numbers correctly', () => {
    const parsedRange = parsePageRange('1-2, 4, 6-7', 10);
    assertEqual(parsedRange.join(','), '1,2,4,6,7', 'Should correctly parse discrete and hyphenated ranges');

    const parsedAll = parsePageRange('all', 5);
    assertEqual(parsedAll.length, 5, 'Should resolve all 5 pages');

    const resolvedAll = resolveTargetPageNumbers('all', 4);
    assertEqual(resolvedAll.join(','), '1,2,3,4', 'resolveTargetPageNumbers all should return all page numbers');

    const resolvedLast = resolveTargetPageNumbers('last', 4);
    assertEqual(resolvedLast.join(','), '4', 'resolveTargetPageNumbers last should return page 4');

    const resolvedCustom = resolveTargetPageNumbers('custom', 4, 3);
    assertEqual(resolvedCustom.join(','), '3', 'resolveTargetPageNumbers custom should return specified page');

    const resolvedSelected = resolveTargetPageNumbers('selected', 5, undefined, [2, 4, 5]);
    assertEqual(resolvedSelected.join(','), '2,4,5', 'resolveTargetPageNumbers selected should return sorted unique list');
  });

  test('PDF Signer', 'Calculates accurate signature metrics & 1:1 UI-PDF coordinate mapping', () => {
    const metrics = computeSignatureBoxMetrics({
      sigWidth: 160,
      sigHeight: 65,
      printedName: 'Alex Morgan',
      signDate: '2026-08-11',
      showBorder: true,
    });

    assertTrue(metrics.totalBoxWidth >= 180, 'Box width should accommodate signature and padding');
    assertTrue(metrics.textLines.length === 2, 'Should compute 2 annotation text lines');

    // Bottom-right position calculation on standard 600x800 page
    const posBR = calculateBoxPosition(600, 800, metrics.totalBoxWidth, metrics.totalBoxHeight, 'bottom-right', 0, 0, 24);
    assertTrue(posBR.pdfX === 600 - metrics.totalBoxWidth - 24, 'PDF X should align with right margin');
    assertTrue(posBR.pdfY === 24, 'PDF Y should align with bottom margin');
    assertTrue(posBR.uiLeftPercent > 50, 'UI Left percentage should be on right half');
    assertTrue(posBR.uiTopPercent > 50, 'UI Top percentage should be on lower half in top-down coordinates');

    // Center position
    const posCenter = calculateBoxPosition(600, 800, metrics.totalBoxWidth, metrics.totalBoxHeight, 'center');
    assertTrue(posCenter.pdfX === (600 - metrics.totalBoxWidth) / 2, 'Center X should be midpoint');
    assertTrue(posCenter.pdfY === (800 - metrics.totalBoxHeight) / 2, 'Center Y should be midpoint');
  });

  test('PDF Signer', 'Supports custom Date of Signature with default current date', () => {
    const todayIso = getDefaultSignatureDate();
    assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(todayIso), 'Default signature date should match YYYY-MM-DD pattern');

    // Test date formatters
    const testDate = '2026-08-22';
    assertEqual(formatSignatureDate(testDate, 'iso'), '2026-08-22', 'ISO format should match');
    assertEqual(formatSignatureDate(testDate, 'long'), 'August 22, 2026', 'Long format should match Month DD, YYYY');
    assertEqual(formatSignatureDate(testDate, 'short-us'), '08/22/2026', 'US format should match MM/DD/YYYY');
    assertEqual(formatSignatureDate(testDate, 'short-eu'), '22/08/2026', 'EU format should match DD/MM/YYYY');

    // Metrics with custom date of signature
    const metricsWithCustomDate = computeSignatureBoxMetrics({
      sigWidth: 160,
      sigHeight: 65,
      signDate: 'August 22, 2026',
      showBorder: true,
    });
    assertTrue(
      metricsWithCustomDate.textLines.some((l) => l.includes('Date: August 22, 2026')),
      'Metrics should include custom Date of Signature text'
    );
  });

  // --- Suite 11: PDF to Docx & Docs Converter ---
  await testAsync('PDF Converter', 'Extracts text content and pages from PDF', async () => {
    const pdfBytes = await createSamplePdf();
    const content = await extractPdfContent(pdfBytes);
    assertEqual(content.pageCount, 3, 'Should extract 3 pages');
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

  // --- Suite 9: cURL Converter & Multi-Target Generator ---
  test('cURL Converter', 'Tokenizes multiline and quoted cURL strings', () => {
    const raw = `curl -X POST "https://api.example.com/v1/users" \\\n  -H "Authorization: Bearer my_token" \\\n  -d '{"name": "DevHub"}'`;
    const tokens = tokenizeCurlCommand(raw);
    assertTrue(tokens.length >= 6, 'Should tokenize multiline curl command');
    assertTrue(tokens.includes('-X'), 'Should include method flag');
    assertTrue(tokens.includes('POST'), 'Should include POST token');
  });

  test('cURL Converter', 'Parses GET request with query params & headers', () => {
    const raw = `curl -X GET "https://api.github.com/users/octocat/repos?sort=updated&per_page=10" -H "Accept: application/json" -H "Authorization: Bearer token123"`;
    const parsed = parseCurlCommand(raw);
    assertEqual(parsed.method, 'GET', 'Method should be GET');
    assertEqual(parsed.queryParams['sort'], 'updated', 'Should parse sort query param');
    assertEqual(parsed.queryParams['per_page'], '10', 'Should parse per_page query param');
    assertEqual(parsed.headers['Accept'], 'application/json', 'Should parse Accept header');
    assertEqual(parsed.auth?.type, 'bearer', 'Should detect bearer token');
    assertEqual(parsed.auth?.token, 'token123', 'Should extract token value');
  });

  test('cURL Converter', 'Parses POST with JSON payload & Basic Auth', () => {
    const raw = `curl -X POST "https://api.example.com/v1/items" -u "admin:secret123" -H "Content-Type: application/json" -d '{"title": "Item 1", "price": 99.5}'`;
    const parsed = parseCurlCommand(raw);
    assertEqual(parsed.method, 'POST', 'Method should be POST');
    assertEqual(parsed.auth?.type, 'basic', 'Auth should be basic');
    assertEqual(parsed.auth?.username, 'admin', 'Username should be admin');
    assertEqual(parsed.auth?.password, 'secret123', 'Password should be secret123');
    assertEqual(parsed.body?.type, 'json', 'Body type should be json');
    assertEqual(parsed.body?.jsonData?.title, 'Item 1', 'JSON field title should match');
  });

  test('cURL Converter', 'Parses PUT, PATCH, DELETE, and Multipart operations', () => {
    const patchRaw = `curl -X PATCH "https://api.example.com/v1/orders/123" -d '{"status": "shipped"}' -H "Content-Type: application/json"`;
    const patchParsed = parseCurlCommand(patchRaw);
    assertEqual(patchParsed.method, 'PATCH', 'Method should be PATCH');

    const delRaw = `curl -X DELETE "https://api.example.com/v1/items/456"`;
    const delParsed = parseCurlCommand(delRaw);
    assertEqual(delParsed.method, 'DELETE', 'Method should be DELETE');

    const multiRaw = `curl -X POST "https://api.example.com/upload" -F "description=My file" -F "file=@./doc.pdf;type=application/pdf"`;
    const multiParsed = parseCurlCommand(multiRaw);
    assertEqual(multiParsed.body?.type, 'multipart', 'Body type should be multipart');
    assertEqual(multiParsed.body?.formData?.description, 'My file', 'Form field should match');
  });

  test('cURL Converter', 'Generates valid Python requests & httpx scripts with Python booleans True/False', () => {
    const parsed = parseCurlCommand(`curl -X POST "https://api.example.com/data" -H "Content-Type: application/json" -d '{"active": true, "disabled": false, "empty": null, "nested": {"flag": true}}'`);
    const pyRequests = generatePythonCode(parsed, 'requests');
    assertTrue(pyRequests.includes('import requests'), 'Should import requests');
    assertTrue(pyRequests.includes('requests.post'), 'Should call requests.post');
    assertTrue(pyRequests.includes('"active": True'), 'Python requests payload should use True instead of true');
    assertTrue(pyRequests.includes('"disabled": False'), 'Python requests payload should use False instead of false');
    assertTrue(pyRequests.includes('"empty": None'), 'Python requests payload should use None instead of null');
    assertTrue(!pyRequests.includes(': true'), 'Python code must not contain : true');
    assertTrue(!pyRequests.includes(': false'), 'Python code must not contain : false');
    assertTrue(!pyRequests.includes(': null'), 'Python code must not contain : null');

    const pyHttpx = generatePythonCode(parsed, 'httpx_async');
    assertTrue(pyHttpx.includes('import httpx'), 'Should import httpx');
    assertTrue(pyHttpx.includes('async with httpx.AsyncClient('), 'Should use async client context');
    assertTrue(pyHttpx.includes('"active": True'), 'Python httpx payload should use True');
    assertTrue(pyHttpx.includes('"disabled": False'), 'Python httpx payload should use False');

    const pyAiohttp = generatePythonCode(parsed, 'aiohttp');
    assertTrue(pyAiohttp.includes('"active": True'), 'Python aiohttp payload should use True');
    assertTrue(pyAiohttp.includes('"disabled": False'), 'Python aiohttp payload should use False');

    const pyUrllib = generatePythonCode(parsed, 'urllib');
    assertTrue(pyUrllib.includes('"active": True'), 'Python urllib payload should use True');
    assertTrue(pyUrllib.includes('"disabled": False'), 'Python urllib payload should use False');
  });

  test('cURL Converter', 'Generates valid TypeScript fetch & axios scripts', () => {
    const parsed = parseCurlCommand(`curl -X PUT "https://api.example.com/resource/789?active=true" -H "Content-Type: application/json" -d '{"active": true}'`);
    const tsFetch = generateTypeScriptCode(parsed, 'fetch');
    assertTrue(tsFetch.includes('await fetch('), 'Should call fetch');
    assertTrue(tsFetch.includes("method: 'PUT'"), 'Should set PUT method');
    assertTrue(tsFetch.includes('export interface RequestPayload'), 'Should generate TypeScript interface');

    const tsAxios = generateTypeScriptCode(parsed, 'axios');
    assertTrue(tsAxios.includes("import axios, { AxiosRequestConfig"), 'Should import axios');
    assertTrue(tsAxios.includes("method: 'put'"), 'Should set method');
  });

  // --- Suite 10: cURL Single-Line Formatter & Flattener ---
  test('cURL Formatter', 'Removes trailing backslashes & newlines into a single line', () => {
    const raw = `curl -X POST "https://api.example.com/v1/users" \\
  -H "Authorization: Bearer token123" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Alice"}'`;
    const { singleLine, stats } = flattenCurlCommand(raw);
    assertEqual(singleLine.split('\n').length, 1, 'Should output strictly 1 line');
    assertTrue(!singleLine.includes('\\'), 'Should not contain trailing backslashes');
    assertTrue(singleLine.includes('-H "Authorization: Bearer token123"'), 'Should preserve headers');
    assertEqual(stats.backslashesRemoved, 3, 'Should count 3 removed backslashes');
  });

  test('cURL Formatter', 'Handles trailing spaces after backslash and CRLF newlines', () => {
    const raw = `curl "https://api.example.com" \\   \r\n  -H "Accept: application/json" \\ \t\r\n  -d "test"`;
    const { singleLine } = flattenCurlCommand(raw);
    assertEqual(singleLine.split('\n').length, 1, 'Should eliminate CRLF with trailing spaces');
    assertTrue(!singleLine.includes('\\'), 'Should remove backslashes with trailing whitespace');
    assertTrue(singleLine.includes('-H "Accept: application/json"'), 'Should keep flags properly formatted');
  });

  test('cURL Formatter', 'Removes Windows CMD carets (^) and PowerShell backticks (`)', () => {
    const cmdRaw = `curl.exe -X POST "https://api.example.com" ^\n  -H "Content-Type: application/json" ^\n  -d "{}"`;
    const { singleLine: cmdOut, stats: cmdStats } = flattenCurlCommand(cmdRaw);
    assertEqual(cmdOut.split('\n').length, 1, 'CMD output should be 1 line');
    assertTrue(!cmdOut.includes('^'), 'Should remove CMD carets');
    assertEqual(cmdStats.caretsRemoved, 2, 'Should count 2 removed carets');

    const psRaw = `curl.exe -X POST 'https://api.example.com' \`\n  -H 'Content-Type: application/json' \`\n  -d '{}'`;
    const { singleLine: psOut, stats: psStats } = flattenCurlCommand(psRaw);
    assertEqual(psOut.split('\n').length, 1, 'PS output should be 1 line');
    assertTrue(!psOut.includes('`'), 'Should remove PS backticks');
    assertEqual(psStats.backticksRemoved, 2, 'Should count 2 removed backticks');
  });

  test('cURL Formatter', 'Strips shell comments and compacts multiline JSON payloads', () => {
    const raw = `# First line comment
# Setup request
curl -X POST "https://api.example.com/data" \\
  -H "Content-Type: application/json" \\
  # inline comment line
  -d '{
    "user": "alex",
    "role": "admin",
    "active": true
  }'`;
    const { singleLine, stats } = flattenCurlCommand(raw, { minifyJsonPayloads: true, stripComments: true });
    assertEqual(singleLine.split('\n').length, 1, 'Should output single line with no comments');
    assertTrue(!singleLine.includes('#'), 'Should strip all comments');
    assertTrue(singleLine.includes('{"user":"alex","role":"admin","active":true}'), 'Should minify JSON body');
    assertTrue(stats.commentsStripped >= 3, 'Should track stripped comments count');
  });

  test('cURL Formatter', 'Normalizes smart quotes and em-dashes from documentation', () => {
    const raw = `curl —X POST “https://api.example.com” —H ‘Accept: application/json’`;
    const { singleLine } = flattenCurlCommand(raw, { normalizeSmartQuotes: true, normalizeSmartDashes: true });
    assertTrue(singleLine.includes('-X POST "https://api.example.com"'), 'Should replace em-dash and curly double quotes');
    assertTrue(singleLine.includes("-H 'Accept: application/json'"), 'Should replace em-dash and curly single quotes');
  });

  test('cURL Formatter', 'Converts to Windows CMD escaped quotes and beautifies to multiline', () => {
    const raw = `curl -X POST "https://api.example.com" -H "Content-Type: application/json" -d '{"key": "val"}'`;
    const { singleLine: cmdLine } = flattenCurlCommand(raw, { targetShell: 'cmd' });
    assertTrue(cmdLine.includes('curl.exe'), 'Should ensure curl.exe prefix for CMD');
    assertTrue(cmdLine.includes('-d "{\\"key\\": \\"val\\"}"'), 'Should escape internal double quotes for CMD');

    const beautified = beautifyCurlCommand(raw, { continuationChar: '\\', indentSize: 2 });
    assertTrue(beautified.split('\n').length >= 3, 'Beautified output should have multiple lines');
    assertTrue(beautified.includes('\\\n'), 'Should include backslash line continuations');
  });

  // --- Suite 15: Invoice Generator Engine ---
  test('Invoice Generator', 'Calculates subtotal, discounts, taxes and balances correctly', () => {
    const inv = createDefaultInvoice();
    // Set explicit numbers for predictable verification
    inv.lineItems = [
      { id: '1', description: 'Web Development', quantity: 10, unitPrice: 100, discountPercent: 10 }, // 1000 - 100 = 900
      { id: '2', description: 'Cloud Setup', quantity: 2, unitPrice: 300, discountPercent: 0 },         // 600
    ];
    inv.globalDiscountType = 'percent';
    inv.globalDiscountValue = 10; // 10% on 1500 = 150 -> net = 1350
    inv.taxMode = 'exclusive';
    inv.defaultTaxRate = 20; // 20% on 1350 = 270
    inv.shippingFee = 50;
    inv.extraFeeAmount = 25;
    inv.enableWithholdingTax = true;
    inv.withholdingTaxRate = 5; // 5% of 1350 = 67.5
    inv.amountPaid = 500;

    const totals = calculateInvoiceTotals(inv);
    assertEqual(totals.subtotal, 1600, 'Subtotal should be 1600');
    assertEqual(totals.totalItemDiscount, 100, 'Item discount should be 100');
    assertEqual(totals.globalDiscountAmount, 150, 'Global discount should be 150 (10% of 1500)');
    assertEqual(totals.netTaxableAmount, 1350, 'Net taxable should be 1350');
    assertEqual(totals.primaryTaxAmount, 270, '20% VAT should be 270');
    assertEqual(totals.shippingFee, 50, 'Shipping fee should be 50');
    assertEqual(totals.extraFeeAmount, 25, 'Extra fee should be 25');
    assertEqual(totals.grandTotal, 1695, 'Grand total = 1350 + 270 + 50 + 25 = 1695');
    assertEqual(totals.withholdingTaxAmount, 67.5, '5% withholding tax = 67.5');
    // Balance due = (1695 - 67.5) - 500 = 1127.5
    assertEqual(totals.balanceDue, 1127.5, 'Balance due should be 1127.5');
  });

  test('Invoice Generator', 'Calculates tax-inclusive pricing correctly', () => {
    const inv = createDefaultInvoice();
    inv.lineItems = [
      { id: '1', description: 'Product Sale', quantity: 1, unitPrice: 120, discountPercent: 0 },
    ];
    inv.taxMode = 'inclusive';
    inv.defaultTaxRate = 20; // Price 120 includes 20% tax -> base = 100, tax = 20
    inv.shippingFee = 0;
    inv.extraFeeAmount = 0;
    inv.globalDiscountValue = 0;
    inv.amountPaid = 0;

    const totals = calculateInvoiceTotals(inv);
    assertEqual(totals.subtotal, 120, 'Subtotal should be 120');
    assertEqual(totals.netTaxableAmount, 100, 'Base taxable amount should be 100 for 120 inclusive 20%');
    assertEqual(totals.primaryTaxAmount, 20, 'Included tax should be 20');
    assertEqual(totals.grandTotal, 120, 'Grand total should remain 120 in inclusive mode');
  });

  test('Invoice Generator', 'Supports dual taxes such as CGST + SGST or State + Federal', () => {
    const inv = createDefaultInvoice();
    inv.lineItems = [
      { id: '1', description: 'Service Job', quantity: 1, unitPrice: 1000, discountPercent: 0 },
    ];
    inv.taxMode = 'exclusive';
    inv.defaultTaxLabel = 'CGST';
    inv.defaultTaxRate = 9;
    inv.enableSecondTax = true;
    inv.secondTaxLabel = 'SGST';
    inv.secondTaxRate = 9;
    inv.globalDiscountValue = 0;

    const totals = calculateInvoiceTotals(inv);
    assertEqual(totals.primaryTaxAmount, 90, 'CGST 9% of 1000 = 90');
    assertEqual(totals.secondTaxAmount, 90, 'SGST 9% of 1000 = 90');
    assertEqual(totals.totalTax, 180, 'Total tax should be 180');
    assertEqual(totals.grandTotal, 1180, 'Grand total should be 1180');
  });

  test('Invoice Generator', 'Formats multi-currency amounts with prefix, suffix and decimal precision', () => {
    const usd = POPULAR_CURRENCIES.find((c) => c.code === 'USD')!;
    const eur = POPULAR_CURRENCIES.find((c) => c.code === 'EUR')!;
    const jpy = POPULAR_CURRENCIES.find((c) => c.code === 'JPY')!;

    assertEqual(formatInvoiceCurrency(1250.5, usd), '$1,250.50', 'USD should format with leading symbol and 2 decimals');
    assertEqual(formatInvoiceCurrency(1250.5, eur), '1,250.50 €', 'EUR should format with trailing symbol and 2 decimals');
    assertEqual(formatInvoiceCurrency(1250, jpy), '¥1,250', 'JPY should format with 0 decimals');
  });

  await testAsync('Invoice Generator', 'Generates valid downloadable vector PDF document', async () => {
    const sampleInv = createDefaultInvoice();
    const pdfBytes = await generateInvoicePdf(sampleInv);
    assertTrue(pdfBytes.length > 500, 'Generated invoice PDF should contain valid bytes');
    // PDF Magic bytes check (%PDF-)
    const headerStr = String.fromCharCode(...pdfBytes.slice(0, 5));
    assertTrue(headerStr.startsWith('%PDF'), 'PDF document should start with %PDF header');
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
