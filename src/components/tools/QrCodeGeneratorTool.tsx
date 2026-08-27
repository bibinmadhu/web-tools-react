import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Link,
  Type,
  Wifi,
  User,
  Mail,
  MessageSquare,
  MapPin,
  Coins,
  Calendar,
  Download,
  Copy,
  Check,
  Sparkles,
  Palette,
  Sliders,
  Image as ImageIcon,
  ShieldCheck,
  Eye,
  RefreshCw,
  FileCode,
  Layers,
  Upload,
} from 'lucide-react';
import {
  QrDataType,
  QrStylingOptions,
  DEFAULT_QR_OPTIONS,
  formatQrPayload,
  generateQrSvg,
  drawCustomQrToCanvas,
  WifiData,
  VCardData,
  EmailData,
  SmsData,
  GeoData,
  CryptoData,
  EventData,
} from '../../utils/qrGenerator';

export const QrCodeGeneratorTool: React.FC = () => {
  // Active payload type
  const [dataType, setDataType] = useState<QrDataType>('url');

  // Payload form states
  const [url, setUrl] = useState('https://github.com');
  const [plainText, setPlainText] = useState('Hello from DevHub!');
  const [wifi, setWifi] = useState<WifiData>({
    ssid: 'DevHub-Office-5G',
    password: 'superSecretPassword123',
    encryption: 'WPA',
    hidden: false,
  });
  const [vcard, setVcard] = useState<VCardData>({
    firstName: 'Alex',
    lastName: 'Chen',
    organization: 'Acme Systems',
    title: 'Lead Architect',
    email: 'alex.chen@acme.dev',
    phone: '+1 (555) 234-5678',
    mobile: '+1 (555) 987-6543',
    url: 'https://alexchen.dev',
    address: '100 Silicon Ave, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    country: 'USA',
    note: 'Cloud Infrastructure & Security',
  });
  const [email, setEmail] = useState<EmailData>({
    address: 'contact@acme.dev',
    subject: 'Project Consultation Request',
    body: 'Hi Alex,\n\nI would love to discuss a project with you.',
  });
  const [sms, setSms] = useState<SmsData>({
    phone: '+15552345678',
    message: 'Hello! Checking in on the project status.',
  });
  const [geo, setGeo] = useState<GeoData>({
    latitude: '37.7749',
    longitude: '-122.4194',
    query: 'San Francisco, CA',
  });
  const [crypto, setCrypto] = useState<CryptoData>({
    coin: 'bitcoin',
    address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    amount: '0.005',
    label: 'DevHub Donation',
    message: 'Coffee fund',
  });
  const [event, setEvent] = useState<EventData>({
    title: 'Tech Architecture Summit 2026',
    location: 'Moscone Center, SF & Virtual',
    description: 'Annual deep-dive conference on cloud security, compiler tooling & distributed architectures.',
    startDate: '2026-09-15',
    startTime: '09:00',
    endDate: '2026-09-17',
    endTime: '17:00',
    allDay: false,
  });

  // Styling options
  const [options, setOptions] = useState<QrStylingOptions>(DEFAULT_QR_OPTIONS);
  const [customLogoImg, setCustomLogoImg] = useState<HTMLImageElement | null>(null);
  const [customLogoFileName, setCustomLogoFileName] = useState<string>('');

  // Output states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [svgCode, setSvgCode] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'logo'>('content');

  // Compute current raw payload string
  const rawPayload = formatQrPayload(dataType, {
    url,
    text: plainText,
    wifi,
    vcard,
    email,
    sms,
    geo,
    crypto,
    event,
  });

  // Re-render canvas & SVG whenever payload or options change
  useEffect(() => {
    if (canvasRef.current) {
      drawCustomQrToCanvas(canvasRef.current, rawPayload, options, customLogoImg);
    }
    generateQrSvg(rawPayload, options)
      .then(setSvgCode)
      .catch((err) => console.error('Failed to generate SVG', err));
  }, [rawPayload, options, customLogoImg]);

  // Handle custom image upload for logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomLogoImg(img);
        setOptions((prev) => ({ ...prev, centerLogoType: 'custom' }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Download PNG
  const downloadPng = (scale: number = 2) => {
    if (!canvasRef.current) return;
    // Render high-res export on temporary offscreen canvas
    const exportCanvas = document.createElement('canvas');
    const exportOptions = { ...options, size: options.size * scale };
    drawCustomQrToCanvas(exportCanvas, rawPayload, exportOptions, customLogoImg);

    const link = document.createElement('a');
    link.download = `qrcode-${dataType}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Download SVG
  const downloadSvg = () => {
    if (!svgCode) return;
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qrcode-${dataType}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy raw payload text
  const handleCopyPayload = () => {
    navigator.clipboard.writeText(rawPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Copy SVG Code
  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgCode);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  // Color presets
  const colorPresets = [
    { name: 'Classic Slate', fg: '#0F172A', bg: '#FFFFFF' },
    { name: 'Indigo Dream', fg: '#4F46E5', bg: '#EEF2FF' },
    { name: 'Emerald Forest', fg: '#059669', bg: '#ECFDF5' },
    { name: 'Cyber Violet', fg: '#7C3AED', bg: '#FAF5FF' },
    { name: 'Crimson Bold', fg: '#E11D48', bg: '#FFF1F2' },
    { name: 'Amber Gold', fg: '#D97706', bg: '#FFFBEB' },
    { name: 'Night Obsidian', fg: '#F8FAFC', bg: '#090D16' },
  ];

  return (
    <div id="qr-code-generator-tool" className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 overflow-y-auto max-h-[82vh]">
      {/* LEFT COLUMN: Configuration Controls */}
      <div className="flex-1 flex flex-col min-w-0 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              id="qr-tab-content"
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'content'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>1. Content & Protocol</span>
            </button>
            <button
              id="qr-tab-design"
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'design'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>2. Color & Styling</span>
            </button>
            <button
              id="qr-tab-logo"
              onClick={() => setActiveTab('logo')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'logo'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>3. Center Badge</span>
            </button>
          </div>
        </div>

        {/* TAB 1: CONTENT TYPE SELECTION & INPUT FIELDS */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {/* Protocol Type Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Select QR Payload Protocol
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'url', label: 'Website URL', icon: Link },
                  { id: 'wifi', label: 'Wi-Fi Network', icon: Wifi },
                  { id: 'vcard', label: 'vCard Contact', icon: User },
                  { id: 'email', label: 'Send Email', icon: Mail },
                  { id: 'sms', label: 'SMS Message', icon: MessageSquare },
                  { id: 'text', label: 'Plain Text', icon: Type },
                  { id: 'geo', label: 'Geolocation', icon: MapPin },
                  { id: 'crypto', label: 'Crypto Pay', icon: Coins },
                  { id: 'event', label: 'Calendar Event', icon: Calendar },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = dataType === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`qr-proto-${item.id}`}
                      onClick={() => setDataType(item.id as QrDataType)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="text-[11px] leading-tight truncate w-full">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PROTOCOL DYNAMIC FORMS */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
              {/* URL */}
              {dataType === 'url' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Web URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-4 h-4" />
                    </div>
                    <input
                      id="qr-input-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/page"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Auto-prefixes <code>https://</code> if omitted. Supports deep links and parameters.
                  </p>
                </div>
              )}

              {/* Plain Text */}
              {dataType === 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Text / Message Content
                  </label>
                  <textarea
                    id="qr-input-text"
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    rows={4}
                    placeholder="Enter any text, notes, token, or snippet..."
                    className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>Characters: {plainText.length}</span>
                    <span>Bytes: {new Blob([plainText]).size} B</span>
                  </div>
                </div>
              )}

              {/* Wi-Fi */}
              {dataType === 'wifi' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Network Name (SSID)
                    </label>
                    <input
                      id="qr-wifi-ssid"
                      type="text"
                      value={wifi.ssid}
                      onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                      placeholder="MyHomeWifi"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Network Password
                      </label>
                      <input
                        id="qr-wifi-password"
                        type="text"
                        disabled={wifi.encryption === 'nopass'}
                        value={wifi.encryption === 'nopass' ? '' : wifi.password}
                        onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                        placeholder="WPA/WPA2 Key"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Encryption Type
                      </label>
                      <select
                        id="qr-wifi-encryption"
                        value={wifi.encryption}
                        onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as any })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="WPA">WPA / WPA2 / WPA3 (Recommended)</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">None (Open Network)</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={wifi.hidden}
                      onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Hidden Network SSID</span>
                  </label>
                </div>
              )}

              {/* vCard */}
              {dataType === 'vcard' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                      <input
                        type="text"
                        value={vcard.firstName}
                        onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={vcard.lastName}
                        onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Organization / Company</label>
                      <input
                        type="text"
                        value={vcard.organization}
                        onChange={(e) => setVcard({ ...vcard, organization: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={vcard.title}
                        onChange={(e) => setVcard({ ...vcard, title: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={vcard.email}
                        onChange={(e) => setVcard({ ...vcard, email: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone / Mobile</label>
                      <input
                        type="tel"
                        value={vcard.phone}
                        onChange={(e) => setVcard({ ...vcard, phone: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={vcard.url}
                        onChange={(e) => setVcard({ ...vcard, url: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City / Country</label>
                      <input
                        type="text"
                        value={`${vcard.city}${vcard.city && vcard.country ? ', ' : ''}${vcard.country}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(',');
                          setVcard({ ...vcard, city: parts[0]?.trim() || '', country: parts[1]?.trim() || '' });
                        }}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              {dataType === 'email' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={email.address}
                      onChange={(e) => setEmail({ ...email, address: e.target.value })}
                      placeholder="hello@example.com"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={email.subject}
                      onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                      placeholder="Meeting notes..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                    <textarea
                      value={email.body}
                      onChange={(e) => setEmail({ ...email, body: e.target.value })}
                      rows={3}
                      placeholder="Draft email body text..."
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* SMS */}
              {dataType === 'sms' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={sms.phone}
                      onChange={(e) => setSms({ ...sms, phone: e.target.value })}
                      placeholder="+15551234567"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pre-filled SMS Text</label>
                    <textarea
                      value={sms.message}
                      onChange={(e) => setSms({ ...sms, message: e.target.value })}
                      rows={3}
                      placeholder="Your SMS message here..."
                      className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Geolocation */}
              {dataType === 'geo' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                      <input
                        type="text"
                        value={geo.latitude}
                        onChange={(e) => setGeo({ ...geo, latitude: e.target.value })}
                        placeholder="37.7749"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                      <input
                        type="text"
                        value={geo.longitude}
                        onChange={(e) => setGeo({ ...geo, longitude: e.target.value })}
                        placeholder="-122.4194"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location Label / Search Query</label>
                    <input
                      type="text"
                      value={geo.query}
                      onChange={(e) => setGeo({ ...geo, query: e.target.value })}
                      placeholder="Golden Gate Park, San Francisco"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Crypto */}
              {dataType === 'crypto' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cryptocurrency</label>
                      <select
                        value={crypto.coin}
                        onChange={(e) => setCrypto({ ...crypto, coin: e.target.value as any })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="bitcoin">Bitcoin (BTC)</option>
                        <option value="ethereum">Ethereum (ETH)</option>
                        <option value="solana">Solana (SOL)</option>
                        <option value="usdt">Tether (USDT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (Optional)</label>
                      <input
                        type="text"
                        value={crypto.amount}
                        onChange={(e) => setCrypto({ ...crypto, amount: e.target.value })}
                        placeholder="0.05"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Wallet Address</label>
                    <input
                      type="text"
                      value={crypto.address}
                      onChange={(e) => setCrypto({ ...crypto, address: e.target.value })}
                      placeholder="0x... or bc1..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Reference / Note</label>
                    <input
                      type="text"
                      value={crypto.message}
                      onChange={(e) => setCrypto({ ...crypto, message: e.target.value })}
                      placeholder="Invoice #4028 or Tip"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Event */}
              {dataType === 'event' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                    <input
                      type="text"
                      value={event.title}
                      onChange={(e) => setEvent({ ...event, title: e.target.value })}
                      placeholder="Tech Conference 2026"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date & Time</label>
                      <input
                        type="date"
                        value={event.startDate}
                        onChange={(e) => setEvent({ ...event, startDate: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 mb-1.5"
                      />
                      <input
                        type="time"
                        value={event.startTime}
                        onChange={(e) => setEvent({ ...event, startTime: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date & Time</label>
                      <input
                        type="date"
                        value={event.endDate}
                        onChange={(e) => setEvent({ ...event, endDate: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 mb-1.5"
                      />
                      <input
                        type="time"
                        value={event.endTime}
                        onChange={(e) => setEvent({ ...event, endTime: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location Venue</label>
                    <input
                      type="text"
                      value={event.location}
                      onChange={(e) => setEvent({ ...event, location: e.target.value })}
                      placeholder="Conference Hall A or Zoom Link"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COLOR & STYLING CONTROLS */}
        {activeTab === 'design' && (
          <div className="space-y-5">
            {/* Color Themes Palette */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Color Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setOptions({ ...options, fgColor: preset.fg, bgColor: preset.bg, transparentBg: false })}
                    className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-400 text-left transition-all"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0" style={{ backgroundColor: preset.bg }}>
                      <div className="w-3.5 h-3.5 rounded-xs" style={{ backgroundColor: preset.fg }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Foreground */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Foreground / Code Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={options.fgColor}
                      onChange={(e) => setOptions({ ...options, fgColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={options.fgColor}
                      onChange={(e) => setOptions({ ...options, fgColor: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Background */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={options.transparentBg}
                      value={options.bgColor}
                      onChange={(e) => setOptions({ ...options, bgColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800 disabled:opacity-40"
                    />
                    <input
                      type="text"
                      disabled={options.transparentBg}
                      value={options.transparentBg ? 'Transparent' : options.bgColor}
                      onChange={(e) => setOptions({ ...options, bgColor: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono disabled:opacity-50"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.transparentBg}
                      onChange={(e) => setOptions({ ...options, transparentBg: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Transparent Background (PNG / SVG only)</span>
                  </label>
                </div>
              </div>

              {/* Module Shape & Corner Eyes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Body Module Pattern
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'square', label: 'Square' },
                      { id: 'rounded', label: 'Smooth' },
                      { id: 'dots', label: 'Circular' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setOptions({ ...options, dotStyle: style.id as any })}
                        className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${
                          options.dotStyle === style.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Corner Eyes (Finder Pattern)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'square', label: 'Square' },
                      { id: 'rounded', label: 'Rounded' },
                      { id: 'extra-rounded', label: 'Circle' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setOptions({ ...options, cornerSquareStyle: style.id as any })}
                        className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${
                          options.cornerSquareStyle === style.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Correction & Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Error Correction Level
                  </label>
                  <select
                    value={options.errorCorrectionLevel}
                    onChange={(e) => setOptions({ ...options, errorCorrectionLevel: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="L">L - Low (7% recovery, densest)</option>
                    <option value="M">M - Medium (15% recovery, standard)</option>
                    <option value="Q">Q - Quartile (25% recovery, logo-ready)</option>
                    <option value="H">H - High (30% recovery, best with center logo)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Higher levels allow logos to cover up to 30% without affecting scanning.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quiet Zone Margin ({options.margin} modules)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={options.margin}
                    onChange={(e) => setOptions({ ...options, margin: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>0 (Tight)</span>
                    <span>2 (Standard)</span>
                    <span>6 (Wide)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CENTER LOGO / EMBEDDED BADGE */}
        {activeTab === 'logo' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Embedded Center Icon
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'url', label: 'Globe' },
                    { id: 'wifi', label: 'Wi-Fi' },
                    { id: 'contact', label: 'Avatar' },
                    { id: 'mail', label: 'Mail' },
                    { id: 'key', label: 'Key' },
                    { id: 'star', label: 'Star' },
                    { id: 'custom', label: 'Custom' },
                  ].map((logo) => (
                    <button
                      key={logo.id}
                      onClick={() => {
                        setOptions((prev) => ({
                          ...prev,
                          centerLogoType: logo.id as any,
                          // Automatically bump error correction if logo is turned on
                          errorCorrectionLevel: logo.id !== 'none' && prev.errorCorrectionLevel === 'L' ? 'Q' : prev.errorCorrectionLevel,
                        }));
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        options.centerLogoType === logo.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs">{logo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image Upload */}
              {options.centerLogoType === 'custom' && (
                <div className="p-3.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700/60 bg-indigo-50/40 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload PNG / SVG / JPG</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {customLogoFileName || 'No custom file uploaded yet (square icon recommended)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Logo Size Percent */}
              {options.centerLogoType !== 'none' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Center Badge Size ({options.logoSizePercent}%)
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      {options.logoSizePercent > 25 ? '⚠️ Ensure Error Correction is Q or H' : '✓ Safe scan radius'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="28"
                    step="1"
                    value={options.logoSizePercent}
                    onChange={(e) => setOptions({ ...options, logoSizePercent: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: LIVE QR PREVIEW & EXPORT ACTIONS */}
      <div className="w-full lg:w-[380px] flex flex-col items-center shrink-0 space-y-4">
        {/* Interactive QR Display Canvas */}
        <div className="w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm flex flex-col items-center justify-center relative group">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center">
            <canvas
              ref={canvasRef}
              id="qr-preview-canvas"
              className="max-w-full h-auto rounded-lg"
              style={{ width: '260px', height: '260px' }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Error Correction: Level {options.errorCorrectionLevel} (Verified)</span>
          </div>
        </div>

        {/* Export Buttons Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5">
          <button
            id="qr-download-png"
            onClick={() => downloadPng(2)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
          <button
            id="qr-download-svg"
            onClick={downloadSvg}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <FileCode className="w-4 h-4" />
            <span>Download SVG</span>
          </button>
        </div>

        {/* Copy Payload & Code Actions */}
        <div className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Formatted QR Payload
            </span>
            <button
              id="qr-copy-payload"
              onClick={handleCopyPayload}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPayload ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all max-h-24 overflow-y-auto select-all">
            {rawPayload}
          </div>

          <button
            id="qr-copy-svg-code"
            onClick={handleCopySvg}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileCode className="w-3.5 h-3.5" />}
            <span>{copiedSvg ? 'SVG Code Copied!' : 'Copy Raw SVG Markup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
