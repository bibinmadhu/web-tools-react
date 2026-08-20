export interface FlattenerPreset {
  id: string;
  name: string;
  category: 'Bash & DevTools' | 'Windows CMD & PS' | 'JSON Payloads' | 'Edge Cases & Cleanups';
  description: string;
  curl: string;
}

export const FLATTENER_PRESETS: FlattenerPreset[] = [
  {
    id: 'bash-multiline-standard',
    name: 'Bash Multiline with Trailing \\',
    category: 'Bash & DevTools',
    description: 'Standard multi-line cURL with trailing backslashes, indentations, and auth headers',
    curl: `curl -X POST "https://api.github.com/repos/octocat/hello-world/issues" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "Authorization: Bearer ghp_9948293849283948293849" \\
  -H "User-Agent: GitHub-Client/2.0" \\
  -d '{"title": "Bug Report", "body": "Found a reproducible issue in module", "labels": ["bug", "priority-high"]}' \\
  -m 30 \\
  -L`,
  },
  {
    id: 'devtools-copy-curl',
    name: 'Browser DevTools (Chrome/Firefox/Safari)',
    category: 'Bash & DevTools',
    description: 'cURL command copied directly from Chrome/Firefox Network tab with trailing spaces & --compressed',
    curl: `curl 'https://api.dashboard.io/v2/analytics/query?range=7d&metrics=dau,mau' \\
  -H 'authority: api.dashboard.io' \\
  -H 'accept: application/json, text/plain, */*' \\
  -H 'accept-language: en-US,en;q=0.9' \\
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \\
  -H 'content-type: application/json' \\
  -H 'sec-fetch-dest: empty' \\
  -H 'sec-fetch-mode: cors' \\
  -H 'sec-fetch-site: same-site' \\
  --data-raw '{"cohort": "2026-q1", "segment": "enterprise"}' \\
  --compressed`,
  },
  {
    id: 'multiline-json-body',
    name: 'Multiline Formatted JSON Payload',
    category: 'JSON Payloads',
    description: 'cURL containing a deeply indented, multi-line JSON payload with comments and nested keys',
    curl: `# Fetch customer profile update
# Prepared for billing sync API
curl -X PUT "https://api.stripe-mock.com/v1/customers/cus_982734" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: idemp_992837498" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane.doe@enterprise.com",
    "metadata": {
      "department": "Engineering",
      "active": true,
      "tier": "enterprise_plus",
      "credits": 5000
    },
    "shipping": {
      "address": {
        "line1": "100 Innovation Way",
        "city": "San Francisco",
        "state": "CA",
        "postal_code": "94105",
        "country": "US"
      }
    }
  }' \\
  --insecure`,
  },
  {
    id: 'windows-cmd-carets',
    name: 'Windows CMD (Caret ^ Continuations)',
    category: 'Windows CMD & PS',
    description: 'Windows Command Prompt cURL using ^ line continuations and double-double quotes',
    curl: `curl.exe -X POST "https://api.example.com/v1/deploy" ^
  -H "Content-Type: application/json" ^
  -H "X-Api-Key: sec_live_9923847293" ^
  -d "{\\"service\\": \\"auth-service\\", \\"version\\": \\"3.1.0\\", \\"autoRollback\\": true}" ^
  -m 60`,
  },
  {
    id: 'powershell-backticks',
    name: 'PowerShell (Backtick ` Continuations)',
    category: 'Windows CMD & PS',
    description: 'PowerShell script cURL using backtick line continuations',
    curl: `curl.exe -X POST 'https://api.example.com/v1/notifications' \`
  -H 'Content-Type: application/json' \`
  -H 'Authorization: Bearer sec_tok_991823' \`
  -d '{"recipient": "admin@company.com", "template": "alert_high", "channel": "slack"}' \`
  --connect-timeout 10`,
  },
  {
    id: 'smart-quotes-and-spaces',
    name: 'Documentation Smart Quotes & Em-Dashes',
    category: 'Edge Cases & Cleanups',
    description: 'cURL copied from Medium/WordPress with curly smart quotes, em-dashes, and trailing spaces after \\',
    curl: `curl —X POST “https://api.example.com/v1/orders” \\    
  —H “Content-Type: application/json” \\  
  —H ‘Authorization: Bearer my_secret_token’ \\
  —d ‘{“orderId”: “ORD-9912”, “amount”: 249.99}’`,
  },
  {
    id: 'graphql-multiline',
    name: 'GraphQL Query Request',
    category: 'JSON Payloads',
    description: 'GraphQL POST request with multiline query string and query variables',
    curl: `curl -X POST "https://api.github.com/graphql" \\
  -H "Authorization: bearer ghp_99283948293849" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "query GetRepoDetails($name: String!, $owner: String!) { repository(name: $name, owner: $owner) { id description stargazerCount } }",
    "variables": {
      "name": "react",
      "owner": "facebook"
    }
  }'`,
  },
];
