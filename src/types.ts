export type ToolCategory = 'favorites' | 'converters' | 'formatters' | 'security' | 'generators' | 'network' | 'all';

export interface DevTool {
  id: string;
  name: string;
  description: string;
  category: Exclude<ToolCategory, 'favorites' | 'all'>;
  tags: string[];
  iconText: string;
  iconBgClass?: string;
  iconType: 'json' | 'shield' | 'code' | 'dice' | 'terminal' | 'base64' | 'regex' | 'key' | 'color' | 'hash' | 'globe' | 'markdown' | 'clock';
  isPopular?: boolean;
}

export interface UnitTestResult {
  suiteName: string;
  testName: string;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: UnitTestResult[];
}
