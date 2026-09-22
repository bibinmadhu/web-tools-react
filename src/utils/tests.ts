import {
  generatePostgresUpdateQuery,
  formatPostgresValue,
  parseCsvOrTsv,
  inferColumnType,
  parseDelimitedValues,
  createDbUpdateConfigExport,
  validateAndParseDbUpdateConfig,
  DB_UPDATE_PRESETS,
} from './dbUpdateQueryGenerator';
import {
  generatePostgresSelectQuery,
  createDbSelectConfigExport,
  validateAndParseDbSelectConfig,
  DB_SELECT_PRESETS,
  stripAliasFromExpression,
  prefixAliasToProjection,
  prefixAliasToOrderBy,
} from './dbSelectQueryGenerator';
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
import { obfuscateDualJavaFiles, deobfuscateDualJavaFiles } from './javaDualObfuscator';
import { JAVA_DUAL_PRESETS } from './javaDualPresets';
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
  exportInvoiceTemplateJson,
  parseInvoiceTemplate,
  createInvoiceTemplateFile,
} from './invoiceGenerator';
import {
  createSampleMarkdownPdf,
  convertPdfToMarkdown,
  calculateMarkdownStats,
  renderMarkdownToHtml,
} from './pdfToMarkdown';
import {
  getDefaultContractorAgreement,
  generateAgreementMarkdown,
  generateAgreementPdf,
  generateAgreementDocx,
  generateAgreementHtml,
  interpolatePlaceholders,
  cleanPdfText,
  wrapText,
  getAgreementCurrency,
  formatAgreementCurrency,
} from './agreementGenerator';
import { getAgreementPresets } from './agreementPresets';
import {
  obfuscateMultipleSets,
  deobfuscateMultipleSets,
  deobfuscateCode,
  MultiObfuscatorOptions,
  DEFAULT_MULTI_OBFUSCATOR_OPTIONS,
} from './multiObfuscator';
import { MULTI_OBFUSCATOR_PRESETS } from './multiObfuscatorPresets';
import {
  formatQrPayload,
  generateQrSvg,
  getQrMatrix,
  DEFAULT_QR_OPTIONS,
} from './qrGenerator';
import {
  generateChainedPythonScript,
  generateTokenExtractionCode,
  prepareSubsequentRequest,
  getHeaderValuePythonExpr,
  DEFAULT_EXTRACTION_CONFIG,
  DEFAULT_INJECTION_CONFIG,
  DEFAULT_OPTIONS,
} from './curlChainConverter';
import { CURL_CHAIN_PRESETS } from './curlChainPresets';
import {
  parseToDataGrid,
  detectDelimiter,
  extractColumnData,
  calculateColumnStats,
  transposeDataGrid,
  deduplicateGridRows,
  sortGridRows,
  filterGridRows,
  exportDataGrid,
  DATA_GRID_PRESETS,
} from './dataGridConverter';
import {
  DEFAULT_MATCHER_CONFIG,
  DEFAULT_SAMPLE_ROWS,
  evaluateLocalRow,
  generatePostgresCategoryQueries,
  generatePg8000PythonScript,
  parseCategoryMetadataInput,
  createMatcherConfigExport,
  validateAndParseMatcherConfig,
  CATEGORY_MATCHER_PRESETS,
} from './dbCategoryMatcher';
import {
  DEFAULT_QUERY_BUILDER_CONFIG,
  generatePostgresQueries,
  parseExcelListInput,
  normalizePostgresDate,
  formatSqlValue,
  createDbQueryBuilderExport,
  validateAndParseDbQueryBuilderConfig,
  QUERY_BUILDER_PRESETS,
} from './dbQueryBuilder';
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

  // --- Suite 9B: Java Class & Test Dual Obfuscator & De-Obfuscator ---
  test('Java Class & Test Dual Obfuscator', 'Synchronized obfuscation of class and test with same mapping keys in same line', () => {
    const mainClass = `package com.acme.ecommerce.service;
public class OrderService {
    public double calculateTotal(double price, int qty) {
        return price * qty;
    }
}`;

    const testClass = `package com.acme.ecommerce.service;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class OrderServiceTest {
    private OrderService orderService = new OrderService();

    @Test
    void testCalculateTotal() {
        double total = orderService.calculateTotal(50.0, 2);
        assertEquals(100.0, total);
    }
}`;

    const res = obfuscateDualJavaFiles({
      mainClassFile: { fileName: 'OrderService.java', code: mainClass },
      testClassFile: { fileName: 'OrderServiceTest.java', code: testClass },
    }, {
      namingStyle: 'alphabetical',
      obfuscateClasses: true,
      obfuscateMethods: true,
      obfuscateVariables: true,
      preserveTestMethods: true,
    });

    const obfOrderService = res.mapping.classes['OrderService'];
    const obfCalculateTotal = res.mapping.methods['calculateTotal'];

    assertTrue(Boolean(obfOrderService), 'OrderService must have a mapped obfuscated class name');
    assertTrue(Boolean(obfCalculateTotal), 'calculateTotal must have a mapped obfuscated method name');

    // Main file checks
    assertTrue(res.mainClassFile.obfuscatedCode.includes(`class ${obfOrderService}`), 'Main file should declare obfuscated class name');
    assertTrue(res.mainClassFile.obfuscatedCode.includes(obfCalculateTotal), 'Main file should rename calculateTotal method');

    // Test file checks - MUST HAVE SAME MAPPING KEYS
    assertTrue(res.testClassFile.obfuscatedCode.includes(`${obfOrderService} `), 'Test file must use the EXACT SAME obfuscated class name as field type');
    assertTrue(res.testClassFile.obfuscatedCode.includes(`new ${obfOrderService}()`), 'Test file must use the EXACT SAME obfuscated class name in instantiation');
    assertTrue(res.testClassFile.obfuscatedCode.includes(`.${obfCalculateTotal}(`), 'Test file must call the EXACT SAME obfuscated method name');

    // Testing assertions & annotations must be preserved
    assertTrue(res.testClassFile.obfuscatedCode.includes('@Test'), '@Test annotation must be preserved');
    assertTrue(res.testClassFile.obfuscatedCode.includes('assertEquals(100.0,'), 'assertEquals assertion must be preserved');
    assertTrue(res.testClassFile.obfuscatedCode.includes('testCalculateTotal()'), 'testCalculateTotal() name should be preserved when preserveTestMethods is true');

    // Cross-file shared identifiers stats
    assertTrue(res.sharedIdentifiers.classes.includes('OrderService'), 'OrderService should be recognized as a shared class');
    assertTrue(res.sharedIdentifiers.methods.includes('calculateTotal'), 'calculateTotal should be recognized as a shared method');
  });

  test('Java Class & Test Dual Obfuscator', 'Lossless de-obfuscation of modified code for both class and test', () => {
    const mainClass = `package com.acme.security.auth;
public class TokenValidator {
    public boolean verifyToken(String token) {
        return token != null;
    }
}`;

    const testClass = `package com.acme.security.auth;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
public class TokenValidatorTest {
    private TokenValidator validator = new TokenValidator();
    @Test
    void testVerify() {
        assertTrue(validator.verifyToken("ABC"));
    }
}`;

    // 1. Obfuscate both
    const obfResult = obfuscateDualJavaFiles({
      mainClassFile: { fileName: 'TokenValidator.java', code: mainClass },
      testClassFile: { fileName: 'TokenValidatorTest.java', code: testClass },
    });

    const obfMain = obfResult.mainClassFile.obfuscatedCode;
    const obfTest = obfResult.testClassFile.obfuscatedCode;

    // 2. User modifies the obfuscated class & test during development or debugging
    const modifiedObfMain = obfMain + '\n// User modified: added audit line\npublic void auditEvent() { System.out.println("Audited"); }';
    const modifiedObfTest = obfTest + '\n// User modified: added second test\n@Test\nvoid userExtraTest() { assertTrue(true); }';

    // 3. De-obfuscate both modified files using the shared mapping
    const restored = deobfuscateDualJavaFiles(modifiedObfMain, modifiedObfTest, obfResult.mapping);

    // Verifications:
    // Original names restored
    assertTrue(restored.restoredMainCode.includes('TokenValidator'), 'Restored main code must have TokenValidator restored');
    assertTrue(restored.restoredMainCode.includes('verifyToken'), 'Restored main code must have verifyToken restored');
    assertTrue(restored.restoredTestCode.includes('TokenValidator validator = new TokenValidator();'), 'Restored test code must have TokenValidator and validator restored');
    assertTrue(restored.restoredTestCode.includes('validator.verifyToken('), 'Restored test code must call verifyToken');

    // User modifications preserved intact
    assertTrue(restored.restoredMainCode.includes('auditEvent()'), 'User-added method in main class must be preserved');
    assertTrue(restored.restoredMainCode.includes('// User modified: added audit line'), 'User-added comment must be preserved');
    assertTrue(restored.restoredTestCode.includes('userExtraTest()'), 'User-added test in test class must be preserved');
  });

  test('Java Class & Test Dual Obfuscator', 'Preset scenarios obfuscate with zero collisions and accurate mapping', () => {
    for (const preset of JAVA_DUAL_PRESETS) {
      const res = obfuscateDualJavaFiles({
        mainClassFile: { fileName: preset.mainFile.fileName, code: preset.mainFile.code },
        testClassFile: { fileName: preset.testFile.fileName, code: preset.testFile.code },
      });

      assertTrue(res.stats.totalClassesRenamed >= 1, `Preset ${preset.id} must rename classes`);
      assertTrue(res.stats.crossFileTokensCount >= 1, `Preset ${preset.id} must have synchronized cross-file tokens`);
      assertTrue(!res.mainClassFile.obfuscatedCode.includes(preset.mainFile.fileName.replace('.java', '')), `Primary class in ${preset.id} should be obfuscated`);
    }
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

  test('Invoice Generator', 'Supports custom general currency settings with 3 decimals and suffix symbol', () => {
    const customKwd = {
      code: 'KWD',
      symbol: 'KD',
      name: 'Kuwaiti Dinar',
      position: 'after' as const,
      decimals: 3,
    };
    assertEqual(formatInvoiceCurrency(45.123, customKwd), '45.123 KD', 'Custom currency with 3 decimals and suffix');
    
    const inv = createDefaultInvoice();
    inv.currency = customKwd;
    inv.lineItems = [{ id: '1', description: 'Consulting', quantity: 2, unitPrice: 22.5, discountPercent: 0 }];
    const totals = calculateInvoiceTotals(inv);
    assertEqual(totals.subtotal, 45, 'Subtotal should be 45');
    assertEqual(formatInvoiceCurrency(totals.subtotal, inv.currency), '45.000 KD', 'Subtotal should format with 3 decimals');
  });

  test('Invoice Generator', 'Exports customized invoice settings into a structured template JSON and parses uploaded template', () => {
    const customInv = createDefaultInvoice();
    customInv.sender.companyName = 'Acme Consulting Global';
    customInv.currency = {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      position: 'after',
      decimals: 2,
    };
    customInv.defaultTaxRate = 19;
    customInv.defaultTaxLabel = 'MwSt / VAT';
    customInv.theme.primaryColor = '#059669';

    // 1. Export template JSON string
    const jsonOutput = exportInvoiceTemplateJson(customInv, 'Acme German Template', '19% VAT standard invoicing');
    assertTrue(jsonOutput.includes('"devhub-invoice-template"'), 'Template JSON should contain template format identifier');
    assertTrue(jsonOutput.includes('"Acme Consulting Global"'), 'Template JSON should contain customized company name');
    assertTrue(jsonOutput.includes('"MwSt / VAT"'), 'Template JSON should contain custom tax label');

    // 2. Parse the exported template back
    const parseResult = parseInvoiceTemplate(jsonOutput);
    assertTrue(parseResult.success, 'Parsing exported template JSON should succeed');
    assertEqual(parseResult.templateName, 'Acme German Template', 'Parsed template name should match');
    assertEqual(parseResult.invoice?.sender.companyName, 'Acme Consulting Global', 'Parsed company name should match');
    assertEqual(parseResult.invoice?.currency.code, 'EUR', 'Parsed currency should match');
    assertEqual(parseResult.invoice?.defaultTaxRate, 19, 'Parsed tax rate should match');
    assertEqual(parseResult.invoice?.theme.primaryColor, '#059669', 'Parsed primary theme color should match');

    // 3. Robust parsing of raw invoice JSON or partial template
    const rawInvJson = JSON.stringify(customInv);
    const rawResult = parseInvoiceTemplate(rawInvJson);
    assertTrue(rawResult.success, 'Parsing raw invoice data JSON should also succeed gracefully');
    assertEqual(rawResult.invoice?.sender.companyName, 'Acme Consulting Global', 'Parsed raw invoice data should preserve company name');
  });

  await testAsync('Invoice Generator', 'Generates valid downloadable vector PDF document', async () => {
    const sampleInv = createDefaultInvoice();
    const pdfBytes = await generateInvoicePdf(sampleInv);
    assertTrue(pdfBytes.length > 500, 'Generated invoice PDF should contain valid bytes');
    // PDF Magic bytes check (%PDF-)
    const headerStr = String.fromCharCode(...pdfBytes.slice(0, 5));
    assertTrue(headerStr.startsWith('%PDF'), 'PDF document should start with %PDF header');
  });

  await testAsync('PDF to Markdown Converter', 'Converts structured PDF document to clean GFM Markdown with YAML frontmatter & tables', async () => {
    const samplePdf = await createSampleMarkdownPdf();
    assertTrue(samplePdf.length > 1000, 'Sample PDF should be generated with valid bytes');

    const result = await convertPdfToMarkdown(samplePdf, {
      includeFrontmatter: true,
      detectHeadings: true,
      detectLists: true,
      detectTables: true,
      detectCodeBlocks: true,
      detectBlockquotes: true,
      preservePageDividers: true,
    });

    assertTrue(result.pageCount === 2, 'Sample PDF should have 2 pages');
    assertTrue(result.markdown.includes('title: "DevHub Architecture & Engineering Guide"'), 'Markdown should include YAML frontmatter title');
    assertTrue(result.markdown.includes('## 1. Executive Overview & Architecture'), 'Markdown should detect Section 1 heading');
    assertTrue(result.markdown.includes('### 1.1 Core Engineering Principles'), 'Markdown should detect Subsection 1.1 heading');
    assertTrue(result.markdown.includes('- Deterministic Output:'), 'Markdown should format bullet list item');
    assertTrue(result.markdown.includes('1. PDF Document Parsing:'), 'Markdown should format numbered list item');
    assertTrue(result.markdown.includes('> **Note: Security Compliance Guidelines**') || result.markdown.includes('> Note: Security Compliance Guidelines'), 'Markdown should format blockquote note');
    assertTrue(result.markdown.includes('| Pipeline Component | Throughput (Docs/s) |'), 'Markdown should format GFM table header');
    assertTrue(result.markdown.includes('| --- | --- |'), 'Markdown should format GFM table delimiter row');
    assertTrue(result.markdown.includes('```ts') || result.markdown.includes('import { convertPdfToMarkdown }'), 'Markdown should detect code block');

    // Test Markdown Stats calculation
    const stats = calculateMarkdownStats(result.markdown);
    assertTrue(stats.words > 50, 'Markdown stats should compute word count');
    assertTrue(stats.headings >= 4, 'Markdown stats should detect headings');
    assertTrue(stats.readingTimeMinutes >= 1, 'Markdown stats should compute reading time');

    // Test HTML rendering
    const html = renderMarkdownToHtml(result.markdown);
    assertTrue(html.includes('<h2'), 'HTML render should include <h2> tag');
    assertTrue(html.includes('<table'), 'HTML render should include <table> tag');
  });

  // ==========================================
  // AGREEMENT GENERATOR TESTS
  // ==========================================
  await testAsync('Agreement Generator', 'Default Agreement Configuration & Presets', () => {
    const defaultAgreement = getDefaultContractorAgreement();
    assertTrue(!!defaultAgreement.title, 'Default agreement should have title');
    assertTrue(defaultAgreement.party1.entityType === 'company', 'Party 1 should default to company');
    assertTrue(defaultAgreement.party2.entityType === 'individual', 'Party 2 should default to individual');
    assertTrue(defaultAgreement.milestones.length === 3, 'Default agreement should have 3 milestones');
    assertTrue(defaultAgreement.clauses.length >= 8, 'Default agreement should have at least 8 standard clauses');

    const presets = getAgreementPresets();
    assertTrue(presets.length >= 4, 'Should provide at least 4 presets (Contractor, NDA, Design, MSA)');
    const ndaPreset = presets.find((p) => p.id === 'mutual-nda');
    assertTrue(!!ndaPreset, 'Should find Mutual NDA preset');
    assertTrue(ndaPreset?.config.party1Role === 'Disclosing Party', 'NDA should configure Disclosing Party role');
  });

  await testAsync('Agreement Generator', 'Placeholder Interpolation & Markdown Generation', () => {
    const config = getDefaultContractorAgreement();
    const rawTemplate = 'Pay {{TOTAL_AMOUNT}} on {{NET_DAYS}} net terms in {{JURISDICTION}} to {{CONTRACTOR_NAME}}.';
    const interpolated = interpolatePlaceholders(rawTemplate, config);

    assertTrue(interpolated.includes('$20,000') || interpolated.includes('20,000'), 'Should interpolate total amount with currency symbol');
    assertTrue(interpolated.includes('14 net terms'), 'Should interpolate net days');
    assertTrue(interpolated.includes('State of California'), 'Should interpolate jurisdiction');
    assertTrue(interpolated.includes('Alex Rivera'), 'Should interpolate contractor name');

    const markdown = generateAgreementMarkdown(config);
    assertTrue(markdown.includes('---'), 'Markdown should include YAML frontmatter delimiters');
    assertTrue(markdown.includes('title: "INDEPENDENT CONTRACTOR AGREEMENT"'), 'Markdown should have contract title in frontmatter');
    assertTrue(markdown.includes('# INDEPENDENT CONTRACTOR AGREEMENT'), 'Markdown should have H1 title');
    assertTrue(markdown.includes('## 1. SCOPE OF SERVICES'), 'Markdown should have Section 1');
    assertTrue(markdown.includes('| Milestone Deliverables / Acceptance Criteria | Payout (% / USD) | Target Date |') || markdown.includes('| Milestone Deliverables / Acceptance Criteria | Payout (% / $) | Target Date |'), 'Markdown should render GFM milestone table with currency');
    assertTrue(markdown.includes('IN WITNESS WHEREOF'), 'Markdown should have execution statement');
    assertTrue(markdown.includes('**SIGNATURES & EXECUTION**'), 'Markdown should have signatures header');
  });

  await testAsync('Agreement Generator', 'Multi-Format Document Export (PDF, Docx, HTML)', async () => {
    const config = getDefaultContractorAgreement();

    // Test PDF Generation
    const pdfBytes = await generateAgreementPdf(config);
    assertTrue(pdfBytes instanceof Uint8Array, 'PDF output should be Uint8Array');
    assertTrue(pdfBytes.length > 500, 'PDF output should contain valid bytes');
    const headerStr = String.fromCharCode(...pdfBytes.slice(0, 5));
    assertTrue(headerStr.startsWith('%PDF'), 'PDF output should start with %PDF header');

    // Test Docx Generation
    const docxBlob = await generateAgreementDocx(config);
    assertTrue(docxBlob instanceof Blob, 'Docx output should be a Blob');
    assertTrue(docxBlob.size > 500, 'Docx output should have valid size');

    // Test HTML Generation
    const html = generateAgreementHtml(config);
    assertTrue(html.includes('<!DOCTYPE html>'), 'HTML output should be a full standalone document');
    assertTrue(html.includes('INDEPENDENT CONTRACTOR AGREEMENT'), 'HTML output should include title');
  });

  await testAsync('Agreement Generator', 'Optional & Blank Signatures with Party Details Preserved', async () => {
    const config = getDefaultContractorAgreement();
    // Configure party 1 and party 2 with blank/optional signatures
    config.party1.signature = {
      type: 'blank',
      date: '2026-03-01',
      location: 'San Francisco, CA',
    };
    config.party2.signature = {
      type: 'blank',
      date: '',
    };

    // 1. Check Markdown export
    const markdown = generateAgreementMarkdown(config);
    assertTrue(markdown.includes('Authorized Signature: _______________________'), 'Markdown should have blank line when signature is optional/blank');
    assertTrue(markdown.includes(config.party1.representativeName), 'Party 1 representative name should be preserved in Markdown signature table');
    assertTrue(markdown.includes(config.party2.representativeName), 'Party 2 representative name should be preserved in Markdown signature table');
    assertTrue(markdown.includes(config.party1.representativeTitle), 'Party 1 representative title should be preserved in Markdown signature table');

    // 2. Check PDF export
    const pdfBytes = await generateAgreementPdf(config);
    assertTrue(pdfBytes instanceof Uint8Array, 'PDF output with blank signatures should be valid Uint8Array');
    assertTrue(pdfBytes.length > 500, 'PDF output should have valid size');

    // 3. Check HTML export
    const html = generateAgreementHtml(config);
    assertTrue(html.includes('(Authorized Signature Line)'), 'HTML output should render blank authorized signature line');
    assertTrue(html.includes(config.party1.representativeName), 'HTML should retain Party 1 representative name');
    assertTrue(html.includes(config.party2.representativeName), 'HTML should retain Party 2 representative name');
  });

  await testAsync('Agreement Generator', 'PDF Text Sanitization & Dynamic Text Wrapping (No Mangling)', async () => {
    // Test cleanPdfText
    const dirtyText = `“Smart Quotes” and ‘Apostrophes’ — Em-Dash & En-Dash – Ellipsis… Bullet • NBSP\u00A0 **Bold** *Italic* \`Code\``;
    const sanitized = cleanPdfText(dirtyText);
    assertTrue(!sanitized.includes('“'), 'Should remove left double curly quote');
    assertTrue(!sanitized.includes('”'), 'Should remove right double curly quote');
    assertTrue(!sanitized.includes('—'), 'Should replace em-dash with hyphen');
    assertTrue(!sanitized.includes('…'), 'Should replace ellipsis character with 3 periods');
    assertTrue(sanitized.includes('"Smart Quotes"'), 'Should contain straight ASCII quotes');
    assertTrue(sanitized.includes("'Apostrophes'"), 'Should contain straight ASCII apostrophes');

    // Test PDF generation with complex long text and special characters
    const complexConfig = getDefaultContractorAgreement();
    complexConfig.title = 'MASTER SERVICES AGREEMENT (“MSA”) – 2026 EDITION';
    complexConfig.subtitle = 'Enterprise Software Development & AI Integration Services — Statement of Work (SOW-09)';
    complexConfig.clauses[0].subClauses[0].content = `The Contractor shall design, build, test, and deploy “next-generation” enterprise modules with high availability (99.99%). This includes:
• Complete REST & GraphQL endpoints with robust error handling.
• Real-time synchronization pipelines — zero data loss guarantee.
• Cross-platform compatibility testing across macOS, Linux, and Windows 11.
Each deliverable must adhere strictly to Client’s security standards, GDPR compliance, and SOC 2 Type II controls.`;

    const pdfBytes = await generateAgreementPdf(complexConfig);
    assertTrue(pdfBytes instanceof Uint8Array, 'PDF output should be valid Uint8Array');
    assertTrue(pdfBytes.length > 1000, 'PDF output with multi-clause sanitized text should be valid and substantive');
  });

  await testAsync('Agreement Generator', 'Unsigned is Default Option for Document & Presets', async () => {
    // 1. Check default contractor agreement defaults
    const defaultConfig = getDefaultContractorAgreement();
    assertEqual(defaultConfig.party1.signature.type, 'blank', 'Default party1 signature must be blank (unsigned)');
    assertEqual(defaultConfig.party2.signature.type, 'blank', 'Default party2 signature must be blank (unsigned)');
    assertEqual(defaultConfig.party1.signature.typedName, '', 'Default party1 typed name must be empty');
    assertEqual(defaultConfig.party2.signature.typedName, '', 'Default party2 typed name must be empty');

    // 2. Generate PDF from default config (unsigned)
    const pdfBytes = await generateAgreementPdf(defaultConfig);
    assertTrue(pdfBytes instanceof Uint8Array, 'Default unsigned agreement should export valid PDF');
    assertTrue(pdfBytes.length > 1000, 'Default unsigned PDF should be valid size');
  });

  await testAsync('Agreement Generator', 'Signatures & Execution Renders Full Untruncated Names', async () => {
    const config = getDefaultContractorAgreement();
    // Set long names that previously would have been truncated by 40 char limits
    config.party1.name = 'Consolidated Global Technologies & Quantum Computing International Holdings Corporation';
    config.party1.representativeName = 'Dr. Alexandros Constantine von Hohenzollern-Smythe III';
    config.party1.representativeTitle = 'Senior Executive Vice President of Global Infrastructure Engineering';

    config.party2.name = 'Advanced Autonomous Robotics & Neural Networks Development Laboratories LLC';
    config.party2.representativeName = 'Lady Genevieve Beatrice Montgomery-Huntington, PhD';
    config.party2.representativeTitle = 'Managing Director & Chief Autonomous Systems Technology Architect';

    // Verify PDF generates without errors with long names and wraps cleanly
    const pdfBytes = await generateAgreementPdf(config);
    assertTrue(pdfBytes instanceof Uint8Array, 'PDF output with extra long untruncated names should be valid');
    assertTrue(pdfBytes.length > 1000, 'PDF size should reflect valid rendering of full names');

    // Verify markdown renders full names
    const markdown = generateAgreementMarkdown(config);
    assertTrue(markdown.includes('Dr. Alexandros Constantine von Hohenzollern-Smythe III'), 'Markdown must contain full untruncated Party 1 representative name');
    assertTrue(markdown.includes('Lady Genevieve Beatrice Montgomery-Huntington, PhD'), 'Markdown must contain full untruncated Party 2 representative name');
    assertTrue(markdown.includes('Senior Executive Vice President of Global Infrastructure Engineering'), 'Markdown must contain full untruncated Party 1 title');
  });

  await testAsync('Agreement Generator', 'Generic Document Currency Configuration across Clauses, Tables & Exports', async () => {
    const config = getDefaultContractorAgreement();

    // 1. Verify default currency resolution
    const defaultCurr = getAgreementCurrency(config);
    assertEqual(defaultCurr.code, 'USD', 'Default document currency should be USD');
    assertEqual(defaultCurr.symbol, '$', 'Default document currency symbol should be $');

    // 2. Configure generic EUR currency at document root
    const eurCurrency = POPULAR_CURRENCIES.find((c) => c.code === 'EUR')!;
    config.currency = eurCurrency;
    delete (config.paymentTerms as any).currency; // Test root-level resolution even if absent in paymentTerms

    const resolvedEur = getAgreementCurrency(config);
    assertEqual(resolvedEur.code, 'EUR', 'Should resolve EUR from document root');
    assertEqual(resolvedEur.symbol, '€', 'Should resolve € symbol from document root');

    // 3. Test placeholder interpolation with generic EUR
    const eurTemplate = 'The aggregate contract price is {{TOTAL_AMOUNT}} ({{CURRENCY_CODE}} {{CURRENCY_SYMBOL}}).';
    const interpolatedEur = interpolatePlaceholders(eurTemplate, config);
    assertTrue(interpolatedEur.includes('20,000') && interpolatedEur.includes('€'), 'Interpolation should format with Euro symbol');
    assertTrue(interpolatedEur.includes('EUR'), 'Interpolation should contain EUR code');

    // 4. Test markdown milestone table with EUR
    const markdownEur = generateAgreementMarkdown(config);
    assertTrue(markdownEur.includes('Payout (% / EUR)') || markdownEur.includes('Payout (% / €)'), 'Markdown milestone table header should use EUR');
    assertTrue(markdownEur.includes('6,000') && markdownEur.includes('€'), 'Markdown milestone table row should format with €');

    // 5. Test PDF generation with EUR & non-WinAnsi currencies (INR, GBP)
    const inrCurrency = POPULAR_CURRENCIES.find((c) => c.code === 'INR')!;
    config.currency = inrCurrency;
    const inrFormatted = formatAgreementCurrency(150000, inrCurrency);
    assertTrue(inrFormatted.includes('150,000') && (inrFormatted.includes('₹') || inrFormatted.includes('INR')), 'INR format should format correctly');

    const pdfInrBytes = await generateAgreementPdf(config);
    assertTrue(pdfInrBytes instanceof Uint8Array, 'PDF with INR generic currency should generate valid Uint8Array');
    assertTrue(pdfInrBytes.length > 1000, 'PDF with INR should have valid non-empty size');

    // 6. Test Custom Document Currency (e.g. Swiss Franc / CHF)
    config.currency = {
      code: 'CHF',
      symbol: 'CHF',
      name: 'Swiss Franc',
      position: 'before',
      decimals: 2,
    };
    const chfFormatted = formatAgreementCurrency(50000, config.currency);
    assertTrue(chfFormatted.includes('50,000') && chfFormatted.includes('CHF'), 'Custom currency should format with CHF');

    const markdownChf = generateAgreementMarkdown(config);
    assertTrue(markdownChf.includes('Payout (% / CHF)'), 'Markdown table should display CHF column header');

    const htmlChf = generateAgreementHtml(config);
    assertTrue(htmlChf.includes('CHF') || htmlChf.includes('50,000'), 'HTML export should contain CHF currency');
  });

  await testAsync('Multiple JS/TS & HTML Obfuscator', 'Synchronized Multi-Set Obfuscation & Fundamentals Preservation', async () => {
    const preset = MULTI_OBFUSCATOR_PRESETS[0]; // E-commerce catalog & checkout
    assertEqual(preset.sets.length, 2, 'Preset must provide exactly 2 sets');

    const result = obfuscateMultipleSets(preset.sets, {
      namingStyle: 'hex',
      obfuscateVariables: true,
      obfuscateFunctions: true,
      obfuscateClassesAndInterfaces: true,
      obfuscateHtmlIds: true,
      obfuscateHtmlClasses: true,
      obfuscateStrings: true,
      obfuscateHtmlText: true,
      stripComments: true,
    });

    // 1. Verify 2 output sets generated
    assertEqual(result.sets.length, 2, 'Should generate 2 obfuscated output sets');
    const set1Out = result.sets[0];
    const set2Out = result.sets[1];

    // 2. Fundamentals preservation in Script:
    // Keywords & DOM APIs must remain intact
    assertTrue(set1Out.obfuscatedScript.includes('class ') || set1Out.obfuscatedScript.includes('function'), 'Script should preserve standard language structure');
    assertTrue(set1Out.obfuscatedScript.includes('document.getElementById'), 'Standard DOM API getElementById should not be mangled');
    assertTrue(set1Out.obfuscatedScript.includes('addEventListener'), 'Standard DOM API addEventListener should not be mangled');

    // 3. Custom identifiers in script should be mangled:
    assertTrue(!set1Out.obfuscatedScript.includes('CatalogManager'), 'Custom class CatalogManager should be mangled');
    assertTrue(set1Out.obfuscatedScript.includes('_0x'), 'Mangled hex tokens should appear in script');

    // 4. HTML tags & attributes preservation:
    assertTrue(set1Out.obfuscatedHtml.includes('<div') && set1Out.obfuscatedHtml.includes('</div>'), 'HTML <div> tags should be preserved');
    assertTrue(set1Out.obfuscatedHtml.includes('<select') && set1Out.obfuscatedHtml.includes('<option'), 'HTML form elements should be preserved');
    assertTrue(set1Out.obfuscatedHtml.includes('id=') && set1Out.obfuscatedHtml.includes('class='), 'HTML attribute names should be preserved');

    // 5. Synchronized ID & Class mapping between JS and HTML:
    // Original ID 'catalog-grid-wrapper' was mangled to an obfuscated token (e.g. _0xid...)
    const mappedGridId = result.mapping.htmlIds['catalog-grid-wrapper'];
    assertTrue(!!mappedGridId, 'Mapping should register HTML ID catalog-grid-wrapper');
    assertTrue(set1Out.obfuscatedHtml.includes(mappedGridId), 'Obfuscated HTML should contain the mapped ID token');
    assertTrue(set1Out.obfuscatedScript.includes(mappedGridId), 'Obfuscated JS/TS getElementById should use the exact same mapped ID token');

    // 6. Inline event handler synchronization:
    // Original onclick="handleAddToCart('p-101')" in Set 1 HTML must call the mangled function name
    const mappedFn = result.mapping.identifiers['handleAddToCart'];
    if (mappedFn) {
      assertTrue(set1Out.obfuscatedHtml.includes(mappedFn), 'HTML onclick should reference the mangled function token');
      assertTrue(set2Out.obfuscatedScript.includes(mappedFn), 'Script defining function should use the mangled function token');
    }

    // 7. HTML Text nodes obfuscated:
    assertTrue(!set1Out.obfuscatedHtml.includes('Featured Hardware & Accessories'), 'Original text heading should be obfuscated');
  });

  await testAsync('Multiple JS/TS & HTML Obfuscator', 'Lossless 100% De-Obfuscation with Mapping Restoration', async () => {
    const preset = MULTI_OBFUSCATOR_PRESETS[0];
    const obfResult = obfuscateMultipleSets(preset.sets, {
      namingStyle: 'hex',
      obfuscateVariables: true,
      obfuscateFunctions: true,
      obfuscateClassesAndInterfaces: true,
      obfuscateHtmlIds: true,
      obfuscateHtmlClasses: true,
      obfuscateStrings: false, // keep strings clear for strict text comparison
      obfuscateHtmlText: true,
      stripComments: false,
    });

    // Run de-obfuscation batch
    const deobfuscated = deobfuscateMultipleSets(
      [
        { id: 'set-1', name: 'Set 1', scriptCode: obfResult.sets[0].obfuscatedScript, htmlCode: obfResult.sets[0].obfuscatedHtml },
        { id: 'set-2', name: 'Set 2', scriptCode: obfResult.sets[1].obfuscatedScript, htmlCode: obfResult.sets[1].obfuscatedHtml },
      ],
      obfResult.mapping
    );

    assertEqual(deobfuscated.length, 2, 'De-obfuscation should return 2 sets');

    // Verify Set 1 Restored
    const set1Restored = deobfuscated[0];
    assertTrue(set1Restored.restoredScript.includes('CatalogManager'), 'Restored script must recover class CatalogManager');
    assertTrue(set1Restored.restoredScript.includes('products'), 'Restored script must recover products variable');
    assertTrue(set1Restored.restoredScript.includes('catalog-grid-wrapper'), 'Restored script must recover catalog-grid-wrapper ID');
    assertTrue(set1Restored.restoredHtml.includes('Featured Hardware & Accessories'), 'Restored HTML must recover text heading');
    assertTrue(set1Restored.restoredHtml.includes('catalog-grid-wrapper'), 'Restored HTML must recover original ID');
    assertTrue(set1Restored.restoredHtml.includes('store-wrapper'), 'Restored HTML must recover original CSS classes');

    // Verify Set 2 Restored
    const set2Restored = deobfuscated[1];
    assertTrue(set2Restored.restoredScript.includes('cartState'), 'Restored script 2 must recover cartState variable');
    assertTrue(set2Restored.restoredScript.includes('calculateOrderTotal'), 'Restored script 2 must recover calculateOrderTotal function');
    assertTrue(set2Restored.restoredHtml.includes('Your Shopping Cart & Review'), 'Restored HTML 2 must recover modal title text');
    assertTrue(set2Restored.restoredHtml.includes('order-summary-container'), 'Restored HTML 2 must recover order-summary-container ID');
  });

  await testAsync('Multiple JS/TS & HTML Obfuscator', 'Custom Exclusions Whitelist & Naming Styles', async () => {
    const preset = MULTI_OBFUSCATOR_PRESETS[1]; // Auth & Dashboard

    // Test with Alphabetical style and Custom Exclusions
    const resultAlphabetical = obfuscateMultipleSets(preset.sets, {
      namingStyle: 'alphabetical',
      obfuscateVariables: true,
      obfuscateFunctions: true,
      customExclusions: ['AuthenticationService', 'metric-throughput', 'telemetry-dashboard-panel'],
    });

    const set1Out = resultAlphabetical.sets[0];
    const set2Out = resultAlphabetical.sets[1];

    // 1. Whitelisted class AuthenticationService must NOT be mangled
    assertTrue(set1Out.obfuscatedScript.includes('AuthenticationService'), 'Whitelisted class AuthenticationService should be preserved');

    // 2. Whitelisted ID metric-throughput must NOT be mangled
    assertTrue(set2Out.obfuscatedHtml.includes('metric-throughput'), 'Whitelisted HTML ID metric-throughput should be preserved');

    // 3. Alphabetical tokens should follow format v_... or fn_...
    assertTrue(set1Out.obfuscatedScript.includes('v_') || set1Out.obfuscatedScript.includes('fn_') || set1Out.obfuscatedScript.includes('Cls_'), 'Should contain alphabetical prefixed tokens');
  });

  await testAsync('QR Code Generator', 'Protocol Payload Formatting & Escaping', async () => {
    // 1. Wi-Fi formatting
    const wifiPayload = formatQrPayload('wifi', {
      wifi: { ssid: 'DevHub-Wifi;5G', password: 'pass:123;secret', encryption: 'WPA', hidden: true },
    });
    assertTrue(wifiPayload.startsWith('WIFI:S:DevHub-Wifi\\;5G;'), 'Wi-Fi SSID with special characters should be escaped');
    assertTrue(wifiPayload.includes('P:pass\\:123\\;secret;'), 'Wi-Fi password with colons and semicolons should be escaped');
    assertTrue(wifiPayload.includes('H:true;'), 'Hidden network flag should be present');

    // 2. vCard formatting
    const vcardPayload = formatQrPayload('vcard', {
      vcard: {
        firstName: 'Sarah',
        lastName: 'Connor',
        organization: 'Cyberdyne Resistance',
        title: 'Security Commander',
        email: 'sarah@resistance.org',
        phone: '+15550199',
        mobile: '',
        url: 'https://resistance.org',
        address: 'Bunker 4',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
        note: 'High Priority Contact',
      },
    });
    assertTrue(vcardPayload.includes('BEGIN:VCARD') && vcardPayload.includes('END:VCARD'), 'vCard must have envelope tags');
    assertTrue(vcardPayload.includes('FN:Sarah Connor'), 'vCard must format full name');
    assertTrue(vcardPayload.includes('EMAIL;TYPE=INTERNET,WORK:sarah@resistance.org'), 'vCard must format email');

    // 3. Crypto formatting
    const btcPayload = formatQrPayload('crypto', {
      crypto: { coin: 'bitcoin', address: 'bc1qexample123', amount: '0.05', label: 'Donation', message: 'Coffee' },
    });
    assertEqual(btcPayload, 'bitcoin:bc1qexample123?amount=0.05&label=Donation&message=Coffee', 'Crypto Bitcoin protocol URL formatted accurately');
  });

  await testAsync('QR Code Generator', 'SVG Generation & Matrix Computation', async () => {
    const payload = 'https://devhub.local/suite';
    const svgStr = await generateQrSvg(payload, {
      fgColor: '#1E293B',
      bgColor: '#FFFFFF',
      errorCorrectionLevel: 'H',
      margin: 2,
    });

    assertTrue(svgStr.includes('<svg') && svgStr.includes('</svg>'), 'Generated SVG must be valid markup');
    assertTrue(svgStr.includes('#1E293B'), 'SVG must include foreground color');

    // Test matrix generator
    const matrixData = getQrMatrix(payload, 'H');
    assertTrue(matrixData.size > 20, 'QR module dimension should be > 20 for standard payload');
    assertEqual(matrixData.finderPatterns.length, 3, 'Must have exactly 3 finder patterns');
    assertEqual(matrixData.matrix.length, matrixData.size, 'Matrix row count matches module count');
  });

  await testAsync('cURL Auth Chain Converter', 'Token Extraction Code Generation', async () => {
    // 1. Root token extraction (e.g. "token" or "access_token")
    const codeToken = generateTokenExtractionCode({
      source: 'json_body',
      keyPath: 'token',
      variableName: 'token',
    }, 'login_res', '    ');
    assertTrue(codeToken.includes('login_res.json()'), 'Should parse json from login_res');
    assertTrue(codeToken.includes('token = login_data.get("token")'), 'Should extract token from root dict');

    // 2. Nested token extraction (e.g. "data.auth.token")
    const codeNested = generateTokenExtractionCode({
      source: 'json_body',
      keyPath: 'data.auth.token',
      variableName: 'jwt_key',
    }, 'res', '  ');
    assertTrue(codeNested.includes('jwt_key = login_data.get("data", {}).get("auth", {}).get("token")'), 'Should extract nested path safely');

    // 3. Response header extraction (e.g. "X-Auth-Token")
    const codeHeader = generateTokenExtractionCode({
      source: 'response_header',
      keyPath: '',
      headerName: 'X-Auth-Token',
      variableName: 'auth_token',
    }, 'login_res', '    ');
    assertTrue(codeHeader.includes('login_res.headers.get("X-Auth-Token")'), 'Should extract from headers');

    // 4. Cookie extraction
    const codeCookie = generateTokenExtractionCode({
      source: 'cookie',
      keyPath: 'session_id',
      variableName: 'session_tok',
    }, 'login_res', '    ');
    assertTrue(codeCookie.includes('login_res.cookies.get("session_id")'), 'Should extract from cookies');
  });

  await testAsync('cURL Auth Chain Converter', 'Header Value Expressions & Auth Replacement', async () => {
    // 1. Bearer format
    const exprBearer = getHeaderValuePythonExpr({
      placement: 'header',
      headerName: 'Authorization',
      headerFormat: 'Bearer {token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    }, 'token');
    assertEqual(exprBearer, 'f"Bearer {token}"', 'Bearer format expression should match');

    // 2. Raw token format (user specified "token" header)
    const exprRaw = getHeaderValuePythonExpr({
      placement: 'header',
      headerName: 'token',
      headerFormat: '{token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    }, 'my_token');
    assertEqual(exprRaw, 'my_token', 'Raw token format should directly use variable name');

    // 3. Prepare subsequent request: removes existing stale header
    const parsedSubsequent = parseCurlCommand(
      'curl -X GET https://api.example.com/me -H "Authorization: Bearer static_old" -H "Accept: application/json"'
    );
    const prep = prepareSubsequentRequest(parsedSubsequent, {
      placement: 'header',
      headerName: 'token',
      headerFormat: '{token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    }, 'token');
    assertEqual(prep.headers['Authorization'], undefined, 'Conflicting static Authorization header should be stripped');
    assertEqual(prep.headers['Accept'], 'application/json', 'Non-auth header should be preserved');
    assertTrue(prep.replacedExistingAuth, 'Should flag replaced existing auth');
  });

  await testAsync('cURL Auth Chain Converter', 'Full Chained Script Generation (Session & Functions)', async () => {
    const preset = CURL_CHAIN_PRESETS[1]; // Simple "token" header preset
    const sessionScript = generateChainedPythonScript(
      preset.loginCurl,
      preset.subsequentRequests,
      preset.extraction,
      preset.injection,
      { ...DEFAULT_OPTIONS, structure: 'session' }
    );

    assertTrue(sessionScript.includes('import requests'), 'Session script must import requests');
    assertTrue(sessionScript.includes('session = requests.Session()'), 'Must initialize session');
    assertTrue(sessionScript.includes('login_res = session.post('), 'Must invoke login endpoint');
    assertTrue(sessionScript.includes('token = login_data.get("token")'), 'Must extract token');
    assertTrue(sessionScript.includes('"token": token'), 'Must update session headers with token');
    assertTrue(sessionScript.includes('url_2 ='), 'Must define subsequent request url');
    assertTrue(sessionScript.includes('session.get(url_2'), 'Must execute subsequent request using session');
    assertTrue(!sessionScript.includes('{method}'), 'Must not contain undefined {method} in f-strings');
    assertTrue(sessionScript.includes('[GET]'), 'Must interpolate concrete HTTP method [GET]');

    // Test modular functions structure
    const funcScript = generateChainedPythonScript(
      preset.loginCurl,
      preset.subsequentRequests,
      preset.extraction,
      preset.injection,
      { ...DEFAULT_OPTIONS, structure: 'functions' }
    );
    assertTrue(funcScript.includes('def login() -> str:'), 'Must generate typed login function');
    assertTrue(funcScript.includes('def step_1_check_account_status(token: str) -> dict:'), 'Must generate step functions with token parameter');
    assertTrue(funcScript.includes('def main():'), 'Must generate main orchestrator');
  });

  // ==========================================
  // DATABASE UPDATE QUERY GENERATOR SUITE
  // ==========================================
  test('Database Update Query Generator', 'PostgreSQL Batch VALUES Strategy with type casts', () => {
    const preset = DB_UPDATE_PRESETS[0]; // users-status-role
    const result = generatePostgresUpdateQuery({
      tableName: preset.tableName,
      matchColumns: preset.matchColumns,
      updateColumns: preset.updateColumns,
      strategy: 'batch_values',
      transactionMode: 'commit',
      returningClause: preset.returningClause,
      includeTypeCasts: true,
    });

    assertTrue(result.rowCount === 5, `Expected 5 rows, got ${result.rowCount}`);
    assertTrue(result.columnCount === 3, `Expected 3 update columns, got ${result.columnCount}`);
    assertTrue(result.sql.includes('UPDATE users AS t'), 'Must contain UPDATE users AS t');
    assertTrue(result.sql.includes('FROM (\n  VALUES'), 'Must contain FROM (VALUES ...)');
    assertTrue(result.sql.includes('status = v.status::text'), 'Must include type cast on status');
    assertTrue(result.sql.includes('WHERE t.id = v.id'), 'Must include WHERE t.id = v.id');
    assertTrue(result.sql.includes('BEGIN;\n\n'), 'Must be wrapped in BEGIN');
    assertTrue(result.sql.includes('\n\nCOMMIT;'), 'Must be committed with COMMIT');
    assertTrue(result.sql.includes('RETURNING id, status, role, updated_at;'), 'Must include RETURNING clause');
    assertTrue(result.pythonSnippet.includes('pg8000.native.Connection'), 'Python snippet must support pg8000');
  });

  test('Database Update Query Generator', 'Individual UPDATE Statements Strategy', () => {
    const result = generatePostgresUpdateQuery({
      tableName: 'products',
      matchColumns: [{ id: 'm1', name: 'sku', type: 'text', values: ['SKU-1', 'SKU-2'] }],
      updateColumns: [{ id: 'u1', name: 'price', type: 'numeric', values: ['19.99', '29.50'] }],
      strategy: 'individual',
      transactionMode: 'none',
    });

    assertTrue(result.rowCount === 2, 'Expected 2 rows');
    assertTrue(result.sql.includes("UPDATE products SET price = 19.99 WHERE sku = 'SKU-1';"), 'Must generate first individual UPDATE statement');
    assertTrue(result.sql.includes("UPDATE products SET price = 29.50 WHERE sku = 'SKU-2';"), 'Must generate second individual UPDATE statement');
  });

  test('Database Update Query Generator', 'CASE-WHEN Update Strategy', () => {
    const result = generatePostgresUpdateQuery({
      tableName: 'accounts',
      matchColumns: [{ id: 'm1', name: 'id', type: 'integer', values: ['1', '2'] }],
      updateColumns: [{ id: 'u1', name: 'status', type: 'text', values: ['active', 'paused'] }],
      strategy: 'case_when',
      transactionMode: 'rollback',
    });

    assertTrue(result.sql.includes('UPDATE accounts\nSET\n  status = CASE id'), 'Must generate CASE WHEN syntax');
    assertTrue(result.sql.includes("WHEN 1 THEN 'active'"), 'Must include WHEN 1 THEN active');
    assertTrue(result.sql.includes("WHEN 2 THEN 'paused'"), 'Must include WHEN 2 THEN paused');
    assertTrue(result.sql.includes('WHERE id IN (\n  1, 2\n)'), 'Must include WHERE id IN (1, 2)');
    assertTrue(result.sql.includes('ROLLBACK;'), 'Must include rollback for dry run');
  });

  test('Database Update Query Generator', 'PostgreSQL Value Escaping and Typing', () => {
    // Single quotes escaping
    const escapedText = formatPostgresValue("O'Reilly", 'text', false);
    assertTrue(escapedText === "'O''Reilly'", `Expected 'O''Reilly', got ${escapedText}`);

    // Numeric and Integer
    const intVal = formatPostgresValue("42", 'integer', false);
    assertTrue(intVal === '42', `Expected 42, got ${intVal}`);

    // Boolean
    const boolVal = formatPostgresValue("true", 'boolean', false);
    assertTrue(boolVal === 'TRUE', `Expected TRUE, got ${boolVal}`);

    // Date & Timestamp (ISO and DD/MM/YYYY formats)
    const tsVal = formatPostgresValue("2026-09-18 10:00:00", 'timestamp', false);
    assertTrue(tsVal === "'2026-09-18 10:00:00'::timestamp", `Expected timestamp cast, got ${tsVal}`);

    const dateDdmmyyyy = formatPostgresValue("24/10/2023", 'date', false);
    assertTrue(dateDdmmyyyy === "'2023-10-24'::date", `Expected '2023-10-24'::date, got ${dateDdmmyyyy}`);

    const tsDdmmyyyy = formatPostgresValue("24/10/2023 15:30:00", 'timestamp', false);
    assertTrue(tsDdmmyyyy === "'2023-10-24 15:30:00'::timestamp", `Expected '2023-10-24 15:30:00'::timestamp, got ${tsDdmmyyyy}`);

    const dateDashedDdmmyyyy = formatPostgresValue("24-10-2023", 'date', false);
    assertTrue(dateDashedDdmmyyyy === "'2023-10-24'::date", `Expected '2023-10-24'::date, got ${dateDashedDdmmyyyy}`);

    // Null
    const nullVal = formatPostgresValue("NULL", 'text', false);
    assertTrue(nullVal === 'NULL', `Expected NULL, got ${nullVal}`);
  });

  test('Database Update Query Generator', 'CSV and TSV parser with inferColumnType', () => {
    const csv = `id,status,score\n1,active,95.5\n2,pending,80.0`;
    const parsed = parseCsvOrTsv(csv);
    assertTrue(parsed.headers.length === 3, 'Must parse 3 headers');
    assertTrue(parsed.rows.length === 2, 'Must parse 2 data rows');
    assertTrue(parsed.rows[0][1] === 'active', 'First row status must be active');

    const inferredInt = inferColumnType(['1', '2', '3']);
    assertTrue(inferredInt === 'integer', `Expected integer, got ${inferredInt}`);

    const inferredNum = inferColumnType(['12.5', '99.9', '0.5']);
    assertTrue(inferredNum === 'numeric', `Expected numeric, got ${inferredNum}`);

    const inferredBool = inferColumnType(['true', 'false', 'true']);
    assertTrue(inferredBool === 'boolean', `Expected boolean, got ${inferredBool}`);

    const inferredDate = inferColumnType(['24/10/2023', '05/11/2023', '15/12/2023']);
    assertTrue(inferredDate === 'date', `Expected date for DD/MM/YYYY, got ${inferredDate}`);
  });

  test('Database Update Query Generator', 'Handles DD/MM/YYYY Dates without Range Errors', () => {
    const result = generatePostgresUpdateQuery({
      tableName: 'customer_subscriptions',
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', values: ['101', '102'], valueMode: 'list' },
      ],
      updateColumns: [
        { id: 'u1', name: 'renewal_date', type: 'date', values: ['24/10/2023', '05/11/2023'] },
      ],
      strategy: 'batch_values',
      executionMode: 'batch',
      transactionMode: 'none',
    });

    assertTrue(result.sql.includes("'2023-10-24'::date"), 'Must convert 24/10/2023 to 2023-10-24::date');
    assertTrue(result.sql.includes("'2023-11-05'"), 'Must convert 05/11/2023 to 2023-11-05');
    assertTrue(!result.sql.includes('24/10/2023'), 'Must NOT contain unconverted 24/10/2023');
    assertTrue(result.warnings.some((w) => w.includes('DD/MM/YYYY')), 'Must emit warning about DD/MM/YYYY conversion');
  });

  test('Database Update Query Generator', 'Multiple Match Columns with Single-Value and List-Value Modes', () => {
    // Match column 1: tenant_id (single constant value 'org-123')
    // Match column 2: user_id (list of IDs ['101', '102'])
    const result = generatePostgresUpdateQuery({
      tableName: 'tenant_members',
      matchColumns: [
        { id: 'm1', name: 'tenant_id', type: 'text', values: ['org-123'], valueMode: 'single' },
        { id: 'm2', name: 'user_id', type: 'integer', values: ['101', '102'], valueMode: 'list' }
      ],
      updateColumns: [
        { id: 'u1', name: 'role', type: 'text', values: ['admin', 'manager'] }
      ],
      strategy: 'batch_values',
      executionMode: 'batch',
      transactionMode: 'none',
    });

    assertTrue(result.rowCount === 2, `Expected 2 rows, got ${result.rowCount}`);
    assertTrue(result.sql.includes("t.user_id = v.user_id"), 'Must join on list match key user_id');
    assertTrue(result.sql.includes("t.tenant_id = 'org-123'"), 'Must filter on single match constant tenant_id');
    assertTrue(result.sql.includes("(101::int, 'admin'::text)"), 'First VALUES tuple must contain user_id and role');
    assertTrue(result.sql.includes("(102, 'manager')"), 'Second VALUES tuple must contain user_id and role');
  });

  test('Database Update Query Generator', 'Execution Mode: Batch vs Individual Queries', () => {
    // When executionMode === 'individual'
    const individualResult = generatePostgresUpdateQuery({
      tableName: 'orders',
      matchColumns: [
        { id: 'm1', name: 'store_id', type: 'text', values: ['store-east'], valueMode: 'single' },
        { id: 'm2', name: 'order_id', type: 'integer', values: ['5001', '5002'], valueMode: 'list' }
      ],
      updateColumns: [
        { id: 'u1', name: 'status', type: 'text', values: ['shipped', 'delivered'] }
      ],
      strategy: 'individual',
      executionMode: 'individual',
      transactionMode: 'none',
    });

    assertTrue(individualResult.rowCount === 2, 'Expected 2 rows');
    assertTrue(individualResult.sql.includes("UPDATE orders SET status = 'shipped' WHERE store_id = 'store-east' AND order_id = 5001;"), 'First individual statement must match');
    assertTrue(individualResult.sql.includes("UPDATE orders SET status = 'delivered' WHERE store_id = 'store-east' AND order_id = 5002;"), 'Second individual statement must match');

    // When executionMode === 'batch'
    const batchResult = generatePostgresUpdateQuery({
      tableName: 'orders',
      matchColumns: [
        { id: 'm1', name: 'order_id', type: 'integer', values: ['5001', '5002'], valueMode: 'list' }
      ],
      updateColumns: [
        { id: 'u1', name: 'status', type: 'text', values: ['shipped', 'delivered'] }
      ],
      strategy: 'batch_values',
      executionMode: 'batch',
      transactionMode: 'none',
    });

    assertTrue(batchResult.sql.includes("UPDATE orders AS t SET"), 'Batch query should generate single UPDATE ... FROM (VALUES ...) statement');
    assertTrue(batchResult.sql.includes("FROM (VALUES"), 'Batch query should use VALUES block');
  });

  test('Database Update Query Generator', 'Export and Import Configuration Reusability', () => {
    // 1. Export configuration
    const exportedConfig = createDbUpdateConfigExport({
      name: 'Inventory Restock Config',
      description: 'Bulk update for warehouse stock levels',
      tableName: 'inventory_items',
      matchColumns: [
        { id: 'm1', name: 'warehouse_id', type: 'text', values: ['wh-north'], valueMode: 'single' },
        { id: 'm2', name: 'sku', type: 'text', values: ['SKU-001', 'SKU-002'], valueMode: 'list' }
      ],
      updateColumns: [
        { id: 'u1', name: 'stock_quantity', type: 'integer', values: ['150', '320'] },
        { id: 'u2', name: 'status', type: 'text', values: ['in_stock', 'in_stock'] }
      ],
      executionMode: 'batch',
      strategy: 'batch_values',
      transactionMode: 'commit',
      returningClause: 'sku, stock_quantity, status',
      includeTypeCasts: true,
      includeRowComments: true
    });

    assertTrue(exportedConfig.version === 1, 'Config version must be 1');
    assertTrue(exportedConfig.tableName === 'inventory_items', 'Table name must match');
    assertTrue(exportedConfig.matchColumns.length === 2, 'Must export 2 match columns');
    assertTrue(exportedConfig.updateColumns.length === 2, 'Must export 2 update columns');
    assertTrue(exportedConfig.executionMode === 'batch', 'Execution mode must be batch');

    // 2. Serialize to JSON string
    const jsonString = JSON.stringify(exportedConfig, null, 2);
    assertTrue(typeof jsonString === 'string' && jsonString.length > 50, 'JSON string should be generated');

    // 3. Import & Validate from JSON string
    const parseRes = validateAndParseDbUpdateConfig(jsonString);
    assertTrue(parseRes.success === true, `Failed to parse valid config: ${parseRes.error}`);
    assertTrue(parseRes.config?.tableName === 'inventory_items', 'Imported tableName must match');
    assertTrue(parseRes.config?.matchColumns[0].valueMode === 'single', 'First match col must preserve single valueMode');
    assertTrue(parseRes.config?.matchColumns[1].valueMode === 'list', 'Second match col must preserve list valueMode');

    // 4. Round-trip execution: Generate query from imported configuration
    const generated = generatePostgresUpdateQuery({
      tableName: parseRes.config!.tableName,
      matchColumns: parseRes.config!.matchColumns,
      updateColumns: parseRes.config!.updateColumns,
      executionMode: parseRes.config!.executionMode,
      strategy: parseRes.config!.strategy,
      transactionMode: parseRes.config!.transactionMode,
      returningClause: parseRes.config!.returningClause,
      includeTypeCasts: parseRes.config!.includeTypeCasts,
      includeRowComments: parseRes.config!.includeRowComments
    });

    assertTrue(generated.rowCount === 2, `Expected 2 rows, got ${generated.rowCount}`);
    assertTrue(generated.sql.includes('UPDATE inventory_items AS t'), 'Should update target table');
    assertTrue(generated.sql.includes("t.warehouse_id = 'wh-north'"), 'Should include single match constant');
    assertTrue(generated.sql.includes('t.sku = v.sku'), 'Should join on list match key sku');

    // 5. Validation error handling for invalid JSON
    const invalidRes = validateAndParseDbUpdateConfig('{ invalid json string }');
    assertTrue(invalidRes.success === false, 'Invalid JSON must return success=false');
    assertTrue(typeof invalidRes.error === 'string', 'Error message should be provided');
  });

  test('Database Select Query Generator', 'Batch VALUES Join and Custom Projections', () => {
    const result = generatePostgresSelectQuery({
      tableName: 'users',
      tableAlias: 't',
      matchColumns: [
        { id: 'm1', name: 'tenant_id', type: 'text', valueMode: 'single', singleValue: 'org-123', values: ['org-123'] },
        { id: 'm2', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['101', '102', '103'] }
      ],
      selectColumns: [
        { id: 's1', name: 'id' },
        { id: 's2', name: 'username' },
        { id: 's3', name: 'email' }
      ],
      strategy: 'batch_values',
      executionMode: 'batch',
      orderBy: 't.id ASC',
      limit: '50',
      includeTypeCasts: true
    });

    assertTrue(result.rowCount === 3, `Expected rowCount 3, got ${result.rowCount}`);
    assertTrue(result.sql.includes('FROM users AS t'), 'Should select from users table');
    assertTrue(result.sql.includes('JOIN (\n  VALUES'), 'Should join on VALUES');
    assertTrue(result.sql.includes("101::int"), 'Should include type cast on first row');
    assertTrue(result.sql.includes("t.tenant_id = 'org-123'"), 'Should include constant filter in WHERE');
    assertTrue(result.sql.includes('ORDER BY t.id ASC'), 'Should include ORDER BY');
    assertTrue(result.sql.includes('LIMIT 50'), 'Should include LIMIT');
    assertTrue(result.pythonSnippet.includes('pg8000.native.Connection'), 'Python snippet should include pg8000');
  });

  test('Database Select Query Generator', 'IN and Multi-Column Tuple IN Clauses', () => {
    // Single list column IN
    const singleIn = generatePostgresSelectQuery({
      tableName: 'customers',
      tableAlias: 'c',
      matchColumns: [
        { id: 'm1', name: 'status', type: 'text', valueMode: 'single', singleValue: 'active', values: ['active'] },
        { id: 'm2', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['1', '2', '3'] }
      ],
      selectColumns: [{ id: 's1', name: '*' }],
      selectAllColumns: true,
      strategy: 'in_clause',
      executionMode: 'batch'
    });

    assertTrue(singleIn.sql.includes('c.id IN ('), 'Should use IN clause');
    assertTrue(singleIn.sql.includes("c.status = 'active'"), 'Should include single match');

    // Multi-column Tuple IN
    const tupleIn = generatePostgresSelectQuery({
      tableName: 'order_items',
      tableAlias: 'o',
      matchColumns: [
        { id: 'm1', name: 'store_id', type: 'text', valueMode: 'list', singleValue: '', values: ['east', 'west'] },
        { id: 'm2', name: 'sku', type: 'text', valueMode: 'list', singleValue: '', values: ['SKU-1', 'SKU-2'] }
      ],
      selectColumns: [{ id: 's1', name: '*' }],
      selectAllColumns: true,
      strategy: 'in_clause',
      executionMode: 'batch'
    });

    assertTrue(tupleIn.sql.includes('(o.store_id, o.sku) IN ('), 'Should use tuple IN for multiple list match columns');
    assertTrue(tupleIn.sql.includes("('east', 'SKU-1')"), 'Should format tuple values');
  });

  test('Database Select Query Generator', 'Handles DD/MM/YYYY Dates in Match Columns without Range Errors', () => {
    const dateSelect = generatePostgresSelectQuery({
      tableName: 'customer_orders',
      tableAlias: 'o',
      matchColumns: [
        {
          id: 'm1',
          name: 'order_date',
          type: 'date',
          valueMode: 'list',
          singleValue: '',
          values: ['24/10/2023', '05/11/2023'],
        },
      ],
      selectColumns: [{ id: 's1', name: '*' }],
      selectAllColumns: true,
      strategy: 'in_clause',
      executionMode: 'batch',
    });

    assertTrue(dateSelect.sql.includes("'2023-10-24'::date"), 'Must convert 24/10/2023 to 2023-10-24::date in IN clause');
    assertTrue(dateSelect.sql.includes("'2023-11-05'::date"), 'Must convert 05/11/2023 to 2023-11-05::date');
    assertTrue(!dateSelect.sql.includes('24/10/2023'), 'Must NOT contain unconverted 24/10/2023');
    assertTrue(dateSelect.warnings.some((w) => w.includes('DD/MM/YYYY')), 'Must emit warning about DD/MM/YYYY conversion');
  });

  test('Database Select Query Generator', 'CTE and Individual Statements and UNION ALL', () => {
    // CTE
    const cteResult = generatePostgresSelectQuery({
      tableName: 'inventory',
      tableAlias: 't',
      matchColumns: [
        { id: 'm1', name: 'warehouse_id', type: 'text', valueMode: 'single', singleValue: 'WH-1', values: ['WH-1'] },
        { id: 'm2', name: 'item_id', type: 'integer', valueMode: 'list', singleValue: '', values: ['10', '20'] }
      ],
      selectColumns: [{ id: 's1', name: '*' }],
      selectAllColumns: true,
      strategy: 'cte',
      executionMode: 'batch'
    });
    assertTrue(cteResult.sql.includes('WITH lookup_keys (item_id) AS'), 'Should generate CTE with lookup_keys');
    assertTrue(cteResult.sql.includes('JOIN lookup_keys'), 'Should join CTE');

    // Individual Statements
    const indResult = generatePostgresSelectQuery({
      tableName: 'accounts',
      matchColumns: [
        { id: 'm1', name: 'account_no', type: 'text', valueMode: 'list', singleValue: '', values: ['ACC-1', 'ACC-2'] }
      ],
      selectColumns: [{ id: 's1', name: 'balance' }],
      strategy: 'individual',
      executionMode: 'individual',
      includeRowComments: true
    });
    assertTrue(indResult.sql.includes('-- Query 1 (account_no=ACC-1)'), 'Should include row comment for Query 1');
    assertTrue(indResult.sql.includes('-- Query 2 (account_no=ACC-2)'), 'Should include row comment for Query 2');

    // UNION ALL
    const unionResult = generatePostgresSelectQuery({
      tableName: 'logs',
      matchColumns: [
        { id: 'm1', name: 'level', type: 'text', valueMode: 'list', singleValue: '', values: ['warn', 'error'] }
      ],
      selectColumns: [{ id: 's1', name: 'message' }],
      strategy: 'union_all',
      executionMode: 'batch'
    });
    assertTrue(unionResult.sql.includes('UNION ALL'), 'Should combine statements with UNION ALL');
    assertTrue(unionResult.sql.includes('1 AS query_index'), 'Should include query index provenance');
  });

  test('Database Select Query Generator', 'Export and Import Configuration Reusability', () => {
    const exportedConfig = createDbSelectConfigExport({
      name: 'Product Inventory Search',
      description: 'Find products across warehouses',
      tableName: 'products',
      matchColumns: [
        { id: 'm1', name: 'category', type: 'text', valueMode: 'single', singleValue: 'electronics', values: ['electronics'] },
        { id: 'm2', name: 'sku', type: 'text', valueMode: 'list', singleValue: '', values: ['SKU-A', 'SKU-B'] }
      ],
      selectColumns: [
        { id: 's1', name: 'sku' },
        { id: 's2', name: 'price' }
      ],
      selectAllColumns: false,
      customSelectClause: 'sku, price, stock',
      strategy: 'batch_values',
      executionMode: 'batch',
      isDistinct: true,
      orderBy: 'sku ASC',
      limit: '100'
    });

    assertTrue(exportedConfig.version === 1, 'Config version must be 1');
    assertTrue(exportedConfig.app === 'devhub-db-select-generator', 'App identifier must match');
    assertTrue(exportedConfig.tableName === 'products', 'Table name must be products');
    assertTrue(exportedConfig.isDistinct === true, 'isDistinct must be true');

    const jsonStr = JSON.stringify(exportedConfig, null, 2);
    const parsed = validateAndParseDbSelectConfig(jsonStr);
    assertTrue(parsed.success === true, `Failed to parse select config: ${parsed.error}`);
    assertTrue(parsed.config?.tableName === 'products', 'Imported tableName must match');
    assertTrue(parsed.config?.matchColumns.length === 2, 'Should have 2 match columns');
    assertTrue(parsed.config?.isDistinct === true, 'Imported isDistinct must be true');

    // Round-trip query generation from parsed config
    const generated = generatePostgresSelectQuery(parsed.config!);
    assertTrue(generated.rowCount === 2, `Expected 2 rows, got ${generated.rowCount}`);
    assertTrue(generated.sql.includes('SELECT DISTINCT'), 'Should include DISTINCT keyword');
    assertTrue(generated.sql.includes('LIMIT 100'), 'Should include LIMIT 100');
  });

  test('Database Select Query Generator', 'Supports Queries Without Table Alias', () => {
    // 1. in_clause without alias
    const inClauseNoAlias = generatePostgresSelectQuery({
      tableName: 'customers',
      useTableAlias: false,
      tableAlias: '',
      matchColumns: [
        { id: 'm1', name: 'status', type: 'text', valueMode: 'single', singleValue: 'active', values: ['active'] },
        { id: 'm2', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['1', '2', '3'] }
      ],
      selectColumns: [
        { id: 's1', name: 'id' },
        { id: 's2', name: 'email' }
      ],
      selectAllColumns: false,
      strategy: 'in_clause',
      executionMode: 'batch'
    });

    assertTrue(inClauseNoAlias.sql.includes('FROM customers\nWHERE'), 'Should generate FROM customers without AS alias');
    assertTrue(!inClauseNoAlias.sql.includes('customers AS'), 'Should not contain AS alias');
    assertTrue(inClauseNoAlias.sql.includes('id IN ('), 'Should not prefix with table alias in in_clause');
    assertTrue(inClauseNoAlias.sql.includes("status = 'active'"), 'Should use clean column name in WHERE');

    // 2. batch_values without alias
    const batchValuesNoAlias = generatePostgresSelectQuery({
      tableName: 'users',
      useTableAlias: false,
      tableAlias: '',
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['10', '20'] }
      ],
      selectColumns: [
        { id: 's1', name: 'id' },
        { id: 's2', name: 'username' }
      ],
      strategy: 'batch_values',
      executionMode: 'batch'
    });

    assertTrue(batchValuesNoAlias.sql.includes('FROM users\nJOIN'), 'Should generate FROM users without AS alias');
    assertTrue(!batchValuesNoAlias.sql.includes('users AS'), 'FROM clause should not have alias');
    assertTrue(batchValuesNoAlias.sql.includes('USING (id)'), 'JOIN condition should use USING (id) to avoid ambiguous column error');
    assertTrue(batchValuesNoAlias.sql.includes('id,\n  username'), 'Projection should have clean unqualified column names without alias');

    // 3. Custom select projection stripping alias when useTableAlias is false
    const customProjectionNoAlias = generatePostgresSelectQuery({
      tableName: 'users',
      useTableAlias: false,
      tableAlias: 't',
      selectColumns: [],
      customSelectClause: 't.id, t.username, t.email, t.status',
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['1', '2'] }
      ],
      strategy: 'in_clause',
      executionMode: 'batch'
    });
    assertTrue(!customProjectionNoAlias.sql.includes('t.id'), 'Custom select clause should strip t. alias prefix when useTableAlias is false');
    assertTrue(customProjectionNoAlias.sql.includes('id, username, email, status'), 'Unqualified columns should be present');

    // 4. Alias helpers: strip and prefix
    assertEqual(stripAliasFromExpression('t.id, t.username, t.email', 't'), 'id, username, email');
    assertEqual(stripAliasFromExpression('u.id ASC, u.created_at DESC', 'u'), 'id ASC, created_at DESC');
    assertEqual(prefixAliasToProjection('id, username, email', 't'), 't.id, t.username, t.email');
    assertEqual(prefixAliasToOrderBy('id ASC, created_at DESC', 't'), 't.id ASC, t.created_at DESC');
  });

  test('Database Select Query Generator', 'Supports Ordering by Order of Match and Filter Criteria List and Removes Conflicting ORDER BY', () => {
    // 1. batch_values strategy with order by match list and manual orderBy supplied -> manual orderBy should be REMOVED
    const batchValuesOrdered = generatePostgresSelectQuery({
      tableName: 'orders',
      useTableAlias: true,
      tableAlias: 't',
      orderBy: 't.created_at DESC, t.id ASC', // should be removed because orderByMatchColumnId is active!
      matchColumns: [
        { id: 'm-order-ids', name: 'order_id', type: 'text', valueMode: 'list', singleValue: '', values: ['ORD-99', 'ORD-12', 'ORD-44'] }
      ],
      selectColumns: [{ id: 's1', name: '*' }],
      selectAllColumns: true,
      strategy: 'batch_values',
      executionMode: 'batch',
      orderByMatchColumnId: 'm-order-ids',
      orderByMatchDirection: 'ASC'
    });

    assertTrue(batchValuesOrdered.sql.includes('AS v(order_id, _ord)'), 'Values alias should include _ord column');
    assertTrue(batchValuesOrdered.sql.includes("('ORD-99', 1::int)"), 'Row values should include index for ordering');
    assertTrue(batchValuesOrdered.sql.includes('ORDER BY v._ord ASC'), 'Should ORDER BY v._ord ASC');
    assertTrue(!batchValuesOrdered.sql.includes('t.created_at'), 'Conflicting manual orderBy should be removed when match list order is active');

    // 2. in_clause strategy with order by match list (PostgreSQL array_position) and manual orderBy removed
    const inClauseOrdered = generatePostgresSelectQuery({
      tableName: 'products',
      useTableAlias: false,
      tableAlias: '',
      orderBy: 'price DESC', // should be removed!
      matchColumns: [
        { id: 'm-skus', name: 'sku', type: 'text', valueMode: 'list', singleValue: '', values: ['SKU-Z', 'SKU-A', 'SKU-M'] }
      ],
      selectColumns: [{ id: 's1', name: 'sku' }, { id: 's2', name: 'price' }],
      strategy: 'in_clause',
      executionMode: 'batch',
      orderByMatchColumnId: 'm-skus',
      orderByMatchDirection: 'DESC'
    });

    assertTrue(inClauseOrdered.sql.includes("array_position(ARRAY['SKU-Z', 'SKU-A', 'SKU-M']::text[], sku) DESC"), 'Should order by array_position with cast DESC');
    assertTrue(!inClauseOrdered.sql.includes('price DESC'), 'Manual orderBy should be removed when match list order is active');

    // 3. Manual ORDER BY without match list ordering when useTableAlias is false -> alias is stripped
    const manualOrderNoAlias = generatePostgresSelectQuery({
      tableName: 'products',
      useTableAlias: false,
      tableAlias: 't',
      orderBy: 't.price DESC, t.name ASC',
      matchColumns: [
        { id: 'm-skus', name: 'sku', type: 'text', valueMode: 'list', singleValue: '', values: ['SKU-1', 'SKU-2'] }
      ],
      selectColumns: [{ id: 's1', name: 'sku' }],
      strategy: 'in_clause',
      executionMode: 'batch'
    });
    assertTrue(manualOrderNoAlias.sql.includes('ORDER BY price DESC, name ASC'), 'Manual ORDER BY should have table alias stripped when useTableAlias is false');
    assertTrue(!manualOrderNoAlias.sql.includes('t.price'), 'No t. in ORDER BY');

    // 4. CTE strategy with order by match list
    const cteOrdered = generatePostgresSelectQuery({
      tableName: 'items',
      useTableAlias: true,
      tableAlias: 't',
      matchColumns: [
        { id: 'm-codes', name: 'code', type: 'text', valueMode: 'list', singleValue: '', values: ['C1', 'C2'] }
      ],
      selectColumns: [{ id: 's1', name: '*' }],
      selectAllColumns: true,
      strategy: 'cte',
      executionMode: 'batch',
      orderByMatchColumnId: 'm-codes',
      orderByMatchDirection: 'ASC'
    });

    assertTrue(cteOrdered.sql.includes('lookup_keys (code, _ord)'), 'CTE should include _ord column');
    assertTrue(cteOrdered.sql.includes('ORDER BY lookup_keys._ord ASC'), 'CTE should ORDER BY lookup_keys._ord ASC');

    // 5. Config export and import preserves no-alias and order by match list options
    const exportedWithNewFeatures = createDbSelectConfigExport({
      tableName: 'shipments',
      useTableAlias: false,
      tableAlias: '',
      orderByMatchColumnId: 'm-trk',
      orderByMatchDirection: 'ASC',
      matchColumns: [
        { id: 'm-trk', name: 'tracking_num', type: 'text', valueMode: 'list', singleValue: '', values: ['TRK-1', 'TRK-2'] }
      ],
      selectColumns: [{ id: 's1', name: 'tracking_num' }],
      strategy: 'batch_values',
      executionMode: 'batch'
    });

    assertTrue(exportedWithNewFeatures.useTableAlias === false, 'Exported useTableAlias must be false');
    assertTrue(exportedWithNewFeatures.orderByMatchColumnId === 'm-trk', 'Exported orderByMatchColumnId must match');

    const parsedJson = validateAndParseDbSelectConfig(JSON.stringify(exportedWithNewFeatures));
    assertTrue(parsedJson.success, 'Parsing exported JSON must succeed');
    assertTrue(parsedJson.config?.useTableAlias === false, 'Parsed useTableAlias must be false');
    assertTrue(parsedJson.config?.orderByMatchColumnId === 'm-trk', 'Parsed orderByMatchColumnId must match');

    const reGenerated = generatePostgresSelectQuery(parsedJson.config!);
    assertTrue(reGenerated.sql.includes('FROM shipments\nJOIN'), 'Re-generated query should not have AS alias');
    assertTrue(reGenerated.sql.includes('ORDER BY v._ord ASC'), 'Re-generated query should order by _ord');
  });

  test('Database Select Query Generator', 'Configurable Show NULL Data for Missing Rows (LEFT JOIN)', () => {
    // 1. batch_values strategy with showNullForMissing enabled
    const batchValuesNullData = generatePostgresSelectQuery({
      tableName: 'users',
      useTableAlias: true,
      tableAlias: 't',
      showNullForMissing: true,
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['101', '999'] }
      ],
      selectColumns: [
        { id: 's1', name: 'id' },
        { id: 's2', name: 'username' },
        { id: 's3', name: 'email' }
      ],
      strategy: 'batch_values',
      executionMode: 'batch'
    });

    assertTrue(batchValuesNullData.sql.includes('LEFT JOIN users AS t'), 'batch_values should use LEFT JOIN to preserve unmatched rows');
    assertTrue(batchValuesNullData.sql.includes('FROM (\n  VALUES'), 'Driving table should be the VALUES clause');
    assertTrue(batchValuesNullData.sql.includes('COALESCE(t.id, v.id) AS id'), 'Match column in projection should use COALESCE to retain search key');
    assertTrue(batchValuesNullData.sql.includes('t.username'), 'Target column username should be selected from t');

    // 2. batch_values with showNullForMissing = false (default) should still use standard JOIN
    const batchValuesDefault = generatePostgresSelectQuery({
      tableName: 'users',
      useTableAlias: true,
      tableAlias: 't',
      showNullForMissing: false,
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['101', '999'] }
      ],
      selectColumns: [
        { id: 's1', name: 'id' },
        { id: 's2', name: 'username' }
      ],
      strategy: 'batch_values',
      executionMode: 'batch'
    });
    assertTrue(batchValuesDefault.sql.includes('FROM users AS t\n  JOIN'), 'Default behavior should use standard JOIN');
    assertTrue(!batchValuesDefault.sql.includes('LEFT JOIN'), 'Default behavior should NOT use LEFT JOIN');

    // 3. CTE strategy with showNullForMissing enabled
    const cteNullData = generatePostgresSelectQuery({
      tableName: 'users',
      useTableAlias: true,
      tableAlias: 't',
      showNullForMissing: true,
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['101', '999'] }
      ],
      selectColumns: [
        { id: 's1', name: 'id' },
        { id: 's2', name: 'username' }
      ],
      strategy: 'cte',
      executionMode: 'batch'
    });
    assertTrue(cteNullData.sql.includes('FROM lookup_keys\nLEFT JOIN users AS t'), 'CTE should select from lookup_keys and LEFT JOIN target table');
    assertTrue(cteNullData.sql.includes('COALESCE(t.id, lookup_keys.id) AS id'), 'CTE should COALESCE match column to lookup_keys');

    // 4. Config export and parsing preserves showNullForMissing
    const exportedConfig = createDbSelectConfigExport({
      tableName: 'customers',
      showNullForMissing: true,
      matchColumns: [
        { id: 'm1', name: 'id', type: 'integer', valueMode: 'list', singleValue: '', values: ['501'] }
      ],
      selectColumns: [{ id: 's1', name: 'id' }],
      strategy: 'batch_values',
      executionMode: 'batch'
    });
    assertTrue(exportedConfig.showNullForMissing === true, 'Exported config should have showNullForMissing true');

    const parsedConfig = validateAndParseDbSelectConfig(JSON.stringify(exportedConfig));
    assertTrue(parsedConfig.success && parsedConfig.config?.showNullForMissing === true, 'Parsed config should have showNullForMissing true');

    const queryFromParsed = generatePostgresSelectQuery(parsedConfig.config!);
    assertTrue(queryFromParsed.sql.includes('LEFT JOIN'), 'Query from parsed config should generate LEFT JOIN');
  });

  test('Data Grid Converter', 'CSV Parsing with RFC 4180 Quotes & Escaped Commas', () => {
    const rawCsv = `id,name,notes,amount\n1,"Acme, Corp","Fast, reliable delivery",150.50\n2,"Smith, John ""CEO""",Normal,200.00`;
    const grid = parseToDataGrid(rawCsv, {
      delimiter: 'comma',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: true,
      skipEmptyLines: true,
      ignoreComments: true,
    });

    assertEqual(grid.headers.length, 4, 'Should parse 4 headers');
    assertEqual(grid.headers[0], 'id');
    assertEqual(grid.headers[1], 'name');
    assertEqual(grid.headers[2], 'notes');
    assertEqual(grid.rows.length, 2, 'Should parse 2 data rows');
    assertEqual(grid.rows[0][1], 'Acme, Corp', 'Should preserve comma inside quotes');
    assertEqual(grid.rows[0][2], 'Fast, reliable delivery', 'Should preserve quoted phrase');
    assertEqual(grid.rows[1][1], 'Smith, John "CEO"', 'Should unescape double quotes');
  });

  test('Data Grid Converter', 'Tab-Separated (TSV) and Space-Separated CLI Data Parsing', () => {
    // 1. TSV parsing
    const tsvData = `user_id\trole\tactive\nU101\tAdmin\ttrue\nU102\tDeveloper\tfalse`;
    const tsvGrid = parseToDataGrid(tsvData, {
      delimiter: 'tab',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: false,
      skipEmptyLines: true,
      ignoreComments: true,
    });
    assertEqual(tsvGrid.headers.length, 3, 'TSV should have 3 columns');
    assertEqual(tsvGrid.rows.length, 2, 'TSV should have 2 rows');
    assertEqual(tsvGrid.rows[0][1], 'Admin', 'TSV value should match');

    // 2. Space-separated CLI output (like ps aux or docker ps)
    const spaceData = `PID   USER    CPU   CMD\n1     root    0.0   /sbin/init\n1450  nginx   0.4   nginx-worker`;
    const spaceGrid = parseToDataGrid(spaceData, {
      delimiter: 'space',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: true,
      skipEmptyLines: true,
      ignoreComments: true,
    });
    assertEqual(spaceGrid.headers.length, 4, 'Space grid should have 4 headers');
    assertEqual(spaceGrid.rows.length, 2, 'Space grid should have 2 rows');
    assertEqual(spaceGrid.rows[1][0], '1450', 'PID should be parsed correctly');
    assertEqual(spaceGrid.rows[1][3], 'nginx-worker', 'CMD should be parsed correctly');
  });

  test('Data Grid Converter', 'Auto Delimiter Detection', () => {
    const csvDetected = detectDelimiter('col1,col2,col3\nval1,val2,val3');
    assertEqual(csvDetected.type, 'comma', 'Should detect comma delimiter');

    const tsvDetected = detectDelimiter('col1\tcol2\tcol3\nval1\tval2\tval3');
    assertEqual(tsvDetected.type, 'tab', 'Should detect tab delimiter');

    const pipeDetected = detectDelimiter('col1|col2|col3\nval1|val2|val3');
    assertEqual(pipeDetected.type, 'pipe', 'Should detect pipe delimiter');

    const semiDetected = detectDelimiter('col1;col2;col3\nval1;val2;val3');
    assertEqual(semiDetected.type, 'semicolon', 'Should detect semicolon delimiter');
  });

  test('Data Grid Converter', 'Column Data Extraction & Copying Formats', () => {
    const rawData = `city,country,population\nTokyo,Japan,37400000\nDelhi,India,29300000\nShanghai,China,26300000`;
    const grid = parseToDataGrid(rawData, {
      delimiter: 'comma',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: false,
      skipEmptyLines: true,
      ignoreComments: true,
    });

    // 1. Newline list
    const newlineList = extractColumnData(grid, 0, 'newline');
    assertEqual(newlineList, 'Tokyo\nDelhi\nShanghai', 'Should extract column as newline list');

    // 2. Comma separated
    const commaList = extractColumnData(grid, 0, 'comma_space');
    assertEqual(commaList, 'Tokyo, Delhi, Shanghai', 'Should extract column as comma separated string');

    // 3. SQL IN format
    const sqlInList = extractColumnData(grid, 0, 'single_quote_sql');
    assertEqual(sqlInList, "'Tokyo', 'Delhi', 'Shanghai'", 'Should format as SQL IN clause');

    // 4. JSON Array format
    const jsonArrayList = extractColumnData(grid, 0, 'json_array');
    assertTrue(jsonArrayList.includes('"Tokyo"'), 'Should format as JSON array');

    // 5. Column stats
    const popStats = calculateColumnStats(grid, 2);
    assertEqual(popStats.type, 'integer', 'Population should be detected as integer');
    assertEqual(popStats.totalCount, 3);
    assertTrue(popStats.numericStats !== undefined && popStats.numericStats.min === 26300000, 'Numeric stats min should match');
  });

  test('Data Grid Converter', 'Grid Transformations: Transpose, Deduplicate, Sort, Filter', () => {
    const rawData = `name,score\nCharlie,85\nAlice,95\nBob,70\nAlice,95`;
    const grid = parseToDataGrid(rawData, {
      delimiter: 'comma',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: false,
      skipEmptyLines: true,
      ignoreComments: true,
    });

    // 1. Deduplicate
    const dedupResult = deduplicateGridRows(grid);
    assertEqual(dedupResult.removedCount, 1, 'Should remove 1 duplicate row');
    assertEqual(dedupResult.grid.rows.length, 3, 'Unique rows should be 3');

    // 2. Sort by score ASC
    const sortedGrid = sortGridRows(dedupResult.grid, 1, 'asc');
    assertEqual(sortedGrid.rows[0][0], 'Bob', 'Lowest score row should be first');
    assertEqual(sortedGrid.rows[2][0], 'Alice', 'Highest score row should be last');

    // 3. Filter by search query
    const filteredGrid = filterGridRows(dedupResult.grid, 'Charlie');
    assertEqual(filteredGrid.rows.length, 1, 'Filter should return 1 matching row');
    assertEqual(filteredGrid.rows[0][0], 'Charlie');

    // 4. Transpose
    const simple = parseToDataGrid(`A,B\n1,2\n3,4`, {
      delimiter: 'comma',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: false,
      skipEmptyLines: true,
      ignoreComments: true,
    });
    const transposed = transposeDataGrid(simple);
    assertEqual(transposed.headers.length, 3, 'Transposed should have 3 headers');
    assertEqual(transposed.headers[0], 'A');
    assertEqual(transposed.headers[1], '1');
    assertEqual(transposed.headers[2], '3');
  });

  test('Data Grid Converter', 'Multi-Format Exporters (CSV, TSV, JSON, Markdown, SQL, HTML, ASCII)', () => {
    const rawData = `id,name,active\n1,Alice,true\n2,Bob,false`;
    const grid = parseToDataGrid(rawData, {
      delimiter: 'comma',
      hasHeader: true,
      trimCells: true,
      collapseSpaces: false,
      skipEmptyLines: true,
      ignoreComments: true,
    });

    // CSV
    const csvExport = exportDataGrid(grid, 'csv');
    assertTrue(csvExport.includes('id,name,active'), 'CSV export should include headers');
    assertTrue(csvExport.includes('1,Alice,true'), 'CSV export should include row 1');

    // TSV
    const tsvExport = exportDataGrid(grid, 'tsv');
    assertTrue(tsvExport.includes('id\tname\tactive'), 'TSV export should include tab separators');

    // JSON Objects
    const jsonObjExport = exportDataGrid(grid, 'json_objects');
    assertTrue(jsonObjExport.includes('"name": "Alice"'), 'JSON Objects export should map keys to values');

    // Markdown Table
    const mdExport = exportDataGrid(grid, 'markdown');
    assertTrue(mdExport.includes('| id'), 'Markdown export should have table pipes');
    assertTrue(mdExport.includes('| ---'), 'Markdown export should have header divider');

    // SQL INSERT
    const sqlExport = exportDataGrid(grid, 'sql_insert', { tableName: 'users' });
    assertTrue(sqlExport.includes('INSERT INTO users'), 'SQL export should generate INSERT statements');
    assertTrue(sqlExport.includes("'Alice'"), 'SQL export should quote string literals');

    // HTML Table
    const htmlExport = exportDataGrid(grid, 'html');
    assertTrue(htmlExport.includes('<table>') || htmlExport.includes('<table class="table">'), 'HTML export should render table tag');
    assertTrue(htmlExport.includes('<th>name</th>'), 'HTML export should render headers');

    // ASCII Box
    const asciiExport = exportDataGrid(grid, 'ascii');
    assertTrue(asciiExport.includes('+'), 'ASCII export should render bordered box grid');
  });

  // =========================================================================
  // DATABASE CATEGORY MATCHER TESTS
  // =========================================================================
  test('Category Matcher', 'SME Compound Rule Logic Evaluation', () => {
    const config = DEFAULT_MATCHER_CONFIG;

    // Micro SME: <=9 employees AND (turnover <= 2M OR balance <= 2M)
    const microSmeRow = {
      id: '1',
      name: 'Micro Test Co',
      recordedCategory: 'Micro SME',
      metrics: {
        no_of_employees: 6,
        annual_turnover: 1500000,
        balance_sheet: 1800000,
      },
    };
    const resMicro = evaluateLocalRow(microSmeRow, config.metricColumns, config.categories, config.ruleLogic);
    assertEqual(resMicro.expectedCategory, 'Micro SME', 'Should evaluate to Micro SME');
    assertEqual(resMicro.status, 'MATCH', 'Should report status as MATCH');

    // Mismatched Row: in DB recorded as Micro SME, but employees is 15 -> should be SME
    const mismatchRow = {
      id: '2',
      name: 'Growing Tech Ltd',
      recordedCategory: 'Micro SME',
      metrics: {
        no_of_employees: 15,
        annual_turnover: 4000000,
        balance_sheet: 3000000,
      },
    };
    const resMismatch = evaluateLocalRow(mismatchRow, config.metricColumns, config.categories, config.ruleLogic);
    assertEqual(resMismatch.expectedCategory, 'SME', 'Expected category should be SME');
    assertEqual(resMismatch.status, 'MISMATCH', 'Should detect category mismatch');

    // Small Midcap: <=499 employees, turnover & balance unbounded
    const midcapRow = {
      id: '3',
      name: 'Midcap Industrial',
      recordedCategory: 'Small Midcap',
      metrics: {
        no_of_employees: 350,
        annual_turnover: 120000000,
        balance_sheet: 95000000,
      },
    };
    const resMidcap = evaluateLocalRow(midcapRow, config.metricColumns, config.categories, config.ruleLogic);
    assertEqual(resMidcap.expectedCategory, 'Small Midcap', 'Should classify as Small Midcap');

    // Fallback: > 499 employees
    const largeRow = {
      id: '4',
      name: 'Global Conglomerate',
      recordedCategory: 'Large Enterprise',
      metrics: {
        no_of_employees: 1200,
        annual_turnover: 500000000,
        balance_sheet: 400000000,
      },
    };
    const resLarge = evaluateLocalRow(largeRow, config.metricColumns, config.categories, config.ruleLogic);
    assertEqual(resLarge.expectedCategory, 'Large Enterprise', 'Should fallback to Large Enterprise');
  });

  test('Category Matcher', 'Metadata TSV/CSV Parser', () => {
    const rawInput = `1\t"Micro SME"\t9\t2000000\t2000000
2\t"SME"\t249\t50000000\t43000000
3\t"Small Midcap"\t499`;

    const parsed = parseCategoryMetadataInput(rawInput, DEFAULT_MATCHER_CONFIG.metricColumns);
    assertEqual(parsed.categories.length, 3, 'Should parse 3 category rules');
    assertEqual(parsed.categories[0].categoryName, 'Micro SME', 'First category should be Micro SME');
    assertEqual(parsed.categories[0].criteria.no_of_employees.value, '9', 'Micro SME employees threshold should be 9');
    assertEqual(parsed.categories[1].categoryName, 'SME', 'Second category should be SME');
    assertEqual(parsed.categories[1].criteria.no_of_employees.value, '249', 'SME employees threshold should be 249');
    assertEqual(parsed.categories[2].categoryName, 'Small Midcap', 'Third category should be Small Midcap');
    assertEqual(parsed.categories[2].criteria.no_of_employees.value, '499', 'Small Midcap employees threshold should be 499');
    assertEqual(parsed.categories[2].criteria.annual_turnover.value, '', 'Small Midcap turnover should be empty/unbounded');
  });

  test('Category Matcher', 'PostgreSQL Queries & pg8000 Script Generation', () => {
    const queries = generatePostgresCategoryQueries(DEFAULT_MATCHER_CONFIG);
    assertTrue(queries.discrepancySelectQuery.includes('SELECT'), 'Discrepancy query should contain SELECT');
    assertTrue(queries.discrepancySelectQuery.includes('CASE'), 'Discrepancy query should contain CASE statement');
    assertTrue(queries.discrepancySelectQuery.includes('WHERE'), 'Discrepancy query should filter mismatches');
    assertTrue(queries.classificationSelectQuery.includes('expected_category'), 'Classification query should project expected_category');
    assertTrue(queries.updateTargetTableQuery.includes('UPDATE business_entities'), 'Update query should target business_entities table');
    assertTrue(queries.createPostgresViewQuery.includes('CREATE OR REPLACE VIEW'), 'View query should create or replace view');
    assertTrue(queries.cteRulesJoinQuery.includes('category_rules AS'), 'CTE query should define category_rules CTE');

    const pythonScript = generatePg8000PythonScript(DEFAULT_MATCHER_CONFIG);
    assertTrue(pythonScript.includes('import pg8000.native'), 'Python script should import pg8000.native');
    assertTrue(pythonScript.includes('def validate_categories'), 'Python script should define validate_categories');
    assertTrue(pythonScript.includes('argparse.ArgumentParser'), 'Python script should have CLI argument parser');
  });

  test('Category Matcher', 'Configuration Export & Import Validation', () => {
    const exportedJson = createMatcherConfigExport(DEFAULT_MATCHER_CONFIG);
    assertTrue(typeof exportedJson === 'string', 'Export should return string');
    assertTrue(exportedJson.includes('"targetTable"'), 'Export should include targetTable');

    const parseResult = validateAndParseMatcherConfig(exportedJson);
    assertTrue(parseResult.success, 'Parsing valid export should succeed');
    assertEqual(parseResult.config?.categories.length, DEFAULT_MATCHER_CONFIG.categories.length, 'Category count should match');

    // Invalid JSON test
    const invalidResult = validateAndParseMatcherConfig('{ invalid: json');
    assertTrue(!invalidResult.success, 'Invalid JSON should return failure');
    assertTrue(invalidResult.error !== undefined, 'Invalid JSON should have error message');
  });

  // =========================================================================
  // DATABASE QUERY BUILDER TESTS (SINGLE & LIST CONDITIONS)
  // =========================================================================
  test('Database Query Builder', 'Date & Time Normalization for PostgreSQL', () => {
    // DD/MM/YYYY
    const dmy = normalizePostgresDate('24/10/2023');
    assertEqual(dmy.normalized, '2023-10-24', 'DD/MM/YYYY should convert to ISO YYYY-MM-DD');
    assertEqual(dmy.isTimestamp, false, 'Should be date not timestamp');

    // DD-MM-YYYY with time
    const dmyTime = normalizePostgresDate('24-10-2023 15:30:00');
    assertEqual(dmyTime.normalized, '2023-10-24 15:30:00', 'Should convert to ISO timestamp');
    assertEqual(dmyTime.isTimestamp, true, 'Should detect timestamp');

    // formatSqlValue
    const sqlDate = formatSqlValue('24/10/2023', 'date');
    assertEqual(sqlDate, "'2023-10-24'::date", 'Should format valid date literal with cast');

    const sqlTime = formatSqlValue('24/10/2023 15:30:00', 'timestamp');
    assertEqual(sqlTime, "'2023-10-24 15:30:00'::timestamp", 'Should format valid timestamp literal');

    // SQL Expression preservation
    const kw = normalizePostgresDate("CURRENT_DATE - INTERVAL '7 days'");
    assertTrue(kw.isKeyword, 'Should detect SQL date expression keyword');
  });

  test('Database Query Builder', 'Excel & Spreadsheet List Parser', () => {
    // Excel column copy (newlines)
    const excelCol = `1001\r\n1002\r\n1003\r\n1002\r\n1004`;
    const parsedCol = parseExcelListInput(excelCol, { deduplicate: true });
    assertEqual(parsedCol.count, 4, 'Should parse 4 unique items after deduplication');
    assertEqual(parsedCol.duplicatesRemoved, 1, 'Should record 1 duplicate removed');
    assertEqual(parsedCol.detectedType, 'integer', 'Should detect integer column type');

    // Quoted strings from spreadsheet
    const quoted = `"sarah@company.com"\n"david@company.com"\n"alex@company.com"`;
    const parsedQuoted = parseExcelListInput(quoted, { trimQuotes: true });
    assertEqual(parsedQuoted.count, 3, 'Should parse 3 emails');
    assertEqual(parsedQuoted.values[0], 'sarah@company.com', 'Should strip double quotes');

    // Tab-separated row copy
    const tabRow = `alpha\tbeta\tgamma`;
    const parsedTab = parseExcelListInput(tabRow, { delimiter: 'tab' });
    assertEqual(parsedTab.count, 3, 'Should parse 3 tab-separated items');
  });

  test('Database Query Builder', 'PostgreSQL Query & CTE Generation', () => {
    const bundle = generatePostgresQueries(DEFAULT_QUERY_BUILDER_CONFIG);
    assertTrue(bundle.mainSql.includes('SELECT'), 'Main SQL should contain SELECT');
    assertTrue(bundle.mainSql.includes('FROM customer_orders'), 'Should query customer_orders');
    assertTrue(bundle.mainSql.includes("'2023-10-24'::date"), 'Should have converted date format in WHERE');
    assertTrue(bundle.mainSql.includes('customer_id IN'), 'Should generate IN list condition');

    // CTE Bulk Join
    assertTrue(bundle.cteJoinSql.includes('WITH filter_values'), 'CTE query should declare filter_values CTE');
    assertTrue(bundle.cteJoinSql.includes('JOIN filter_values'), 'CTE query should join filter_values');

    // Python script with pg8000
    assertTrue(bundle.pythonScript.includes('import pg8000.native'), 'Python script should import pg8000.native');
    assertTrue(bundle.pythonScript.includes('def execute_query'), 'Python script should define execute_query');
  });

  test('Database Query Builder', 'Configuration Export & Import Roundtrip', () => {
    const jsonStr = createDbQueryBuilderExport(DEFAULT_QUERY_BUILDER_CONFIG);
    assertTrue(jsonStr.includes('customer_orders'), 'Exported JSON should include table name');

    const res = validateAndParseDbQueryBuilderConfig(jsonStr);
    assertTrue(res.success, 'Valid JSON should parse successfully');
    assertEqual(res.config?.targetTable.tableName, 'customer_orders', 'Table name should match');
    assertEqual(res.config?.singleConditions.length, DEFAULT_QUERY_BUILDER_CONFIG.singleConditions.length, 'Single conditions count match');

    // Invalid JSON
    const bad = validateAndParseDbQueryBuilderConfig('{ bad json }');
    assertTrue(!bad.success, 'Should reject malformed JSON');
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
