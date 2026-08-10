import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const MarkdownPreviewTool: React.FC = () => {
  const sampleMarkdown = `# DevHub Utilities Platform\n\nWelcome to **DevHub**! Built for modern developer workflows.\n\n### Key Features\n- **Fast**: Runs 100% client-side\n- **Secure**: No data leaves your browser\n- **Dark Mode**: High-contrast dark themes\n\n\`\`\`ts\nconst dev = "DevHub";\nconsole.log(dev);\n\`\`\``;

  const [md, setMd] = useState(sampleMarkdown);
  const [copied, setCopied] = useState(false);

  // Simple clean markdown parser for preview
  const renderSimpleMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-900 dark:text-white my-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-900 dark:text-white my-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-slate-900 dark:text-white my-3">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/gim, '<code class="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            navigator.clipboard.writeText(md);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            MARKDOWN EDITOR
          </label>
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            placeholder="Type markdown here..."
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            RENDERED PREVIEW
          </label>
          <div
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(md) }}
            className="w-full h-80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm overflow-y-auto leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
