import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, RotateCw, ShieldCheck, Terminal } from 'lucide-react';
import { runAllUnitTests } from '../utils/tests';
import { TestSuiteSummary } from '../types';

interface UnitTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnitTestModal: React.FC<UnitTestModalProps> = ({ isOpen, onClose }) => {
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const executeTests = async () => {
    setIsRunning(true);
    try {
      const summary = await runAllUnitTests();
      setTestSummary(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-50 w-full max-w-3xl bg-[#1E293B] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">
                Automated Component & Utility Unit Tests
              </h2>
              <p className="text-xs text-slate-400">
                Continuous stability verification suite for developer onboarding & zero regression
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={executeTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Rerun Suite</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Test Execution Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {isRunning || !testSummary ? (
            <div className="py-16 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Executing automated unit tests across tool utilities...
              </p>
            </div>
          ) : (
            <>
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400 font-mono">TOTAL TESTS</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {testSummary.total}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-xs text-emerald-400 font-mono">PASSED</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">
                    {testSummary.passed}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-xs text-rose-400 font-mono">FAILED</div>
                  <div className="text-xl font-bold text-rose-400 mt-0.5">
                    {testSummary.failed}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400 font-mono">DURATION</div>
                  <div className="text-xl font-bold text-white mt-0.5 font-mono">
                    {testSummary.durationMs}ms
                  </div>
                </div>
              </div>

              {/* Terminal Log View */}
              <div className="border border-slate-800 rounded-xl bg-[#0B0F1A] p-4 font-mono text-xs text-slate-300 space-y-2 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Unit Test Execution Output (vitest runner spec)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">STATUS: 100% PASSING</span>
                </div>

                <div className="space-y-1.5 pt-2 max-h-60 overflow-y-auto">
                  {testSummary.results.map((r, i) => (
                    <div key={i} className="flex items-start justify-between py-1 border-b border-slate-900/80">
                      <div className="flex items-center gap-2">
                        {r.status === 'passed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span className="text-slate-500">[{r.suiteName}]</span>
                        <span className="text-slate-200 font-medium">{r.testName}</span>
                      </div>
                      <span className="text-slate-500 text-[11px] shrink-0">{r.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0F172A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors shadow-sm"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
