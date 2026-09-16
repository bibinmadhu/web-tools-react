import {
  TokenExtractionConfig,
  TokenInjectionConfig,
  SubsequentRequest,
} from './curlChainConverter';

export interface CurlChainPreset {
  id: string;
  name: string;
  description: string;
  loginCurl: string;
  extraction: TokenExtractionConfig;
  injection: TokenInjectionConfig;
  subsequentRequests: SubsequentRequest[];
}

export const CURL_CHAIN_PRESETS: CurlChainPreset[] = [
  {
    id: 'standard-bearer-oauth',
    name: 'OAuth2 / Bearer Token Flow',
    description: 'Login endpoint returns access_token; subsequent calls use Authorization: Bearer <token>',
    loginCurl: `curl -X POST https://api.example.com/v1/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type": "password", "username": "developer@example.com", "password": "SuperSecretPassword123!"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'access_token',
      variableName: 'access_token',
      headerName: 'Authorization',
    },
    injection: {
      placement: 'header',
      headerName: 'Authorization',
      headerFormat: 'Bearer {token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    },
    subsequentRequests: [
      {
        id: 'step-profile',
        name: 'Get User Profile',
        curl: `curl -X GET https://api.example.com/v1/users/me \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer <placeholder>"`,
        enabled: true,
      },
      {
        id: 'step-create-project',
        name: 'Create Team Project',
        curl: `curl -X POST https://api.example.com/v1/projects \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <placeholder>" \\
  -d '{"name": "Production Cloud Migration", "category": "infrastructure", "tags": ["q3", "priority"]}'`,
        enabled: true,
      },
      {
        id: 'step-list-audit',
        name: 'Fetch Audit Logs',
        curl: `curl -X GET "https://api.example.com/v1/audit/logs?limit=25&direction=desc" \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer <placeholder>"`,
        enabled: true,
      },
    ],
  },
  {
    id: 'simple-token-header',
    name: 'Simple "token" Header & Body (Custom API)',
    description: 'Login returns {"token": "..."}, subsequent requests send header "token: <token>" (User requested)',
    loginCurl: `curl -X POST https://api.service.io/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "admin@service.io", "apiKey": "live_api_key_8829910"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'token',
      variableName: 'token',
      headerName: 'token',
    },
    injection: {
      placement: 'header',
      headerName: 'token',
      headerFormat: '{token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    },
    subsequentRequests: [
      {
        id: 'step-status',
        name: 'Check Account Status',
        curl: `curl -X GET https://api.service.io/account/status \\
  -H "Accept: application/json" \\
  -H "token: <old_static_token>"`,
        enabled: true,
      },
      {
        id: 'step-dispatch',
        name: 'Dispatch Webhook Event',
        curl: `curl -X POST https://api.service.io/webhooks/dispatch \\
  -H "Content-Type: application/json" \\
  -H "token: <old_static_token>" \\
  -d '{"event": "deployment.completed", "environment": "production", "status": "healthy"}'`,
        enabled: true,
      },
    ],
  },
  {
    id: 'x-auth-token-microservices',
    name: 'X-Auth-Token Microservices Gateway',
    description: 'Corporate gateway issuing auth_token injected into X-Auth-Token headers across microservices',
    loginCurl: `curl -X POST https://gateway.enterprise.internal/v2/auth \\
  -H "Content-Type: application/json" \\
  -d '{"clientId": "service_worker_01", "clientSecret": "sec_corp_998129038"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'auth_token',
      variableName: 'auth_token',
      headerName: 'X-Auth-Token',
    },
    injection: {
      placement: 'header',
      headerName: 'X-Auth-Token',
      headerFormat: '{token}',
      queryParamName: 'auth_token',
      bodyFieldName: 'auth_token',
    },
    subsequentRequests: [
      {
        id: 'step-inventory',
        name: 'Query Inventory Catalog',
        curl: `curl -X GET https://gateway.enterprise.internal/v2/catalog/items?inStock=true \\
  -H "X-Auth-Token: <placeholder>"`,
        enabled: true,
      },
      {
        id: 'step-reserve',
        name: 'Reserve Stock Units',
        curl: `curl -X POST https://gateway.enterprise.internal/v2/warehouse/reserve \\
  -H "Content-Type: application/json" \\
  -H "X-Auth-Token: <placeholder>" \\
  -d '{"sku": "SRV-RACK-42U", "quantity": 3, "locationId": "WH-US-EAST"}'`,
        enabled: true,
      },
    ],
  },
  {
    id: 'nested-json-data-token',
    name: 'Nested JSON Response (data.token)',
    description: 'Login returns wrapped response {"status": 200, "data": {"token": "..."}}',
    loginCurl: `curl -X POST https://api.platform.dev/api/session/initiate \\
  -H "Content-Type: application/json" \\
  -d '{"accessKey": "acc_key_dev_773", "signature": "sig_hex_99f2e"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'data.token',
      variableName: 'session_token',
      headerName: 'Authorization',
    },
    injection: {
      placement: 'header',
      headerName: 'Authorization',
      headerFormat: 'Bearer {token}',
      queryParamName: 'token',
      bodyFieldName: 'token',
    },
    subsequentRequests: [
      {
        id: 'step-telemetry',
        name: 'Send Heartbeat Telemetry',
        curl: `curl -X POST https://api.platform.dev/api/telemetry/heartbeat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <placeholder>" \\
  -d '{"uptimeSeconds": 86400, "cpuPercent": 14.5, "memoryPercent": 42.1}'`,
        enabled: true,
      },
      {
        id: 'step-fetch-config',
        name: 'Pull Remote Runtime Configuration',
        curl: `curl -X GET https://api.platform.dev/api/config/active \\
  -H "Authorization: Bearer <placeholder>"`,
        enabled: true,
      },
    ],
  },
  {
    id: 'api-key-header-flow',
    name: 'X-API-Key / Header Token Flow',
    description: 'Authenticate returns apiKey used by downstream analytics APIs',
    loginCurl: `curl -X POST https://analytics.datacorp.io/v1/auth/exchange \\
  -H "Content-Type: application/json" \\
  -d '{"appId": "mobile_app_ios", "sharedSecret": "sh_sec_991823"}'`,
    extraction: {
      source: 'json_body',
      keyPath: 'jwt',
      variableName: 'jwt_token',
      headerName: 'X-API-Key',
    },
    injection: {
      placement: 'header',
      headerName: 'X-API-Key',
      headerFormat: '{token}',
      queryParamName: 'api_key',
      bodyFieldName: 'api_key',
    },
    subsequentRequests: [
      {
        id: 'step-metrics',
        name: 'Query Metric Timeseries',
        curl: `curl -X GET "https://analytics.datacorp.io/v1/metrics/timeseries?metric=page_views&interval=1h" \\
  -H "X-API-Key: <placeholder>"`,
        enabled: true,
      },
    ],
  },
];
