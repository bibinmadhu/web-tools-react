import React from 'react';
import { Building2, User, Plus, Trash2, ShieldCheck, Mail, Phone, MapPin, Hash } from 'lucide-react';
import { AgreementParty, PartyEntityType, TAX_ID_PRESETS } from '../../../utils/agreementGenerator';
import { SignaturePad } from './SignaturePad';

interface PartyEditorProps {
  roleLabel: string;
  roleKey: string;
  party: AgreementParty;
  onChange: (updated: AgreementParty) => void;
}

export const PartyEditor: React.FC<PartyEditorProps> = ({
  roleLabel,
  roleKey,
  party,
  onChange,
}) => {
  const handleEntityTypeChange = (type: PartyEntityType) => {
    onChange({
      ...party,
      entityType: type,
      entityStructure: type === 'company' ? 'Limited Liability Company (LLC)' : 'Individual / Freelancer',
      taxIdType: type === 'company' ? 'EIN / Tax ID (US)' : 'SSN (US Individual)',
    });
  };

  const handleAddCustomField = () => {
    const newField = {
      id: `cf-${Date.now()}`,
      label: 'Registration Jurisdiction',
      value: '',
    };
    onChange({
      ...party,
      customFields: [...party.customFields, newField],
    });
  };

  const handleUpdateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    onChange({
      ...party,
      customFields: party.customFields.map((f) => (f.id === id ? { ...f, [key]: val } : f)),
    });
  };

  const handleRemoveCustomField = (id: string) => {
    onChange({
      ...party,
      customFields: party.customFields.filter((f) => f.id !== id),
    });
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header & Entity Type Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
            Role: {roleLabel}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {party.name || (party.entityType === 'company' ? 'Company Name' : 'Individual Name')}
          </h3>
        </div>

        {/* Entity Type Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleEntityTypeChange('company')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              party.entityType === 'company'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company / Corp</span>
          </button>
          <button
            type="button"
            onClick={() => handleEntityTypeChange('individual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              party.entityType === 'individual'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Individual / Freelancer</span>
          </button>
        </div>
      </div>

      {/* Primary Info Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            {party.entityType === 'company' ? 'Company / Business Legal Name' : 'Full Legal Name'}
          </label>
          <input
            type="text"
            value={party.name}
            onChange={(e) => onChange({ ...party, name: e.target.value })}
            placeholder={party.entityType === 'company' ? 'e.g. Acme Technologies Inc.' : 'e.g. Alex Rivera'}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            {party.entityType === 'company' ? 'Trade Name / DBA / Brand' : 'Professional Title / Alias'}
          </label>
          <input
            type="text"
            value={party.tradeName || ''}
            onChange={(e) => onChange({ ...party, tradeName: e.target.value })}
            placeholder={party.entityType === 'company' ? 'e.g. Acme Cloud Platform' : 'e.g. Senior Frontend Consultant'}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Entity Legal Structure
          </label>
          <input
            type="text"
            value={party.entityStructure || ''}
            onChange={(e) => onChange({ ...party, entityStructure: e.target.value })}
            placeholder={party.entityType === 'company' ? 'e.g. Delaware C-Corp / LLC / Ltd.' : 'e.g. Sole Proprietor / Individual'}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Authorized Signatory / Representative Name
          </label>
          <input
            type="text"
            value={party.representativeName}
            onChange={(e) => onChange({ ...party, representativeName: e.target.value })}
            placeholder="e.g. Sarah Jenkins"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Signatory Official Title
          </label>
          <input
            type="text"
            value={party.representativeTitle}
            onChange={(e) => onChange({ ...party, representativeTitle: e.target.value })}
            placeholder="e.g. Chief Executive Officer / Founder"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 truncate">
              Tax ID Type
            </label>
            <select
              value={party.taxIdType}
              onChange={(e) => onChange({ ...party, taxIdType: e.target.value })}
              className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {TAX_ID_PRESETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 truncate">
              Tax ID / SSN / Reg No
            </label>
            <input
              type="text"
              value={party.taxId}
              onChange={(e) => onChange({ ...party, taxId: e.target.value })}
              placeholder="e.g. 12-3456789"
              className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Address & Contact Information */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
          <span>Address & Legal Location</span>
        </h4>

        <div>
          <input
            type="text"
            value={party.addressStreet}
            onChange={(e) => onChange({ ...party, addressStreet: e.target.value })}
            placeholder="Street Address (e.g. 100 Montgomery St, Suite 2400)"
            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={party.addressCity}
            onChange={(e) => onChange({ ...party, addressCity: e.target.value })}
            placeholder="City (San Francisco)"
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            value={party.addressState}
            onChange={(e) => onChange({ ...party, addressState: e.target.value })}
            placeholder="State / Region (CA)"
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            value={party.addressZip}
            onChange={(e) => onChange({ ...party, addressZip: e.target.value })}
            placeholder="Postal / Zip"
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
          <input
            type="text"
            value={party.addressCountry}
            onChange={(e) => onChange({ ...party, addressCountry: e.target.value })}
            placeholder="Country (United States)"
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="email"
              value={party.email}
              onChange={(e) => onChange({ ...party, email: e.target.value })}
              placeholder="Email address"
              className="w-full bg-transparent border-none text-xs focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={party.phone}
              onChange={(e) => onChange({ ...party, phone: e.target.value })}
              placeholder="Phone number"
              className="w-full bg-transparent border-none text-xs focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Custom Identifier Fields */}
      {party.customFields.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Custom Identifiers / Notes
          </h4>
          {party.customFields.map((field) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleUpdateCustomField(field.id, 'label', e.target.value)}
                placeholder="Field Name"
                className="w-1/3 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleUpdateCustomField(field.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveCustomField(field.id)}
                className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAddCustomField}
        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Custom Field (e.g. DUNS, CRN, Passport)</span>
      </button>

      {/* Digital Signature Component */}
      <SignaturePad
        partyRole={roleLabel}
        party={party}
        onChange={(signature) => onChange({ ...party, signature })}
      />
    </div>
  );
};
