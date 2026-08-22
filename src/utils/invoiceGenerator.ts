import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoiceCurrency {
  code: string;
  symbol: string;
  name: string;
  position: 'before' | 'after';
  decimals: number;
}

export const POPULAR_CURRENCIES: InvoiceCurrency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', position: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', position: 'after', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', position: 'before', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', position: 'before', decimals: 2 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', position: 'before', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', position: 'before', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', position: 'before', decimals: 0 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)', position: 'before', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)', position: 'before', decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)', position: 'before', decimals: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (CNY)', position: 'before', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar (NZD)', position: 'before', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (BRL)', position: 'before', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand (ZAR)', position: 'before', decimals: 2 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona (SEK)', position: 'after', decimals: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone (NOK)', position: 'after', decimals: 2 },
  { code: 'DKK', symbol: 'kr.', name: 'Danish Krone (DKK)', position: 'after', decimals: 2 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty (PLN)', position: 'after', decimals: 2 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso (MXN)', position: 'before', decimals: 2 },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)', position: 'before', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar (HKD)', position: 'before', decimals: 2 },
];

export const TAX_LABEL_PRESETS = [
  { label: 'VAT No / Reg', country: 'United Kingdom / Europe / Gulf' },
  { label: 'GSTIN / GST No', country: 'India / Australia / Singapore / Canada' },
  { label: 'EIN / Tax ID (TIN)', country: 'United States' },
  { label: 'TVA / SIRET', country: 'France / Belgium' },
  { label: 'USt-IdNr / Steuernummer', country: 'Germany / Austria' },
  { label: 'CIF / NIF', country: 'Spain' },
  { label: 'Partita IVA (P.IVA)', country: 'Italy' },
  { label: 'ABN (Australian Business No)', country: 'Australia' },
  { label: 'Business Number (BN / NE)', country: 'Canada' },
  { label: 'UEN (Unique Entity Number)', country: 'Singapore' },
  { label: 'Consumption Tax ID (JCT)', country: 'Japan' },
  { label: 'CNPJ / CPF', country: 'Brazil' },
  { label: 'RFC', country: 'Mexico' },
  { label: 'Tax Identification Number', country: 'Generic Global' },
];

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface InvoiceParty {
  entityType: 'company' | 'individual';
  companyName: string;
  contactPerson: string;
  tagline?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website?: string;
  taxIdLabel: string; // e.g. "VAT No", "GSTIN", "Tax ID"
  taxIdValue: string;
  regIdLabel: string; // e.g. "Company Reg No", "CRN", "Business No"
  regIdValue: string;
  customFields: CustomField[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  notes?: string;
  quantity: number;
  unit?: string; // e.g. "hrs", "pcs", "days", "units"
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
}

export interface InvoicePaymentInfo {
  bankName: string;
  accountHolder: string;
  accountNumberOrIban: string;
  swiftBic: string;
  routingOrSortCode?: string;
  upiIdOrQr?: string;
  paypalEmail?: string;
  paymentLink?: string;
  customPaymentNotes?: string;
}

export type PaymentStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceTemplateTheme = 'modern' | 'corporate' | 'minimal' | 'emerald' | 'crimson';

export interface InvoiceData {
  invoiceTitle: string; // e.g. "TAX INVOICE", "INVOICE", "PROFORMA INVOICE"
  invoiceNumber: string;
  poNumber?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  paymentStatus: PaymentStatus;

  sender: InvoiceParty;
  recipient: InvoiceParty;

  hasSeparateShippingAddress: boolean;
  shippingAddress?: {
    recipientName: string;
    companyName?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  currency: InvoiceCurrency;

  taxMode: 'exclusive' | 'inclusive' | 'none';
  defaultTaxLabel: string; // e.g. "VAT", "GST", "Sales Tax"
  defaultTaxRate: number;  // percentage e.g. 20 for 20%
  enableSecondTax: boolean;
  secondTaxLabel?: string; // e.g. "State Tax", "SGST", "Cess"
  secondTaxRate?: number;

  lineItems: InvoiceLineItem[];

  globalDiscountType: 'percent' | 'fixed';
  globalDiscountValue: number;

  shippingFee: number;
  extraFeeLabel?: string;
  extraFeeAmount: number;

  enableWithholdingTax: boolean;
  withholdingTaxLabel?: string; // e.g. "TDS / Retención"
  withholdingTaxRate?: number;  // % deducted

  amountPaid: number;

  notes: string;
  termsAndConditions: string;

  signatoryName?: string;
  signatoryTitle?: string;
  signatorySignatureUrl?: string; // Data URL of signature

  companyLogoUrl?: string; // Data URL or Image URL
  theme: {
    template: InvoiceTemplateTheme;
    primaryColor: string; // Hex color e.g. #4F46E5
    density: 'compact' | 'normal' | 'spacious';
  };
}

export interface InvoiceTotals {
  subtotal: number;
  totalItemDiscount: number;
  globalDiscountAmount: number;
  netTaxableAmount: number;
  primaryTaxAmount: number;
  secondTaxAmount: number;
  totalTax: number;
  shippingFee: number;
  extraFeeAmount: number;
  withholdingTaxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

/**
 * Accurately calculate invoice breakdown totals, taxes, discounts, and balances
 */
export function calculateInvoiceTotals(invoice: InvoiceData): InvoiceTotals {
  let subtotal = 0;
  let totalItemDiscount = 0;
  let lineItemsTotalAfterItemDiscount = 0;

  invoice.lineItems.forEach((item) => {
    const rawLine = (item.quantity || 0) * (item.unitPrice || 0);
    const itemDiscPct = Math.max(0, Math.min(100, item.discountPercent || 0));
    const itemDiscVal = (rawLine * itemDiscPct) / 100;
    const lineNet = Math.max(0, rawLine - itemDiscVal);

    subtotal += rawLine;
    totalItemDiscount += itemDiscVal;
    lineItemsTotalAfterItemDiscount += lineNet;
  });

  // Calculate Global Discount
  let globalDiscountAmount = 0;
  if (invoice.globalDiscountType === 'percent') {
    const discPct = Math.max(0, Math.min(100, invoice.globalDiscountValue || 0));
    globalDiscountAmount = (lineItemsTotalAfterItemDiscount * discPct) / 100;
  } else {
    globalDiscountAmount = Math.max(0, Math.min(lineItemsTotalAfterItemDiscount, invoice.globalDiscountValue || 0));
  }

  const netAfterDiscount = Math.max(0, lineItemsTotalAfterItemDiscount - globalDiscountAmount);

  // Tax calculations
  let primaryTaxAmount = 0;
  let secondTaxAmount = 0;
  let netTaxableAmount = netAfterDiscount;

  if (invoice.taxMode === 'exclusive') {
    const taxRate1 = Math.max(0, invoice.defaultTaxRate || 0);
    primaryTaxAmount = (netAfterDiscount * taxRate1) / 100;

    if (invoice.enableSecondTax && invoice.secondTaxRate) {
      const taxRate2 = Math.max(0, invoice.secondTaxRate);
      secondTaxAmount = (netAfterDiscount * taxRate2) / 100;
    }
  } else if (invoice.taxMode === 'inclusive') {
    const taxRate1 = Math.max(0, invoice.defaultTaxRate || 0);
    const taxRate2 = invoice.enableSecondTax ? Math.max(0, invoice.secondTaxRate || 0) : 0;
    const totalTaxRate = taxRate1 + taxRate2;

    if (totalTaxRate > 0) {
      const baseBeforeTax = netAfterDiscount / (1 + totalTaxRate / 100);
      netTaxableAmount = baseBeforeTax;
      primaryTaxAmount = (baseBeforeTax * taxRate1) / 100;
      secondTaxAmount = (baseBeforeTax * taxRate2) / 100;
    }
  }

  const totalTax = primaryTaxAmount + secondTaxAmount;
  const shippingFee = Math.max(0, invoice.shippingFee || 0);
  const extraFeeAmount = Math.max(0, invoice.extraFeeAmount || 0);

  // Grand Total before withholding
  let grandTotal = 0;
  if (invoice.taxMode === 'exclusive') {
    grandTotal = netAfterDiscount + totalTax + shippingFee + extraFeeAmount;
  } else if (invoice.taxMode === 'inclusive') {
    grandTotal = netAfterDiscount + shippingFee + extraFeeAmount;
  } else {
    // No tax
    grandTotal = netAfterDiscount + shippingFee + extraFeeAmount;
  }

  // Withholding Tax (e.g. TDS / Retención)
  let withholdingTaxAmount = 0;
  if (invoice.enableWithholdingTax && invoice.withholdingTaxRate) {
    const wTaxRate = Math.max(0, invoice.withholdingTaxRate);
    withholdingTaxAmount = (netTaxableAmount * wTaxRate) / 100;
  }

  const finalPayable = Math.max(0, grandTotal - withholdingTaxAmount);
  const amountPaid = Math.max(0, invoice.amountPaid || 0);
  const balanceDue = Math.max(0, finalPayable - amountPaid);

  return {
    subtotal: roundTo(subtotal, 2),
    totalItemDiscount: roundTo(totalItemDiscount, 2),
    globalDiscountAmount: roundTo(globalDiscountAmount, 2),
    netTaxableAmount: roundTo(netTaxableAmount, 2),
    primaryTaxAmount: roundTo(primaryTaxAmount, 2),
    secondTaxAmount: roundTo(secondTaxAmount, 2),
    totalTax: roundTo(totalTax, 2),
    shippingFee: roundTo(shippingFee, 2),
    extraFeeAmount: roundTo(extraFeeAmount, 2),
    withholdingTaxAmount: roundTo(withholdingTaxAmount, 2),
    grandTotal: roundTo(grandTotal, 2),
    amountPaid: roundTo(amountPaid, 2),
    balanceDue: roundTo(balanceDue, 2),
  };
}

function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Format currency with appropriate symbol positioning, thousand separators, and decimal digits
 */
export function formatInvoiceCurrency(amount: number, currency: InvoiceCurrency): string {
  const decimals = currency.decimals !== undefined ? currency.decimals : 2;
  const absVal = Math.abs(amount || 0);
  
  const formattedNumber = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = amount < 0 ? '-' : '';

  if (currency.position === 'after') {
    return `${sign}${formattedNumber} ${currency.symbol}`;
  }
  return `${sign}${currency.symbol}${formattedNumber}`;
}

/**
 * Format currency safely for Standard PDF PostScript Fonts (Helvetica WinAnsi)
 */
export function formatInvoiceCurrencyForPdf(amount: number, currency: InvoiceCurrency): string {
  const decimals = currency.decimals !== undefined ? currency.decimals : 2;
  const absVal = Math.abs(amount || 0);
  
  const formattedNumber = absVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = amount < 0 ? '-' : '';

  // Safe mapping for Helvetica standard font WinAnsi compatibility
  let safeSymbol = currency.symbol;
  if (safeSymbol === '₹') {
    safeSymbol = 'Rs. ';
  } else if (safeSymbol === 'zł') {
    safeSymbol = 'PLN ';
  }

  if (currency.position === 'after') {
    return `${sign}${formattedNumber} ${safeSymbol.trim()}`;
  }
  return `${sign}${safeSymbol}${formattedNumber}`;
}

/**
 * Generate a clean, modern default invoice template
 */
export function createDefaultInvoice(): InvoiceData {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 30);

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    invoiceTitle: 'TAX INVOICE',
    invoiceNumber: `INV-${today.getFullYear()}-0042`,
    poNumber: 'PO-98421',
    issueDate: formatDate(today),
    dueDate: formatDate(dueDate),
    paymentStatus: 'pending',

    sender: {
      entityType: 'company',
      companyName: 'Apex Cloud Solutions Inc.',
      tagline: 'Enterprise Infrastructure & Cloud Services',
      contactPerson: 'Alex Morgan',
      addressLine1: '742 Evergreen Terrace, Suite 500',
      addressLine2: 'Tech District',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'United States',
      email: 'billing@apexcloud.io',
      phone: '+1 (415) 890-2340',
      website: 'www.apexcloud.io',
      taxIdLabel: 'EIN / Tax ID',
      taxIdValue: 'US-94-3829104',
      regIdLabel: 'Company Reg No',
      regIdValue: 'DE-8492048',
      customFields: [],
    },

    recipient: {
      entityType: 'company',
      companyName: 'Nexus Global Enterprises Ltd.',
      contactPerson: 'Elena Rostova (Head of Procurement)',
      addressLine1: '100 Bishopsgate, 14th Floor',
      addressLine2: 'Financial District',
      city: 'London',
      state: 'Greater London',
      postalCode: 'EC2N 4AG',
      country: 'United Kingdom',
      email: 'accounts.payable@nexusglobal.co.uk',
      phone: '+44 20 7946 0912',
      website: 'www.nexusglobal.co.uk',
      taxIdLabel: 'VAT No / Reg',
      taxIdValue: 'GB 982 4810 23',
      regIdLabel: 'CRN',
      regIdValue: '08941209',
      customFields: [],
    },

    hasSeparateShippingAddress: false,

    currency: POPULAR_CURRENCIES[0], // USD

    taxMode: 'exclusive',
    defaultTaxLabel: 'VAT / Tax',
    defaultTaxRate: 10,
    enableSecondTax: false,
    secondTaxLabel: 'State Tax',
    secondTaxRate: 0,

    lineItems: [
      {
        id: 'item-1',
        description: 'Enterprise Cloud Architecture & Migration',
        notes: 'Multi-region AWS Kubernetes cluster deployment and automated CI/CD pipeline',
        quantity: 40,
        unit: 'hrs',
        unitPrice: 150,
        discountPercent: 0,
        taxPercent: 10,
      },
      {
        id: 'item-2',
        description: 'Database High-Availability & Replication Setup',
        notes: 'PostgreSQL active-active clustering with automated failover and backup verification',
        quantity: 20,
        unit: 'hrs',
        unitPrice: 165,
        discountPercent: 5,
        taxPercent: 10,
      },
      {
        id: 'item-3',
        description: '24/7 Tier-3 Infrastructure SLA Support',
        notes: 'Quarterly enterprise maintenance and priority incident resolution',
        quantity: 1,
        unit: 'mo',
        unitPrice: 1200,
        discountPercent: 0,
        taxPercent: 10,
      },
    ],

    globalDiscountType: 'percent',
    globalDiscountValue: 0,

    shippingFee: 0,
    extraFeeLabel: 'Payment Processing Fee',
    extraFeeAmount: 0,

    enableWithholdingTax: false,
    withholdingTaxLabel: 'Withholding Tax (TDS)',
    withholdingTaxRate: 0,

    amountPaid: 0,

    notes: 'Thank you for your business! Payment is requested within 30 days of invoice date. Please reference invoice number on wire transfers.',
    termsAndConditions: 'All services provided in accordance with the Master Service Agreement dated 15 Jan 2026. Late payments are subject to a 1.5% monthly finance charge.',

    signatoryName: 'Alex Morgan',
    signatoryTitle: 'Managing Director, Apex Cloud',
    theme: {
      template: 'modern',
      primaryColor: '#4F46E5', // Indigo
      density: 'normal',
    },
  };
}

/**
 * Pre-built sample invoice configurations for various industries & countries
 */
export const SAMPLE_INVOICES: { name: string; description: string; data: () => InvoiceData }[] = [
  {
    name: 'B2B International Tech Services (USD / VAT)',
    description: 'Corporate consulting invoice with company tax IDs, line items, and wire transfer details',
    data: () => createDefaultInvoice(),
  },
  {
    name: 'Freelancer / Design Studio to Individual (EUR / Net 14)',
    description: 'B2C creative agency invoice for an individual client with hourly rates and PayPal details',
    data: () => {
      const inv = createDefaultInvoice();
      inv.invoiceTitle = 'INVOICE';
      inv.invoiceNumber = 'INV-2026-F089';
      inv.currency = POPULAR_CURRENCIES[1]; // EUR
      inv.defaultTaxLabel = 'VAT';
      inv.defaultTaxRate = 20;
      inv.sender = {
        entityType: 'individual',
        companyName: 'Lumina Studio Design',
        tagline: 'Brand Identity & UI/UX Design',
        contactPerson: 'Sophie Bernard',
        addressLine1: '24 Rue de la Paix',
        city: 'Paris',
        state: 'Île-de-France',
        postalCode: '75002',
        country: 'France',
        email: 'sophie@luminastudio.fr',
        phone: '+33 1 42 68 55 00',
        website: 'www.luminastudio.fr',
        taxIdLabel: 'TVA / SIRET',
        taxIdValue: 'FR 84 928374820',
        regIdLabel: 'SIRET',
        regIdValue: '928 374 820 00018',
        customFields: [],
      };
      inv.recipient = {
        entityType: 'individual',
        companyName: '',
        contactPerson: 'Dr. Arthur Pendelton',
        addressLine1: '45 Kensington Gardens Square',
        city: 'London',
        state: 'Greater London',
        postalCode: 'W2 4BH',
        country: 'United Kingdom',
        email: 'arthur.pendelton@gmail.com',
        phone: '+44 7700 900123',
        taxIdLabel: 'Personal Tax ID',
        taxIdValue: '',
        regIdLabel: '',
        regIdValue: '',
        customFields: [],
      };
      inv.lineItems = [
        {
          id: 'item-1',
          description: 'Custom Brand Identity & Vector Logo Suite',
          notes: 'Full brand guidelines, typography pairings, color palette, and vector asset deliverables',
          quantity: 1,
          unit: 'pkg',
          unitPrice: 1850,
          discountPercent: 0,
        },
        {
          id: 'item-2',
          description: 'Responsive Web UI/UX Design (Figma)',
          notes: '12 desktop and mobile screen layouts with interactive component design system',
          quantity: 28,
          unit: 'hrs',
          unitPrice: 85,
          discountPercent: 10,
        },
      ];
      inv.theme.primaryColor = '#059669'; // Emerald
      inv.theme.template = 'emerald';
      return inv;
    },
  },
  {
    name: 'Indian B2B Software Services (INR / GST with HSN/SAC)',
    description: 'GST invoice format with GSTIN, SAC codes, and CGST + SGST dual tax breakdown',
    data: () => {
      const inv = createDefaultInvoice();
      inv.invoiceTitle = 'TAX INVOICE';
      inv.invoiceNumber = 'GST/2026/0412';
      inv.currency = POPULAR_CURRENCIES[3]; // INR
      inv.defaultTaxLabel = 'CGST (9%)';
      inv.defaultTaxRate = 9;
      inv.enableSecondTax = true;
      inv.secondTaxLabel = 'SGST (9%)';
      inv.secondTaxRate = 9;
      inv.sender = {
        entityType: 'company',
        companyName: 'Vanguard Infotech Pvt. Ltd.',
        tagline: 'Next-Gen Software & AI Automation',
        contactPerson: 'Rajesh Sharma',
        addressLine1: 'Plot 42, Electronic City Phase 1',
        addressLine2: 'Hosur Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560100',
        country: 'India',
        email: 'billing@vanguardinfotech.in',
        phone: '+91 80 4123 7890',
        website: 'www.vanguardinfotech.in',
        taxIdLabel: 'GSTIN',
        taxIdValue: '29AABCU9603R1ZM',
        regIdLabel: 'CIN',
        regIdValue: 'U72200KA2018PTC112345',
        customFields: [{ id: 'pan', label: 'PAN No', value: 'AABCU9603R' }],
      };
      inv.recipient = {
        entityType: 'company',
        companyName: 'Zenith Logistics Technologies Pvt. Ltd.',
        contactPerson: 'Pooja Nair (Finance Lead)',
        addressLine1: 'B-Wing, 8th Floor, Supreme Business Park',
        addressLine2: 'Powai',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400076',
        country: 'India',
        email: 'accounts@zenithlogistics.in',
        phone: '+91 22 6789 1234',
        taxIdLabel: 'GSTIN',
        taxIdValue: '27AAGCZ8491K1ZX',
        regIdLabel: 'State Code',
        regIdValue: '27 (Maharashtra)',
        customFields: [],
      };
      inv.lineItems = [
        {
          id: 'item-1',
          description: 'Custom ERP Logistics Automation Module [SAC: 998314]',
          notes: 'Automated fleet tracking, route optimization, and electronic dispatch manifest integration',
          quantity: 1,
          unit: 'milestone',
          unitPrice: 285000,
          discountPercent: 0,
        },
        {
          id: 'item-2',
          description: 'Cloud Server Setup & Security Hardening [SAC: 998315]',
          notes: 'High-availability Kubernetes deployment and automated disaster recovery configuration',
          quantity: 1,
          unit: 'job',
          unitPrice: 65000,
          discountPercent: 5,
        },
      ];
      inv.enableWithholdingTax = true;
      inv.withholdingTaxLabel = 'TDS u/s 194J (2%)';
      inv.withholdingTaxRate = 2;
      inv.theme.primaryColor = '#2563EB'; // Blue
      inv.theme.template = 'corporate';
      return inv;
    },
  },
  {
    name: 'US B2B Marketing Agency (USD / Net 30)',
    description: 'American corporate marketing & advertising invoice with PO number and bank routing',
    data: () => {
      const inv = createDefaultInvoice();
      inv.invoiceTitle = 'INVOICE';
      inv.invoiceNumber = 'AGY-2026-891';
      inv.poNumber = 'PO-US-89124';
      inv.taxMode = 'none'; // No sales tax on services
      inv.defaultTaxRate = 0;
      inv.sender = {
        entityType: 'company',
        companyName: 'Catalyst Creative Partners LLC',
        tagline: 'Brand Growth & Performance Marketing',
        contactPerson: 'Marcus Vance',
        addressLine1: '350 5th Avenue, 42nd Floor',
        city: 'New York',
        state: 'NY',
        postalCode: '10118',
        country: 'United States',
        email: 'invoices@catalystagency.com',
        phone: '+1 (212) 736-3100',
        website: 'www.catalystagency.com',
        taxIdLabel: 'EIN',
        taxIdValue: '13-8492019',
        regIdLabel: 'State File No',
        regIdValue: 'NY-489201',
        customFields: [],
      };
      inv.recipient = {
        entityType: 'company',
        companyName: 'Vertex BioHealth Inc.',
        contactPerson: 'Claire Bennett',
        addressLine1: '400 Technology Square',
        city: 'Cambridge',
        state: 'MA',
        postalCode: '02139',
        country: 'United States',
        email: 'ap@vertexbiohealth.com',
        phone: '+1 (617) 495-1000',
        taxIdLabel: 'Tax ID',
        taxIdValue: '04-9842109',
        regIdLabel: '',
        regIdValue: '',
        customFields: [],
      };
      inv.lineItems = [
        {
          id: 'item-1',
          description: 'Q3 Omni-Channel Performance Ad Campaign Management',
          notes: 'Google Search Ads, LinkedIn B2B Sponsored Content, and Meta Retargeting optimization',
          quantity: 1,
          unit: 'mo',
          unitPrice: 6500,
          discountPercent: 0,
        },
        {
          id: 'item-2',
          description: 'High-Conversion Landing Page & Video Production',
          notes: 'Full copy, 3D product motion graphics, interactive calculator, and A/B testing suite',
          quantity: 1,
          unit: 'project',
          unitPrice: 4200,
          discountPercent: 0,
        },
      ];
      inv.theme.primaryColor = '#E11D48'; // Rose/Crimson
      inv.theme.template = 'crimson';
      return inv;
    },
  },
];

/**
 * Generate high quality, vector PDF invoice using pdf-lib
 */
export async function generateInvoicePdf(invoice: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper colors
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  };

  const primaryRgb = hexToRgb(invoice.theme?.primaryColor || '#4F46E5');
  const darkRgb = rgb(0.09, 0.13, 0.2); // slate-900
  const mutedRgb = rgb(0.4, 0.45, 0.55); // slate-500
  const lightBgRgb = rgb(0.96, 0.97, 0.99); // slate-50
  const borderRgb = rgb(0.88, 0.9, 0.94); // slate-200
  const whiteRgb = rgb(1, 1, 1);

  const totals = calculateInvoiceTotals(invoice);

  let currentY = height - 40;

  // 1. Top Decorative Accent Header Bar
  page.drawRectangle({
    x: 0,
    y: height - 10,
    width: width,
    height: 10,
    color: primaryRgb,
  });

  // 2. Company Info (Left) & Invoice Title / Status (Right)
  const senderName = invoice.sender.companyName || invoice.sender.contactPerson || 'Company Name';
  page.drawText(senderName, {
    x: 40,
    y: currentY,
    size: 16,
    font: fontBold,
    color: darkRgb,
  });
  currentY -= 14;

  if (invoice.sender.tagline) {
    page.drawText(invoice.sender.tagline, {
      x: 40,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: mutedRgb,
    });
    currentY -= 12;
  }

  // Invoice Title on Right
  const invTitle = (invoice.invoiceTitle || 'INVOICE').toUpperCase();
  const titleWidth = fontBold.widthOfTextAtSize(invTitle, 18);
  page.drawText(invTitle, {
    x: width - 40 - titleWidth,
    y: height - 40,
    size: 18,
    font: fontBold,
    color: primaryRgb,
  });

  // Invoice Meta on Right
  const invNumText = `# ${invoice.invoiceNumber || 'INV-001'}`;
  const invNumWidth = fontBold.widthOfTextAtSize(invNumText, 10);
  page.drawText(invNumText, {
    x: width - 40 - invNumWidth,
    y: height - 56,
    size: 10,
    font: fontBold,
    color: darkRgb,
  });

  // Status Badge
  const statusStr = invoice.paymentStatus.toUpperCase();
  const statusWidth = fontBold.widthOfTextAtSize(statusStr, 8);
  const badgeX = width - 40 - statusWidth - 14;
  const badgeY = height - 76;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: statusWidth + 14,
    height: 16,
    color: invoice.paymentStatus === 'paid' ? rgb(0.85, 0.98, 0.9) : rgb(0.93, 0.95, 0.99),
    borderColor: invoice.paymentStatus === 'paid' ? rgb(0.2, 0.75, 0.4) : primaryRgb,
    borderWidth: 1,
  });
  page.drawText(statusStr, {
    x: badgeX + 7,
    y: badgeY + 4,
    size: 8,
    font: fontBold,
    color: invoice.paymentStatus === 'paid' ? rgb(0.1, 0.5, 0.2) : primaryRgb,
  });

  // Sender details block
  const senderLines: string[] = [];
  if (invoice.sender.addressLine1) senderLines.push(invoice.sender.addressLine1);
  if (invoice.sender.addressLine2) senderLines.push(invoice.sender.addressLine2);
  const senderCityState = [invoice.sender.city, invoice.sender.state, invoice.sender.postalCode].filter(Boolean).join(', ');
  if (senderCityState) senderLines.push(senderCityState);
  if (invoice.sender.country) senderLines.push(invoice.sender.country);
  if (invoice.sender.email) senderLines.push(`Email: ${invoice.sender.email}`);
  if (invoice.sender.phone) senderLines.push(`Phone: ${invoice.sender.phone}`);
  if (invoice.sender.taxIdValue) senderLines.push(`${invoice.sender.taxIdLabel || 'Tax ID'}: ${invoice.sender.taxIdValue}`);
  if (invoice.sender.regIdValue) senderLines.push(`${invoice.sender.regIdLabel || 'Reg No'}: ${invoice.sender.regIdValue}`);

  senderLines.slice(0, 6).forEach((line) => {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: mutedRgb,
    });
    currentY -= 11;
  });

  // Dates block on right
  let datesY = height - 98;
  const drawMetaRow = (label: string, value: string) => {
    const valWidth = fontBold.widthOfTextAtSize(value, 8.5);
    page.drawText(label, {
      x: width - 200,
      y: datesY,
      size: 8.5,
      font: fontRegular,
      color: mutedRgb,
    });
    page.drawText(value, {
      x: width - 40 - valWidth,
      y: datesY,
      size: 8.5,
      font: fontBold,
      color: darkRgb,
    });
    datesY -= 12;
  };

  drawMetaRow('Issue Date:', invoice.issueDate || '—');
  drawMetaRow('Due Date:', invoice.dueDate || '—');
  if (invoice.poNumber) drawMetaRow('PO Number:', invoice.poNumber);

  // Horizontal divider
  currentY = Math.min(currentY - 10, datesY - 10);
  page.drawLine({
    start: { x: 40, y: currentY },
    end: { x: width - 40, y: currentY },
    thickness: 1,
    color: borderRgb,
  });
  currentY -= 20;

  // 3. Bill To / Recipient Box
  const billToY = currentY;
  page.drawText('BILLED TO', {
    x: 40,
    y: billToY,
    size: 8.5,
    font: fontBold,
    color: primaryRgb,
  });

  let recipientTextY = billToY - 14;
  const recipientPrimaryName = invoice.recipient.companyName || invoice.recipient.contactPerson || 'Client Name';
  page.drawText(recipientPrimaryName, {
    x: 40,
    y: recipientTextY,
    size: 11,
    font: fontBold,
    color: darkRgb,
  });
  recipientTextY -= 13;

  if (invoice.recipient.companyName && invoice.recipient.contactPerson) {
    page.drawText(`Attn: ${invoice.recipient.contactPerson}`, {
      x: 40,
      y: recipientTextY,
      size: 8.5,
      font: fontRegular,
      color: mutedRgb,
    });
    recipientTextY -= 11;
  }

  const recipientLines: string[] = [];
  if (invoice.recipient.addressLine1) recipientLines.push(invoice.recipient.addressLine1);
  if (invoice.recipient.addressLine2) recipientLines.push(invoice.recipient.addressLine2);
  const recipientCityState = [invoice.recipient.city, invoice.recipient.state, invoice.recipient.postalCode].filter(Boolean).join(', ');
  if (recipientCityState) recipientLines.push(recipientCityState);
  if (invoice.recipient.country) recipientLines.push(invoice.recipient.country);
  if (invoice.recipient.email) recipientLines.push(`Email: ${invoice.recipient.email}`);
  if (invoice.recipient.taxIdValue) recipientLines.push(`${invoice.recipient.taxIdLabel || 'Tax ID'}: ${invoice.recipient.taxIdValue}`);

  recipientLines.forEach((line) => {
    page.drawText(line, {
      x: 40,
      y: recipientTextY,
      size: 8.5,
      font: fontRegular,
      color: mutedRgb,
    });
    recipientTextY -= 11;
  });

  // Optional Shipping Address on Right
  if (invoice.hasSeparateShippingAddress && invoice.shippingAddress) {
    page.drawText('SHIPPED TO', {
      x: width / 2 + 20,
      y: billToY,
      size: 8.5,
      font: fontBold,
      color: primaryRgb,
    });
    let shipY = billToY - 14;
    page.drawText(invoice.shippingAddress.recipientName || 'Recipient', {
      x: width / 2 + 20,
      y: shipY,
      size: 11,
      font: fontBold,
      color: darkRgb,
    });
    shipY -= 13;
    const shipLines = [
      invoice.shippingAddress.addressLine1,
      invoice.shippingAddress.city,
      invoice.shippingAddress.country,
    ].filter(Boolean);
    shipLines.forEach((line) => {
      page.drawText(line as string, {
        x: width / 2 + 20,
        y: shipY,
        size: 8.5,
        font: fontRegular,
        color: mutedRgb,
      });
      shipY -= 11;
    });
  }

  currentY = Math.min(recipientTextY - 15, billToY - 80);

  // 4. Line Items Table Header
  const tableX = 40;
  const tableWidth = width - 80;
  const headerHeight = 22;

  page.drawRectangle({
    x: tableX,
    y: currentY - headerHeight,
    width: tableWidth,
    height: headerHeight,
    color: lightBgRgb,
    borderColor: borderRgb,
    borderWidth: 1,
  });

  page.drawText('DESCRIPTION / SERVICE', {
    x: tableX + 10,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: mutedRgb,
  });

  page.drawText('QTY', {
    x: tableX + 280,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: mutedRgb,
  });

  page.drawText('UNIT PRICE', {
    x: tableX + 340,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: mutedRgb,
  });

  const amountHeaderText = 'AMOUNT';
  const amountHeaderWidth = fontBold.widthOfTextAtSize(amountHeaderText, 8);
  page.drawText(amountHeaderText, {
    x: tableX + tableWidth - 10 - amountHeaderWidth,
    y: currentY - 14,
    size: 8,
    font: fontBold,
    color: mutedRgb,
  });

  currentY -= headerHeight;

  // 5. Line Items Rows
  invoice.lineItems.forEach((item, index) => {
    const rawTotal = (item.quantity || 0) * (item.unitPrice || 0);
    const discPct = item.discountPercent || 0;
    const netTotal = rawTotal - (rawTotal * discPct) / 100;
    const rowHeight = item.notes ? 32 : 22;

    // Alternating subtle row background
    if (index % 2 === 1) {
      page.drawRectangle({
        x: tableX,
        y: currentY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.98, 0.99, 1.0),
      });
    }

    // Border line bottom
    page.drawLine({
      start: { x: tableX, y: currentY - rowHeight },
      end: { x: tableX + tableWidth, y: currentY - rowHeight },
      thickness: 0.5,
      color: borderRgb,
    });

    // Description text
    page.drawText(item.description || 'Item', {
      x: tableX + 10,
      y: currentY - 14,
      size: 8.5,
      font: fontBold,
      color: darkRgb,
    });

    if (item.notes) {
      const truncatedNotes = item.notes.length > 55 ? item.notes.substring(0, 52) + '...' : item.notes;
      page.drawText(truncatedNotes, {
        x: tableX + 10,
        y: currentY - 25,
        size: 7.5,
        font: fontRegular,
        color: mutedRgb,
      });
    }

    // Qty
    const qtyStr = `${item.quantity || 0} ${item.unit || ''}`.trim();
    page.drawText(qtyStr, {
      x: tableX + 280,
      y: currentY - 14,
      size: 8.5,
      font: fontRegular,
      color: darkRgb,
    });

    // Unit Price
    const priceStr = formatInvoiceCurrencyForPdf(item.unitPrice || 0, invoice.currency);
    page.drawText(priceStr, {
      x: tableX + 340,
      y: currentY - 14,
      size: 8.5,
      font: fontRegular,
      color: darkRgb,
    });

    // Line Amount
    const totalStr = formatInvoiceCurrencyForPdf(netTotal, invoice.currency);
    const totalW = fontBold.widthOfTextAtSize(totalStr, 8.5);
    page.drawText(totalStr, {
      x: tableX + tableWidth - 10 - totalW,
      y: currentY - 14,
      size: 8.5,
      font: fontBold,
      color: darkRgb,
    });

    currentY -= rowHeight;
  });

  currentY -= 15;

  // 6. Notes / Payment Terms (Left) & Totals Summary Card (Right)
  const totalsBoxWidth = 210;
  const totalsBoxX = tableX + tableWidth - totalsBoxWidth;
  const summaryStartY = currentY;

  // Left Notes & Terms
  let leftY = summaryStartY;
  if (invoice.notes) {
    page.drawText('NOTES & REMARKS', {
      x: tableX,
      y: leftY,
      size: 8,
      font: fontBold,
      color: primaryRgb,
    });
    leftY -= 12;

    const cleanNotes = invoice.notes.length > 120 ? invoice.notes.substring(0, 115) + '...' : invoice.notes;
    page.drawText(cleanNotes, {
      x: tableX,
      y: leftY,
      size: 7.5,
      font: fontRegular,
      color: mutedRgb,
    });
    leftY -= 20;
  }

  if (invoice.termsAndConditions) {
    page.drawText('TERMS & CONDITIONS', {
      x: tableX,
      y: leftY,
      size: 8,
      font: fontBold,
      color: primaryRgb,
    });
    leftY -= 12;

    const cleanTerms = invoice.termsAndConditions.length > 140 ? invoice.termsAndConditions.substring(0, 135) + '...' : invoice.termsAndConditions;
    page.drawText(cleanTerms, {
      x: tableX,
      y: leftY,
      size: 7.5,
      font: fontRegular,
      color: mutedRgb,
    });
    leftY -= 20;
  }

  // Signatory
  if (invoice.signatoryName) {
    leftY -= 10;
    page.drawText('AUTHORIZED SIGNATURE', {
      x: tableX,
      y: leftY,
      size: 7.5,
      font: fontBold,
      color: mutedRgb,
    });
    leftY -= 12;
    page.drawText(invoice.signatoryName, {
      x: tableX,
      y: leftY,
      size: 9,
      font: fontBold,
      color: darkRgb,
    });
    if (invoice.signatoryTitle) {
      leftY -= 10;
      page.drawText(invoice.signatoryTitle, {
        x: tableX,
        y: leftY,
        size: 7.5,
        font: fontRegular,
        color: mutedRgb,
      });
    }
  }

  // Right Totals Breakdown
  let totalsY = summaryStartY;
  const drawTotalRow = (label: string, value: string, isBold = false, isAccent = false) => {
    const valWidth = (isBold ? fontBold : fontRegular).widthOfTextAtSize(value, isAccent ? 10.5 : 8.5);
    page.drawText(label, {
      x: totalsBoxX,
      y: totalsY,
      size: isAccent ? 9.5 : 8.5,
      font: isBold ? fontBold : fontRegular,
      color: isAccent ? primaryRgb : darkRgb,
    });
    page.drawText(value, {
      x: tableX + tableWidth - valWidth,
      y: totalsY,
      size: isAccent ? 10.5 : 8.5,
      font: fontBold,
      color: isAccent ? primaryRgb : darkRgb,
    });
    totalsY -= 13;
  };

  drawTotalRow('Subtotal:', formatInvoiceCurrencyForPdf(totals.subtotal, invoice.currency));
  
  if (totals.totalItemDiscount > 0) {
    drawTotalRow('Item Discounts:', `-${formatInvoiceCurrencyForPdf(totals.totalItemDiscount, invoice.currency)}`);
  }

  if (totals.globalDiscountAmount > 0) {
    drawTotalRow('Global Discount:', `-${formatInvoiceCurrencyForPdf(totals.globalDiscountAmount, invoice.currency)}`);
  }

  if (invoice.taxMode === 'exclusive' && totals.totalTax > 0) {
    drawTotalRow(
      `${invoice.defaultTaxLabel || 'Tax'} (${invoice.defaultTaxRate}%):`,
      formatInvoiceCurrencyForPdf(totals.primaryTaxAmount, invoice.currency)
    );
    if (invoice.enableSecondTax && totals.secondTaxAmount > 0) {
      drawTotalRow(
        `${invoice.secondTaxLabel || 'Tax 2'} (${invoice.secondTaxRate}%):`,
        formatInvoiceCurrencyForPdf(totals.secondTaxAmount, invoice.currency)
      );
    }
  } else if (invoice.taxMode === 'inclusive' && totals.totalTax > 0) {
    drawTotalRow(
      `Includes ${invoice.defaultTaxLabel || 'Tax'}:`,
      formatInvoiceCurrencyForPdf(totals.totalTax, invoice.currency)
    );
  }

  if (totals.shippingFee > 0) {
    drawTotalRow('Shipping / Delivery:', formatInvoiceCurrencyForPdf(totals.shippingFee, invoice.currency));
  }

  if (totals.extraFeeAmount > 0) {
    drawTotalRow(invoice.extraFeeLabel || 'Extra Fee:', formatInvoiceCurrencyForPdf(totals.extraFeeAmount, invoice.currency));
  }

  // Divider above Total
  page.drawLine({
    start: { x: totalsBoxX, y: totalsY + 4 },
    end: { x: tableX + tableWidth, y: totalsY + 4 },
    thickness: 1,
    color: borderRgb,
  });
  totalsY -= 4;

  drawTotalRow('Grand Total:', formatInvoiceCurrencyForPdf(totals.grandTotal, invoice.currency), true, true);

  if (totals.withholdingTaxAmount > 0) {
    drawTotalRow(
      `Less ${invoice.withholdingTaxLabel || 'TDS'}:`,
      `-${formatInvoiceCurrencyForPdf(totals.withholdingTaxAmount, invoice.currency)}`
    );
  }

  if (totals.amountPaid > 0) {
    drawTotalRow('Amount Paid:', formatInvoiceCurrencyForPdf(totals.amountPaid, invoice.currency));
  }

  if (totals.amountPaid > 0 || totals.withholdingTaxAmount > 0) {
    totalsY -= 2;
    page.drawRectangle({
      x: totalsBoxX - 6,
      y: totalsY - 14,
      width: totalsBoxWidth + 6,
      height: 20,
      color: lightBgRgb,
      borderColor: primaryRgb,
      borderWidth: 1,
    });
    const balStr = formatInvoiceCurrencyForPdf(totals.balanceDue, invoice.currency);
    const balW = fontBold.widthOfTextAtSize(balStr, 9.5);
    page.drawText('BALANCE DUE:', {
      x: totalsBoxX,
      y: totalsY - 9,
      size: 8.5,
      font: fontBold,
      color: darkRgb,
    });
    page.drawText(balStr, {
      x: tableX + tableWidth - balW,
      y: totalsY - 9,
      size: 9.5,
      font: fontBold,
      color: primaryRgb,
    });
  }

  // 7. Footer line
  page.drawLine({
    start: { x: 40, y: 35 },
    end: { x: width - 40, y: 35 },
    thickness: 0.5,
    color: borderRgb,
  });

  page.drawText('Generated with DevFlow Pro Invoice Engine • Thank you for your business', {
    x: 40,
    y: 22,
    size: 7.5,
    font: fontRegular,
    color: mutedRgb,
  });

  const pageStr = 'Page 1 of 1';
  const pageW = fontRegular.widthOfTextAtSize(pageStr, 7.5);
  page.drawText(pageStr, {
    x: width - 40 - pageW,
    y: 22,
    size: 7.5,
    font: fontRegular,
    color: mutedRgb,
  });

  return await pdfDoc.save();
}
