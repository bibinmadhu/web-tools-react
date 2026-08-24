import React from 'react';
import { AgreementConfig, interpolatePlaceholders, generateAgreementMarkdown } from '../../../utils/agreementGenerator';
import { Copy, Check, FileText, Download, Code, Eye, Sparkles } from 'lucide-react';

interface DocumentPreviewProps {
  config: AgreementConfig;
  previewMode: 'visual' | 'markdown';
  onTogglePreviewMode: (mode: 'visual' | 'markdown') => void;
  onCopyMarkdown: () => void;
  hasCopied: boolean;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  config,
  previewMode,
  onTogglePreviewMode,
  onCopyMarkdown,
  hasCopied,
}) => {
  const md = generateAgreementMarkdown(config);
  const activeClauses = config.clauses.filter((c) => c.enabled);
  const sym = config.paymentTerms.currency.symbol;

  const p1Address = [config.party1.addressStreet, config.party1.addressCity, config.party1.addressState, config.party1.addressCountry]
    .filter(Boolean)
    .join(', ') || '[Party 1 Address]';
  const p2Address = [config.party2.addressStreet, config.party2.addressCity, config.party2.addressState, config.party2.addressCountry]
    .filter(Boolean)
    .join(', ') || '[Party 2 Address]';

  const getSigFontFamily = (style?: string) => {
    switch (style) {
      case 'calligraphy':
        return '"Brush Script MT", "Caveat", "Dancing Script", cursive';
      case 'handwriting':
        return '"Segoe Script", "Comic Sans MS", cursive';
      case 'serif':
        return '"Playfair Display", "Times New Roman", serif';
      case 'formal':
        return '"Cinzel", "Georgia", serif';
      default:
        return '"Brush Script MT", cursive';
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col h-full">
      {/* Top Header Controls */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onTogglePreviewMode('visual')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              previewMode === 'visual'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Document View</span>
          </button>
          <button
            type="button"
            onClick={() => onTogglePreviewMode('markdown')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              previewMode === 'markdown'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Markdown Source</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onCopyMarkdown}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors shadow-xs"
        >
          {hasCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Markdown</span>
            </>
          )}
        </button>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 dark:bg-slate-950/60 font-sans">
        {previewMode === 'markdown' ? (
          <div className="bg-slate-900 text-slate-100 p-4 sm:p-6 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto selection:bg-indigo-500 selection:text-white">
            <pre className="whitespace-pre-wrap">{md}</pre>
          </div>
        ) : (
          /* Visual Document Simulation */
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 sm:p-10 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 space-y-6 text-sm leading-relaxed">
            {/* Classification & ID Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-400">
              <span>{config.classification}</span>
              <span>CONTRACT ID: {config.contractId}</span>
            </div>

            {/* Document Title & Subtitle */}
            <div className="text-center space-y-1.5 py-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                {config.title}
              </h1>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {config.subtitle}
              </p>
            </div>

            {/* Document Key Metadata Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Effective Date: </span>
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">{config.effectiveDate}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Contract ID: </span>
                <strong className="font-mono text-slate-900 dark:text-slate-100">{config.contractId}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{config.party1Role}: </span>
                <strong className="text-slate-900 dark:text-slate-100">{config.party1.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{config.party2Role}: </span>
                <strong className="text-slate-900 dark:text-slate-100">{config.party2.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{config.party1Role} Rep: </span>
                <span className="text-slate-800 dark:text-slate-200">{config.party1.representativeName} ({config.party1.representativeTitle})</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Tax ID / Reg No: </span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{config.party2.taxId || 'N/A'}</span>
              </div>
            </div>

            {/* Preamble / Intro Paragraph */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              This <strong>{config.title}</strong> (the "Agreement") is entered into and made effective as of the Effective Date written above, by and between <strong>{config.party1.name}</strong>, having its principal place of business at {p1Address} ("<strong>{config.party1Role}</strong>"), and <strong>{config.party2.name}</strong>, located at {p2Address} ("<strong>{config.party2Role}</strong>").
            </p>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {config.party1Role} and {config.party2Role} may collectively be referred to as the "Parties" or individually as a "Party."
            </p>

            {/* Clauses List */}
            <div className="space-y-6 pt-2">
              {activeClauses.map((clause) => (
                <section key={clause.id} className="space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    {clause.sectionNumber}. {clause.title}
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    {clause.subClauses.map((sub) => {
                      const text = interpolatePlaceholders(sub.content, config);

                      if (sub.isCallout) {
                        return (
                          <div
                            key={sub.id}
                            className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 rounded-r-xl text-xs text-blue-950 dark:text-blue-200 space-y-1 my-3"
                          >
                            <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                              {sub.calloutTitle || 'COMPLIANCE MANDATE'}
                            </span>
                            <p className="italic">{text}</p>
                          </div>
                        );
                      }

                      return (
                        <div key={sub.id} className="space-y-2">
                          {sub.subNumber && sub.title ? (
                            <p>
                              <strong className="text-slate-900 dark:text-slate-100">
                                {sub.subNumber} {sub.title}:{' '}
                              </strong>
                              {text}
                            </p>
                          ) : (
                            <p>{text}</p>
                          )}

                          {/* Render Milestone Table inside Section 2.2 */}
                          {clause.sectionNumber === '2' && sub.subNumber === '2.2' && config.milestones.length > 0 && (
                            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-2.5">Milestone Deliverables / Acceptance Criteria</th>
                                    <th className="p-2.5 w-36">Payout (% / $)</th>
                                    <th className="p-2.5 w-28">Target Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {config.milestones.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                      <td className="p-2.5">
                                        <strong className="text-slate-900 dark:text-slate-100 block">{m.name}</strong>
                                        <span className="text-slate-600 dark:text-slate-400">{m.deliverables}</span>
                                      </td>
                                      <td className="p-2.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                        {m.percentage}% ({sym}{m.amount.toLocaleString()})
                                      </td>
                                      <td className="p-2.5 font-mono text-slate-500">{m.targetDate || '[Date]'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Execution Signatures Table */}
            <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-800 space-y-4">
              <p className="italic text-xs text-slate-600 dark:text-slate-400">
                IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as of the Effective Date written above.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party 1 Sign Box */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                    FOR {config.party1Role.toUpperCase()}: {config.party1.name}
                  </span>

                  <div className="h-16 flex flex-col items-center justify-center border-b border-dashed border-slate-300 dark:border-slate-700 py-1">
                    {config.party1.signature.type === 'drawn' && config.party1.signature.dataUrl ? (
                      <img src={config.party1.signature.dataUrl} alt="Signature" className="max-h-12 max-w-full" />
                    ) : config.party1.signature.type === 'uploaded' && config.party1.signature.dataUrl ? (
                      <img src={config.party1.signature.dataUrl} alt="Uploaded Signature" className="max-h-12 max-w-full" />
                    ) : config.party1.signature.type === 'typed' && config.party1.signature.typedName ? (
                      <span
                        className="text-2xl text-indigo-700 dark:text-indigo-400 px-2"
                        style={{ fontFamily: getSigFontFamily(config.party1.signature.fontStyle) }}
                      >
                        {config.party1.signature.typedName}
                      </span>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center">
                        <div className="w-4/5 border-b-2 border-slate-400 dark:border-slate-500 mb-1"></div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          (Authorized Signature Line • Sign upon export)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs space-y-0.5 text-slate-600 dark:text-slate-400">
                    <p>Printed Name: <strong className="text-slate-900 dark:text-slate-200">{config.party1.representativeName || config.party1.name}</strong></p>
                    <p>Title: {config.party1.representativeTitle || 'Authorized Signatory'}</p>
                    <p>Date: {config.party1.signature.date || config.effectiveDate || '_______________________'}</p>
                  </div>
                </div>

                {/* Party 2 Sign Box */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                    FOR {config.party2Role.toUpperCase()}: {config.party2.name}
                  </span>

                  <div className="h-16 flex flex-col items-center justify-center border-b border-dashed border-slate-300 dark:border-slate-700 py-1">
                    {config.party2.signature.type === 'drawn' && config.party2.signature.dataUrl ? (
                      <img src={config.party2.signature.dataUrl} alt="Signature" className="max-h-12 max-w-full" />
                    ) : config.party2.signature.type === 'uploaded' && config.party2.signature.dataUrl ? (
                      <img src={config.party2.signature.dataUrl} alt="Uploaded Signature" className="max-h-12 max-w-full" />
                    ) : config.party2.signature.type === 'typed' && config.party2.signature.typedName ? (
                      <span
                        className="text-2xl text-indigo-700 dark:text-indigo-400 px-2"
                        style={{ fontFamily: getSigFontFamily(config.party2.signature.fontStyle) }}
                      >
                        {config.party2.signature.typedName}
                      </span>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center">
                        <div className="w-4/5 border-b-2 border-slate-400 dark:border-slate-500 mb-1"></div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          (Authorized Signature Line • Sign upon export)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs space-y-0.5 text-slate-600 dark:text-slate-400">
                    <p>Printed Name: <strong className="text-slate-900 dark:text-slate-200">{config.party2.representativeName || config.party2.name}</strong></p>
                    <p>Title: {config.party2.representativeTitle || 'Authorized Signatory'}</p>
                    <p>Date: {config.party2.signature.date || config.effectiveDate || '_______________________'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule A if included */}
            {config.includeScheduleA && config.scheduleAContent && (
              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-800 space-y-3">
                <h2 className="text-sm font-bold uppercase text-slate-900 dark:text-white">
                  {config.scheduleATitle}
                </h2>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">
                  {config.scheduleAContent}
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{config.classification}</span>
              <span>Generated with DevHub Legal Engine</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
