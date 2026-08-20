export interface CurlPreset {
  id: string;
  name: string;
  category: 'REST Methods' | 'Authentication' | 'Payload Types' | 'Advanced';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  description: string;
  curl: string;
}

export const CURL_PRESETS: CurlPreset[] = [
  {
    id: 'get-users',
    name: 'GET - List Users with Query Params',
    category: 'REST Methods',
    method: 'GET',
    description: 'Fetch paginated user list with search filter and auth header',
    curl: `curl -X GET "https://api.github.com/users/octocat/repos?sort=updated&per_page=10&page=1" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "Authorization: Bearer ghp_9948293849283948293849" \\
  -H "User-Agent: DevFlow-Client/1.0"`,
  },
  {
    id: 'post-create-user',
    name: 'POST - Create JSON Resource',
    category: 'REST Methods',
    method: 'POST',
    description: 'Create a new user account with JSON payload & custom headers',
    curl: `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -H "X-Client-Version: 2.4.0" \\
  -d '{
    "username": "alex_developer",
    "email": "alex@devhub.io",
    "role": "engineer",
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "tags": ["frontend", "typescript", "react"]
  }'`,
  },
  {
    id: 'put-update-user',
    name: 'PUT - Full Resource Replace',
    category: 'REST Methods',
    method: 'PUT',
    description: 'Replace complete resource object state',
    curl: `curl -X PUT "https://api.example.com/v1/users/usr_98124" \\
  -H "Content-Type: application/json" \\
  -H "If-Match: \\"w/1234567\\"" \\
  -d '{
    "id": "usr_98124",
    "username": "alex_developer",
    "status": "active",
    "quota": 10000,
    "tier": "enterprise"
  }'`,
  },
  {
    id: 'patch-partial-update',
    name: 'PATCH - Partial Update Resource',
    category: 'REST Methods',
    method: 'PATCH',
    description: 'Update specific fields of an existing entity',
    curl: `curl -X PATCH "https://api.example.com/v1/orders/ord_5521/status" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sec_tok_8943759238" \\
  -d '{
    "status": "shipped",
    "trackingNumber": "TRK-99238-US",
    "carrier": "FedEx",
    "estimatedDelivery": "2026-08-25"
  }'`,
  },
  {
    id: 'delete-resource',
    name: 'DELETE - Remove Entity',
    category: 'REST Methods',
    method: 'DELETE',
    description: 'Delete resource by ID with confirmation and reason query param',
    curl: `curl -X DELETE "https://api.example.com/v1/projects/proj_88291?force=true&reason=archive" \\
  -H "Authorization: Bearer sec_tok_8943759238" \\
  -H "X-Audit-User: admin@company.com"`,
  },
  {
    id: 'post-multipart-form',
    name: 'POST - Multipart Form & File Upload',
    category: 'Payload Types',
    method: 'POST',
    description: 'Upload files and metadata using multipart/form-data (-F)',
    curl: `curl -X POST "https://api.example.com/v1/documents/upload" \\
  -H "Authorization: Bearer sec_tok_8943759238" \\
  -F "title=Q3 Financial Report" \\
  -F "category=finance" \\
  -F "file=@./documents/report.pdf;type=application/pdf" \\
  -F "metadata={\\"isConfidential\\":true,\\"department\\":\\"accounting\\"}"`,
  },
  {
    id: 'post-url-encoded',
    name: 'POST - URL-Encoded Form (OAuth Token)',
    category: 'Payload Types',
    method: 'POST',
    description: 'OAuth 2.0 token grant exchange with form urlencoded payload',
    curl: `curl -X POST "https://auth.example.com/oauth/v2/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  --data-urlencode "grant_type=authorization_code" \\
  --data-urlencode "code=auth_code_xyz987" \\
  --data-urlencode "client_id=dev_app_client_id" \\
  --data-urlencode "client_secret=super_secret_key" \\
  --data-urlencode "redirect_uri=https://app.devhub.io/callback"`,
  },
  {
    id: 'get-basic-auth',
    name: 'GET - HTTP Basic Auth with Cookies',
    category: 'Authentication',
    method: 'GET',
    description: 'Send basic authentication credentials and session cookies',
    curl: `curl -X GET "https://api.internal-service.local/v2/metrics" \\
  -u "admin:SuperSecretPassword123!" \\
  -b "session_id=sess_abcdef123456; csrf_token=csrf_998877" \\
  -H "Accept: application/json" \\
  -m 15 \\
  -k`,
  },
  {
    id: 'post-graphql',
    name: 'POST - GraphQL Query Request',
    category: 'Payload Types',
    method: 'POST',
    description: 'Execute GraphQL query with query variables',
    curl: `curl -X POST "https://api.github.com/graphql" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ghp_9948293849283948293849" \\
  -d '{
    "query": "query GetViewer($login: String!) { user(login: $login) { name bio repositories(first: 5) { totalCount nodes { name stargazerCount } } } }",
    "variables": {
      "login": "torvalds"
    }
  }'`,
  },
  {
    id: 'options-cors',
    name: 'OPTIONS - CORS Preflight Check',
    category: 'Advanced',
    method: 'OPTIONS',
    description: 'CORS Preflight request to check server allowed origins and methods',
    curl: `curl -X OPTIONS "https://api.example.com/v1/payments" \\
  -H "Origin: https://dashboard.devhub.io" \\
  -H "Access-Control-Request-Method: POST" \\
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-Requested-With"`,
  },
  {
    id: 'head-metadata',
    name: 'HEAD - Resource Headers & Status',
    category: 'Advanced',
    method: 'HEAD',
    description: 'Check if resource exists and get headers without downloading body',
    curl: `curl -I "https://cdn.example.com/assets/releases/v3.0.0.tar.gz" \\
  -H "Accept-Encoding: gzip, deflate, br" \\
  -L`,
  },
];
