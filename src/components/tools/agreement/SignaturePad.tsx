import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Type, Upload } from 'lucide-react';
import { AgreementParty } from '../../../utils/agreementGenerator';

interface SignaturePadProps {
  partyRole: string;
  party: AgreementParty;
  onChange: (sig: AgreementParty['signature']) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  partyRole,
  party,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'typed' | 'drawn' | 'uploaded'>('typed');
  const [typedText, setTypedText] = useState(party.signature.typedName || party.representativeName || party.name || '');
  const [fontStyle, setFontStyle] = useState<'calligraphy' | 'handwriting' | 'serif' | 'formal'>(
    party.signature.fontStyle || 'calligraphy'
  );
  const [date, setDate] = useState(party.signature.date || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState(party.signature.location || `${party.addressCity || ''}, ${party.addressState || ''}`.replace(/^,\s*|,\s*$/g, ''));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!party.signature.typedName && party.representativeName) {
      setTypedText(party.representativeName);
    }
  }, [party.representativeName]);

  // Handle Canvas Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange({
        type: 'drawn',
        dataUrl,
        date,
        location,
        typedName: typedText,
      });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange({
      type: 'typed',
      typedName: typedText,
      fontStyle,
      date,
      location,
    });
  };

  const handleApplyTyped = (name: string, style: typeof fontStyle) => {
    setTypedText(name);
    setFontStyle(style);
    onChange({
      type: 'typed',
      typedName: name,
      fontStyle: style,
      date,
      location,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result as string;
        onChange({
          type: 'uploaded',
          dataUrl,
          typedName: typedText,
          date,
          location,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const getFontFamily = (style: typeof fontStyle) => {
    switch (style) {
      case 'calligraphy':
        return '"Brush Script MT", "Caveat", "Dancing Script", cursive';
      case 'handwriting':
        return '"Segoe Script", "Comic Sans MS", cursive';
      case 'serif':
        return '"Playfair Display", "Times New Roman", serif';
      case 'formal':
        return '"Cinzel", "Georgia", serif';
    }
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Digital Signature • {partyRole}
        </h4>
        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('typed');
              handleApplyTyped(typedText, fontStyle);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'typed'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drawn')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'drawn'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('uploaded')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'uploaded'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {activeTab === 'typed' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Signatory Full Name
            </label>
            <input
              type="text"
              value={typedText}
              onChange={(e) => handleApplyTyped(e.target.value, fontStyle)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['calligraphy', 'handwriting', 'serif', 'formal'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => handleApplyTyped(typedText, style)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  fontStyle === style
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div
                  className="text-lg leading-tight truncate px-1 py-0.5"
                  style={{ fontFamily: getFontFamily(style) }}
                >
                  {typedText || 'Signature'}
                </div>
                <span className="text-[10px] text-slate-400 capitalize">{style}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'drawn' && (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={460}
              height={120}
              className="w-full h-28 touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-mono">
                ✍️ Draw signature with mouse or touch
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Signature</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'uploaded' && (
        <div className="space-y-2">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-950 cursor-pointer hover:border-indigo-500 transition-colors">
            <Upload className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Click to upload signature image (PNG, JPG, SVG)</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Execution Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              onChange({
                ...party.signature,
                date: e.target.value,
              });
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Signing City / Location (Optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              onChange({
                ...party.signature,
                location: e.target.value,
              });
            }}
            placeholder="e.g. San Francisco, CA"
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};
