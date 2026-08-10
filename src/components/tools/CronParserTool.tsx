import React, { useState } from 'react';
import { Clock, Check } from 'lucide-react';
import { parseCron } from '../../utils/toolFunctions';

export const CronParserTool: React.FC = () => {
  const [cron, setCron] = useState('*/15 * * * *');
  const translation = parseCron(cron);

  const presets = [
    { label: 'Every Minute', expr: '* * * * *' },
    { label: 'Every 5 Mins', expr: '*/5 * * * *' },
    { label: 'Every Hour', expr: '0 * * * *' },
    { label: 'Every Day Midnight', expr: '0 0 * * *' },
    { label: 'Every Monday 8 AM', expr: '0 8 * * 1' },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">
          CRON EXPRESSION (5 FIELDS: MIN HOUR DAY MONTH WEEKDAY)
        </label>
        <input
          type="text"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          placeholder="e.g. */15 * * * *"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex flex-wrap gap-2 pt-1">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setCron(p.expr)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium font-mono transition-colors"
            >
              {p.label} ({p.expr})
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/80 text-blue-600 dark:text-blue-300">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
            HUMAN READABLE SCHEDULE
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {translation}
          </div>
        </div>
      </div>
    </div>
  );
};
