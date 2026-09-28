import React from 'react';
import { Plus, Trash2, Calendar, DollarSign, Clock, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { AgreementMilestone, AgreementPaymentTerms } from '../../../utils/agreementGenerator';
import { POPULAR_CURRENCIES, InvoiceCurrency } from '../../../utils/invoiceGenerator';

interface MilestoneEditorProps {
  paymentTerms: AgreementPaymentTerms;
  milestones: AgreementMilestone[];
  onUpdatePaymentTerms: (terms: AgreementPaymentTerms) => void;
  onUpdateMilestones: (milestones: AgreementMilestone[]) => void;
}

export const MilestoneEditor: React.FC<MilestoneEditorProps> = ({
  paymentTerms,
  milestones,
  onUpdatePaymentTerms,
  onUpdateMilestones,
}) => {
  const handleCurrencyChange = (currencyCode: string) => {
    const selected = POPULAR_CURRENCIES.find((c) => c.code === currencyCode) || POPULAR_CURRENCIES[0];
    onUpdatePaymentTerms({
      ...paymentTerms,
      currency: selected,
    });
  };

  const handleTotalAmountChange = (newTotal: number) => {
    const validTotal = Math.max(0, newTotal);
    // Recalculate milestone amounts based on their percentages
    const updatedMilestones = milestones.map((m) => ({
      ...m,
      amount: Math.round((m.percentage / 100) * validTotal),
    }));

    onUpdatePaymentTerms({
      ...paymentTerms,
      totalAmount: validTotal,
    });
    onUpdateMilestones(updatedMilestones);
  };

  const handleAddMilestone = () => {
    const newIndex = milestones.length + 1;
    const currentTotalPct = milestones.reduce((sum, m) => sum + m.percentage, 0);
    const defaultPct = Math.max(5, 100 - currentTotalPct);
    const calculatedAmount = Math.round((defaultPct / 100) * paymentTerms.totalAmount);

    const newMilestone: AgreementMilestone = {
      id: `m_${Date.now()}`,
      name: `Milestone ${newIndex}`,
      deliverables: 'Deliverable specifications & acceptance criteria.',
      percentage: defaultPct,
      amount: calculatedAmount,
      targetDate: new Date(Date.now() + newIndex * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    };

    onUpdateMilestones([...milestones, newMilestone]);
  };

  const handleUpdateMilestone = (id: string, updates: Partial<AgreementMilestone>) => {
    const updated = milestones.map((m) => {
      if (m.id !== id) return m;
      const merged = { ...m, ...updates };
      // If percentage was updated, auto-calculate amount
      if (updates.percentage !== undefined) {
        merged.amount = Math.round((updates.percentage / 100) * paymentTerms.totalAmount);
      }
      return merged;
    });
    onUpdateMilestones(updated);
  };

  const handleRemoveMilestone = (id: string) => {
    onUpdateMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleAutoBalancePercentages = () => {
    if (milestones.length === 0) return;
    const equalPct = Math.floor(100 / milestones.length);
    const remainder = 100 - equalPct * milestones.length;

    const balanced = milestones.map((m, idx) => {
      const pct = idx === 0 ? equalPct + remainder : equalPct;
      return {
        ...m,
        percentage: pct,
        amount: Math.round((pct / 100) * paymentTerms.totalAmount),
      };
    });
    onUpdateMilestones(balanced);
  };

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const totalMilestoneSum = milestones.reduce((sum, m) => sum + m.amount, 0);
  const sym = paymentTerms.currency.symbol;

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
      {/* Financial Overview & Currency Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Payment Model
          </label>
          <select
            value={paymentTerms.paymentModel}
            onChange={(e) => onUpdatePaymentTerms({ ...paymentTerms, paymentModel: e.target.value as any })}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
          >
            <option value="milestones">Milestone-Based Payments</option>
            <option value="fixed_lump_sum">Fixed Lump Sum / Upfront</option>
            <option value="hourly_rate">Hourly / Time & Materials</option>
            <option value="retainer">Monthly Retainer</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Contract Currency
          </label>
          <select
            value={paymentTerms.currency.code}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
          >
            {POPULAR_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol}) - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Total Fixed Fee / Contract Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
              {sym}
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={paymentTerms.totalAmount || ''}
              onChange={(e) => handleTotalAmountChange(parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Additional Terms Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Invoicing Payment Net Days
          </label>
          <select
            value={paymentTerms.netDays}
            onChange={(e) => onUpdatePaymentTerms({ ...paymentTerms, netDays: parseInt(e.target.value) || 14 })}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="0">Due Upon Receipt (Net 0)</option>
            <option value="7">Net 7 Days</option>
            <option value="14">Net 14 Calendar Days</option>
            <option value="30">Net 30 Calendar Days</option>
            <option value="45">Net 45 Calendar Days</option>
            <option value="60">Net 60 Calendar Days</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Bug-Fix Warranty Period
          </label>
          <select
            value={paymentTerms.warrantyDays}
            onChange={(e) => onUpdatePaymentTerms({ ...paymentTerms, warrantyDays: parseInt(e.target.value) || 30 })}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="14">14 Days Post-Launch</option>
            <option value="30">30 Days Standard</option>
            <option value="60">60 Days Extended</option>
            <option value="90">90 Days Enterprise</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Late Payment Fee (% / Month)
          </label>
          <input
            type="number"
            step="0.1"
            value={paymentTerms.lateFeePercent || 1.5}
            onChange={(e) => onUpdatePaymentTerms({ ...paymentTerms, lateFeePercent: parseFloat(e.target.value) || 0 })}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Calculated Milestone Total
          </label>
          <div
            className={`px-2.5 py-1.5 rounded-lg border font-mono font-bold ${
              totalPercentage === 100
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            }`}
          >
            {totalPercentage}% ({sym}
            {totalMilestoneSum.toLocaleString()})
          </div>
        </div>
      </div>

      {/* Milestone List Editor */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Milestone Payment Schedule ({milestones.length})
            </h4>
            {totalPercentage !== 100 && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-full">
                Total is {totalPercentage}% (should be 100%)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoBalancePercentages}
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Balance 100%</span>
            </button>
            <button
              type="button"
              onClick={handleAddMilestone}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {milestones.map((m, idx) => (
            <div
              key={m.id}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => handleUpdateMilestone(m.id, { name: e.target.value })}
                  placeholder="e.g. Milestone 1"
                  className="w-1/3 px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={m.percentage}
                      onChange={(e) => handleUpdateMilestone(m.id, { percentage: parseFloat(e.target.value) || 0 })}
                      className="w-12 text-right bg-transparent border-none font-mono font-bold focus:outline-hidden"
                    />
                    <span className="text-slate-400">%</span>
                  </div>

                  <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800">
                    {sym}
                    {m.amount.toLocaleString()}
                  </div>

                  <input
                    type="date"
                    value={m.targetDate}
                    onChange={(e) => handleUpdateMilestone(m.id, { targetDate: e.target.value })}
                    className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveMilestone(m.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  value={m.deliverables}
                  onChange={(e) => handleUpdateMilestone(m.id, { deliverables: e.target.value })}
                  placeholder="Deliverables / Acceptance criteria for this milestone..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
