import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { InvoiceCurrency, POPULAR_CURRENCIES } from './invoiceGenerator';

export type PartyEntityType = 'company' | 'individual';

export interface PartyCustomField {
  id: string;
  label: string;
  value: string;
}

export interface AgreementParty {
  entityType: PartyEntityType;
  name: string; // Company Name or Individual Full Name
  tradeName?: string; // DBA / Trade Name / Agency Name
  entityStructure?: string; // LLC, Inc., Ltd., Sole Proprietorship, Individual
  representativeName: string; // Signatory / Authorized Rep
  representativeTitle: string; // CEO, Director, Owner, Lead Developer
  taxIdType: string; // EIN, VAT, GSTIN, SSN, etc.
  taxId: string;
  registrationNo?: string;
  email: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  customFields: PartyCustomField[];
  signature: {
    type: 'typed' | 'drawn' | 'uploaded' | 'blank';
    typedName?: string;
    fontStyle?: 'calligraphy' | 'handwriting' | 'serif' | 'formal';
    dataUrl?: string;
    date: string;
    location?: string;
  };
}

export interface AgreementMilestone {
  id: string;
  name: string;
  deliverables: string;
  percentage: number;
  amount: number;
  targetDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
}

export interface AgreementSubClause {
  id: string;
  subNumber: string; // "1.1", "1.2"
  title: string; // "Services", "Standard of Performance"
  content: string; // clause body
  isCallout?: boolean;
  calloutTitle?: string;
}

export interface AgreementClause {
  id: string;
  sectionNumber: string; // "1", "2", "3"
  title: string; // "ENGAGEMENT & SCOPE OF SERVICES"
  enabled: boolean;
  subClauses: AgreementSubClause[];
}

export interface AgreementPaymentTerms {
  paymentModel: 'milestones' | 'fixed_lump_sum' | 'retainer' | 'hourly_rate';
  totalAmount: number;
  currency: InvoiceCurrency;
  netDays: number; // e.g. 14
  warrantyDays: number; // e.g. 30
  lateFeePercent: number; // e.g. 1.5%
  retainerMonthlyAmount?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  depositPercentage?: number; // e.g. 20%
}

export interface AgreementConfig {
  id: string;
  title: string;
  subtitle: string;
  contractId: string;
  effectiveDate: string;
  expirationDate?: string;
  classification: string; // "CONFIDENTIAL & PROPRIETARY"
  party1Role: string; // "Client"
  party2Role: string; // "Contractor"
  party1: AgreementParty;
  party2: AgreementParty;
  paymentTerms: AgreementPaymentTerms;
  milestones: AgreementMilestone[];
  clauses: AgreementClause[];
  governingJurisdiction: string;
  governingCity: string;
  disputeResolutionMethod: 'courts' | 'arbitration' | 'mediation_then_arbitration';
  includeScheduleA: boolean;
  scheduleATitle: string;
  scheduleAContent: string;
  includeFrontmatter: boolean;
  includePageDividers: boolean;
  includeWitnessBlock: boolean;
  witnessName?: string;
  witnessDate?: string;
}

export const JURISDICTION_PRESETS = [
  { label: 'California, United States', city: 'San Francisco, CA', jurisdiction: 'State of California, United States' },
  { label: 'Delaware, United States', city: 'Wilmington, DE', jurisdiction: 'State of Delaware, United States' },
  { label: 'New York, United States', city: 'New York, NY', jurisdiction: 'State of New York, United States' },
  { label: 'Texas, United States', city: 'Austin, TX', jurisdiction: 'State of Texas, United States' },
  { label: 'England & Wales, United Kingdom', city: 'London, England', jurisdiction: 'England and Wales' },
  { label: 'Ontario, Canada', city: 'Toronto, ON', jurisdiction: 'Province of Ontario and the federal laws of Canada' },
  { label: 'New South Wales, Australia', city: 'Sydney, NSW', jurisdiction: 'State of New South Wales, Australia' },
  { label: 'Germany / European Union', city: 'Berlin, Germany', jurisdiction: 'Federal Republic of Germany' },
  { label: 'Singapore', city: 'Singapore', jurisdiction: 'Republic of Singapore' },
  { label: 'Maharashtra / Karnataka, India', city: 'Bengaluru, Karnataka', jurisdiction: 'Republic of India' },
  { label: 'Dubai / UAE', city: 'Dubai, UAE', jurisdiction: 'Emirate of Dubai and UAE Federal Laws' },
];

export const TAX_ID_PRESETS = [
  'EIN / Tax ID (US)',
  'SSN (US Individual)',
  'VAT Reg No (UK / EU)',
  'GSTIN (India)',
  'ABN (Australia)',
  'UEN (Singapore)',
  'BN / Business No (Canada)',
  'SIRET / TVA (France)',
  'USt-IdNr (Germany)',
  'CIF / NIF (Spain)',
  'P.IVA / Codice Fiscale (Italy)',
  'CNPJ / CPF (Brazil)',
  'Custom Tax / Reg ID',
];

/**
 * Default sample contractor agreement configuration matching the reference markdown.
 */
export function getDefaultContractorAgreement(): AgreementConfig {
  const usdCurrency = POPULAR_CURRENCIES.find((c) => c.code === 'USD') || POPULAR_CURRENCIES[0];

  const party1: AgreementParty = {
    entityType: 'company',
    name: 'Acme Technologies Inc.',
    tradeName: 'Acme Cloud Platform',
    entityStructure: 'Delaware C-Corporation',
    representativeName: 'Sarah Jenkins',
    representativeTitle: 'Chief Executive Officer',
    taxIdType: 'EIN / Tax ID (US)',
    taxId: 'XX-XXXXXXX',
    registrationNo: 'DE-8923411',
    email: 'legal@acmetech.io',
    phone: '+1 (415) 890-1200',
    addressStreet: '100 Montgomery Street, Suite 2400',
    addressCity: 'San Francisco',
    addressState: 'CA',
    addressZip: '94104',
    addressCountry: 'United States',
    customFields: [],
    signature: {
      type: 'blank',
      typedName: '',
      fontStyle: 'calligraphy',
      date: '',
      location: '',
    },
  };

  const party2: AgreementParty = {
    entityType: 'company',
    name: 'Nexus Digital Architecture LLC',
    tradeName: 'Nexus Dev Studio',
    entityStructure: 'Limited Liability Company',
    representativeName: 'Alex Rivera',
    representativeTitle: 'Principal Systems Architect',
    taxIdType: 'EIN / Tax ID (US)',
    taxId: 'YY-YYYYYYY',
    registrationNo: 'CA-2024-9182',
    email: 'alex@nexusdigital.dev',
    phone: '+1 (510) 555-0192',
    addressStreet: '2150 Shattuck Avenue, Suite 1100',
    addressCity: 'Berkeley',
    addressState: 'CA',
    addressZip: '94704',
    addressCountry: 'United States',
    customFields: [],
    signature: {
      type: 'blank',
      typedName: '',
      fontStyle: 'calligraphy',
      date: '',
      location: '',
    },
  };

  const milestones: AgreementMilestone[] = [
    {
      id: 'm1',
      name: 'Milestone 1',
      deliverables: 'Figma Wireframes, Interactive UI/UX Mockups, Approved Site Architecture.',
      percentage: 20,
      amount: 4000,
      targetDate: '2026-11-15',
      status: 'completed',
    },
    {
      id: 'm2',
      name: 'Milestone 2',
      deliverables: 'Front-End Staging Build (Responsive UI, Core HTML/CSS/JS Structure).',
      percentage: 25,
      amount: 5000,
      targetDate: '2026-12-05',
      status: 'in_progress',
    },
    {
      id: 'm3',
      name: 'Milestone 3',
      deliverables: 'Full CMS/Back-End Integration, Form Captures, PageSpeed Optimization (>90 score).',
      percentage: 35,
      amount: 7000,
      targetDate: '2026-12-28',
      status: 'pending',
    },
    {
      id: 'm4',
      name: 'Milestone 4',
      deliverables: 'Final Deployment to Production, Admin Handoff, 14-Day Warranty Clearance.',
      percentage: 20,
      amount: 4000,
      targetDate: '2027-01-15',
      status: 'pending',
    },
  ];

  const clauses: AgreementClause[] = [
    {
      id: 'sec1',
      sectionNumber: '1',
      title: 'ENGAGEMENT & SCOPE OF SERVICES',
      enabled: true,
      subClauses: [
        {
          id: 'sc1_1',
          subNumber: '1.1',
          title: 'Services',
          content:
            'Client hereby retains Contractor, and Contractor agrees to perform software, UI/UX design, and web development services as specified in Schedule A (Scope of Work) attached hereto (the "Services").',
        },
        {
          id: 'sc1_2',
          subNumber: '1.2',
          title: 'Standard of Performance',
          content:
            'Contractor agrees to perform all Services in a professional, workmanlike manner, in accordance with the highest industry standards for professional software and web development. Contractor guarantees that all code, scripts, and visual deliverables will perform as specified in Schedule A.',
        },
      ],
    },
    {
      id: 'sec2',
      sectionNumber: '2',
      title: 'MILESTONE PAYMENTS & INVOICING',
      enabled: true,
      subClauses: [
        {
          id: 'sc2_1',
          subNumber: '2.1',
          title: 'Total Fee',
          content:
            'As full compensation for the satisfactory performance and completion of the Services, Client shall pay Contractor the total fixed fee of ${{TOTAL_AMOUNT}} {{CURRENCY_CODE}} (the "Contract Price").',
        },
        {
          id: 'sc2_2',
          subNumber: '2.2',
          title: 'Milestone Payment Schedule',
          content:
            'Payments shall be released strictly upon the formal review, inspection, and written approval by Client of each completed milestone as set forth in the Milestone Schedule table below.',
        },
        {
          id: 'sc2_3',
          subNumber: '2.3',
          title: 'Invoicing Terms',
          content:
            'Contractor shall submit written invoices upon completion of each milestone. Client shall pay verified invoices within {{NET_DAYS}} calendar days of written acceptance of the milestone deliverables. Client reserves the right to withhold payment for any milestone that fails to meet technical specifications.',
        },
      ],
    },
    {
      id: 'sec3',
      sectionNumber: '3',
      title: 'INTELLECTUAL PROPERTY RIGHTS & WORK MADE FOR HIRE',
      enabled: true,
      subClauses: [
        {
          id: 'sc3_1',
          subNumber: '3.1',
          title: 'Work Made for Hire',
          content:
            'Contractor explicitly acknowledges and agrees that all materials, code, designs, graphics, content, documentation, domain configurations, and deliverables created, developed, or submitted under this Agreement (collectively, the "Work Product") shall be considered a "work made for hire" specially ordered or commissioned by Client under applicable intellectual property laws.',
        },
        {
          id: 'sc3_2',
          subNumber: '3.2',
          title: 'Assignment of Intellectual Property',
          content:
            'To the extent that any Work Product does not qualify as a "work made for hire," Contractor hereby irrevocably assigns, transfers, and conveys to Client, unconditionally and perpetually, all worldwide right, title, and interest in and to the Work Product, including all copyrights, patents, trade secrets, trademarks, and all other proprietary rights therein.',
        },
        {
          id: 'sc3_3',
          subNumber: '3.3',
          title: 'Pre-Existing Materials & Open Source',
          content:
            'Contractor shall not incorporate any third-party software, open-source software (GPL, AGPL, etc.), or Contractor\'s pre-existing code into the Work Product without prior written disclosure and written consent from Client. Contractor guarantees that any permitted open-source code shall not obligate Client to publish or disclose its proprietary source code.',
        },
      ],
    },
    {
      id: 'sec4',
      sectionNumber: '4',
      title: 'CONFIDENTIALITY & NON-DISCLOSURE',
      enabled: true,
      subClauses: [
        {
          id: 'sc4_1',
          subNumber: '4.1',
          title: 'Confidential Information',
          content:
            'Contractor acknowledges that during the course of this engagement, Contractor will have access to Client’s confidential and proprietary information, including business plans, client lists, software architectures, technical code, financial data, and marketing strategies ("Confidential Information").',
        },
        {
          id: 'sc4_2',
          subNumber: '4.2',
          title: 'Non-Disclosure Obligation',
          content:
            'Contractor agrees to hold all Confidential Information in strict confidence and shall not disclose, copy, publish, or use any Confidential Information for any purpose other than fulfilling obligations under this Agreement without Client\'s express written consent.',
        },
      ],
    },
    {
      id: 'sec5',
      sectionNumber: '5',
      title: 'WARRANTIES & CODE QUALITY',
      enabled: true,
      subClauses: [
        {
          id: 'sc5_1',
          subNumber: '5.1',
          title: 'Originality Warranty',
          content:
            'Contractor warrants that all Work Product delivered is entirely original and does not infringe upon or violate any patent, copyright, trademark, trade secret, or other proprietary right of any third party.',
        },
        {
          id: 'sc5_2',
          subNumber: '5.2',
          title: 'Performance & Bug-Fix Warranty',
          content:
            'Contractor warrants that for a period of {{WARRANTY_DAYS}} days following final deployment to production (the "Warranty Period"), the website and deliverables shall function without errors, bugs, security vulnerabilities, or performance degradation. Contractor shall repair any such bugs or deficiencies at no additional cost to Client within 48 hours of notice.',
        },
        {
          id: 'sc5_3',
          subNumber: '',
          title: '',
          content:
            'SECURITY & COMPLIANCE MANDATE: Contractor warrants that code delivered contains no backdoors, malware, trojans, or unauthorized administrative access tools. All web forms must implement Honeypot/reCAPTCHA protection, and hosting deployment must strictly enforce HTTPS and SSL encryption.',
          isCallout: true,
          calloutTitle: 'SECURITY & COMPLIANCE MANDATE',
        },
      ],
    },
    {
      id: 'sec6',
      sectionNumber: '6',
      title: 'INDEPENDENT CONTRACTOR STATUS',
      enabled: true,
      subClauses: [
        {
          id: 'sc6_1',
          subNumber: '',
          title: '',
          content:
            'It is expressly understood that Contractor is acting as an independent contractor and not as an employee, agent, partner, or joint venturer of Client. Contractor shall be solely responsible for paying all federal, state, and local income taxes, self-employment taxes, and statutory insurance obligations.',
        },
      ],
    },
    {
      id: 'sec7',
      sectionNumber: '7',
      title: 'TERMINATION',
      enabled: true,
      subClauses: [
        {
          id: 'sc7_1',
          subNumber: '7.1',
          title: 'Termination for Convenience',
          content:
            'Client may terminate this Agreement at any time by providing seven (7) days\' written notice to Contractor. In such event, Client shall pay Contractor for approved milestones completed prior to the notice date.',
        },
        {
          id: 'sc7_2',
          subNumber: '7.2',
          title: 'Termination for Cause',
          content:
            'Client may terminate this Agreement immediately without prior notice if Contractor fails to meet milestone deadlines, breaches confidentiality, or delivers non-conforming Work Product.',
        },
      ],
    },
    {
      id: 'sec8',
      sectionNumber: '8',
      title: 'GOVERNING LAW & DISPUTE RESOLUTION',
      enabled: true,
      subClauses: [
        {
          id: 'sc8_1',
          subNumber: '',
          title: '',
          content:
            'This Agreement shall be governed by and construed in accordance with the laws of {{JURISDICTION}}, without regard to its conflict of law principles. Any legal action arising from this Agreement shall be brought exclusively in the courts located in {{CITY}}.',
        },
      ],
    },
    {
      id: 'sec9',
      sectionNumber: '9',
      title: 'SIGNATURES & EXECUTION',
      enabled: true,
      subClauses: [
        {
          id: 'sc9_1',
          subNumber: '',
          title: '',
          content:
            'IN WITNESS WHEREOF, the Parties hereto have executed this Independent Contractor Agreement as of the Effective Date written above.',
        },
      ],
    },
  ];

  return {
    id: 'agreement-sample-1',
    title: 'INDEPENDENT CONTRACTOR AGREEMENT',
    subtitle: 'Web Development & Digital Architecture Services',
    contractId: 'ICA-WEB-2026-001',
    effectiveDate: '2026-10-24',
    expirationDate: '2027-04-30',
    classification: 'CONFIDENTIAL & PROPRIETARY',
    party1Role: 'Client',
    party2Role: 'Contractor',
    party1,
    party2,
    paymentTerms: {
      paymentModel: 'milestones',
      totalAmount: 20000,
      currency: usdCurrency,
      netDays: 14,
      warrantyDays: 30,
      lateFeePercent: 1.5,
    },
    milestones,
    clauses,
    governingJurisdiction: 'State of California, United States',
    governingCity: 'San Francisco, CA',
    disputeResolutionMethod: 'courts',
    includeScheduleA: true,
    scheduleATitle: 'Schedule A: Scope of Work & Deliverables',
    scheduleAContent: `### Scope of Work Details
1. **Design System & Architecture**: Modern design tokens, responsive typography, and mobile-first layouts.
2. **Component Implementation**: TypeScript React components with full accessibility (ARIA 1.2) standards.
3. **Backend API Integration**: Secure RESTful endpoints, JWT authentication, and database query optimizations.
4. **Testing & QA**: Comprehensive unit and integration test coverage across Chrome, Safari, Firefox, and Edge.`,
    includeFrontmatter: true,
    includePageDividers: true,
    includeWitnessBlock: false,
  };
}

/**
 * Replaces placeholders in clause texts with actual agreement variables.
 */
export function interpolatePlaceholders(text: string, config: AgreementConfig): string {
  const symbol = config.paymentTerms.currency.symbol;
  const totalStr = `${symbol}${config.paymentTerms.totalAmount.toLocaleString()}`;

  let result = text
    .replace(/\$\{\{TOTAL_AMOUNT\}\}/g, totalStr)
    .replace(/\{\{TOTAL_AMOUNT\}\}/g, totalStr)
    .replace(/\{\{CURRENCY_CODE\}\}/g, config.paymentTerms.currency.code)
    .replace(/\{\{NET_DAYS\}\}/g, `${config.paymentTerms.netDays}`)
    .replace(/\{\{WARRANTY_DAYS\}\}/g, `${config.paymentTerms.warrantyDays}`)
    .replace(/\{\{JURISDICTION\}\}/g, config.governingJurisdiction)
    .replace(/\{\{CITY\}\}/g, config.governingCity)
    .replace(/\{\{EFFECTIVE_DATE\}\}/g, config.effectiveDate)
    .replace(/\{\{CLIENT_NAME\}\}/g, config.party1.name)
    .replace(/\{\{CONTRACTOR_NAME\}\}/g, config.party2.name);

  // Clean up any unintended double currency symbols
  result = result.replace(/\$\$+/g, '$');
  return result;
}

/**
 * Generates clean, standard GitHub Flavored Markdown matching the exact layout of the reference.
 */
export function generateAgreementMarkdown(config: AgreementConfig): string {
  const sections: string[] = [];

  // 1. YAML Frontmatter
  if (config.includeFrontmatter) {
    sections.push(
      `---\ntitle: "${config.title} - ${config.subtitle}"\nauthor: "DevHub Agreement Engine"\npages: 3\nconverted_at: "${new Date().toISOString().split('T')[0]}"\n---\n`
    );
  }

  // 2. Title & Subtitle
  sections.push(`## ${config.title}\n\n${config.subtitle}`);

  // 3. Metadata Header (Effective Date, Contract ID, Parties Info)
  const metaLines = [
    `Effective Date: ${config.effectiveDate || '[Date]'}    Contract ID: ${config.contractId || 'N/A'}`,
    `${config.party1Role}: ${config.party1.name || '[Party 1 Name]'}    ${config.party2Role}: ${config.party2.name || '[Party 2 Name]'}`,
    `${config.party1Role} Rep: ${config.party1.representativeName || '[Rep Name]'}    Tax ID/Reg No: ${config.party2.taxId || '[Tax ID / Reg No]'}`,
  ];
  sections.push(metaLines.join('\n\n'));

  // 4. Intro Paragraph
  const p1Address = [config.party1.addressStreet, config.party1.addressCity, config.party1.addressState, config.party1.addressCountry]
    .filter(Boolean)
    .join(', ') || '[Party 1 Address]';
  const p2Address = [config.party2.addressStreet, config.party2.addressCity, config.party2.addressState, config.party2.addressCountry]
    .filter(Boolean)
    .join(', ') || '[Party 2 Address]';

  const intro = `This ${config.title} (the "Agreement") is entered into and made effective as of the Effective Date written above, by and between ${config.party1.name || '[Party 1]'}, having its principal place of business at ${p1Address} ("${config.party1Role}"), and ${config.party2.name || '[Party 2]'}, located at ${p2Address} ("${config.party2Role}").\n\n${config.party1Role} and ${config.party2Role} may collectively be referred to as the "Parties" or individually as a "Party."`;
  sections.push(intro);

  // 5. Clauses
  let pageCountTracker = 1;
  const activeClauses = config.clauses.filter((c) => c.enabled);

  for (let i = 0; i < activeClauses.length; i++) {
    const clause = activeClauses[i];
    const clauseLines: string[] = [];

    clauseLines.push(`## ${clause.sectionNumber}. ${clause.title}`);

    for (const sub of clause.subClauses) {
      if (sub.isCallout) {
        clauseLines.push(`\n> **${sub.calloutTitle || 'MANDATE'}:** ${interpolatePlaceholders(sub.content, config)}\n`);
        continue;
      }

      if (sub.subNumber && sub.title) {
        clauseLines.push(`\n### ${sub.subNumber} ${sub.title}: ${interpolatePlaceholders(sub.content, config)}`);
      } else {
        clauseLines.push(`\n${interpolatePlaceholders(sub.content, config)}`);
      }

      // If this is Section 2.2, insert Milestone Payment Table
      if (clause.sectionNumber === '2' && sub.subNumber === '2.2' && config.milestones.length > 0) {
        clauseLines.push('\n| Milestone Deliverables / Acceptance Criteria | Payout (% / $) | Target Date |');
        clauseLines.push('| --- | --- | --- |');

        const sym = config.paymentTerms.currency.symbol;
        for (const m of config.milestones) {
          const formattedAmt = `${m.percentage}% (${sym}${m.amount.toLocaleString()})`;
          clauseLines.push(`| **${m.name}**: ${m.deliverables} | ${formattedAmt} | ${m.targetDate || '[Date]'} |`);
        }
      }
    }

    sections.push(clauseLines.join('\n\n'));

    // Inject simulated page breaks if enabled
    if (config.includePageDividers) {
      if (i === 1) {
        pageCountTracker++;
        sections.push(`\n${config.classification} Page 1 of 3\n\n---\n<!-- Page ${pageCountTracker} -->\n`);
      } else if (i === 5) {
        pageCountTracker++;
        sections.push(`\n${config.classification} Page 2 of 3\n\n---\n<!-- Page ${pageCountTracker} -->\n`);
      }
    }
  }

  // 6. Signatures & Execution Table
  const p1Sig =
    config.party1.signature.type !== 'blank' && config.party1.signature.typedName
      ? config.party1.signature.typedName
      : '_______________________';
  const p2Sig =
    config.party2.signature.type !== 'blank' && config.party2.signature.typedName
      ? config.party2.signature.typedName
      : '_______________________';

  const sigTable = [
    `| FOR ${config.party1Role.toUpperCase()}: ${config.party1.name} | FOR ${config.party2Role.toUpperCase()}: ${config.party2.name} |`,
    `| --- | --- |`,
    `| Authorized Signature: ${p1Sig} | Authorized Signature: ${p2Sig} |`,
    `| Printed Name: ${config.party1.representativeName || '[Signatory Name]'} | Printed Name: ${config.party2.representativeName || '[Signatory Name]'} |`,
    `| Title: ${config.party1.representativeTitle || '[Title]'} | Title: ${config.party2.representativeTitle || '[Title]'} |`,
    `| Date: ${config.party1.signature.date || '_______________________'} | Date: ${config.party2.signature.date || '_______________________'} |`,
  ];
  sections.push(sigTable.join('\n'));

  // Witness Block if enabled
  if (config.includeWitnessBlock) {
    sections.push(
      `\n### WITNESS / NOTARIZATION ATTESTATION\n\nWitness Name: ${config.witnessName || '_______________________'}    Date: ${config.witnessDate || '_______________________'}\nWitness Signature: _______________________`
    );
  }

  // Schedule A if enabled
  if (config.includeScheduleA && config.scheduleAContent) {
    sections.push(`\n---\n\n## ${config.scheduleATitle}\n\n${config.scheduleAContent}`);
  }

  // Final page footer
  if (config.includePageDividers) {
    sections.push(`\n${config.classification} Page 3 of 3`);
  }

  return sections.join('\n\n').trim() + '\n';
}

/**
 * Sanitizes text to remove unencodable unicode glyphs, smart quotes,
 * em-dashes, and unsupported symbols for PDF-lib standard WinAnsi fonts.
 */
export function cleanPdfText(text: string): string {
  if (!text) return '';
  return text
    // Replace smart quotes and apostrophes
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u02BC\u02B9]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    // Replace dashes and hyphens
    .replace(/[\u2013\u2014\u2015\u2212]/g, '-')
    // Replace ellipsis
    .replace(/\u2026/g, '...')
    // Replace bullet points and dots
    .replace(/[\u2022\u25E6\u25AA\u25AB\u25CF\u2219]/g, '-')
    // Replace non-breaking spaces and zero-width spaces
    .replace(/[\u00A0\u202F\u2007\u200B\uFEFF]/g, ' ')
    // Replace copyright/trademark/registered symbols
    .replace(/\u00A9/g, '(c)')
    .replace(/\u00AE/g, '(R)')
    .replace(/\u2122/g, '(TM)')
    // Strip markdown formatting symbols like **bold**, *italic*, ###
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Clean consecutive spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Accurately calculates text wrapping lines using exact font metrics from pdf-lib.
 */
export function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const clean = cleanPdfText(text);
  if (!clean) return [];

  const rawParagraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of rawParagraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) {
      lines.push('');
      continue;
    }

    const words = trimmedPara.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      let width = 0;
      try {
        width = font.widthOfTextAtSize(candidate, fontSize);
      } catch {
        width = candidate.length * fontSize * 0.55;
      }

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);

        // Handle exceptionally long words that exceed maxWidth
        let wordWidth = 0;
        try {
          wordWidth = font.widthOfTextAtSize(word, fontSize);
        } catch {
          wordWidth = word.length * fontSize * 0.55;
        }

        if (wordWidth > maxWidth) {
          let partial = '';
          for (let c = 0; c < word.length; c++) {
            const testPartial = partial + word[c];
            let testWidth = 0;
            try {
              testWidth = font.widthOfTextAtSize(testPartial, fontSize);
            } catch {
              testWidth = testPartial.length * fontSize * 0.55;
            }
            if (testWidth > maxWidth && partial) {
              lines.push(partial);
              partial = word[c];
            } else {
              partial = testPartial;
            }
          }
          currentLine = partial;
        } else {
          currentLine = word;
        }
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Generates a clean, perfectly aligned multi-page PDF document without mangled or overlapping text.
 */
export async function generateAgreementPdf(config: AgreementConfig): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(cleanPdfText(`${config.title} - ${config.contractId}`));
  pdfDoc.setAuthor(cleanPdfText(config.party1.name || 'DevHub Agreement Generator'));
  pdfDoc.setSubject(cleanPdfText(config.subtitle));

  const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontSig = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 45;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 50;

  const pages: any[] = [];
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let y = pageHeight - 45;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < bottomMargin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      y = pageHeight - 45;
    }
  };

  const writeWrappedText = (
    text: string,
    font: any,
    fontSize: number,
    color: any,
    lineHeight: number,
    indentX = 0,
    customMaxWidth?: number
  ) => {
    const maxWidth = customMaxWidth || contentWidth - indentX;
    const lines = wrapText(text, font, fontSize, maxWidth);

    for (const line of lines) {
      if (!line) {
        ensureSpace(lineHeight * 0.6);
        y -= lineHeight * 0.6;
        continue;
      }
      ensureSpace(lineHeight);
      currentPage.drawText(line, {
        x: marginX + indentX,
        y,
        size: fontSize,
        font,
        color,
      });
      y -= lineHeight;
    }
  };

  // 1. Top Banner (Page 1)
  currentPage.drawRectangle({
    x: marginX,
    y: y - 36,
    width: contentWidth,
    height: 40,
    color: rgb(0.09, 0.13, 0.22),
  });
  currentPage.drawText(cleanPdfText(config.title), {
    x: marginX + 14,
    y: y - 16,
    size: 11.5,
    font: fontTitle,
    color: rgb(1, 1, 1),
  });
  currentPage.drawText(cleanPdfText(config.subtitle), {
    x: marginX + 14,
    y: y - 28,
    size: 8,
    font: fontBody,
    color: rgb(0.72, 0.82, 0.96),
  });
  currentPage.drawText(`ID: ${cleanPdfText(config.contractId)}`, {
    x: pageWidth - marginX - 115,
    y: y - 22,
    size: 8,
    font: fontMono,
    color: rgb(0.65, 0.78, 0.95),
  });

  y -= 48;

  // 2. Metadata Grid Box (Page 1)
  const metaBoxHeight = 54;
  currentPage.drawRectangle({
    x: marginX,
    y: y - metaBoxHeight,
    width: contentWidth,
    height: metaBoxHeight,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.94),
    borderWidth: 1,
  });

  currentPage.drawText(`Effective Date: ${cleanPdfText(config.effectiveDate)}`, {
    x: marginX + 12,
    y: y - 14,
    size: 8,
    font: fontTitle,
    color: rgb(0.2, 0.25, 0.35),
  });
  currentPage.drawText(`Contract ID: ${cleanPdfText(config.contractId)}`, {
    x: marginX + 270,
    y: y - 14,
    size: 8,
    font: fontMono,
    color: rgb(0.2, 0.25, 0.35),
  });

  const colW = (contentWidth - 28) / 2;
  const p1StrLines = wrapText(cleanPdfText(`${config.party1Role}: ${config.party1.name} (${config.party1.entityType || 'Entity'})`), fontBody, 7.5, colW);
  const p2StrLines = wrapText(cleanPdfText(`${config.party2Role}: ${config.party2.name} (${config.party2.entityType || 'Entity'})`), fontBody, 7.5, colW);
  const p1RepLines = wrapText(cleanPdfText(`Signatory: ${config.party1.representativeName || config.party1.name} (${config.party1.representativeTitle || 'Rep'})`), fontBody, 7.5, colW);
  const p2TaxLines = wrapText(cleanPdfText(`Tax/Reg ID: ${config.party2.taxId || 'N/A'}`), fontBody, 7.5, colW);

  currentPage.drawText(p1StrLines[0] || '', {
    x: marginX + 12,
    y: y - 28,
    size: 7.5,
    font: fontBody,
    color: rgb(0.3, 0.35, 0.45),
  });
  currentPage.drawText(p2StrLines[0] || '', {
    x: marginX + 270,
    y: y - 28,
    size: 7.5,
    font: fontBody,
    color: rgb(0.3, 0.35, 0.45),
  });

  currentPage.drawText(p1RepLines[0] || '', {
    x: marginX + 12,
    y: y - 42,
    size: 7.5,
    font: fontBody,
    color: rgb(0.4, 0.45, 0.55),
  });
  currentPage.drawText(p2TaxLines[0] || '', {
    x: marginX + 270,
    y: y - 42,
    size: 7.5,
    font: fontBody,
    color: rgb(0.4, 0.45, 0.55),
  });

  y -= metaBoxHeight + 14;

  // 3. Preamble Paragraph
  const p1Address = [config.party1.addressStreet, config.party1.addressCity, config.party1.addressState].filter(Boolean).join(', ');
  const p2Address = [config.party2.addressStreet, config.party2.addressCity, config.party2.addressState].filter(Boolean).join(', ');
  const preamble = `This ${config.title} (the "Agreement") is made effective as of ${config.effectiveDate}, by and between ${config.party1.name} ("${config.party1Role}"), located at ${p1Address || '[Address 1]'}, and ${config.party2.name} ("${config.party2Role}"), located at ${p2Address || '[Address 2]'}. The ${config.party1Role} and ${config.party2Role} may collectively be referred to as "Parties" or individually as "Party."`;

  writeWrappedText(preamble, fontBody, 8, rgb(0.25, 0.3, 0.4), 10.5);
  y -= 8;

  // 4. Render Active Clauses
  const activeClauses = config.clauses.filter((c) => c.enabled);

  for (const clause of activeClauses) {
    ensureSpace(28);

    // Section Heading
    currentPage.drawText(`${clause.sectionNumber}. ${cleanPdfText(clause.title)}`, {
      x: marginX,
      y,
      size: 9.5,
      font: fontTitle,
      color: rgb(0.12, 0.18, 0.32),
    });
    y -= 13;

    for (const sub of clause.subClauses) {
      const rawText = interpolatePlaceholders(sub.content, config);
      const cleanContent = cleanPdfText(rawText);

      // Callout box styling
      if (sub.isCallout) {
        const calloutLines = wrapText(cleanContent, fontItalic, 7.5, contentWidth - 20);
        const boxH = 16 + calloutLines.length * 9.5 + 8;
        ensureSpace(boxH + 6);

        currentPage.drawRectangle({
          x: marginX,
          y: y - boxH,
          width: contentWidth,
          height: boxH,
          color: rgb(0.95, 0.97, 1),
          borderColor: rgb(0.35, 0.55, 0.85),
          borderWidth: 1,
        });

        currentPage.drawText(cleanPdfText(sub.calloutTitle || 'COMPLIANCE MANDATE'), {
          x: marginX + 10,
          y: y - 11,
          size: 7.5,
          font: fontTitle,
          color: rgb(0.15, 0.35, 0.7),
        });

        let lineY = y - 22;
        for (const cLine of calloutLines) {
          currentPage.drawText(cLine, {
            x: marginX + 10,
            y: lineY,
            size: 7.5,
            font: fontItalic,
            color: rgb(0.25, 0.3, 0.4),
          });
          lineY -= 9.5;
        }

        y -= boxH + 8;
        continue;
      }

      // Regular Subclause
      if (sub.subNumber && sub.title) {
        const fullSub = `${sub.subNumber} ${sub.title}: ${cleanContent}`;
        writeWrappedText(fullSub, fontBody, 8, rgb(0.25, 0.3, 0.4), 10.5, 6);
        y -= 4;
      } else {
        writeWrappedText(cleanContent, fontBody, 8, rgb(0.25, 0.3, 0.4), 10.5, 6);
        y -= 4;
      }

      // Milestone Payment Table if Section 2.2 and milestones exist
      if (clause.sectionNumber === '2' && sub.subNumber === '2.2' && config.milestones.length > 0) {
        ensureSpace(24 + config.milestones.length * 16 + 10);

        // Header
        currentPage.drawRectangle({
          x: marginX,
          y: y - 14,
          width: contentWidth,
          height: 15,
          color: rgb(0.9, 0.93, 0.97),
        });
        currentPage.drawText('Milestone Deliverables / Acceptance Criteria', {
          x: marginX + 8,
          y: y - 10,
          size: 7.5,
          font: fontTitle,
          color: rgb(0.15, 0.2, 0.35),
        });
        currentPage.drawText('Payout (% / $)', {
          x: marginX + 320,
          y: y - 10,
          size: 7.5,
          font: fontTitle,
          color: rgb(0.15, 0.2, 0.35),
        });
        currentPage.drawText('Target Date', {
          x: marginX + 430,
          y: y - 10,
          size: 7.5,
          font: fontTitle,
          color: rgb(0.15, 0.2, 0.35),
        });
        y -= 15;

        const sym = config.paymentTerms.currency.symbol || '$';
        for (let mIdx = 0; mIdx < config.milestones.length; mIdx++) {
          const m = config.milestones[mIdx];
          if (mIdx % 2 === 1) {
            currentPage.drawRectangle({
              x: marginX,
              y: y - 14,
              width: contentWidth,
              height: 15,
              color: rgb(0.97, 0.98, 1),
            });
          }
          const shortDeliv = cleanPdfText(m.deliverables.length > 58 ? m.deliverables.substring(0, 56) + '...' : m.deliverables);
          currentPage.drawText(`${cleanPdfText(m.name)}: ${shortDeliv}`, {
            x: marginX + 8,
            y: y - 10,
            size: 7,
            font: fontBody,
            color: rgb(0.2, 0.25, 0.35),
          });
          currentPage.drawText(`${m.percentage}% (${sym}${m.amount.toLocaleString()})`, {
            x: marginX + 320,
            y: y - 10,
            size: 7,
            font: fontMono,
            color: rgb(0.15, 0.3, 0.6),
          });
          currentPage.drawText(cleanPdfText(m.targetDate || 'N/A'), {
            x: marginX + 430,
            y: y - 10,
            size: 7,
            font: fontMono,
            color: rgb(0.4, 0.45, 0.55),
          });
          y -= 15;
        }
        y -= 8;
      }
    }
    y -= 4;
  }

  // 5. Signatures & Execution Section
  y -= 4;
  const boxW = (contentWidth - 16) / 2;
  const textMaxW = boxW - 20;

  const p1Header = `FOR ${config.party1Role.toUpperCase()}: ${config.party1.name}`;
  const p2Header = `FOR ${config.party2Role.toUpperCase()}: ${config.party2.name}`;
  const p1Print = `Printed Name: ${config.party1.representativeName || config.party1.name}`;
  const p2Print = `Printed Name: ${config.party2.representativeName || config.party2.name}`;
  const p1Title = `Title: ${config.party1.representativeTitle || 'Authorized Signatory'}`;
  const p2Title = `Title: ${config.party2.representativeTitle || 'Authorized Signatory'}`;
  const p1Date = `Date: ${config.party1.signature.date || '___________________'}`;
  const p2Date = `Date: ${config.party2.signature.date || '___________________'}`;

  const p1HeaderLines = wrapText(cleanPdfText(p1Header), fontTitle, 7.5, textMaxW);
  const p2HeaderLines = wrapText(cleanPdfText(p2Header), fontTitle, 7.5, textMaxW);
  const p1PrintLines = wrapText(cleanPdfText(p1Print), fontBody, 7.5, textMaxW);
  const p2PrintLines = wrapText(cleanPdfText(p2Print), fontBody, 7.5, textMaxW);
  const p1TitleLines = wrapText(cleanPdfText(p1Title), fontBody, 7.5, textMaxW);
  const p2TitleLines = wrapText(cleanPdfText(p2Title), fontBody, 7.5, textMaxW);
  const p1DateLines = wrapText(cleanPdfText(p1Date), fontMono, 7.5, textMaxW);
  const p2DateLines = wrapText(cleanPdfText(p2Date), fontMono, 7.5, textMaxW);

  const p1NeededH = 14 + p1HeaderLines.length * 9.5 + 26 + p1PrintLines.length * 9.5 + p1TitleLines.length * 9.5 + p1DateLines.length * 9.5 + 8;
  const p2NeededH = 14 + p2HeaderLines.length * 9.5 + 26 + p2PrintLines.length * 9.5 + p2TitleLines.length * 9.5 + p2DateLines.length * 9.5 + 8;
  const boxHeight = Math.max(92, p1NeededH, p2NeededH);

  ensureSpace(boxHeight + 36);

  currentPage.drawText('IN WITNESS WHEREOF, the Parties hereto have executed this Agreement.', {
    x: marginX,
    y,
    size: 8,
    font: fontItalic,
    color: rgb(0.2, 0.25, 0.35),
  });
  y -= 16;

  // Party 1 Box
  currentPage.drawRectangle({
    x: marginX,
    y: y - boxHeight,
    width: boxW,
    height: boxHeight,
    color: rgb(0.98, 0.98, 1),
    borderColor: rgb(0.85, 0.88, 0.95),
    borderWidth: 1,
  });

  let p1CurY = y - 13;
  for (const hLine of p1HeaderLines) {
    currentPage.drawText(hLine, {
      x: marginX + 10,
      y: p1CurY,
      size: 7.5,
      font: fontTitle,
      color: rgb(0.1, 0.15, 0.3),
    });
    p1CurY -= 9.5;
  }
  p1CurY -= 2;

  const p1HasSig =
    config.party1.signature.type !== 'blank' &&
    (config.party1.signature.typedName || config.party1.signature.dataUrl);

  if (p1HasSig && config.party1.signature.type === 'typed') {
    const sigLines = wrapText(`Signed: ${cleanPdfText(config.party1.signature.typedName || config.party1.representativeName)}`, fontSig, 9.5, textMaxW);
    currentPage.drawText(sigLines[0] || '', {
      x: marginX + 10,
      y: p1CurY - 10,
      size: 9.5,
      font: fontSig,
      color: rgb(0.1, 0.25, 0.6),
    });
  } else if (p1HasSig && config.party1.signature.dataUrl) {
    try {
      const dataUrl = config.party1.signature.dataUrl;
      const base64Data = dataUrl.split(',')[1] || dataUrl;
      const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      let img;
      if (dataUrl.includes('image/png') || dataUrl.startsWith('data:image/png')) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        img = await pdfDoc.embedJpg(imgBytes);
      }
      if (img) {
        const dims = img.scaleToFit(boxW - 30, 20);
        currentPage.drawImage(img, {
          x: marginX + 10,
          y: p1CurY - 16,
          width: dims.width,
          height: dims.height,
        });
      }
    } catch {
      currentPage.drawText('Authorized Signature:', {
        x: marginX + 10,
        y: p1CurY - 10,
        size: 7,
        font: fontItalic,
        color: rgb(0.45, 0.5, 0.6),
      });
    }
  } else {
    currentPage.drawText('Authorized Signature:', {
      x: marginX + 10,
      y: p1CurY - 10,
      size: 7,
      font: fontItalic,
      color: rgb(0.45, 0.5, 0.6),
    });
  }

  currentPage.drawLine({
    start: { x: marginX + 10, y: p1CurY - 16 },
    end: { x: marginX + boxW - 10, y: p1CurY - 16 },
    thickness: 0.5,
    color: rgb(0.7, 0.75, 0.85),
  });

  p1CurY -= 26;

  for (const pLine of p1PrintLines) {
    currentPage.drawText(pLine, {
      x: marginX + 10,
      y: p1CurY,
      size: 7.5,
      font: fontBody,
      color: rgb(0.3, 0.35, 0.45),
    });
    p1CurY -= 9.5;
  }

  for (const tLine of p1TitleLines) {
    currentPage.drawText(tLine, {
      x: marginX + 10,
      y: p1CurY,
      size: 7.5,
      font: fontBody,
      color: rgb(0.3, 0.35, 0.45),
    });
    p1CurY -= 9.5;
  }

  for (const dLine of p1DateLines) {
    currentPage.drawText(dLine, {
      x: marginX + 10,
      y: p1CurY,
      size: 7.5,
      font: fontMono,
      color: rgb(0.4, 0.45, 0.55),
    });
    p1CurY -= 9.5;
  }

  // Party 2 Box
  const p2X = marginX + boxW + 16;
  currentPage.drawRectangle({
    x: p2X,
    y: y - boxHeight,
    width: boxW,
    height: boxHeight,
    color: rgb(0.98, 0.98, 1),
    borderColor: rgb(0.85, 0.88, 0.95),
    borderWidth: 1,
  });

  let p2CurY = y - 13;
  for (const hLine of p2HeaderLines) {
    currentPage.drawText(hLine, {
      x: p2X + 10,
      y: p2CurY,
      size: 7.5,
      font: fontTitle,
      color: rgb(0.1, 0.15, 0.3),
    });
    p2CurY -= 9.5;
  }
  p2CurY -= 2;

  const p2HasSig =
    config.party2.signature.type !== 'blank' &&
    (config.party2.signature.typedName || config.party2.signature.dataUrl);

  if (p2HasSig && config.party2.signature.type === 'typed') {
    const sigLines = wrapText(`Signed: ${cleanPdfText(config.party2.signature.typedName || config.party2.representativeName)}`, fontSig, 9.5, textMaxW);
    currentPage.drawText(sigLines[0] || '', {
      x: p2X + 10,
      y: p2CurY - 10,
      size: 9.5,
      font: fontSig,
      color: rgb(0.1, 0.25, 0.6),
    });
  } else if (p2HasSig && config.party2.signature.dataUrl) {
    try {
      const dataUrl = config.party2.signature.dataUrl;
      const base64Data = dataUrl.split(',')[1] || dataUrl;
      const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      let img;
      if (dataUrl.includes('image/png') || dataUrl.startsWith('data:image/png')) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        img = await pdfDoc.embedJpg(imgBytes);
      }
      if (img) {
        const dims = img.scaleToFit(boxW - 30, 20);
        currentPage.drawImage(img, {
          x: p2X + 10,
          y: p2CurY - 16,
          width: dims.width,
          height: dims.height,
        });
      }
    } catch {
      currentPage.drawText('Authorized Signature:', {
        x: p2X + 10,
        y: p2CurY - 10,
        size: 7,
        font: fontItalic,
        color: rgb(0.45, 0.5, 0.6),
      });
    }
  } else {
    currentPage.drawText('Authorized Signature:', {
      x: p2X + 10,
      y: p2CurY - 10,
      size: 7,
      font: fontItalic,
      color: rgb(0.45, 0.5, 0.6),
    });
  }

  currentPage.drawLine({
    start: { x: p2X + 10, y: p2CurY - 16 },
    end: { x: p2X + boxW - 10, y: p2CurY - 16 },
    thickness: 0.5,
    color: rgb(0.7, 0.75, 0.85),
  });

  p2CurY -= 26;

  for (const pLine of p2PrintLines) {
    currentPage.drawText(pLine, {
      x: p2X + 10,
      y: p2CurY,
      size: 7.5,
      font: fontBody,
      color: rgb(0.3, 0.35, 0.45),
    });
    p2CurY -= 9.5;
  }

  for (const tLine of p2TitleLines) {
    currentPage.drawText(tLine, {
      x: p2X + 10,
      y: p2CurY,
      size: 7.5,
      font: fontBody,
      color: rgb(0.3, 0.35, 0.45),
    });
    p2CurY -= 9.5;
  }

  for (const dLine of p2DateLines) {
    currentPage.drawText(dLine, {
      x: p2X + 10,
      y: p2CurY,
      size: 7.5,
      font: fontMono,
      color: rgb(0.4, 0.45, 0.55),
    });
    p2CurY -= 9.5;
  }

  y -= boxHeight + 14;

  // 6. Witness Block if enabled
  if (config.includeWitnessBlock) {
    ensureSpace(60);
    currentPage.drawText('WITNESS / NOTARIZATION ATTESTATION', {
      x: marginX,
      y,
      size: 8.5,
      font: fontTitle,
      color: rgb(0.15, 0.2, 0.35),
    });
    y -= 14;
    currentPage.drawText(`Witness Name: ${cleanPdfText(config.witnessName || '_______________________')}     Date: ${cleanPdfText(config.witnessDate || '_______________________')}`, {
      x: marginX,
      y,
      size: 7.5,
      font: fontBody,
      color: rgb(0.3, 0.35, 0.45),
    });
    y -= 14;
    currentPage.drawText('Witness Signature: _______________________', {
      x: marginX,
      y,
      size: 7.5,
      font: fontBody,
      color: rgb(0.3, 0.35, 0.45),
    });
    y -= 16;
  }

  // 7. Schedule A if enabled
  if (config.includeScheduleA && config.scheduleAContent) {
    ensureSpace(70);
    currentPage.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.92),
    });
    y -= 14;

    currentPage.drawText(cleanPdfText(config.scheduleATitle || 'Schedule A: Scope of Work'), {
      x: marginX,
      y,
      size: 9.5,
      font: fontTitle,
      color: rgb(0.12, 0.18, 0.32),
    });
    y -= 14;

    writeWrappedText(cleanPdfText(config.scheduleAContent), fontBody, 8, rgb(0.25, 0.3, 0.4), 10.5);
  }

  // 8. Final Header & Footer Pass on all generated pages
  const totalPages = pages.length;
  for (let idx = 0; idx < totalPages; idx++) {
    const page = pages[idx];
    const pageNumber = idx + 1;

    // Continuation Header on Pages 2..N
    if (pageNumber > 1) {
      page.drawText(`${cleanPdfText(config.title)} | Contract ID: ${cleanPdfText(config.contractId)}`, {
        x: marginX,
        y: pageHeight - 25,
        size: 7,
        font: fontMono,
        color: rgb(0.5, 0.55, 0.65),
      });
      page.drawLine({
        start: { x: marginX, y: pageHeight - 30 },
        end: { x: pageWidth - marginX, y: pageHeight - 30 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.94),
      });
    }

    // Standardized Clean Footer on all pages
    page.drawLine({
      start: { x: marginX, y: 36 },
      end: { x: pageWidth - marginX, y: 36 },
      thickness: 0.75,
      color: rgb(0.82, 0.85, 0.9),
    });

    const classificationText = `${cleanPdfText(config.classification || 'CONFIDENTIAL')} - CONTRACT ID: ${cleanPdfText(config.contractId)}`;
    page.drawText(classificationText, {
      x: marginX,
      y: 24,
      size: 7,
      font: fontMono,
      color: rgb(0.5, 0.55, 0.65),
    });

    page.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: pageWidth - marginX - 60,
      y: 24,
      size: 7.5,
      font: fontMono,
      color: rgb(0.5, 0.55, 0.65),
    });
  }

  return await pdfDoc.save();
}

/**
 * Generates formatted Microsoft Word (.docx) document.
 */
export async function generateAgreementDocx(config: AgreementConfig): Promise<Blob> {
  const docParagraphs: any[] = [];

  // Title
  docParagraphs.push(
    new Paragraph({
      text: config.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );

  // Subtitle
  docParagraphs.push(
    new Paragraph({
      text: config.subtitle,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Preamble
  const p1Address = [config.party1.addressStreet, config.party1.addressCity, config.party1.addressState].filter(Boolean).join(', ');
  const p2Address = [config.party2.addressStreet, config.party2.addressCity, config.party2.addressState].filter(Boolean).join(', ');
  const intro = `This ${config.title} (the "Agreement") is entered into and made effective as of ${config.effectiveDate}, by and between ${config.party1.name} ("${config.party1Role}"), having its principal place of business at ${p1Address}, and ${config.party2.name} ("${config.party2Role}"), located at ${p2Address}.`;

  docParagraphs.push(
    new Paragraph({
      children: [new TextRun({ text: intro, size: 22 })],
      spacing: { after: 240 },
    })
  );

  // Clauses
  const activeClauses = config.clauses.filter((c) => c.enabled);
  for (const clause of activeClauses) {
    docParagraphs.push(
      new Paragraph({
        text: `${clause.sectionNumber}. ${clause.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      })
    );

    for (const sub of clause.subClauses) {
      const text = interpolatePlaceholders(sub.content, config);
      if (sub.subNumber && sub.title) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${sub.subNumber} ${sub.title}: `, bold: true, size: 21 }),
              new TextRun({ text, size: 21 }),
            ],
            spacing: { after: 140 },
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text, size: 21, italics: sub.isCallout })],
            spacing: { after: 140 },
          })
        );
      }
    }
  }

  // Signatures
  docParagraphs.push(
    new Paragraph({
      text: 'IN WITNESS WHEREOF, the Parties hereto have executed this Agreement.',
      spacing: { before: 300, after: 200 },
    })
  );

  const p1SigText =
    config.party1.signature.type !== 'blank' && config.party1.signature.typedName
      ? config.party1.signature.typedName
      : '_______________________';
  const p2SigText =
    config.party2.signature.type !== 'blank' && config.party2.signature.typedName
      ? config.party2.signature.typedName
      : '_______________________';

  docParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `FOR ${config.party1Role.toUpperCase()}: ${config.party1.name}\n`, bold: true, size: 21 }),
        new TextRun({ text: `Authorized Signature: ${p1SigText}\n`, size: 21 }),
        new TextRun({ text: `Printed Name: ${config.party1.representativeName || config.party1.name}\n`, size: 21 }),
        new TextRun({ text: `Title: ${config.party1.representativeTitle || 'Authorized Signatory'}\n`, size: 21 }),
        new TextRun({ text: `Date: ${config.party1.signature.date || '_______________________'}\n\n`, size: 21 }),
        new TextRun({ text: `FOR ${config.party2Role.toUpperCase()}: ${config.party2.name}\n`, bold: true, size: 21 }),
        new TextRun({ text: `Authorized Signature: ${p2SigText}\n`, size: 21 }),
        new TextRun({ text: `Printed Name: ${config.party2.representativeName || config.party2.name}\n`, size: 21 }),
        new TextRun({ text: `Title: ${config.party2.representativeTitle || 'Authorized Signatory'}\n`, size: 21 }),
        new TextRun({ text: `Date: ${config.party2.signature.date || '_______________________'}`, size: 21 }),
      ],
      spacing: { after: 200 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates a styled HTML document for printing or embedding.
 */
export function generateAgreementHtml(config: AgreementConfig): string {
  const md = generateAgreementMarkdown(config);
  const sym = config.paymentTerms.currency.symbol;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${config.title} - ${config.contractId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 850px; margin: 40px auto; padding: 0 24px; }
    h1, h2, h3 { color: #0f172a; }
    h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    blockquote { border-left: 4px solid #3b82f6; background: #eff6ff; padding: 10px 16px; margin: 16px 0; font-style: italic; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
    .sig-box { border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; background: #f8fafc; }
    .font-sig { font-family: "Brush Script MT", cursive, Georgia, serif; font-size: 22px; color: #1d4ed8; margin: 10px 0; }
    @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 24px;">
    <h1>${config.title}</h1>
    <p style="font-size: 16px; color: #64748b;">${config.subtitle}</p>
    <p style="font-family: monospace; font-size: 13px; color: #475569;">Contract ID: ${config.contractId} | Effective Date: ${config.effectiveDate}</p>
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 14px;">
    <strong>${config.party1Role} (${config.party1.entityType}):</strong> ${config.party1.name} (Rep: ${config.party1.representativeName})<br/>
    <strong>${config.party2Role} (${config.party2.entityType}):</strong> ${config.party2.name} (Tax ID: ${config.party2.taxId || 'N/A'})
  </div>

  <div class="content">
    ${md
      .split('\n\n')
      .map((block) => {
        if (block.startsWith('## ')) return `<h2>${block.replace('## ', '')}</h2>`;
        if (block.startsWith('### ')) return `<h3>${block.replace('### ', '')}</h3>`;
        if (block.startsWith('> ')) return `<blockquote>${block.replace('> ', '')}</blockquote>`;
        return `<p>${block}</p>`;
      })
      .join('')}
  </div>

  <div class="sig-grid">
    <div class="sig-box">
      <strong>FOR ${config.party1Role.toUpperCase()}: ${config.party1.name}</strong><br/>
      ${
        config.party1.signature.type !== 'blank' && config.party1.signature.typedName
          ? `<div class="font-sig">${config.party1.signature.typedName}</div>`
          : `<div style="border-bottom: 1.5px solid #94a3b8; height: 32px; margin: 12px 0 6px 0;"></div><span style="font-size: 11px; color: #64748b;">(Authorized Signature Line)</span>`
      }
      <p style="margin: 4px 0; font-size: 13px;"><strong>Printed Name:</strong> ${config.party1.representativeName || config.party1.name}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Title:</strong> ${config.party1.representativeTitle || 'Authorized Signatory'}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${config.party1.signature.date || '_______________________'}</p>
    </div>
    <div class="sig-box">
      <strong>FOR ${config.party2Role.toUpperCase()}: ${config.party2.name}</strong><br/>
      ${
        config.party2.signature.type !== 'blank' && config.party2.signature.typedName
          ? `<div class="font-sig">${config.party2.signature.typedName}</div>`
          : `<div style="border-bottom: 1.5px solid #94a3b8; height: 32px; margin: 12px 0 6px 0;"></div><span style="font-size: 11px; color: #64748b;">(Authorized Signature Line)</span>`
      }
      <p style="margin: 4px 0; font-size: 13px;"><strong>Printed Name:</strong> ${config.party2.representativeName || config.party2.name}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Title:</strong> ${config.party2.representativeTitle || 'Authorized Signatory'}</p>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${config.party2.signature.date || '_______________________'}</p>
    </div>
  </div>
</body>
</html>`;
}
