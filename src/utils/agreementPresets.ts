import { AgreementConfig, getDefaultContractorAgreement } from './agreementGenerator';
import { POPULAR_CURRENCIES } from './invoiceGenerator';

export interface AgreementPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  config: AgreementConfig;
}

export function getAgreementPresets(): AgreementPreset[] {
  const defaultContractor = getDefaultContractorAgreement();
  const usd = POPULAR_CURRENCIES.find((c) => c.code === 'USD') || POPULAR_CURRENCIES[0];
  const eur = POPULAR_CURRENCIES.find((c) => c.code === 'EUR') || usd;
  const gbp = POPULAR_CURRENCIES.find((c) => c.code === 'GBP') || usd;

  // Preset 2: Mutual NDA
  const ndaConfig: AgreementConfig = {
    id: 'preset-nda',
    title: 'MUTUAL NON-DISCLOSURE AGREEMENT',
    subtitle: 'Confidentiality & Proprietary Information Protection',
    contractId: 'NDA-2026-MUT-042',
    effectiveDate: '2026-10-24',
    expirationDate: '2028-10-24',
    classification: 'STRICTLY CONFIDENTIAL & PROPRIETARY',
    party1Role: 'Disclosing / Receiving Party 1',
    party2Role: 'Disclosing / Receiving Party 2',
    party1: {
      entityType: 'company',
      name: 'Venture Core Technologies Inc.',
      entityStructure: 'Delaware Corporation',
      representativeName: 'Elena Rostova',
      representativeTitle: 'Chief Strategy Officer',
      taxIdType: 'EIN / Tax ID (US)',
      taxId: '12-3456789',
      email: 'legal@venturecore.tech',
      phone: '+1 (415) 555-0188',
      addressStreet: '500 Howard Street, Suite 400',
      addressCity: 'San Francisco',
      addressState: 'CA',
      addressZip: '94105',
      addressCountry: 'United States',
      customFields: [],
      signature: {
        type: 'typed',
        typedName: 'Elena Rostova',
        fontStyle: 'calligraphy',
        date: '2026-10-24',
        location: 'San Francisco, CA',
      },
    },
    party2: {
      entityType: 'individual',
      name: 'David K. Vance',
      entityStructure: 'Individual Advisor / Researcher',
      representativeName: 'David K. Vance',
      representativeTitle: 'AI Research Consultant',
      taxIdType: 'SSN (US Individual)',
      taxId: 'XXX-XX-8921',
      email: 'david@vance-research.com',
      phone: '+1 (650) 555-0144',
      addressStreet: '742 Evergreen Terrace',
      addressCity: 'Palo Alto',
      addressState: 'CA',
      addressZip: '94301',
      addressCountry: 'United States',
      customFields: [],
      signature: {
        type: 'typed',
        typedName: 'David K. Vance',
        fontStyle: 'calligraphy',
        date: '2026-10-24',
        location: 'Palo Alto, CA',
      },
    },
    paymentTerms: {
      paymentModel: 'fixed_lump_sum',
      totalAmount: 0,
      currency: usd,
      netDays: 0,
      warrantyDays: 0,
      lateFeePercent: 0,
    },
    milestones: [],
    clauses: [
      {
        id: 'nda-c1',
        sectionNumber: '1',
        title: 'PURPOSE & SCOPE',
        enabled: true,
        subClauses: [
          {
            id: 'nda-sc1',
            subNumber: '1.1',
            title: 'Evaluation Purpose',
            content:
              'The Parties wish to explore potential business, commercial, and technical opportunities (the "Purpose") and, in connection therewith, may disclose confidential and proprietary information to one another.',
          },
        ],
      },
      {
        id: 'nda-c2',
        sectionNumber: '2',
        title: 'DEFINITION OF CONFIDENTIAL INFORMATION',
        enabled: true,
        subClauses: [
          {
            id: 'nda-sc2',
            subNumber: '2.1',
            title: 'Scope of Protection',
            content:
              '"Confidential Information" encompasses all proprietary data, software code, algorithms, roadmap specifications, customer data, and business forecasts disclosed by either Party, whether orally or in written or electronic form.',
          },
          {
            id: 'nda-sc2_2',
            subNumber: '2.2',
            title: 'Exclusions',
            content:
              'Confidential Information does not include information that: (a) is or becomes publicly known through no breach; (b) was already known to the receiving Party prior to disclosure; or (c) is independently developed without reference to the disclosed information.',
          },
        ],
      },
      {
        id: 'nda-c3',
        sectionNumber: '3',
        title: 'NON-DISCLOSURE & RESTRICTION ON USE',
        enabled: true,
        subClauses: [
          {
            id: 'nda-sc3',
            subNumber: '3.1',
            title: 'Standard of Care',
            content:
              'Each Party agrees to protect the Confidential Information of the other Party with the same degree of care it uses for its own confidential data, but in no event less than reasonable care. Neither Party shall disclose Confidential Information to third parties without prior written consent.',
          },
        ],
      },
      {
        id: 'nda-c4',
        sectionNumber: '4',
        title: 'TERM & RETURN OF MATERIALS',
        enabled: true,
        subClauses: [
          {
            id: 'nda-sc4',
            subNumber: '4.1',
            title: 'Confidentiality Period',
            content:
              'The confidentiality obligations herein shall remain in effect for a period of three (3) years from the Effective Date, with trade secrets protected indefinitely.',
          },
        ],
      },
      {
        id: 'nda-c5',
        sectionNumber: '5',
        title: 'GOVERNING LAW & JURISDICTION',
        enabled: true,
        subClauses: [
          {
            id: 'nda-sc5',
            subNumber: '5.1',
            title: '',
            content:
              'This Agreement shall be construed in accordance with the laws of {{JURISDICTION}}. Any dispute shall be resolved in the courts located in {{CITY}}.',
          },
        ],
      },
    ],
    governingJurisdiction: 'State of California, United States',
    governingCity: 'San Francisco, CA',
    disputeResolutionMethod: 'courts',
    includeScheduleA: false,
    scheduleATitle: '',
    scheduleAContent: '',
    includeFrontmatter: true,
    includePageDividers: true,
    includeWitnessBlock: false,
  };

  // Preset 3: Freelance UI/UX Design & Brand Asset Agreement
  const designConfig: AgreementConfig = {
    ...defaultContractor,
    id: 'preset-design',
    title: 'FREELANCE DESIGN & CREATIVE ASSETS AGREEMENT',
    subtitle: 'Brand Identity, UI/UX Design & Design System Deliverables',
    contractId: 'DES-2026-CR8',
    party1Role: 'Client',
    party2Role: 'Designer',
    party2: {
      entityType: 'individual',
      name: 'Maya Lin',
      tradeName: 'Studio Maya Visuals',
      entityStructure: 'Sole Proprietorship / Freelance Designer',
      representativeName: 'Maya Lin',
      representativeTitle: 'Lead Product Designer',
      taxIdType: 'SSN (US Individual)',
      taxId: 'XXX-XX-4910',
      email: 'maya@studiomaya.design',
      phone: '+1 (206) 555-0177',
      addressStreet: '1201 3rd Ave, Suite 2200',
      addressCity: 'Seattle',
      addressState: 'WA',
      addressZip: '98101',
      addressCountry: 'United States',
      customFields: [],
      signature: {
        type: 'typed',
        typedName: 'Maya Lin',
        fontStyle: 'calligraphy',
        date: '2026-10-24',
        location: 'Seattle, WA',
      },
    },
    paymentTerms: {
      paymentModel: 'milestones',
      totalAmount: 12500,
      currency: usd,
      netDays: 7,
      warrantyDays: 14,
      lateFeePercent: 2.0,
    },
    milestones: [
      {
        id: 'dm1',
        name: 'Phase 1: Brand & Discovery',
        deliverables: 'Brand style tiles, typography scale, color tokens, visual moodboard.',
        percentage: 30,
        amount: 3750,
        targetDate: '2026-11-10',
        status: 'completed',
      },
      {
        id: 'dm2',
        name: 'Phase 2: High-Fidelity UI/UX',
        deliverables: 'Figma prototypes (30+ responsive desktop & mobile screens), interactive flows.',
        percentage: 45,
        amount: 5625,
        targetDate: '2026-12-01',
        status: 'in_progress',
      },
      {
        id: 'dm3',
        name: 'Phase 3: Design System & Handoff',
        deliverables: 'Complete component library with auto-layout, SVG asset export, developer handoff specs.',
        percentage: 25,
        amount: 3125,
        targetDate: '2026-12-18',
        status: 'pending',
      },
    ],
  };

  // Preset 4: Master Services Agreement (MSA)
  const msaConfig: AgreementConfig = {
    ...defaultContractor,
    id: 'preset-msa',
    title: 'MASTER SERVICES AGREEMENT',
    subtitle: 'Enterprise Cloud Infrastructure & Software Engineering Framework',
    contractId: 'MSA-ENT-2026-904',
    paymentTerms: {
      paymentModel: 'hourly_rate',
      totalAmount: 45000,
      currency: usd,
      netDays: 30,
      warrantyDays: 60,
      lateFeePercent: 1.5,
      hourlyRate: 150,
      estimatedHours: 300,
    },
  };

  return [
    {
      id: 'contractor-web-dev',
      name: 'Independent Contractor (Web Dev & Architecture)',
      category: 'Software & Development',
      description: 'Standard 3-page contractor agreement with milestone payments, IP assignment, bug warranties, and security mandates.',
      config: defaultContractor,
    },
    {
      id: 'mutual-nda',
      name: 'Mutual Non-Disclosure Agreement (M-NDA)',
      category: 'Confidentiality',
      description: 'Bilateral confidentiality agreement covering trade secrets, software code, roadmaps, and 3-year survival term.',
      config: ndaConfig,
    },
    {
      id: 'freelance-design',
      name: 'Freelance Design & UI/UX Agreement',
      category: 'Design & Creative',
      description: 'Creative deliverables agreement with asset licensing, Figma prototypes, design systems, and revision terms.',
      config: designConfig,
    },
    {
      id: 'master-services-msa',
      name: 'Master Services Agreement (MSA)',
      category: 'Enterprise & SOW',
      description: 'Enterprise framework agreement for ongoing cloud infrastructure and software engineering services.',
      config: msaConfig,
    },
  ];
}
