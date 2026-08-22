import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Sparkles,
  Building2,
  User,
  DollarSign,
  Percent,
  Calendar,
  CreditCard,
  Settings,
  ChevronDown,
  Globe,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Edit3,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  FileDown,
  FileUp,
  Bookmark,
  Save,
  Check,
  FileJson,
  FolderOpen,
} from 'lucide-react';
import {
  InvoiceData,
  InvoiceCurrency,
  POPULAR_CURRENCIES,
  TAX_LABEL_PRESETS,
  SAMPLE_INVOICES,
  createDefaultInvoice,
  calculateInvoiceTotals,
  formatInvoiceCurrency,
  generateInvoicePdf,
  InvoiceTemplateTheme,
  exportInvoiceTemplateJson,
  parseInvoiceTemplate,
  createInvoiceTemplateFile,
  InvoiceTemplateFile,
} from '../../utils/invoiceGenerator';

export interface SavedTemplateEntry {
  id: string;
  name: string;
  description: string;
  savedAt: string;
  currencyCode: string;
  data: InvoiceData;
}

export const InvoiceGeneratorTool: React.FC = () => {
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    try {
      const saved = localStorage.getItem('devflow_saved_invoice');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return createDefaultInvoice();
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [activeEditorSection, setActiveEditorSection] = useState<'details' | 'from' | 'to' | 'items' | 'taxes' | 'payment' | 'terms'>('items');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template Manager state
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateDescInput, setTemplateDescInput] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateEntry[]>(() => {
    try {
      const stored = localStorage.getItem('devflow_invoice_templates_list');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Keep template name in sync with company name if user hasn't typed a custom one
  useEffect(() => {
    if (!templateNameInput) {
      setTemplateNameInput(`${invoice.sender.companyName || 'My Business'} Template`);
    }
  }, [invoice.sender.companyName]);

  // Persist custom saved templates
  useEffect(() => {
    try {
      localStorage.setItem('devflow_invoice_templates_list', JSON.stringify(savedTemplates));
    } catch (e) {
      // ignore
    }
  }, [savedTemplates]);

  // Auto-save draft
  useEffect(() => {
    try {
      localStorage.setItem('devflow_saved_invoice', JSON.stringify(invoice));
    } catch (e) {
      // storage quota or private mode
    }
  }, [invoice]);

  const totals = calculateInvoiceTotals(invoice);

  // Download settings as template (.json)
  const handleDownloadTemplate = (customName?: string, customDesc?: string) => {
    const tplName = (customName || templateNameInput || `${invoice.sender.companyName || 'Custom'} Template`).trim();
    const tplDesc = (customDesc || templateDescInput || `Settings for ${invoice.currency.code} (${invoice.currency.symbol}) with ${invoice.defaultTaxRate}% tax`).trim();
    
    try {
      const jsonStr = exportInvoiceTemplateJson(invoice, tplName, tplDesc);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filenameSlug = tplName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'invoice-template';
      a.href = url;
      a.download = `invoice-template-${filenameSlug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save a copy to local saved templates as well
      const newEntry: SavedTemplateEntry = {
        id: `tpl-${Date.now()}`,
        name: tplName,
        description: tplDesc,
        savedAt: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        currencyCode: invoice.currency.code,
        data: JSON.parse(JSON.stringify(invoice)),
      };

      setSavedTemplates((prev) => [newEntry, ...prev.filter((t) => t.name !== tplName)].slice(0, 10));
      setPdfSuccessMessage(`Template "${tplName}" exported and saved successfully!`);
      setTimeout(() => setPdfSuccessMessage(null), 4000);
      setIsTemplateModalOpen(false);
    } catch (err: any) {
      setErrorMessage(`Failed to export template: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Upload previously downloaded template (.json)
  const handleUploadTemplateFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const result = parseInvoiceTemplate(raw);

        if (result.success && result.invoice) {
          setInvoice(result.invoice);

          // Save to local templates if it had a template name
          if (result.templateName) {
            const newEntry: SavedTemplateEntry = {
              id: `tpl-${Date.now()}`,
              name: result.templateName,
              description: result.templateDescription || `Imported template (${result.invoice.currency.code})`,
              savedAt: new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
              currencyCode: result.invoice.currency.code,
              data: JSON.parse(JSON.stringify(result.invoice)),
            };
            setSavedTemplates((prev) => [newEntry, ...prev.filter((t) => t.name !== result.templateName)].slice(0, 10));
          }

          setPdfSuccessMessage(`Template "${result.templateName || file.name}" loaded successfully!`);
          setTimeout(() => setPdfSuccessMessage(null), 4000);
        } else {
          setErrorMessage(result.error || 'Failed to parse invoice template.');
          setTimeout(() => setErrorMessage(null), 4500);
        }
      } catch (err: any) {
        setErrorMessage(`Failed to read template file: ${err?.message || 'Invalid JSON syntax'}`);
        setTimeout(() => setErrorMessage(null), 4500);
      }
    };
    reader.readAsText(file);
  };

  const handleTemplateFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadTemplateFile(file);
    }
    e.target.value = '';
  };

  const handleApplySavedTemplate = (entry: SavedTemplateEntry) => {
    setInvoice(JSON.parse(JSON.stringify(entry.data)));
    setPdfSuccessMessage(`Applied saved template "${entry.name}"`);
    setTimeout(() => setPdfSuccessMessage(null), 3000);
  };

  const handleDeleteSavedTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle Load Sample
  const handleLoadSample = (sampleIdx: number) => {
    if (sampleIdx >= 0 && sampleIdx < SAMPLE_INVOICES.length) {
      setInvoice(SAMPLE_INVOICES[sampleIdx].data());
      setPdfSuccessMessage(`Loaded "${SAMPLE_INVOICES[sampleIdx].name}" template`);
      setTimeout(() => setPdfSuccessMessage(null), 3000);
    }
  };

  // Handle Reset
  const handleResetToDefault = () => {
    if (window.confirm('Reset all fields to a fresh default invoice?')) {
      setInvoice(createDefaultInvoice());
      setPdfSuccessMessage('Reset to default template');
      setTimeout(() => setPdfSuccessMessage(null), 3000);
    }
  };

  // JSON Import & Export
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(invoice, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber || 'draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.lineItems) {
          setInvoice(parsed);
          setPdfSuccessMessage('Invoice JSON imported successfully!');
          setTimeout(() => setPdfSuccessMessage(null), 3000);
        } else {
          setErrorMessage('Invalid invoice JSON structure.');
          setTimeout(() => setErrorMessage(null), 4000);
        }
      } catch (err) {
        setErrorMessage('Failed to parse JSON file.');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // PDF Export
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setErrorMessage(null);
      const pdfBytes = await generateInvoicePdf(invoice);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setPdfSuccessMessage('Invoice PDF exported successfully!');
      setTimeout(() => setPdfSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to generate PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Line item handlers
  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      description: 'New Service or Product Item',
      notes: '',
      quantity: 1,
      unit: 'hrs',
      unitPrice: 100,
      discountPercent: 0,
      taxPercent: invoice.defaultTaxRate,
    };
    setInvoice((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  const handleDuplicateItem = (id: string) => {
    const target = invoice.lineItems.find((i) => i.id === id);
    if (!target) return;
    const duplicated = {
      ...target,
      id: `item-${Date.now()}`,
      description: `${target.description} (Copy)`,
    };
    setInvoice((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, duplicated],
    }));
  };

  const handleDeleteItem = (id: string) => {
    if (invoice.lineItems.length <= 1) {
      setErrorMessage('An invoice must contain at least one line item.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((i) => i.id !== id),
    }));
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    }));
  };

  // Currency handler
  const handleCurrencyChange = (code: string) => {
    const matched = POPULAR_CURRENCIES.find((c) => c.code === code);
    if (matched) {
      setInvoice((prev) => ({ ...prev, currency: { ...matched } }));
    }
  };

  const handleUpdateCustomCurrency = (field: keyof InvoiceCurrency, value: any) => {
    setInvoice((prev) => ({
      ...prev,
      currency: {
        ...prev.currency,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-800 border border-slate-700">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`hidden lg:flex px-3 py-1.5 rounded-md text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          {/* Quick Currency Selector in Top Bar */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300 hidden sm:inline">Currency:</span>
            <select
              value={invoice.currency.code}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-slate-900 text-white font-bold text-xs px-2 py-0.5 rounded cursor-pointer border border-slate-700 focus:outline-hidden focus:border-indigo-500"
              title="Change global currency across the tool"
            >
              {POPULAR_CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>
                  {cur.code} ({cur.symbol})
                </option>
              ))}
            </select>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
              {invoice.currency.symbol}
            </span>
          </div>

          {/* Sample Preset Dropdown */}
          <div className="relative inline-block">
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('saved-')) {
                  const savedId = val.replace('saved-', '');
                  const found = savedTemplates.find((t) => t.id === savedId);
                  if (found) handleApplySavedTemplate(found);
                } else if (val !== '') {
                  handleLoadSample(Number(val));
                }
              }}
              value=""
              className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg font-medium cursor-pointer focus:outline-hidden focus:border-indigo-500"
            >
              <option value="" disabled>
                ⚡ Presets & Templates...
              </option>
              {savedTemplates.length > 0 && (
                <optgroup label="⭐ Your Saved Templates">
                  {savedTemplates.map((tpl) => (
                    <option key={tpl.id} value={`saved-${tpl.id}`}>
                      {tpl.name} ({tpl.currencyCode})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="📋 Built-in Standard Presets">
                {SAMPLE_INVOICES.map((sample, idx) => (
                  <option key={idx} value={idx}>
                    {sample.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Download & Upload Actions */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-800/90 border border-slate-700">
            <button
              onClick={() => handleDownloadTemplate()}
              type="button"
              className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download your customized invoice settings as a reusable template JSON"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Download Template</span>
              <span className="sm:hidden">Save Tpl</span>
            </button>

            <label
              className="px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Upload a previously downloaded template (.json) to restore all invoice settings"
            >
              <FileUp className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Upload Template</span>
              <span className="sm:hidden">Load Tpl</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleTemplateFileInputChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Raw JSON Export/Import */}
          <div className="hidden xl:flex items-center gap-1">
            <button
              onClick={handleExportJson}
              type="button"
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Export full invoice state as JSON"
            >
              <span>Raw JSON</span>
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={handleResetToDefault}
            type="button"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Reset to blank template"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            type="button"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            type="button"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {pdfSuccessMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div
        className={`grid gap-5 ${
          activeTab === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {/* LEFT / EDITOR COLUMN */}
        {(activeTab === 'editor' || activeTab === 'split') && (
          <div
            className={`space-y-4 ${
              activeTab === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'w-full'
            }`}
          >
            {/* Section Switcher Tabs */}
            <div className="flex overflow-x-auto gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 no-scrollbar">
              {[
                { id: 'details', label: 'General', icon: FileText },
                { id: 'from', label: 'From (Issuer)', icon: Building2 },
                { id: 'to', label: 'To (Client)', icon: User },
                { id: 'items', label: `Items (${invoice.lineItems.length})`, icon: Layers },
                { id: 'taxes', label: 'Taxes & Totals', icon: Percent },
                { id: 'payment', label: 'Payment', icon: CreditCard },
                { id: 'terms', label: 'Notes & Sign', icon: ShieldCheck },
              ].map((sec) => {
                const Icon = sec.icon;
                const isActive = activeEditorSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveEditorSection(sec.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* SECTION 1: DETAILS & GENERAL */}
            {activeEditorSection === 'details' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Invoice Metadata & Branding</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Invoice Title
                    </label>
                    <input
                      type="text"
                      value={invoice.invoiceTitle}
                      onChange={(e) =>
                        setInvoice((prev) => ({ ...prev, invoiceTitle: e.target.value }))
                      }
                      placeholder="e.g. TAX INVOICE, INVOICE"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoice.invoiceNumber}
                      onChange={(e) =>
                        setInvoice((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      placeholder="e.g. INV-2026-001"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      PO / Reference #
                    </label>
                    <input
                      type="text"
                      value={invoice.poNumber || ''}
                      onChange={(e) =>
                        setInvoice((prev) => ({ ...prev, poNumber: e.target.value }))
                      }
                      placeholder="e.g. PO-89410"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={invoice.paymentStatus}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          paymentStatus: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="pending">🟡 Pending / Due</option>
                      <option value="paid">🟢 Paid in Full</option>
                      <option value="draft">⚪ Draft</option>
                      <option value="overdue">🔴 Overdue</option>
                      <option value="cancelled">⚫ Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={invoice.issueDate}
                      onChange={(e) =>
                        setInvoice((prev) => ({ ...prev, issueDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={invoice.dueDate}
                      onChange={(e) =>
                        setInvoice((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Currency & Regional Formatting Engine */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">
                          Global Currency & Regional Formatting
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Applied across all items, taxes, totals, deposits, and PDF outputs
                        </p>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-inner">
                      <span className="text-[10px] text-slate-400 font-sans font-medium">Sample:</span>
                      <span>{formatInvoiceCurrency(1250.75, invoice.currency)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Preset Currency
                      </label>
                      <select
                        value={invoice.currency.code}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-medium text-xs focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        {POPULAR_CURRENCIES.map((cur) => (
                          <option key={cur.code} value={cur.code}>
                            {cur.code} ({cur.symbol}) — {cur.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={invoice.currency.symbol}
                        onChange={(e) => handleUpdateCustomCurrency('symbol', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                        placeholder="$"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        ISO Code
                      </label>
                      <input
                        type="text"
                        value={invoice.currency.code}
                        onChange={(e) => handleUpdateCustomCurrency('code', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs uppercase focus:outline-hidden focus:border-indigo-500"
                        placeholder="USD"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Currency Full Name
                      </label>
                      <input
                        type="text"
                        value={invoice.currency.name}
                        onChange={(e) => handleUpdateCustomCurrency('name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                        placeholder="US Dollar"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Symbol Placement
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomCurrency('position', 'before')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            invoice.currency.position === 'before'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          Prefix ({invoice.currency.symbol}100)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCustomCurrency('position', 'after')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            invoice.currency.position === 'after'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          Suffix (100 {invoice.currency.symbol})
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Decimal Precision
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[0, 2, 3].map((decimals) => (
                          <button
                            key={decimals}
                            type="button"
                            onClick={() => handleUpdateCustomCurrency('decimals', decimals)}
                            className={`py-1.5 px-1.5 rounded-lg text-xs font-mono font-semibold border text-center transition-all cursor-pointer ${
                              invoice.currency.decimals === decimals
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            .{'0'.repeat(decimals) || '0 (None)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accent Theme Color */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Accent Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={invoice.theme.primaryColor}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, primaryColor: e.target.value },
                        }))
                      }
                      className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer p-0.5"
                    />
                    <div className="flex gap-1.5">
                      {['#4F46E5', '#2563EB', '#059669', '#E11D48', '#0F172A', '#D97706'].map(
                        (c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              setInvoice((prev) => ({
                                ...prev,
                                theme: { ...prev.theme, primaryColor: c },
                              }))
                            }
                            style={{ backgroundColor: c }}
                            className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* INVOICE GENERATOR TEMPLATE MANAGER */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 pt-4 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>Invoice Generator Templates & Settings</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                            .json
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Save all customized settings, currency, taxes, company info & styling into a reusable template file
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Template Meta Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={templateNameInput}
                        onChange={(e) => setTemplateNameInput(e.target.value)}
                        placeholder="e.g. My Agency EU Template"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Template Description / Notes
                      </label>
                      <input
                        type="text"
                        value={templateDescInput}
                        onChange={(e) => setTemplateDescInput(e.target.value)}
                        placeholder={`e.g. Default ${invoice.currency.code} billing with ${invoice.defaultTaxRate}% VAT`}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons: Download and Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate()}
                      className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download Settings as Template (.json)</span>
                    </button>

                    <label className="w-full py-2.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-center">
                      <FileUp className="w-4 h-4 text-indigo-400" />
                      <span>Upload Template (.json)</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleTemplateFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Summary of What's Included in Template */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1.5 font-mono">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Template Snapshot Includes:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Currency:</span>
                        <span className="text-indigo-300 font-semibold">{invoice.currency.code} ({invoice.currency.symbol})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Default Tax:</span>
                        <span className="text-indigo-300 font-semibold">{invoice.defaultTaxRate}% ({invoice.taxMode})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Company:</span>
                        <span className="text-indigo-300 font-semibold truncate block">{invoice.sender.companyName || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Items Count:</span>
                        <span className="text-indigo-300 font-semibold">{invoice.lineItems.length} default line items</span>
                      </div>
                    </div>
                  </div>

                  {/* Saved Templates in Browser List */}
                  {savedTemplates.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Saved Templates in Browser ({savedTemplates.length})</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {savedTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2 group transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-200 truncate">{tpl.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {tpl.currencyCode} • {tpl.savedAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApplySavedTemplate(tpl)}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                                title="Apply this template"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadTemplate(tpl.name, tpl.description)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                title="Download JSON"
                              >
                                <FileDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedTemplate(tpl.id, e)}
                                className="p-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Delete from saved"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 2: FROM (ISSUER / COMPANY DETAILS) */}
            {activeEditorSection === 'from' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Your Details (Biller / Issuer)</span>
                  </h3>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Entity:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, entityType: 'company' },
                        }))
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        invoice.sender.entityType === 'company'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Company
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, entityType: 'individual' },
                        }))
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        invoice.sender.entityType === 'individual'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Freelancer / Indv.
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {invoice.sender.entityType === 'company'
                        ? 'Company / Business Name'
                        : 'Your Full Name'}
                    </label>
                    <input
                      type="text"
                      value={invoice.sender.companyName}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, companyName: e.target.value },
                        }))
                      }
                      placeholder="e.g. Apex Cloud Solutions Inc."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Business Tagline / Subtitle
                    </label>
                    <input
                      type="text"
                      value={invoice.sender.tagline || ''}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, tagline: e.target.value },
                        }))
                      }
                      placeholder="e.g. Enterprise Cloud & Security Services"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={invoice.sender.email}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, email: e.target.value },
                        }))
                      }
                      placeholder="billing@apexcloud.io"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={invoice.sender.phone}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, phone: e.target.value },
                        }))
                      }
                      placeholder="+1 (415) 890-2340"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={invoice.sender.addressLine1}
                    onChange={(e) =>
                      setInvoice((prev) => ({
                        ...prev,
                        sender: { ...prev.sender, addressLine1: e.target.value },
                      }))
                    }
                    placeholder="742 Evergreen Terrace, Suite 500"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={invoice.sender.city}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, city: e.target.value },
                        }))
                      }
                      placeholder="City"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={invoice.sender.state}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, state: e.target.value },
                        }))
                      }
                      placeholder="State / Region"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={invoice.sender.postalCode}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, postalCode: e.target.value },
                        }))
                      }
                      placeholder="Postal Code"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={invoice.sender.country}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          sender: { ...prev.sender, country: e.target.value },
                        }))
                      }
                      placeholder="Country"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Configurable Tax / Registration Identification */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Configurable Tax & Registration Numbers</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Custom Labels</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Primary Tax Identifier */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-slate-400">
                          Tax Label (e.g. VAT, GSTIN, EIN)
                        </label>
                        {/* Quick Preset Selector */}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setInvoice((prev) => ({
                                ...prev,
                                sender: { ...prev.sender, taxIdLabel: e.target.value },
                              }));
                            }
                          }}
                          value=""
                          className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          <option value="" disabled>
                            Presets...
                          </option>
                          {TAX_LABEL_PRESETS.map((p, i) => (
                            <option key={i} value={p.label}>
                              {p.label} ({p.country})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <input
                          type="text"
                          value={invoice.sender.taxIdLabel}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              sender: { ...prev.sender, taxIdLabel: e.target.value },
                            }))
                          }
                          placeholder="VAT No"
                          className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden"
                        />
                        <input
                          type="text"
                          value={invoice.sender.taxIdValue}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              sender: { ...prev.sender, taxIdValue: e.target.value },
                            }))
                          }
                          placeholder="GB 982 4810 23"
                          className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Secondary Registration Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 block">
                        Business / Company Reg Label & Value
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        <input
                          type="text"
                          value={invoice.sender.regIdLabel}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              sender: { ...prev.sender, regIdLabel: e.target.value },
                            }))
                          }
                          placeholder="CRN / Reg #"
                          className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden"
                        />
                        <input
                          type="text"
                          value={invoice.sender.regIdValue}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              sender: { ...prev.sender, regIdValue: e.target.value },
                            }))
                          }
                          placeholder="08941209"
                          className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: TO (RECIPIENT / CLIENT DETAILS) */}
            {activeEditorSection === 'to' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Client / Recipient (Billed To)</span>
                  </h3>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Client Type:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, entityType: 'company' },
                        }))
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        invoice.recipient.entityType === 'company'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Company (B2B)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, entityType: 'individual' },
                        }))
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        invoice.recipient.entityType === 'individual'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Individual (B2C)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {invoice.recipient.entityType === 'company' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Client Company Name
                      </label>
                      <input
                        type="text"
                        value={invoice.recipient.companyName}
                        onChange={(e) =>
                          setInvoice((prev) => ({
                            ...prev,
                            recipient: { ...prev.recipient, companyName: e.target.value },
                          }))
                        }
                        placeholder="e.g. Nexus Global Enterprises Ltd."
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {invoice.recipient.entityType === 'company'
                        ? 'Contact Person / Attention'
                        : 'Customer Full Name'}
                    </label>
                    <input
                      type="text"
                      value={invoice.recipient.contactPerson}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, contactPerson: e.target.value },
                        }))
                      }
                      placeholder="e.g. Elena Rostova"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      value={invoice.recipient.email}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, email: e.target.value },
                        }))
                      }
                      placeholder="accounts.payable@nexusglobal.co.uk"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Client Phone
                    </label>
                    <input
                      type="text"
                      value={invoice.recipient.phone}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, phone: e.target.value },
                        }))
                      }
                      placeholder="+44 20 7946 0912"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Client Address */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    value={invoice.recipient.addressLine1}
                    onChange={(e) =>
                      setInvoice((prev) => ({
                        ...prev,
                        recipient: { ...prev.recipient, addressLine1: e.target.value },
                      }))
                    }
                    placeholder="100 Bishopsgate, 14th Floor"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={invoice.recipient.city}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, city: e.target.value },
                        }))
                      }
                      placeholder="City"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={invoice.recipient.state}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, state: e.target.value },
                        }))
                      }
                      placeholder="State / Region"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={invoice.recipient.postalCode}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, postalCode: e.target.value },
                        }))
                      }
                      placeholder="Postal Code"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={invoice.recipient.country}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, country: e.target.value },
                        }))
                      }
                      placeholder="Country"
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Client Tax / VAT ID */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-slate-400">
                      Client Tax / VAT ID (Optional)
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setInvoice((prev) => ({
                            ...prev,
                            recipient: { ...prev.recipient, taxIdLabel: e.target.value },
                          }));
                        }
                      }}
                      value=""
                      className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      <option value="" disabled>
                        Presets...
                      </option>
                      {TAX_LABEL_PRESETS.map((p, i) => (
                        <option key={i} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <input
                      type="text"
                      value={invoice.recipient.taxIdLabel}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, taxIdLabel: e.target.value },
                        }))
                      }
                      placeholder="VAT No"
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={invoice.recipient.taxIdValue}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          recipient: { ...prev.recipient, taxIdValue: e.target.value },
                        }))
                      }
                      placeholder="GB 982 4810 23"
                      className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: LINE ITEMS */}
            {activeEditorSection === 'items' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Line Items & Services</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 font-semibold">
                      {invoice.lineItems.length} {invoice.lineItems.length === 1 ? 'item' : 'items'} • Subtotal: {formatInvoiceCurrency(totals.subtotal, invoice.currency)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {invoice.lineItems.map((item, idx) => {
                    const rawLineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                    const discVal = (rawLineTotal * (item.discountPercent || 0)) / 100;
                    const netLine = rawLineTotal - discVal;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5 relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10">
                            #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateItem(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                              title="Duplicate item"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'description', e.target.value)
                            }
                            placeholder="Item or service title..."
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-medium text-xs focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>

                        {/* Subtext / Details */}
                        <div>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'notes', e.target.value)
                            }
                            placeholder="Additional description, deliverable notes, or SKU..."
                            className="w-full px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300 text-[11px] focus:outline-hidden"
                          />
                        </div>

                        {/* Quantity, Unit, Price, Discount, Total */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Quantity & Unit
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    'quantity',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                              />
                              <input
                                type="text"
                                value={item.unit || ''}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, 'unit', e.target.value)
                                }
                                placeholder="hrs/pcs"
                                className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Unit Price ({invoice.currency.symbol} {invoice.currency.code})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Discount (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent || 0}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'discountPercent',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Line Total
                            </label>
                            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold text-xs text-right">
                              {formatInvoiceCurrency(netLine, invoice.currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Item</span>
                </button>
              </div>
            )}

            {/* SECTION 5: TAXES & ADJUSTMENTS */}
            {activeEditorSection === 'taxes' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-indigo-400" />
                  <span>Tax Configuration & Financial Adjustments</span>
                </h3>

                {/* Tax Mode */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Tax Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'exclusive', label: 'Exclusive (+ Tax)' },
                      { id: 'inclusive', label: 'Inclusive (Included)' },
                      { id: 'none', label: 'No Tax (0% / Exempt)' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setInvoice((prev) => ({ ...prev, taxMode: mode.id as any }))
                        }
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                          invoice.taxMode === mode.id
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Tax */}
                {invoice.taxMode !== 'none' && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        Primary Tax Rate
                      </span>
                      {/* Presets */}
                      <div className="flex gap-1">
                        {[0, 5, 9, 10, 18, 20].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setInvoice((prev) => ({ ...prev, defaultTaxRate: r }))
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 cursor-pointer"
                          >
                            {r}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Tax Name / Label
                        </label>
                        <input
                          type="text"
                          value={invoice.defaultTaxLabel}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              defaultTaxLabel: e.target.value,
                            }))
                          }
                          placeholder="e.g. VAT, GST, Sales Tax"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={invoice.defaultTaxRate}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              defaultTaxRate: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Secondary Tax Toggle (e.g. CGST + SGST, State Tax) */}
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-slate-300">
                          Dual Tax / Second Tax (e.g. SGST, State Tax)
                        </span>
                        <input
                          type="checkbox"
                          checked={invoice.enableSecondTax}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              enableSecondTax: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                      </div>

                      {invoice.enableSecondTax && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={invoice.secondTaxLabel || ''}
                              onChange={(e) =>
                                setInvoice((prev) => ({
                                  ...prev,
                                  secondTaxLabel: e.target.value,
                                }))
                              }
                              placeholder="e.g. SGST / State Tax"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={invoice.secondTaxRate || 0}
                              onChange={(e) =>
                                setInvoice((prev) => ({
                                  ...prev,
                                  secondTaxRate: parseFloat(e.target.value) || 0,
                                }))
                              }
                              placeholder="Rate %"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Adjustments: Discount, Shipping, Fees, TDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Global Discount
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={invoice.globalDiscountValue || 0}
                        onChange={(e) =>
                          setInvoice((prev) => ({
                            ...prev,
                            globalDiscountValue: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                      />
                      <select
                        value={invoice.globalDiscountType}
                        onChange={(e) =>
                          setInvoice((prev) => ({
                            ...prev,
                            globalDiscountType: e.target.value as any,
                          }))
                        }
                        className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        <option value="percent">% (Percent)</option>
                        <option value="fixed">{invoice.currency.symbol} ({invoice.currency.code})</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Shipping / Delivery Fee ({invoice.currency.symbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={invoice.shippingFee || 0}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          shippingFee: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Amount Already Paid / Deposit ({invoice.currency.symbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={invoice.amountPaid || 0}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          amountPaid: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Withholding Tax (TDS / Retención)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={invoice.enableWithholdingTax}
                        onChange={(e) =>
                          setInvoice((prev) => ({
                            ...prev,
                            enableWithholdingTax: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                      {invoice.enableWithholdingTax && (
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={invoice.withholdingTaxRate || 0}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              withholdingTaxRate: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="Rate %"
                          className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Calculation Summary in Taxes Tab */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Base Subtotal:</span>
                    <span className="text-slate-200">{formatInvoiceCurrency(totals.netTaxableAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Calculated Total Tax:</span>
                    <span className="text-slate-200">{formatInvoiceCurrency(totals.totalTax, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold pt-1 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400">{formatInvoiceCurrency(totals.grandTotal, invoice.currency)}</span>
                  </div>
                  {totals.balanceDue !== totals.grandTotal && (
                    <div className="flex justify-between text-indigo-300 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatInvoiceCurrency(totals.balanceDue, invoice.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 6: PAYMENT INFO */}
            {activeEditorSection === 'payment' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>Bank & Remittance Information</span>
                  </h3>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>Billing Currency: {invoice.currency.name} ({invoice.currency.code})</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JPMorgan Chase Bank / Barclays"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Cloud Solutions Inc."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Account Number / IBAN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      SWIFT / BIC / Routing Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CHASUS33XXX"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      UPI ID / PayPal / Payment Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. payments@apexcloud.io or upi@bank"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: NOTES, TERMS & SIGNATURE */}
            {activeEditorSection === 'terms' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Notes, Terms & Signature</span>
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Notes & Thank You Message
                  </label>
                  <textarea
                    rows={2}
                    value={invoice.notes}
                    onChange={(e) =>
                      setInvoice((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Thank you for your business! Please reference invoice number on wire transfers."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={2}
                    value={invoice.termsAndConditions}
                    onChange={(e) =>
                      setInvoice((prev) => ({
                        ...prev,
                        termsAndConditions: e.target.value,
                      }))
                    }
                    placeholder="All services provided in accordance with Master Service Agreement. Late payments subject to finance charge."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Authorized Signatory Name
                    </label>
                    <input
                      type="text"
                      value={invoice.signatoryName || ''}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          signatoryName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Signatory Title / Designation
                    </label>
                    <input
                      type="text"
                      value={invoice.signatoryTitle || ''}
                      onChange={(e) =>
                        setInvoice((prev) => ({
                          ...prev,
                          signatoryTitle: e.target.value,
                        }))
                      }
                      placeholder="e.g. Managing Director"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT / LIVE PREVIEW COLUMN */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div
            className={`space-y-3 ${
              activeTab === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'w-full'
            }`}
          >
            {/* Live Rendered Invoice Sheet Container */}
            <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 min-h-[750px] p-6 sm:p-10 font-sans print:shadow-none print:border-none print:p-0">
              {/* Accent Color Band */}
              <div
                className="absolute top-0 left-0 right-0 h-2.5"
                style={{ backgroundColor: invoice.theme.primaryColor || '#4F46E5' }}
              />

              {/* Invoice Header */}
              <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-slate-200">
                {/* Sender Company */}
                <div className="space-y-1 max-w-sm">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {invoice.sender.companyName || 'Company Name'}
                  </h1>
                  {invoice.sender.tagline && (
                    <p className="text-xs text-slate-500 font-medium">
                      {invoice.sender.tagline}
                    </p>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                    {invoice.sender.addressLine1 && <p>{invoice.sender.addressLine1}</p>}
                    {(invoice.sender.city || invoice.sender.country) && (
                      <p>
                        {[
                          invoice.sender.city,
                          invoice.sender.state,
                          invoice.sender.postalCode,
                          invoice.sender.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {invoice.sender.email && (
                      <p className="text-indigo-600 font-medium">{invoice.sender.email}</p>
                    )}
                    {invoice.sender.phone && <p>{invoice.sender.phone}</p>}
                    {invoice.sender.taxIdValue && (
                      <p className="font-semibold text-slate-700">
                        {invoice.sender.taxIdLabel || 'Tax ID'}: {invoice.sender.taxIdValue}
                      </p>
                    )}
                    {invoice.sender.regIdValue && (
                      <p className="text-slate-500">
                        {invoice.sender.regIdLabel || 'Reg'}: {invoice.sender.regIdValue}
                      </p>
                    )}
                  </div>
                </div>

                {/* Invoice Title & Meta */}
                <div className="text-right space-y-2">
                  <h2
                    className="text-2xl sm:text-3xl font-black tracking-tight"
                    style={{ color: invoice.theme.primaryColor || '#4F46E5' }}
                  >
                    {invoice.invoiceTitle || 'INVOICE'}
                  </h2>
                  <p className="text-sm font-mono font-bold text-slate-800">
                    # {invoice.invoiceNumber || 'INV-001'}
                  </p>

                  <div className="inline-block">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                        invoice.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : invoice.paymentStatus === 'overdue'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {invoice.paymentStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-2 font-medium">
                    <p>
                      <span className="text-slate-400">Currency:</span>{' '}
                      <span className="font-semibold text-slate-800 font-mono">
                        {invoice.currency.code} ({invoice.currency.symbol})
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Issue Date:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {invoice.issueDate || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Due Date:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {invoice.dueDate || '—'}
                      </span>
                    </p>
                    {invoice.poNumber && (
                      <p>
                        <span className="text-slate-400">PO Ref:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {invoice.poNumber}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Billed To / Recipient Info */}
              <div className="py-6 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span
                    className="text-[10px] font-bold tracking-wider uppercase mb-1.5 block"
                    style={{ color: invoice.theme.primaryColor || '#4F46E5' }}
                  >
                    Billed To:
                  </span>
                  <p className="text-base font-bold text-slate-900">
                    {invoice.recipient.companyName || invoice.recipient.contactPerson || 'Client'}
                  </p>
                  {invoice.recipient.companyName && invoice.recipient.contactPerson && (
                    <p className="text-xs text-slate-600 font-medium">
                      Attn: {invoice.recipient.contactPerson}
                    </p>
                  )}
                  <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                    {invoice.recipient.addressLine1 && <p>{invoice.recipient.addressLine1}</p>}
                    {(invoice.recipient.city || invoice.recipient.country) && (
                      <p>
                        {[
                          invoice.recipient.city,
                          invoice.recipient.state,
                          invoice.recipient.postalCode,
                          invoice.recipient.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {invoice.recipient.email && <p>{invoice.recipient.email}</p>}
                    {invoice.recipient.taxIdValue && (
                      <p className="font-semibold text-slate-700 pt-0.5">
                        {invoice.recipient.taxIdLabel || 'Tax ID'}:{' '}
                        {invoice.recipient.taxIdValue}
                      </p>
                    )}
                  </div>
                </div>

                {invoice.hasSeparateShippingAddress && invoice.shippingAddress && (
                  <div>
                    <span
                      className="text-[10px] font-bold tracking-wider uppercase mb-1.5 block"
                      style={{ color: invoice.theme.primaryColor || '#4F46E5' }}
                    >
                      Shipped To:
                    </span>
                    <p className="text-sm font-bold text-slate-900">
                      {invoice.shippingAddress.recipientName}
                    </p>
                    <p className="text-xs text-slate-600">
                      {invoice.shippingAddress.addressLine1}
                    </p>
                    <p className="text-xs text-slate-600">
                      {invoice.shippingAddress.city}, {invoice.shippingAddress.country}
                    </p>
                  </div>
                )}
              </div>

              {/* Table of Line Items */}
              <div className="py-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-2">Description / Service</th>
                      <th className="py-3 px-2 text-center">Qty</th>
                      <th className="py-3 px-2 text-right">Unit Price ({invoice.currency.symbol})</th>
                      {invoice.lineItems.some((i) => (i.discountPercent || 0) > 0) && (
                        <th className="py-3 px-2 text-right">Disc %</th>
                      )}
                      <th className="py-3 px-2 text-right">Amount ({invoice.currency.symbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {invoice.lineItems.map((item, idx) => {
                      const rawTotal = (item.quantity || 0) * (item.unitPrice || 0);
                      const discVal = (rawTotal * (item.discountPercent || 0)) / 100;
                      const lineNet = rawTotal - discVal;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-2">
                            <p className="font-semibold text-slate-900">{item.description}</p>
                            {item.notes && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-center font-mono text-slate-700">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-700">
                            {formatInvoiceCurrency(item.unitPrice || 0, invoice.currency)}
                          </td>
                          {invoice.lineItems.some((i) => (i.discountPercent || 0) > 0) && (
                            <td className="py-3.5 px-2 text-right font-mono text-slate-500">
                              {item.discountPercent ? `${item.discountPercent}%` : '—'}
                            </td>
                          )}
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-900">
                            {formatInvoiceCurrency(lineNet, invoice.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes Section */}
              <div className="pt-4 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-6">
                {/* Notes & Terms on Left */}
                <div className="sm:col-span-6 space-y-4">
                  {invoice.notes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Notes & Remarks
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">{invoice.notes}</p>
                    </div>
                  )}

                  {invoice.termsAndConditions && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Terms & Conditions
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {invoice.termsAndConditions}
                      </p>
                    </div>
                  )}

                  {invoice.signatoryName && (
                    <div className="pt-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Authorized Signatory
                      </span>
                      <p className="text-sm font-bold text-slate-900 font-serif italic">
                        {invoice.signatoryName}
                      </p>
                      {invoice.signatoryTitle && (
                        <p className="text-xs text-slate-500">{invoice.signatoryTitle}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Summary on Right */}
                <div className="sm:col-span-6 space-y-2 text-xs">
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">
                      {formatInvoiceCurrency(totals.subtotal, invoice.currency)}
                    </span>
                  </div>

                  {totals.totalItemDiscount > 0 && (
                    <div className="flex justify-between py-1 text-emerald-600 font-medium">
                      <span>Item Discounts:</span>
                      <span className="font-mono">
                        -{formatInvoiceCurrency(totals.totalItemDiscount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {totals.globalDiscountAmount > 0 && (
                    <div className="flex justify-between py-1 text-emerald-600 font-medium">
                      <span>Global Discount:</span>
                      <span className="font-mono">
                        -{formatInvoiceCurrency(totals.globalDiscountAmount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {invoice.taxMode === 'exclusive' && totals.totalTax > 0 && (
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>
                        {invoice.defaultTaxLabel || 'Tax'} ({invoice.defaultTaxRate}%):
                      </span>
                      <span className="font-mono font-semibold">
                        {formatInvoiceCurrency(totals.primaryTaxAmount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {invoice.taxMode === 'exclusive' &&
                    invoice.enableSecondTax &&
                    totals.secondTaxAmount > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>
                          {invoice.secondTaxLabel || 'Tax 2'} ({invoice.secondTaxRate}%):
                        </span>
                        <span className="font-mono font-semibold">
                          {formatInvoiceCurrency(totals.secondTaxAmount, invoice.currency)}
                        </span>
                      </div>
                    )}

                  {invoice.taxMode === 'inclusive' && totals.totalTax > 0 && (
                    <div className="flex justify-between py-1 text-slate-500 text-[11px]">
                      <span>Includes {invoice.defaultTaxLabel || 'Tax'}:</span>
                      <span className="font-mono">
                        {formatInvoiceCurrency(totals.totalTax, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {totals.shippingFee > 0 && (
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Shipping Fee:</span>
                      <span className="font-mono font-semibold">
                        {formatInvoiceCurrency(totals.shippingFee, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div
                    className="flex justify-between py-2.5 border-t-2 border-slate-900 font-bold text-sm"
                    style={{ color: invoice.theme.primaryColor || '#4F46E5' }}
                  >
                    <span>Grand Total:</span>
                    <span className="text-base font-mono">
                      {formatInvoiceCurrency(totals.grandTotal, invoice.currency)}
                    </span>
                  </div>

                  {totals.withholdingTaxAmount > 0 && (
                    <div className="flex justify-between py-1 text-rose-600 text-xs">
                      <span>Less {invoice.withholdingTaxLabel || 'TDS'}:</span>
                      <span className="font-mono">
                        -{formatInvoiceCurrency(totals.withholdingTaxAmount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {totals.amountPaid > 0 && (
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Amount Paid:</span>
                      <span className="font-mono font-semibold">
                        {formatInvoiceCurrency(totals.amountPaid, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {(totals.amountPaid > 0 || totals.withholdingTaxAmount > 0) && (
                    <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-100 border border-slate-300 font-bold text-sm text-slate-900 mt-2">
                      <span>Balance Due:</span>
                      <span className="font-mono text-indigo-700">
                        {formatInvoiceCurrency(totals.balanceDue, invoice.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="pt-8 mt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>DevFlow Pro Enterprise Invoice Engine</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
