import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Terminal,
  Settings2,
  ChevronDown,
  ChevronUp,
  Layers,
  Key,
  Globe,
  Code2,
  FileCode,
  Shield,
  Zap,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  MoveUp,
  MoveDown,
  CopyPlus,
  Database,
  CheckCircle2,
  HelpCircle,
  Server,
  Lock,
  Workflow,
  AlertCircle,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { parseCurlCommand, ParsedCurlRequest } from '../../utils/curlParser';
import {
  PythonClientLibrary,
  ScriptStructure,
  TokenExtractionConfig,
  TokenInjectionConfig,
  COMMON_RESPONSE_TOKENS,
  COMMON_TOKEN_HEADERS,
  DEFAULT_EXTRACTION_CONFIG,
  DEFAULT_INJECTION_CONFIG,
} from '../../utils/curlChainConverter';
import {
  AnyChainStep,
  CurlChainStep,
  DatabaseChainStep,
  DatabaseConfig,
  SupportedDatabaseType,
  SqlServerDriver,
  PythonDbChainOptions,
  DEFAULT_DATABASE_CONFIG,
  DEFAULT_DB_CHAIN_OPTIONS,
  generateCurlAndDatabaseScript,
  getDatabaseMeta,
} from '../../utils/curlDbChainConverter';

interface PresetDefinition {
  id: string;
  name: string;
  badge: string;
  dbType: SupportedDatabaseType;
  description: string;
  loginCurl: string;
  steps: AnyChainStep[];
  dbConfig: Partial<DatabaseConfig>;
  extraction: TokenExtractionConfig;
  injection: TokenInjectionConfig;
}

const PRESETS: PresetDefinition[] = [
  {
    id: 'user-auth-db-audit',
    name: 'User Auth & PostgreSQL Audit Verification',
    badge: 'PostgreSQL',
    dbType: 'postgresql',
    description: 'Login via API token, verify active user record in PostgreSQL via pg8000, fetch profile, and inspect audit logs',
    loginCurl: `curl -X POST https://api.example.com/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{"email": "qa.engineer@company.org", "password": "SuperSecretPass123!"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'token',
      variableName: 'token',
    },
    injection: {
      placement: 'header',
      headerName: 'Authorization',
      headerFormat: 'Bearer {token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    },
    dbConfig: {
      dbType: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'production_db',
      user: 'postgres',
      useEnvVars: true,
      interfaceStyle: 'dbapi',
    },
    steps: [
      {
        id: 'step-db-1',
        type: 'database',
        name: 'Verify User Record in PostgreSQL',
        query: `SELECT id, email, role, is_active, created_at
FROM users
WHERE email = 'qa.engineer@company.org'
LIMIT 1;`,
        params: '',
        fetchMode: 'fetchone',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'row is not None and row["is_active"] is True',
        description: 'Ensure user status in DB is active before making API operations',
      },
      {
        id: 'step-curl-1',
        type: 'curl',
        name: 'Get User Account Profile',
        curl: `curl -X GET https://api.example.com/v1/user/profile \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer <token>"`,
        enabled: true,
      },
      {
        id: 'step-db-2',
        type: 'database',
        name: 'Inspect Recent Login Audit Logs',
        query: `SELECT id, user_email, action, ip_address, created_at
FROM audit_logs
WHERE user_email = 'qa.engineer@company.org'
ORDER BY created_at DESC
LIMIT 5;`,
        params: '',
        fetchMode: 'fetchall',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'len(rows) > 0',
        description: 'Verify login audit trail was properly persisted by the auth service',
      },
    ],
  },
  {
    id: 'sqlserver-customer-audit',
    name: 'SQL Server (T-SQL) Customer Verification & Audit',
    badge: 'SQL Server',
    dbType: 'sqlserver',
    description: 'OAuth token authentication with Microsoft SQL Server checks using pymssql (T-SQL SELECT TOP 1 and updates)',
    loginCurl: `curl -X POST https://auth.enterprise.net/oauth/v2/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&client_id=erp_client&client_secret=secret_xyz"`,
    extraction: {
      source: 'json_body',
      keyPath: 'access_token',
      variableName: 'access_token',
    },
    injection: {
      placement: 'header',
      headerName: 'Authorization',
      headerFormat: 'Bearer {token}',
      queryParamName: 'access_token',
      bodyFieldName: 'access_token',
    },
    dbConfig: {
      dbType: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'ERP_Production',
      user: 'sa',
      sqlServerDriver: 'pymssql',
      useEnvVars: true,
      returnAsDict: true,
      autoCommit: true,
    },
    steps: [
      {
        id: 'step-sqlserver-check-user',
        type: 'database',
        name: 'Query Customer Record in SQL Server',
        query: `SELECT TOP 1 CustomerID, CompanyName, ContactName, AccountStatus, CreditLimit
FROM dbo.Customers
WHERE ContactEmail = 'client@enterprise.net';`,
        params: '',
        fetchMode: 'fetchone',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'row is not None and row.get("AccountStatus") == "ACTIVE"',
        description: 'Verify customer account exists and is ACTIVE in SQL Server',
      },
      {
        id: 'step-curl-dispatch-job',
        type: 'curl',
        name: 'Dispatch Workflow Job via REST API',
        curl: `curl -X POST https://api.enterprise.net/v1/jobs/sync \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"jobType": "ACCOUNT_RECONCILIATION", "priority": "HIGH"}'`,
        enabled: true,
      },
      {
        id: 'step-sqlserver-verify-log',
        type: 'database',
        name: 'Assert Audit Log Inserted in SQL Server',
        query: `SELECT TOP 5 LogID, EventType, ExecutionStatus, CreatedAt
FROM dbo.IntegrationAuditLogs
ORDER BY CreatedAt DESC;`,
        params: '',
        fetchMode: 'fetchall',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'len(rows) > 0',
        description: 'Verify background job logged reconciliation event in SQL Server',
      },
    ],
  },
  {
    id: 'oracle-ledger-inspection',
    name: 'Oracle DB (PL/SQL) Token Verification & Ledger',
    badge: 'Oracle DB',
    dbType: 'oracle',
    description: 'Zero-client Thin Mode oracledb connection to Oracle Database with session authorization & ledger check',
    loginCurl: `curl -X POST https://finance.corp.internal/api/auth/session \\
  -H "Content-Type: application/json" \\
  -d '{"service_principal": "ledger_auditor", "passcode": "CertPass#9921"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'session_id',
      variableName: 'session_id',
    },
    injection: {
      placement: 'header',
      headerName: 'X-Financial-Session',
      headerFormat: '{token}',
      queryParamName: 'session_id',
      bodyFieldName: 'session_id',
    },
    dbConfig: {
      dbType: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'XEPDB1',
      oracleServiceName: 'XEPDB1',
      user: 'SYSTEM',
      useEnvVars: true,
      returnAsDict: true,
      autoCommit: true,
    },
    steps: [
      {
        id: 'step-oracle-verify-principal',
        type: 'database',
        name: 'Verify Authorization in Oracle Database',
        query: `SELECT principal_id, principal_name, security_clearance, status
FROM sec_principals
WHERE principal_name = 'ledger_auditor'
FETCH FIRST 1 ROWS ONLY`,
        params: '',
        fetchMode: 'fetchone',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'row is not None and row.get("status") == "APPROVED"',
        description: 'Assert principal privileges in Oracle DB using oracledb Thin Mode',
      },
      {
        id: 'step-curl-audit-report',
        type: 'curl',
        name: 'Generate Financial Audit Snapshot API',
        curl: `curl -X POST https://finance.corp.internal/api/v2/ledger/snapshot \\
  -H "Content-Type: application/json" \\
  -H "X-Financial-Session: <token>" \\
  -d '{"fiscal_quarter": "Q3", "reconcile": true}'`,
        enabled: true,
      },
      {
        id: 'step-oracle-audit-records',
        type: 'database',
        name: 'Fetch Recent Oracle Ledger Entries',
        query: `SELECT entry_id, account_code, amount, currency, transaction_time
FROM general_ledger_entries
ORDER BY transaction_time DESC
FETCH FIRST 10 ROWS ONLY`,
        params: '',
        fetchMode: 'fetchall',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'len(rows) > 0',
        description: 'Verify financial ledger entries updated in Oracle DB',
      },
    ],
  },
  {
    id: 'order-create-db-check',
    name: 'Order Creation API & PostgreSQL Verification',
    badge: 'PostgreSQL',
    dbType: 'postgresql',
    description: 'Authenticate, create an order via REST API, verify database row was inserted, then update shipping state',
    loginCurl: `curl -X POST https://api.example.com/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d 'grant_type=client_credentials&client_id=store_service&client_secret=sec_991823'`,
    extraction: {
      source: 'json_body',
      keyPath: 'access_token',
      variableName: 'access_token',
    },
    injection: {
      placement: 'header',
      headerName: 'Authorization',
      headerFormat: 'Bearer {token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    },
    dbConfig: {
      dbType: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'ecommerce_db',
      user: 'postgres',
      useEnvVars: true,
      interfaceStyle: 'dbapi',
    },
    steps: [
      {
        id: 'step-curl-order-create',
        type: 'curl',
        name: 'Create Customer Order via REST API',
        curl: `curl -X POST https://api.example.com/v1/orders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"sku": "ITEM-4092", "quantity": 2, "price": 49.99, "currency": "USD"}'`,
        enabled: true,
      },
      {
        id: 'step-db-order-verify',
        type: 'database',
        name: 'Query Created Order in PostgreSQL',
        query: `SELECT order_id, sku, quantity, price, status, created_at
FROM customer_orders
WHERE sku = 'ITEM-4092'
ORDER BY created_at DESC
LIMIT 1;`,
        params: '',
        fetchMode: 'fetchone',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'row is not None and row["status"] in ("pending", "created")',
        description: 'Assert database contains the order created by the API call',
      },
      {
        id: 'step-db-inventory-update',
        type: 'database',
        name: 'DML: Deduct Inventory Stock in PostgreSQL',
        query: `UPDATE warehouse_inventory
SET stock_level = stock_level - 2,
    updated_at = NOW()
WHERE sku = 'ITEM-4092';`,
        params: '',
        fetchMode: 'execute',
        enabled: true,
        assertRowCount: false,
        description: 'Execute DML operation directly in database via pg8000 with auto-commit',
      },
      {
        id: 'step-curl-order-summary',
        type: 'curl',
        name: 'Fetch Order Inventory Summary',
        curl: `curl -X GET https://api.example.com/v1/inventory/ITEM-4092/summary \\
  -H "Authorization: Bearer <token>"`,
        enabled: true,
      },
    ],
  },
  {
    id: 'db-preseed-api-validate',
    name: 'Database Pre-Seed & API Workflow Test',
    badge: 'Pre-Seed + API',
    dbType: 'postgresql',
    description: 'Seed test record into PostgreSQL using pg8000, call API to process it, and check final DB state',
    loginCurl: `curl -X POST https://api.example.com/api/v1/sessions \\
  -H "Content-Type: application/json" \\
  -d '{"client_key": "test_client_key_01"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'session_token',
      variableName: 'session_token',
    },
    injection: {
      placement: 'header',
      headerName: 'X-Session-Token',
      headerFormat: '{token}',
      queryParamName: 'session_token',
      bodyFieldName: 'session_token',
    },
    dbConfig: {
      dbType: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'integration_test_db',
      user: 'postgres',
      useEnvVars: true,
      interfaceStyle: 'dbapi',
    },
    steps: [
      {
        id: 'step-seed-db',
        type: 'database',
        name: 'Pre-Seed Account Balance in PostgreSQL',
        query: `INSERT INTO test_accounts (account_id, owner_email, balance, is_verified)
VALUES ('ACC-TEST-99', 'qa@example.com', 500.00, true)
ON CONFLICT (account_id)
DO UPDATE SET balance = 500.00;`,
        params: '',
        fetchMode: 'execute',
        enabled: true,
        assertRowCount: false,
        description: 'Ensure test fixture exists before running API test',
      },
      {
        id: 'step-curl-charge-api',
        type: 'curl',
        name: 'Deduct Account Balance via API',
        curl: `curl -X POST https://api.example.com/api/v1/accounts/ACC-TEST-99/charge \\
  -H "Content-Type: application/json" \\
  -H "X-Session-Token: <token>" \\
  -d '{"amount": 50.00, "reason": "Integration Test Charge"}'`,
        enabled: true,
      },
      {
        id: 'step-db-verify-new-balance',
        type: 'database',
        name: 'Assert Updated Balance in PostgreSQL',
        query: `SELECT account_id, balance, is_verified
FROM test_accounts
WHERE account_id = 'ACC-TEST-99';`,
        params: '',
        fetchMode: 'fetchone',
        enabled: true,
        assertRowCount: true,
        assertCondition: 'row is not None and float(row["balance"]) == 450.0',
        description: 'Verify 50.00 deduction was recorded accurately in PostgreSQL',
      },
    ],
  },
];

export const CurlDbChainConverterTool: React.FC = () => {
  // Preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESETS[0].id);

  // Login cURL input
  const [loginCurl, setLoginCurl] = useState<string>(PRESETS[0].loginCurl);

  // Mixed Steps (cURL or Database)
  const [steps, setSteps] = useState<AnyChainStep[]>(PRESETS[0].steps);

  // Extraction & Injection configs
  const [extraction, setExtraction] = useState<TokenExtractionConfig>(PRESETS[0].extraction);
  const [injection, setInjection] = useState<TokenInjectionConfig>(PRESETS[0].injection);

  // Database Config (PostgreSQL default)
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    ...DEFAULT_DATABASE_CONFIG,
    ...PRESETS[0].dbConfig,
  });

  // Generator Options
  const [options, setOptions] = useState<PythonDbChainOptions>(DEFAULT_DB_CHAIN_OPTIONS);

  // UI States
  const [activeTab, setActiveTab] = useState<'code' | 'flow' | 'guide'>('code');
  const [copied, setCopied] = useState<boolean>(false);
  const [showDbConfig, setShowDbConfig] = useState<boolean>(true);
  const [showGeneratorOptions, setShowGeneratorOptions] = useState<boolean>(false);
  const [isCustomResponseToken, setIsCustomResponseToken] = useState<boolean>(false);
  const [isCustomTokenHeader, setIsCustomTokenHeader] = useState<boolean>(false);

  // Active database metadata
  const currentDbMeta = useMemo(() => {
    return getDatabaseMeta(dbConfig.dbType, dbConfig);
  }, [dbConfig.dbType, dbConfig.sqlServerDriver]);

  // Parse login cURL live
  const parsedLogin: ParsedCurlRequest = useMemo(() => {
    return parseCurlCommand(loginCurl);
  }, [loginCurl]);

  // Generate Python Code
  const generatedPythonCode = useMemo(() => {
    try {
      return generateCurlAndDatabaseScript(
        loginCurl,
        steps,
        extraction,
        injection,
        dbConfig,
        options
      );
    } catch (err: any) {
      return `# Error generating Python script: ${err.message || String(err)}`;
    }
  }, [loginCurl, steps, extraction, injection, dbConfig, options]);

  // Handle Switch Database Type
  const handleSwitchDbType = (newType: SupportedDatabaseType) => {
    const meta = getDatabaseMeta(newType);
    setDbConfig((prev) => ({
      ...prev,
      dbType: newType,
      port: meta.defaultPort,
      user: meta.defaultUser,
      database: meta.defaultDb,
      oracleServiceName: newType === 'oracle' ? meta.defaultDb : prev.oracleServiceName,
    }));
  };

  // Handle Preset change
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setLoginCurl(preset.loginCurl);
    setSteps(preset.steps);
    setExtraction(preset.extraction);
    setInjection(preset.injection);
    setDbConfig((prev) => ({ ...prev, ...preset.dbConfig, dbType: preset.dbType }));

    const isStandardResp = COMMON_RESPONSE_TOKENS.some((t) => t.value === preset.extraction.keyPath);
    setIsCustomResponseToken(!isStandardResp);

    const isStandardHeader = COMMON_TOKEN_HEADERS.some((h) => h.header.toLowerCase() === preset.injection.headerName.toLowerCase());
    setIsCustomTokenHeader(!isStandardHeader);
  };

  // Add a new cURL Step
  const handleAddCurlStep = () => {
    const newId = `step-curl-${Date.now()}`;
    const newStep: CurlChainStep = {
      id: newId,
      type: 'curl',
      name: `Step ${steps.length + 2}: Custom API Request`,
      curl: `curl -X GET https://api.example.com/v1/resource \\
  -H "Accept: application/json" \\
  -H "${injection.headerName}: <placeholder>"`,
      enabled: true,
    };
    setSteps([...steps, newStep]);
  };

  // Add a new Database Step
  const handleAddDbStep = () => {
    const newId = `step-db-${Date.now()}`;
    let sampleQuery = `SELECT id, name, status, created_at\nFROM my_table\nWHERE status = 'active'\nLIMIT 10;`;
    if (dbConfig.dbType === 'sqlserver') {
      sampleQuery = `SELECT TOP 10 id, name, status, created_at\nFROM dbo.my_table\nWHERE status = 'active';`;
    } else if (dbConfig.dbType === 'oracle') {
      sampleQuery = `SELECT id, name, status, created_at\nFROM my_table\nWHERE status = 'active'\nFETCH FIRST 10 ROWS ONLY;`;
    }

    const newStep: DatabaseChainStep = {
      id: newId,
      type: 'database',
      name: `Step ${steps.length + 2}: ${currentDbMeta.shortName} Query`,
      query: sampleQuery,
      params: '',
      fetchMode: 'fetchall',
      enabled: true,
      assertRowCount: true,
      assertCondition: 'len(rows) > 0',
      description: `Execute query and verify records exist in ${currentDbMeta.shortName}`,
    };
    setSteps([...steps, newStep]);
  };

  // Update a step
  const handleUpdateStep = (id: string, updates: Partial<AnyChainStep>) => {
    setSteps((prev) =>
      prev.map((item) => (item.id === id ? ({ ...item, ...updates } as AnyChainStep) : item))
    );
  };

  // Delete a step
  const handleDeleteStep = (id: string) => {
    setSteps((prev) => prev.filter((item) => item.id !== id));
  };

  // Duplicate a step
  const handleDuplicateStep = (index: number) => {
    const itemToClone = steps[index];
    const cloned: AnyChainStep = {
      ...itemToClone,
      id: `step-${itemToClone.type}-${Date.now()}`,
      name: `${itemToClone.name} (Copy)`,
    };
    const nextList = [...steps];
    nextList.splice(index + 1, 0, cloned);
    setSteps(nextList);
  };

  // Move step up / down
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const nextList = [...steps];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);
    setSteps(nextList);
  };

  // Copy Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedPythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Python file
  const handleDownloadCode = () => {
    const blob = new Blob([generatedPythonCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `curl_${dbConfig.dbType}_chain_test.py`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Auto-detect token field from login cURL
  const autoDetectToken = () => {
    if (loginCurl.includes('oauth') || loginCurl.includes('token')) {
      setExtraction((prev) => ({ ...prev, keyPath: 'access_token', variableName: 'access_token' }));
    } else if (loginCurl.includes('jwt') || loginCurl.includes('token')) {
      setExtraction((prev) => ({ ...prev, keyPath: 'token', variableName: 'token' }));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-800 dark:text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-amber-500/10 border border-emerald-500/20 dark:border-emerald-500/30">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md">
              <Workflow className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              cURL & Database Chain to Python
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {currentDbMeta.badge}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl">
            Authenticate via cURL, extract bearer tokens, and seamlessly interweave REST API calls with database operations in{' '}
            <strong className="text-emerald-700 dark:text-emerald-300">PostgreSQL (pg8000)</strong>,{' '}
            <strong className="text-sky-700 dark:text-sky-300">SQL Server (pymssql/pyodbc)</strong>, or{' '}
            <strong className="text-amber-700 dark:text-amber-300">Oracle Database (oracledb Thin Mode)</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Python!' : 'Copy Script'}
          </button>
          <button
            onClick={handleDownloadCode}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
          >
            <Download className="w-4 h-4" />
            Download .py
          </button>
        </div>
      </div>

      {/* DATABASE TYPE SELECTOR (PostgreSQL Default) */}
      <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-500" />
            Target Database Engine:
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            PostgreSQL is selected by default. Choose your dialect to generate tailored drivers and connection code:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {/* PostgreSQL */}
          <button
            type="button"
            onClick={() => handleSwitchDbType('postgresql')}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              dbConfig.dbType === 'postgresql'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${dbConfig.dbType === 'postgresql' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">PostgreSQL</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Default
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Pure-Python <code className="font-mono text-emerald-600 dark:text-emerald-400">pg8000</code> driver (DB-API & native)
              </p>
            </div>
          </button>

          {/* Microsoft SQL Server */}
          <button
            type="button"
            onClick={() => handleSwitchDbType('sqlserver')}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              dbConfig.dbType === 'sqlserver'
                ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30 shadow-xs'
                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${dbConfig.dbType === 'sqlserver' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <Server className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">SQL Server (MSSQL)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  T-SQL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                DB-API with <code className="font-mono text-sky-600 dark:text-sky-400">pymssql</code> or <code className="font-mono text-sky-600 dark:text-sky-400">pyodbc</code>
              </p>
            </div>
          </button>

          {/* Oracle Database */}
          <button
            type="button"
            onClick={() => handleSwitchDbType('oracle')}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              dbConfig.dbType === 'oracle'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${dbConfig.dbType === 'oracle' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white">Oracle Database</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Thin Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Official <code className="font-mono text-amber-600 dark:text-amber-400">oracledb</code> zero-client driver
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Integration Test Presets:
          </span>
          <span className="text-[11px] text-slate-500">Pick a pre-configured template or customize steps below</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-[#1E293B] border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                    : 'bg-white/60 dark:bg-[#1E293B]/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">{p.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ml-1 ${
                    isSelected ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {p.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {p.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left is Configuration & Steps, Right is Generated Python Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chain Steps Builder (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* STEP 1: LOGIN cURL & AUTHENTICATION */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs">
                  1
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Authentication Step (cURL Login)
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Endpoint returning authentication token or session cookie
                  </p>
                </div>
              </div>
              <button
                onClick={autoDetectToken}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
                title="Auto-detect token format from URL"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                Auto-detect
              </button>
            </div>

            {/* Login cURL Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>cURL Login Command:</span>
                {parsedLogin.method && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                    {parsedLogin.method} • {parsedLogin.baseUrl || parsedLogin.url || 'URL'}
                  </span>
                )}
              </label>
              <textarea
                value={loginCurl}
                onChange={(e) => setLoginCurl(e.target.value)}
                rows={4}
                placeholder="curl -X POST https://api.example.com/login -H 'Content-Type: application/json' -d '{&quot;user&quot;:&quot;admin&quot;}'"
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Token Extraction & Injection Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              {/* Extract Config */}
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-500" />
                  Extract Token From Response:
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={isCustomResponseToken ? 'custom' : extraction.keyPath}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomResponseToken(true);
                      } else {
                        setIsCustomResponseToken(false);
                        const match = COMMON_RESPONSE_TOKENS.find((t) => t.value === e.target.value);
                        setExtraction({
                          ...extraction,
                          keyPath: e.target.value,
                          variableName: match?.value?.replace('.', '_') || 'token',
                        });
                      }
                    }}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex-1"
                  >
                    {COMMON_RESPONSE_TOKENS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                    <option value="custom">Custom JSON Key Path...</option>
                  </select>
                </div>
                {isCustomResponseToken && (
                  <input
                    type="text"
                    value={extraction.keyPath}
                    onChange={(e) => setExtraction({ ...extraction, keyPath: e.target.value })}
                    placeholder="e.g. data.auth.jwt_token"
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                )}
              </div>

              {/* Injection Config */}
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  Inject Token Into Subsequent Calls:
                </span>
                <select
                  value={isCustomTokenHeader ? 'custom' : injection.headerName}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomTokenHeader(true);
                    } else {
                      setIsCustomTokenHeader(false);
                      const match = COMMON_TOKEN_HEADERS.find((h) => h.header === e.target.value);
                      if (match) {
                        setInjection({
                          ...injection,
                          headerName: match.header,
                          headerFormat: match.format,
                        });
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  {COMMON_TOKEN_HEADERS.map((h) => (
                    <option key={h.header} value={h.header}>
                      {h.label}
                    </option>
                  ))}
                  <option value="custom">Custom Header / Placement...</option>
                </select>

                {isCustomTokenHeader && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={injection.headerName}
                      onChange={(e) => setInjection({ ...injection, headerName: e.target.value })}
                      placeholder="Header Name (e.g. X-Token)"
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200"
                    />
                    <input
                      type="text"
                      value={injection.headerFormat}
                      onChange={(e) => setInjection({ ...injection, headerFormat: e.target.value })}
                      placeholder="Format: {token} or Bearer {token}"
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: DATABASE CONNECTION CONFIGURATION */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowDbConfig(!showDbConfig)}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    {currentDbMeta.name} Configuration
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                      {currentDbMeta.driverPackage}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Host: <code className="font-mono text-emerald-600 dark:text-emerald-400">{dbConfig.host}:{dbConfig.port}</code> / Database:{' '}
                    <code className="font-mono text-indigo-600 dark:text-indigo-400">
                      {dbConfig.dbType === 'oracle' ? dbConfig.oracleServiceName || dbConfig.database : dbConfig.database}
                    </code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle Database Config"
                >
                  {showDbConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showDbConfig && (
              <div className="flex flex-col gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Host, Port, DB, User, Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Host / Server</label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      placeholder="localhost"
                      className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Port</label>
                    <input
                      type="number"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value, 10) || currentDbMeta.defaultPort })}
                      placeholder={String(currentDbMeta.defaultPort)}
                      className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {dbConfig.dbType === 'oracle' ? 'Service Name / SID' : 'Database Name'}
                    </label>
                    <input
                      type="text"
                      value={dbConfig.dbType === 'oracle' ? dbConfig.oracleServiceName || dbConfig.database : dbConfig.database}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDbConfig({
                          ...dbConfig,
                          database: val,
                          oracleServiceName: val,
                        });
                      }}
                      placeholder={currentDbMeta.defaultDb}
                      className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Username / User</label>
                    <input
                      type="text"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                      placeholder={currentDbMeta.defaultUser}
                      className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Password</label>
                    <input
                      type="password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                      placeholder="(empty or env var)"
                      className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>

                  {/* Dialect-specific driver selectors */}
                  {dbConfig.dbType === 'postgresql' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">pg8000 Driver Mode</label>
                      <select
                        value={dbConfig.interfaceStyle}
                        onChange={(e) => setDbConfig({ ...dbConfig, interfaceStyle: e.target.value as any })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                      >
                        <option value="dbapi">pg8000.dbapi (Standard DB-API 2.0)</option>
                        <option value="native">pg8000.native (High-performance Connection)</option>
                      </select>
                    </div>
                  )}

                  {dbConfig.dbType === 'sqlserver' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">SQL Server Library</label>
                      <select
                        value={dbConfig.sqlServerDriver}
                        onChange={(e) => setDbConfig({ ...dbConfig, sqlServerDriver: e.target.value as SqlServerDriver })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                      >
                        <option value="pymssql">pymssql (Recommended - Pure Python)</option>
                        <option value="pyodbc">pyodbc (ODBC Driver Environment)</option>
                      </select>
                    </div>
                  )}

                  {dbConfig.dbType === 'oracle' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Oracle Driver Mode</label>
                      <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>oracledb Thin Mode</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SQL Server ODBC driver custom name */}
                {dbConfig.dbType === 'sqlserver' && dbConfig.sqlServerDriver === 'pyodbc' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">ODBC Driver Name</label>
                      <input
                        type="text"
                        value={dbConfig.sqlServerOdbcDriverName}
                        onChange={(e) => setDbConfig({ ...dbConfig, sqlServerOdbcDriverName: e.target.value })}
                        placeholder="ODBC Driver 18 for SQL Server"
                        className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={dbConfig.trustServerCertificate}
                          onChange={(e) => setDbConfig({ ...dbConfig, trustServerCertificate: e.target.checked })}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>TrustServerCertificate=yes (Dev/Test SSL)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Advanced Database Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={dbConfig.useEnvVars}
                      onChange={(e) => setDbConfig({ ...dbConfig, useEnvVars: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Extract Env Vars ({currentDbMeta.envPrefix}_HOST)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={dbConfig.autoCommit}
                      onChange={(e) => setDbConfig({ ...dbConfig, autoCommit: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Auto-commit DML queries</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={dbConfig.returnAsDict}
                      onChange={(e) => setDbConfig({ ...dbConfig, returnAsDict: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Dict rows (named columns)</span>
                  </label>

                  {dbConfig.dbType === 'postgresql' && (
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={dbConfig.ssl}
                        onChange={(e) => setDbConfig({ ...dbConfig, ssl: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>SSL Context (cloud DBs)</span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: SUBSEQUENT OPERATIONS BUILDER (cURL or Database) */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs">
                  2
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Post-Login Operations ({steps.length} steps)
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mix cURL API calls & {currentDbMeta.shortName} queries in sequence
                </span>
              </div>

              {/* Add Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddCurlStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add cURL Request
                </button>
                <button
                  onClick={handleAddDbStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition-colors shadow-2xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  Add {currentDbMeta.shortName} Query
                </button>
              </div>
            </div>

            {/* List of Steps */}
            <div className="flex flex-col gap-4">
              {steps.map((step, index) => {
                const stepNum = index + 2;
                const isDb = step.type === 'database';

                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      step.enabled
                        ? isDb
                          ? 'bg-white dark:bg-[#1E293B] border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                          : 'bg-white dark:bg-[#1E293B] border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    {/* Step Card Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shrink-0 ${
                            isDb ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}
                        >
                          {stepNum}
                        </span>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                            isDb
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                          }`}
                        >
                          {isDb ? `${currentDbMeta.shortName} (${currentDbMeta.driverPackage})` : 'HTTP cURL'}
                        </span>

                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                          placeholder={isDb ? `${currentDbMeta.shortName} query description` : 'Request description'}
                          className="font-bold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:outline-none focus:border-indigo-500 px-1 py-0.5 flex-1 min-w-[120px]"
                        />
                      </div>

                      {/* Controls: Move, Duplicate, Toggle, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer mr-2">
                          <input
                            type="checkbox"
                            checked={step.enabled}
                            onChange={(e) => handleUpdateStep(step.id, { enabled: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="hidden sm:inline">Active</span>
                        </label>

                        <button
                          onClick={() => handleMoveStep(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          title="Move up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          title="Move down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateStep(index)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                          title="Duplicate step"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500"
                          title="Delete step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Step Body */}
                    {isDb ? (
                      /* Database Step Editor */
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            SQL Query ({currentDbMeta.name}):
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">Execution Mode:</span>
                            <select
                              value={(step as DatabaseChainStep).fetchMode}
                              onChange={(e) =>
                                handleUpdateStep(step.id, {
                                  fetchMode: e.target.value as any,
                                })
                              }
                              className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
                            >
                              <option value="fetchall">fetchall() → Multiple Rows</option>
                              <option value="fetchone">fetchone() → Single Row</option>
                              <option value="execute">execute() → Mutation (INSERT/UPDATE/DELETE)</option>
                            </select>
                          </div>
                        </div>

                        <textarea
                          value={(step as DatabaseChainStep).query}
                          onChange={(e) => handleUpdateStep(step.id, { query: e.target.value })}
                          rows={3}
                          placeholder="SELECT id, name FROM users WHERE is_active = true;"
                          className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed"
                        />

                        {/* Query Parameters and Assertions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Query Parameters (Python tuple / dict):
                            </label>
                            <input
                              type="text"
                              value={(step as DatabaseChainStep).params}
                              onChange={(e) => handleUpdateStep(step.id, { params: e.target.value })}
                              placeholder={`e.g. (${extraction.variableName || 'token'},) or {'email': 'test@org.com'}`}
                              className="w-full p-1.5 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            />
                          </div>

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                              <input
                                type="checkbox"
                                checked={(step as DatabaseChainStep).assertRowCount ?? true}
                                onChange={(e) => handleUpdateStep(step.id, { assertRowCount: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="font-semibold text-[11px]">Include Python Test Assertion</span>
                            </label>
                            {(step as DatabaseChainStep).assertRowCount && (
                              <input
                                type="text"
                                value={(step as DatabaseChainStep).assertCondition || ''}
                                onChange={(e) => handleUpdateStep(step.id, { assertCondition: e.target.value })}
                                placeholder="(step as DatabaseChainStep).fetchMode === 'fetchone' ? 'row is not None' : 'len(rows) > 0'"
                                className="w-full mt-1 p-1 font-mono text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* cURL Step Editor */
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={(step as CurlChainStep).curl}
                          onChange={(e) => handleUpdateStep(step.id, { curl: e.target.value })}
                          rows={3}
                          placeholder="curl -X GET https://api.example.com/v1/resource -H 'Authorization: Bearer <token>'"
                          className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PYTHON GENERATOR OPTIONS (Collapsible) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowGeneratorOptions(!showGeneratorOptions)}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Python Code & Generator Options
                </h3>
              </div>
              <button type="button" className="p-1 text-slate-400">
                {showGeneratorOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showGeneratorOptions && (
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      HTTP Client Library
                    </label>
                    <select
                      value={options.httpLibrary}
                      onChange={(e) => setOptions({ ...options, httpLibrary: e.target.value as any })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                    >
                      <option value="requests">requests (Sync - Recommended)</option>
                      <option value="httpx_sync">httpx (Sync)</option>
                      <option value="httpx_async">httpx (Async with asyncio)</option>
                      <option value="aiohttp">aiohttp (Async)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Code Architecture
                    </label>
                    <select
                      value={options.structure}
                      onChange={(e) => setOptions({ ...options, structure: e.target.value as any })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                    >
                      <option value="session">Modular Session Workflow (run_chain)</option>
                      <option value="class_client">OOP Test Suite Class (ApiAndDatabaseTestSuite)</option>
                      <option value="functions">Functional Procedures</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Request Timeout (Seconds)
                    </label>
                    <input
                      type="number"
                      value={options.timeoutSeconds}
                      onChange={(e) => setOptions({ ...options, timeoutSeconds: parseInt(e.target.value, 10) || 30 })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={options.baseUrlVariable}
                      onChange={(e) => setOptions({ ...options, baseUrlVariable: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">Extract Base URL (BASE_URL)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={options.modularMethods}
                      onChange={(e) => setOptions({ ...options, modularMethods: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">Modular methods (commentable)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={options.includeAssertions}
                      onChange={(e) => setOptions({ ...options, includeAssertions: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Include Test Assertions</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={options.printDbResults}
                      onChange={(e) => setOptions({ ...options, printDbResults: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Print DB query results</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={options.useTypeHints}
                      onChange={(e) => setOptions({ ...options, useTypeHints: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Include Python Type Hints</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={options.includeErrorHandling}
                      onChange={(e) => setOptions({ ...options, includeErrorHandling: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>raise_for_status() on HTTP</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Generated Code & Inspection (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 sticky top-4">
          {/* Tabs bar */}
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Python Script
              </button>
              <button
                onClick={() => setActiveTab('flow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'flow'
                    ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                Chain Visualizer
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'guide'
                    ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Setup Guide
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pr-2">
              <span className={`w-2 h-2 rounded-full ${
                dbConfig.dbType === 'postgresql' ? 'bg-emerald-500' : dbConfig.dbType === 'sqlserver' ? 'bg-sky-500' : 'bg-amber-500'
              }`}></span>
              {currentDbMeta.driverPackage}
            </div>
          </div>

          {/* TAB 1: CODE OUTPUT */}
          {activeTab === 'code' && (
            <div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
              {/* Code Header Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    curl_{dbConfig.dbType}_chain_test.py
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({generatedPythonCode.split('\n').length} lines)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Dependencies Installation Helper */}
              <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Run command:</span>
                <code className="text-emerald-400 select-all">
                  pip install {options.httpLibrary === 'requests' ? 'requests' : options.httpLibrary.startsWith('httpx') ? 'httpx' : 'aiohttp'} {currentDbMeta.pipPackage}
                </code>
              </div>

              {/* Code Display */}
              <div className="p-4 overflow-x-auto max-h-[640px] overflow-y-auto">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed select-text">
                  <code>{generatedPythonCode}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL CHAIN FLOW */}
          {activeTab === 'flow' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Workflow className="w-4 h-4 text-emerald-500" />
                Execution Topology ({currentDbMeta.name})
              </h3>

              <div className="flex flex-col gap-3">
                {/* Step 1 Auth */}
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">API Authentication</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold uppercase">
                        {parsedLogin.method}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono">
                      {parsedLogin.baseUrl || parsedLogin.url || 'Auth Endpoint'}
                    </p>
                    <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-1.5">
                      <Key className="w-3 h-3" />
                      Captures <code className="font-bold">{extraction.variableName || 'token'}</code> from response
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center text-slate-400">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Steps */}
                {steps.map((s, idx) => {
                  const isDb = s.type === 'database';
                  return (
                    <React.Fragment key={s.id}>
                      <div
                        className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                          isDb
                            ? dbConfig.dbType === 'postgresql'
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                              : dbConfig.dbType === 'sqlserver'
                              ? 'border-sky-300 dark:border-sky-800 bg-sky-50/30 dark:bg-sky-950/20'
                              : 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20'
                            : 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                            isDb
                              ? dbConfig.dbType === 'postgresql'
                                ? 'bg-emerald-600'
                                : dbConfig.dbType === 'sqlserver'
                                ? 'bg-sky-600'
                                : 'bg-amber-600'
                              : 'bg-indigo-600'
                          }`}
                        >
                          {idx + 2}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{s.name}</span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                isDb
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {isDb ? `${currentDbMeta.shortName} (${(s as DatabaseChainStep).fetchMode})` : 'HTTP API Call'}
                            </span>
                          </div>
                          {isDb ? (
                            <p className="text-[11px] text-slate-500 font-mono mt-1 line-clamp-2 bg-white/50 dark:bg-slate-900/50 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                              {(s as DatabaseChainStep).query}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                              {(s as CurlChainStep).curl.split('\n')[0]}
                            </p>
                          )}
                        </div>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className="flex justify-center text-slate-400">
                          <ArrowRight className="w-4 h-4 rotate-90" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SETUP & TESTING GUIDE */}
          {activeTab === 'guide' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 text-xs">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                Setup Guide: {currentDbMeta.name} ({currentDbMeta.driverPackage})
              </h3>

              <div className="flex flex-col gap-3 leading-relaxed text-slate-600 dark:text-slate-400">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    1. Install Driver & HTTP Client
                  </span>
                  {dbConfig.dbType === 'postgresql' && (
                    <code className="block p-2 rounded bg-slate-900 text-emerald-400 font-mono text-[11px]">
                      pip install requests pg8000
                    </code>
                  )}
                  {dbConfig.dbType === 'sqlserver' && (
                    <code className="block p-2 rounded bg-slate-900 text-sky-400 font-mono text-[11px]">
                      pip install requests {dbConfig.sqlServerDriver === 'pyodbc' ? 'pyodbc' : 'pymssql'}
                    </code>
                  )}
                  {dbConfig.dbType === 'oracle' && (
                    <code className="block p-2 rounded bg-slate-900 text-amber-400 font-mono text-[11px]">
                      pip install requests oracledb
                    </code>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    2. Recommended Environment Variables
                  </span>
                  <p className="text-[11px] mb-2">Configure credentials safely without committing passwords:</p>
                  {dbConfig.dbType === 'postgresql' && (
                    <pre className="p-2 rounded bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto">
{`export PGHOST="${dbConfig.host || 'localhost'}"
export PGPORT="${dbConfig.port || 5432}"
export PGDATABASE="${dbConfig.database || 'postgres'}"
export PGUSER="${dbConfig.user || 'postgres'}"
export PGPASSWORD="your_secret_password"`}
                    </pre>
                  )}
                  {dbConfig.dbType === 'sqlserver' && (
                    <pre className="p-2 rounded bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto">
{`export MSSQL_HOST="${dbConfig.host || 'localhost'}"
export MSSQL_PORT="${dbConfig.port || 1433}"
export MSSQL_DATABASE="${dbConfig.database || 'master'}"
export MSSQL_USER="${dbConfig.user || 'sa'}"
export MSSQL_PASSWORD="your_secret_password"`}
                    </pre>
                  )}
                  {dbConfig.dbType === 'oracle' && (
                    <pre className="p-2 rounded bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto">
{`export ORACLE_HOST="${dbConfig.host || 'localhost'}"
export ORACLE_PORT="${dbConfig.port || 1521}"
export ORACLE_SERVICE_NAME="${dbConfig.oracleServiceName || dbConfig.database || 'XEPDB1'}"
export ORACLE_USER="${dbConfig.user || 'SYSTEM'}"
export ORACLE_PASSWORD="your_secret_password"`}
                    </pre>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    3. Dialect Details & Driver Highlights
                  </span>
                  {dbConfig.dbType === 'postgresql' && (
                    <p className="text-[11px]">
                      Uses <code className="font-mono text-emerald-600">pg8000</code>, a pure-Python driver with zero C library dependencies. Supports both standard DB-API 2.0 cursor modes and native high-performance connection calls.
                    </p>
                  )}
                  {dbConfig.dbType === 'sqlserver' && (
                    <p className="text-[11px]">
                      Uses <code className="font-mono text-sky-600">pymssql</code> (recommended pure-Python DB-API driver with <code className="font-mono">as_dict=True</code> cursor support) or <code className="font-mono text-sky-600">pyodbc</code> for environments configured with Microsoft ODBC Driver 18.
                    </p>
                  )}
                  {dbConfig.dbType === 'oracle' && (
                    <p className="text-[11px]">
                      Uses the modern <code className="font-mono text-amber-600">oracledb</code> library in <strong>Thin Mode</strong>. No Oracle Instant Client installation or external binaries are required!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
