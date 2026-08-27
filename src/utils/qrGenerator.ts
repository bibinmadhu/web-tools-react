import QRCode from 'qrcode';

export type QrDataType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'sms' | 'geo' | 'crypto' | 'event';

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface VCardData {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  url: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  note: string;
}

export interface EmailData {
  address: string;
  subject: string;
  body: string;
}

export interface SmsData {
  phone: string;
  message: string;
}

export interface GeoData {
  latitude: string;
  longitude: string;
  query: string;
}

export interface CryptoData {
  coin: 'bitcoin' | 'ethereum' | 'solana' | 'usdt';
  address: string;
  amount: string;
  label: string;
  message: string;
}

export interface EventData {
  title: string;
  location: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
}

export interface QrStylingOptions {
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  size: number;
  margin: number;
  errorCorrectionLevel: QrErrorCorrectionLevel;
  dotStyle: 'square' | 'dots' | 'rounded';
  cornerSquareStyle: 'square' | 'rounded' | 'extra-rounded';
  centerLogoType: 'none' | 'wifi' | 'url' | 'contact' | 'mail' | 'key' | 'star' | 'custom';
  customLogoUrl?: string;
  logoSizePercent: number; // e.g. 20%
}

export const DEFAULT_QR_OPTIONS: QrStylingOptions = {
  fgColor: '#0F172A',
  bgColor: '#FFFFFF',
  transparentBg: false,
  size: 320,
  margin: 2,
  errorCorrectionLevel: 'M',
  dotStyle: 'square',
  cornerSquareStyle: 'square',
  centerLogoType: 'none',
  logoSizePercent: 22,
};

/**
 * Format structured data into standard QR text payload protocols
 */
export function formatQrPayload(type: QrDataType, data: {
  url?: string;
  text?: string;
  wifi?: WifiData;
  vcard?: VCardData;
  email?: EmailData;
  sms?: SmsData;
  geo?: GeoData;
  crypto?: CryptoData;
  event?: EventData;
}): string {
  switch (type) {
    case 'url': {
      let url = (data.url || '').trim();
      if (url && !/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
        url = 'https://' + url;
      }
      return url || 'https://example.com';
    }
    case 'text':
      return data.text || '';

    case 'wifi': {
      const w = data.wifi || { ssid: '', password: '', encryption: 'WPA', hidden: false };
      // WIFI:S:MySSID;T:WPA;P:MyPass;H:true;;
      const escape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
      const ssid = escape(w.ssid || 'WiFi-Network');
      const enc = w.encryption || 'WPA';
      const pass = enc !== 'nopass' ? escape(w.password || '') : '';
      const hidden = w.hidden ? 'H:true;' : '';
      return `WIFI:S:${ssid};T:${enc};P:${pass};${hidden};`;
    }

    case 'vcard': {
      const v = data.vcard || {
        firstName: '',
        lastName: '',
        organization: '',
        title: '',
        email: '',
        phone: '',
        mobile: '',
        url: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        note: '',
      };
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${v.lastName};${v.firstName};;;`,
        `FN:${v.firstName} ${v.lastName}`.trim(),
      ];
      if (v.organization) lines.push(`ORG:${v.organization}`);
      if (v.title) lines.push(`TITLE:${v.title}`);
      if (v.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${v.email}`);
      if (v.phone) lines.push(`TEL;TYPE=WORK,VOICE:${v.phone}`);
      if (v.mobile) lines.push(`TEL;TYPE=CELL,VOICE:${v.mobile}`);
      if (v.url) lines.push(`URL:${v.url.startsWith('http') ? v.url : `https://${v.url}`}`);
      if (v.address || v.city || v.state || v.zip || v.country) {
        lines.push(`ADR;TYPE=WORK:;;${v.address};${v.city};${v.state};${v.zip};${v.country}`);
      }
      if (v.note) lines.push(`NOTE:${v.note}`);
      lines.push('END:VCARD');
      return lines.join('\r\n');
    }

    case 'email': {
      const e = data.email || { address: '', subject: '', body: '' };
      const queryParts: string[] = [];
      if (e.subject) queryParts.push(`subject=${encodeURIComponent(e.subject)}`);
      if (e.body) queryParts.push(`body=${encodeURIComponent(e.body)}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      return `mailto:${e.address || ''}${qs}`;
    }

    case 'sms': {
      const s = data.sms || { phone: '', message: '' };
      const body = s.message ? `?body=${encodeURIComponent(s.message)}` : '';
      return `smsto:${s.phone || ''}${body}`;
    }

    case 'geo': {
      const g = data.geo || { latitude: '', longitude: '', query: '' };
      if (g.query) {
        return `geo:${g.latitude || '0'},${g.longitude || '0'}?q=${encodeURIComponent(g.query)}`;
      }
      return `geo:${g.latitude || '0'},${g.longitude || '0'}`;
    }

    case 'crypto': {
      const c = data.crypto || { coin: 'bitcoin', address: '', amount: '', label: '', message: '' };
      const q: string[] = [];
      if (c.amount) q.push(`amount=${encodeURIComponent(c.amount)}`);
      if (c.label) q.push(`label=${encodeURIComponent(c.label)}`);
      if (c.message) q.push(`message=${encodeURIComponent(c.message)}`);
      const qs = q.length > 0 ? `?${q.join('&')}` : '';
      return `${c.coin}:${c.address || ''}${qs}`;
    }

    case 'event': {
      const ev = data.event || {
        title: '',
        location: '',
        description: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        allDay: false,
      };
      const formatIso = (dateStr: string, timeStr: string, allDay: boolean) => {
        if (!dateStr) return '';
        const cleanDate = dateStr.replace(/-/g, '');
        if (allDay || !timeStr) return cleanDate;
        const cleanTime = timeStr.replace(/:/g, '') + '00';
        return `${cleanDate}T${cleanTime}`;
      };

      const dtStart = formatIso(ev.startDate, ev.startTime, ev.allDay);
      const dtEnd = formatIso(ev.endDate, ev.endTime, ev.allDay);

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//DevHub QR Generator//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${ev.title || 'Event'}`,
      ];
      if (dtStart) lines.push(`DTSTART:${dtStart}`);
      if (dtEnd) lines.push(`DTEND:${dtEnd}`);
      if (ev.location) lines.push(`LOCATION:${ev.location}`);
      if (ev.description) lines.push(`DESCRIPTION:${ev.description}`);
      lines.push('END:VEVENT');
      lines.push('END:VCALENDAR');
      return lines.join('\r\n');
    }

    default:
      return '';
  }
}

/**
 * Generate standard SVG string from payload using qrcode library
 */
export async function generateQrSvg(payload: string, options: Partial<QrStylingOptions>): Promise<string> {
  const fg = options.fgColor || '#000000';
  const bg = options.transparentBg ? '#00000000' : (options.bgColor || '#FFFFFF');
  const margin = options.margin !== undefined ? options.margin : 2;
  const level = options.errorCorrectionLevel || 'M';

  const svgStr = await QRCode.toString(payload || ' ', {
    type: 'svg',
    errorCorrectionLevel: level,
    margin,
    color: {
      dark: fg,
      light: bg,
    },
  });

  return svgStr;
}

/**
 * Generate raw matrix from payload for custom canvas drawing (rounded dots, custom corner squares, embedded logos)
 */
export function getQrMatrix(payload: string, errorCorrectionLevel: QrErrorCorrectionLevel = 'M'): {
  size: number;
  matrix: boolean[][];
  finderPatterns: { r: number; c: number; size: number }[];
} {
  const qrData = QRCode.create(payload || ' ', {
    errorCorrectionLevel,
  });

  const moduleCount = qrData.modules.size;
  const data = qrData.modules.data;
  const matrix: boolean[][] = [];

  for (let r = 0; r < moduleCount; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < moduleCount; c++) {
      row.push(Boolean(data[r * moduleCount + c]));
    }
    matrix.push(row);
  }

  // 3 standard Finder Pattern positions (7x7 modules)
  const finderPatterns = [
    { r: 0, c: 0, size: 7 }, // Top-Left
    { r: 0, c: moduleCount - 7, size: 7 }, // Top-Right
    { r: moduleCount - 7, c: 0, size: 7 }, // Bottom-Left
  ];

  return { size: moduleCount, matrix, finderPatterns };
}

/**
 * Draw custom stylized QR code to HTML5 Canvas
 */
export function drawCustomQrToCanvas(
  canvas: HTMLCanvasElement,
  payload: string,
  options: QrStylingOptions,
  customLogoImage?: HTMLImageElement | null
) {
  const {
    size,
    margin,
    fgColor,
    bgColor,
    transparentBg,
    errorCorrectionLevel,
    dotStyle,
    cornerSquareStyle,
    centerLogoType,
    logoSizePercent,
  } = options;

  const { size: moduleCount, matrix } = getQrMatrix(payload, errorCorrectionLevel);

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Clear & draw background
  ctx.clearRect(0, 0, size, size);
  if (!transparentBg) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  const totalModules = moduleCount + margin * 2;
  const cellSize = size / totalModules;
  const offset = margin * cellSize;

  // Helper: check if a coordinate belongs to any of the 3 finder patterns (including 1-module quiet margin around them)
  const isFinderModule = (r: number, c: number): boolean => {
    // Top-Left (0..6, 0..6)
    if (r < 7 && c < 7) return true;
    // Top-Right (0..6, moduleCount-7..moduleCount-1)
    if (r < 7 && c >= moduleCount - 7) return true;
    // Bottom-Left (moduleCount-7..moduleCount-1, 0..6)
    if (r >= moduleCount - 7 && c < 7) return true;
    return false;
  };

  // Helper: check if cell is in center reserved area for logo
  const logoModules = centerLogoType !== 'none' ? Math.floor(moduleCount * (logoSizePercent / 100)) : 0;
  const centerStart = Math.floor((moduleCount - logoModules) / 2);
  const centerEnd = centerStart + logoModules;

  const isCenterLogoModule = (r: number, c: number): boolean => {
    if (centerLogoType === 'none') return false;
    return r >= centerStart && r < centerEnd && c >= centerStart && c < centerEnd;
  };

  ctx.fillStyle = fgColor;

  // 2. Draw standard body modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isFinderModule(r, c) || isCenterLogoModule(r, c)) {
        continue;
      }

      if (matrix[r][c]) {
        const x = offset + c * cellSize;
        const y = offset + r * cellSize;

        if (dotStyle === 'dots') {
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.42, 0, Math.PI * 2);
          ctx.fill();
        } else if (dotStyle === 'rounded') {
          const radius = cellSize * 0.35;
          ctx.beginPath();
          ctx.roundRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, radius);
          ctx.fill();
        } else {
          // Sharp square
          ctx.fillRect(x, y, cellSize + 0.2, cellSize + 0.2);
        }
      }
    }
  }

  // 3. Draw 3 Finder Patterns (Corner Eyes)
  const drawCornerFinder = (startR: number, startC: number) => {
    const x = offset + startC * cellSize;
    const y = offset + startR * cellSize;
    const finderSize = 7 * cellSize;

    // Outer 7x7 box
    ctx.fillStyle = fgColor;
    if (cornerSquareStyle === 'rounded') {
      ctx.beginPath();
      ctx.roundRect(x, y, finderSize, finderSize, cellSize * 1.5);
      ctx.fill();
    } else if (cornerSquareStyle === 'extra-rounded') {
      ctx.beginPath();
      ctx.roundRect(x, y, finderSize, finderSize, finderSize / 2);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, finderSize, finderSize);
    }

    // Inner cutout (5x5) filled with background color
    ctx.fillStyle = transparentBg ? '#FFFFFF' : bgColor;
    const inner1X = x + cellSize;
    const inner1Y = y + cellSize;
    const inner1Size = 5 * cellSize;
    if (cornerSquareStyle === 'rounded') {
      ctx.beginPath();
      ctx.roundRect(inner1X, inner1Y, inner1Size, inner1Size, cellSize * 1.0);
      ctx.fill();
    } else if (cornerSquareStyle === 'extra-rounded') {
      ctx.beginPath();
      ctx.roundRect(inner1X, inner1Y, inner1Size, inner1Size, inner1Size / 2);
      ctx.fill();
    } else {
      ctx.fillRect(inner1X, inner1Y, inner1Size, inner1Size);
    }

    // Center 3x3 dot
    ctx.fillStyle = fgColor;
    const inner2X = x + 2 * cellSize;
    const inner2Y = y + 2 * cellSize;
    const inner2Size = 3 * cellSize;
    if (cornerSquareStyle === 'rounded') {
      ctx.beginPath();
      ctx.roundRect(inner2X, inner2Y, inner2Size, inner2Size, cellSize * 0.8);
      ctx.fill();
    } else if (cornerSquareStyle === 'extra-rounded') {
      ctx.beginPath();
      ctx.arc(inner2X + inner2Size / 2, inner2Y + inner2Size / 2, inner2Size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(inner2X, inner2Y, inner2Size, inner2Size);
    }
  };

  drawCornerFinder(0, 0); // Top-Left
  drawCornerFinder(0, moduleCount - 7); // Top-Right
  drawCornerFinder(moduleCount - 7, 0); // Bottom-Left

  // 4. Draw Center Logo / Badge if enabled
  if (centerLogoType !== 'none') {
    const logoPx = size * (logoSizePercent / 100);
    const logoX = (size - logoPx) / 2;
    const logoY = (size - logoPx) / 2;
    const bgPad = logoPx * 0.12;

    // Draw background badge pill behind logo for clear contrast
    ctx.fillStyle = bgColor === '#FFFFFF' || transparentBg ? '#FFFFFF' : bgColor;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(logoX - bgPad, logoY - bgPad, logoPx + bgPad * 2, logoPx + bgPad * 2, (logoPx + bgPad * 2) * 0.22);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border around badge
    ctx.strokeStyle = fgColor + '20';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (centerLogoType === 'custom' && customLogoImage && customLogoImage.complete) {
      try {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoPx, logoPx, logoPx * 0.18);
        ctx.clip();
        ctx.drawImage(customLogoImage, logoX, logoY, logoPx, logoPx);
        ctx.restore();
      } catch (e) {
        console.error('Failed to draw custom logo image', e);
      }
    } else {
      // Draw Vector Icon Badge
      drawCenterVectorIcon(ctx, centerLogoType, logoX, logoY, logoPx, fgColor);
    }
  }
}

/**
 * Render crisp vector symbol at center
 */
function drawCenterVectorIcon(
  ctx: CanvasRenderingContext2D,
  iconType: string,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = x + size / 2;
  const cy = y + size / 2;

  switch (iconType) {
    case 'wifi': {
      // Draw wifi arcs
      const r1 = size * 0.38;
      const r2 = size * 0.24;
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.22, r1, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.22, r2, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.22, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'url': {
      // Draw globe / link
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, size * 0.16, size * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - size * 0.32, cy);
      ctx.lineTo(cx + size * 0.32, cy);
      ctx.stroke();
      break;
    }
    case 'contact': {
      // Draw user avatar
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.12, size * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.32, size * 0.28, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    case 'mail': {
      // Draw envelope
      const w = size * 0.6;
      const h = size * 0.42;
      const ex = cx - w / 2;
      const ey = cy - h / 2;
      ctx.strokeRect(ex, ey, w, h);

      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(cx, ey + h * 0.6);
      ctx.lineTo(ex + w, ey);
      ctx.stroke();
      break;
    }
    case 'key': {
      // Draw key
      ctx.beginPath();
      ctx.arc(cx - size * 0.14, cy, size * 0.16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + size * 0.02, cy);
      ctx.lineTo(cx + size * 0.34, cy);
      ctx.lineTo(cx + size * 0.34, cy + size * 0.12);
      ctx.moveTo(cx + size * 0.22, cy);
      ctx.lineTo(cx + size * 0.22, cy + size * 0.1);
      ctx.stroke();
      break;
    }
    case 'star': {
      // Draw star
      const spikes = 5;
      const outerR = size * 0.34;
      const innerR = size * 0.16;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        let px = cx + Math.cos(rot) * outerR;
        let py = cy + Math.sin(rot) * outerR;
        ctx.lineTo(px, py);
        rot += step;

        px = cx + Math.cos(rot) * innerR;
        py = cy + Math.sin(rot) * innerR;
        ctx.lineTo(px, py);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerR);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}
