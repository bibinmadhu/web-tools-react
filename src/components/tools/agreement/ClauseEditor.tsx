import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Check, Eye, EyeOff, ShieldAlert, FileText } from 'lucide-react';
import { AgreementClause, AgreementSubClause } from '../../../utils/agreementGenerator';

interface ClauseEditorProps {
  clauses: AgreementClause[];
  onChange: (clauses: AgreementClause[]) => void;
}

const PLACEHOLDERS = [
  { label: '{{TOTAL_AMOUNT}}', desc: 'Formatted Total Price (e.g. $20,000)' },
  { label: '{{CURRENCY_CODE}}', desc: 'ISO Currency (e.g. USD)' },
  { label: '{{NET_DAYS}}', desc: 'Invoicing Net Days (e.g. 14)' },
  { label: '{{WARRANTY_DAYS}}', desc: 'Bug-Fix Warranty Days (e.g. 30)' },
  { label: '{{JURISDICTION}}', desc: 'Governing Jurisdiction (e.g. State of California)' },
  { label: '{{CITY}}', desc: 'Court City (e.g. San Francisco, CA)' },
  { label: '{{CLIENT_NAME}}', desc: 'Party 1 Legal Name' },
  { label: '{{CONTRACTOR_NAME}}', desc: 'Party 2 Legal Name' },
];

export const ClauseEditor: React.FC<ClauseEditorProps> = ({ clauses, onChange }) => {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(clauses[0]?.id || null);

  const handleToggleClause = (id: string) => {
    onChange(
      clauses.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleMoveClause = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clauses.length) return;

    const newClauses = [...clauses];
    const [moved] = newClauses.splice(index, 1);
    newClauses.splice(targetIndex, 0, moved);

    // Auto renumber sections
    const renumbered = newClauses.map((c, i) => ({
      ...c,
      sectionNumber: `${i + 1}`,
    }));
    onChange(renumbered);
  };

  const handleAddClause = () => {
    const newNum = `${clauses.length + 1}`;
    const newClause: AgreementClause = {
      id: `sec_${Date.now()}`,
      sectionNumber: newNum,
      title: 'SPECIAL TERMS & CUSTOM PROVISIONS',
      enabled: true,
      subClauses: [
        {
          id: `sub_${Date.now()}_1`,
          subNumber: `${newNum}.1`,
          title: 'Custom Terms',
          content: 'Add your custom legal provision or specific agreement clause here.',
        },
      ],
    };
    onChange([...clauses, newClause]);
    setExpandedSectionId(newClause.id);
  };

  const handleRemoveClause = (id: string) => {
    const remaining = clauses.filter((c) => c.id !== id);
    const renumbered = remaining.map((c, i) => ({
      ...c,
      sectionNumber: `${i + 1}`,
    }));
    onChange(renumbered);
  };

  const handleUpdateClauseTitle = (id: string, title: string) => {
    onChange(clauses.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const handleAddSubClause = (clauseId: string) => {
    const clause = clauses.find((c) => c.id === clauseId);
    if (!clause) return;

    const newSubIndex = clause.subClauses.length + 1;
    const newSub: AgreementSubClause = {
      id: `sub_${Date.now()}`,
      subNumber: `${clause.sectionNumber}.${newSubIndex}`,
      title: 'Additional Term',
      content: 'Detailed clause text description.',
    };

    onChange(
      clauses.map((c) =>
        c.id === clauseId ? { ...c, subClauses: [...c.subClauses, newSub] } : c
      )
    );
  };

  const handleUpdateSubClause = (
    clauseId: string,
    subId: string,
    updates: Partial<AgreementSubClause>
  ) => {
    onChange(
      clauses.map((c) => {
        if (c.id !== clauseId) return c;
        return {
          ...c,
          subClauses: c.subClauses.map((s) => (s.id === subId ? { ...s, ...updates } : s)),
        };
      })
    );
  };

  const handleRemoveSubClause = (clauseId: string, subId: string) => {
    onChange(
      clauses.map((c) => {
        if (c.id !== clauseId) return c;
        return {
          ...c,
          subClauses: c.subClauses.filter((s) => s.id !== subId),
        };
      })
    );
  };

  const insertPlaceholderIntoSub = (clauseId: string, subId: string, placeholder: string) => {
    const clause = clauses.find((c) => c.id === clauseId);
    const sub = clause?.subClauses.find((s) => s.id === subId);
    if (!sub) return;

    handleUpdateSubClause(clauseId, subId, {
      content: `${sub.content} ${placeholder}`,
    });
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Clause Manager & Custom Legal Terms</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Toggle, reorder, edit, and insert dynamic placeholder variables into agreement sections.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddClause}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Section</span>
        </button>
      </div>

      {/* Placeholders Quick Reference Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Available Smart Variables:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <span
              key={p.label}
              title={p.desc}
              className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold cursor-help"
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Clause Sections Accordion */}
      <div className="space-y-3">
        {clauses.map((clause, idx) => {
          const isExpanded = expandedSectionId === clause.id;

          return (
            <div
              key={clause.id}
              className={`border rounded-xl transition-all ${
                clause.enabled
                  ? isExpanded
                    ? 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20'
                  : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-100 dark:bg-slate-950/40'
              }`}
            >
              {/* Section Header */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleClause(clause.id)}
                    className={`p-1 rounded-md transition-colors ${
                      clause.enabled
                        ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={clause.enabled ? 'Disable Section' : 'Enable Section'}
                  >
                    {clause.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <span className="font-mono font-bold text-xs text-slate-500 dark:text-slate-400 shrink-0">
                    §{clause.sectionNumber}.
                  </span>

                  <input
                    type="text"
                    value={clause.title}
                    onChange={(e) => handleUpdateClauseTitle(clause.id, e.target.value)}
                    className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 flex-1 min-w-0"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveClause(idx, 'up')}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === clauses.length - 1}
                    onClick={() => handleMoveClause(idx, 'down')}
                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedSectionId(isExpanded ? null : clause.id)}
                    className="px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    {isExpanded ? 'Collapse' : `Edit (${clause.subClauses.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveClause(clause.id)}
                    className="p-1 text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete Section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub Clauses Body (when expanded) */}
              {isExpanded && (
                <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-1">
                  {clause.subClauses.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-2.5 rounded-lg border space-y-2 ${
                        sub.isCallout
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sub.subNumber}
                          onChange={(e) => handleUpdateSubClause(clause.id, sub.id, { subNumber: e.target.value })}
                          placeholder="1.1"
                          className="w-12 px-2 py-1 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                        />
                        <input
                          type="text"
                          value={sub.title}
                          onChange={(e) => handleUpdateSubClause(clause.id, sub.id, { title: e.target.value })}
                          placeholder="Sub-clause Title (e.g. Services, Work Made for Hire)"
                          className="flex-1 px-2 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                        />

                        {/* Callout Toggle */}
                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!sub.isCallout}
                            onChange={(e) =>
                              handleUpdateSubClause(clause.id, sub.id, {
                                isCallout: e.target.checked,
                                calloutTitle: e.target.checked ? 'SECURITY & COMPLIANCE MANDATE' : undefined,
                              })
                            }
                            className="rounded text-indigo-600"
                          />
                          <span>Callout Box</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubClause(clause.id, sub.id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {sub.isCallout && (
                        <input
                          type="text"
                          value={sub.calloutTitle || ''}
                          onChange={(e) => handleUpdateSubClause(clause.id, sub.id, { calloutTitle: e.target.value })}
                          placeholder="Callout Title Badge (e.g. MANDATE, WARNING)"
                          className="w-full px-2 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded"
                        />
                      )}

                      <div>
                        <textarea
                          value={sub.content}
                          onChange={(e) => handleUpdateSubClause(clause.id, sub.id, { content: e.target.value })}
                          rows={3}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
                        />
                      </div>

                      {/* Quick insert placeholder chips */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-slate-400">Insert:</span>
                        {PLACEHOLDERS.slice(0, 5).map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => insertPlaceholderIntoSub(clause.id, sub.id, p.label)}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-700"
                          >
                            +{p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddSubClause(clause.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Sub-Clause to Section {clause.sectionNumber}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
