import React, { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Building2,
  User,
  DollarSign,
  Layers,
  Settings,
  Eye,
  Code,
  FileCheck,
  Printer,
  Upload,
  Save,
  CheckCircle2,
  Calendar,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  AgreementConfig,
  getDefaultContractorAgreement,
  generateAgreementMarkdown,
  generateAgreementPdf,
  generateAgreementDocx,
  generateAgreementHtml,
  JURISDICTION_PRESETS,
} from '../../utils/agreementGenerator';
import { getAgreementPresets, AgreementPreset } from '../../utils/agreementPresets';
import { PartyEditor } from './agreement/PartyEditor';
import { MilestoneEditor } from './agreement/MilestoneEditor';
import { ClauseEditor } from './agreement/ClauseEditor';
import { DocumentPreview } from './agreement/DocumentPreview';

export const AgreementGeneratorTool: React.FC = () => {
  const [presets] = useState<AgreementPreset[]>(getAgreementPresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('contractor-web-dev');
  const [config, setConfig] = useState<AgreementConfig>(getDefaultContractorAgreement());

  const [activeFormTab, setActiveFormTab] = useState<'meta' | 'party1' | 'party2' | 'financials' | 'clauses' | 'scheduleA'>('meta');
  const [viewLayout, setViewLayout] = useState<'split' | 'form' | 'preview'>('split');
  const [previewMode, setPreviewMode] = useState<'visual' | 'markdown'>('visual');

  const [hasCopied, setHasCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setConfig(JSON.parse(JSON.stringify(preset.config)));
      showStatus(`Loaded template: ${preset.name}`);
    }
  };

  const handleResetToDefault = () => {
    setConfig(getDefaultContractorAgreement());
    setSelectedPresetId('contractor-web-dev');
    showStatus('Reset agreement to Web Development Contractor default');
  };

  const handleGenerateRandomId = () => {
    const prefix = config.title.includes('NDA')
      ? 'NDA'
      : config.title.includes('MSA')
      ? 'MSA'
      : config.title.includes('DESIGN')
      ? 'DES'
      : 'ICA';
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newId = `${prefix}-WEB-${year}-${rand}`;
    setConfig({ ...config, contractId: newId });
  };

  const handleCopyMarkdown = async () => {
    const md = generateAgreementMarkdown(config);
    await navigator.clipboard.writeText(md);
    setHasCopied(true);
    showStatus('Markdown copied to clipboard!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateAgreementMarkdown(config);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.contractId || 'agreement'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Downloaded agreement as Markdown (.md)');
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const pdfBytes = await generateAgreementPdf(config);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.contractId || 'agreement'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('Downloaded agreement as PDF');
    } catch (err) {
      console.error('PDF export error:', err);
      showStatus('Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      const blob = await generateAgreementDocx(config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.contractId || 'agreement'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('Downloaded agreement as Word document (.docx)');
    } catch (err) {
      console.error('Word export error:', err);
      showStatus('Failed to generate Docx');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrint = () => {
    const htmlContent = generateAgreementHtml(config);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  const handleSaveJsonTemplate = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${config.contractId || 'agreement'}-template.json`;
    a.click();
    showStatus('Saved agreement configuration as JSON template');
  };

  const handleLoadJsonTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        try {
          const parsed = JSON.parse(loadEvt.target?.result as string);
          if (parsed && parsed.title && parsed.clauses) {
            setConfig(parsed);
            showStatus('Successfully imported agreement configuration!');
          }
        } catch (err) {
          alert('Invalid JSON agreement template file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSelectJurisdiction = (preset: typeof JURISDICTION_PRESETS[0]) => {
    setConfig({
      ...config,
      governingJurisdiction: preset.jurisdiction,
      governingCity: preset.city,
    });
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Banner & Archetype Selector */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-indigo-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                AGR
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                Legal Agreement & Contract Generator
              </h2>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-2xl">
              Create enforceable contractor agreements, NDAs, MSAs, and SOWs. Configure corporate vs individual parties, milestone payouts, custom clauses, digital signatures, and export to PDF, Markdown, and Word.
            </p>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-2 bg-indigo-950/80 p-1.5 rounded-xl border border-indigo-700/50">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider pl-2 shrink-0">
              Template:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-indigo-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-600/60 focus:ring-2 focus:ring-indigo-400"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleResetToDefault}
              title="Reset to default reference"
              className="p-1.5 text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-800/50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Layout Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewLayout('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewLayout === 'split'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewLayout === 'form'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Form Only
          </button>
          <button
            type="button"
            onClick={() => setViewLayout('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewLayout === 'preview'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Preview Only
          </button>
        </div>

        {/* Export / Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Markdown (.md)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            title="Print or Save as HTML"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleSaveJsonTemplate}
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Export JSON Configuration"
          >
            <Save className="w-4 h-4" />
          </button>

          <label
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Import JSON Configuration"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleLoadJsonTemplate} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Workspace (Split / Form / Preview) */}
      <div className={`grid gap-4 ${viewLayout === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Form Editor Column */}
        {viewLayout !== 'preview' && (
          <div className={`${viewLayout === 'split' ? 'lg:col-span-6' : 'w-full'} space-y-3`}>
            {/* Form Section Navigation Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveFormTab('meta')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFormTab === 'meta'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                1. Agreement Info
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('party1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFormTab === 'party1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                2. {config.party1Role}
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('party2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFormTab === 'party2'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                3. {config.party2Role}
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('financials')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFormTab === 'financials'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                4. Milestones & Fee
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('clauses')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFormTab === 'clauses'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                5. Clauses & Terms
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('scheduleA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFormTab === 'scheduleA'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                6. Schedule A
              </button>
            </div>

            {/* Form Section 1: Agreement Info & Governing Law */}
            {activeFormTab === 'meta' && (
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Agreement Metadata & Legal Framework</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Agreement Title
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      placeholder="e.g. INDEPENDENT CONTRACTOR AGREEMENT"
                      className="w-full px-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Subtitle / Service Specification
                    </label>
                    <input
                      type="text"
                      value={config.subtitle}
                      onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      placeholder="e.g. Web Development & Digital Architecture Services"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Contract / Reference ID
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomId}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={config.contractId}
                      onChange={(e) => setConfig({ ...config, contractId: e.target.value })}
                      placeholder="e.g. ICA-WEB-2026-001"
                      className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={config.effectiveDate}
                      onChange={(e) => setConfig({ ...config, effectiveDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Party 1 Role Label
                    </label>
                    <input
                      type="text"
                      value={config.party1Role}
                      onChange={(e) => setConfig({ ...config, party1Role: e.target.value })}
                      placeholder="e.g. Client, Disclosing Party"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Party 2 Role Label
                    </label>
                    <input
                      type="text"
                      value={config.party2Role}
                      onChange={(e) => setConfig({ ...config, party2Role: e.target.value })}
                      placeholder="e.g. Contractor, Receiving Party"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Jurisdiction & Dispute Resolution */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Governing Law & Jurisdiction Presets
                    </h4>
                    <select
                      onChange={(e) => {
                        const p = JURISDICTION_PRESETS.find((j) => j.label === e.target.value);
                        if (p) handleSelectJurisdiction(p);
                      }}
                      className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                    >
                      <option value="">Quick Presets...</option>
                      {JURISDICTION_PRESETS.map((j) => (
                        <option key={j.label} value={j.label}>
                          {j.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Governing Jurisdiction / State
                      </label>
                      <input
                        type="text"
                        value={config.governingJurisdiction}
                        onChange={(e) => setConfig({ ...config, governingJurisdiction: e.target.value })}
                        placeholder="e.g. State of California, United States"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Court Venue / City
                      </label>
                      <input
                        type="text"
                        value={config.governingCity}
                        onChange={(e) => setConfig({ ...config, governingCity: e.target.value })}
                        placeholder="e.g. San Francisco, CA"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Formatting Toggles */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeFrontmatter}
                      onChange={(e) => setConfig({ ...config, includeFrontmatter: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>YAML Frontmatter</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includePageDividers}
                      onChange={(e) => setConfig({ ...config, includePageDividers: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Page Break Comments</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeWitnessBlock}
                      onChange={(e) => setConfig({ ...config, includeWitnessBlock: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Witness / Notary Block</span>
                  </label>
                </div>
              </div>
            )}

            {/* Form Section 2: Party 1 */}
            {activeFormTab === 'party1' && (
              <PartyEditor
                roleLabel={config.party1Role}
                roleKey="party1"
                party={config.party1}
                onChange={(party1) => setConfig({ ...config, party1 })}
              />
            )}

            {/* Form Section 3: Party 2 */}
            {activeFormTab === 'party2' && (
              <PartyEditor
                roleLabel={config.party2Role}
                roleKey="party2"
                party={config.party2}
                onChange={(party2) => setConfig({ ...config, party2 })}
              />
            )}

            {/* Form Section 4: Financials & Milestones */}
            {activeFormTab === 'financials' && (
              <MilestoneEditor
                paymentTerms={config.paymentTerms}
                milestones={config.milestones}
                onUpdatePaymentTerms={(paymentTerms) => setConfig({ ...config, paymentTerms })}
                onUpdateMilestones={(milestones) => setConfig({ ...config, milestones })}
              />
            )}

            {/* Form Section 5: Clauses & Legal Terms */}
            {activeFormTab === 'clauses' && (
              <ClauseEditor
                clauses={config.clauses}
                onChange={(clauses) => setConfig({ ...config, clauses })}
              />
            )}

            {/* Form Section 6: Schedule A */}
            {activeFormTab === 'scheduleA' && (
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Schedule A: Scope of Work & Deliverables</span>
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeScheduleA}
                      onChange={(e) => setConfig({ ...config, includeScheduleA: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Include Schedule A in Document</span>
                  </label>
                </div>

                {config.includeScheduleA && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Schedule Header Title
                      </label>
                      <input
                        type="text"
                        value={config.scheduleATitle}
                        onChange={(e) => setConfig({ ...config, scheduleATitle: e.target.value })}
                        placeholder="Schedule A: Scope of Work & Deliverables"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Scope Specification Content (Markdown supported)
                      </label>
                      <textarea
                        value={config.scheduleAContent}
                        onChange={(e) => setConfig({ ...config, scheduleAContent: e.target.value })}
                        rows={10}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Document Live Preview Column */}
        {viewLayout !== 'form' && (
          <div className={`${viewLayout === 'split' ? 'lg:col-span-6' : 'w-full'} min-h-[600px]`}>
            <DocumentPreview
              config={config}
              previewMode={previewMode}
              onTogglePreviewMode={setPreviewMode}
              onCopyMarkdown={handleCopyMarkdown}
              hasCopied={hasCopied}
            />
          </div>
        )}
      </div>
    </div>
  );
};
