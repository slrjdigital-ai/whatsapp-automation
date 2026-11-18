import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { validateAndNormalizePhone, PhoneValidationResult } from './phone';

export type ConsentStatusType = 'OPTED_IN' | 'PENDING_VERIFICATION' | 'OPTED_OUT';

export interface RawParsedRow {
  fullName: string;
  mobileNumber: string;
  countryCode?: string;
  email?: string;
  marketingConsent?: string | boolean | number;
  consentSource?: string;
  consentDate?: string | number | Date;
  consentEvidence?: string;
  businessName?: string;
  category?: string;
  rowIndex: number;
}

export interface ValidatedContactRow {
  rowIndex: number;
  fullName: string;
  rawMobile: string;
  normalizedMobile: string;
  countryCode: string;
  nationalNumber: string;
  email: string;
  businessName: string;
  category: string;
  consentStatus: ConsentStatusType;
  consentSource: string;
  consentDate: Date | null;
  consentEvidence: string;
  isValidNumber: boolean;
  isDuplicateInBatch: boolean;
  isExistingInDb: boolean;
  isSuppressed: boolean;
  isEligibleForMarketing: boolean;
  validationError?: string;
  selected: boolean;
}

export interface FileParseSummary {
  fileName: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  eligibleOptedInCount: number;
  pendingVerificationCount: number;
  optedOutCount: number;
  suppressedCount: number;
  rows: ValidatedContactRow[];
}

/**
 * Robust consent value parser adhering strictly to WhatsApp compliance rules:
 * - Never automatically marks as OPTED_IN without affirmative consent evidence.
 * - Recognizes booleans, integers (1/0), and text keywords.
 */
export function parseConsentString(val: any): ConsentStatusType {
  if (val === undefined || val === null) return 'PENDING_VERIFICATION';

  // Handle boolean directly
  if (typeof val === 'boolean') {
    return val ? 'OPTED_IN' : 'OPTED_OUT';
  }

  // Handle number (1 = Yes, 0 = No)
  if (typeof val === 'number') {
    if (val === 1) return 'OPTED_IN';
    if (val === 0) return 'OPTED_OUT';
    return 'PENDING_VERIFICATION';
  }

  const str = String(val).trim().toUpperCase();
  if (!str) return 'PENDING_VERIFICATION';

  const optInKeywords = [
    'YES',
    'Y',
    'TRUE',
    '1',
    'OPTED_IN',
    'OPTED IN',
    'OPT-IN',
    'OPT IN',
    'CONSENTED',
    'AGREED',
    'CONFIRMED',
    'SUBSCRIBED',
    'APPROVED',
    'GRANTED',
    'ACCEPT',
    'ACCEPTED',
  ];

  const optOutKeywords = [
    'NO',
    'N',
    'FALSE',
    '0',
    'OPTED_OUT',
    'OPTED OUT',
    'OPT-OUT',
    'OPT OUT',
    'REVOKED',
    'DENIED',
    'STOP',
    'UNSUBSCRIBE',
    'UNSUBSCRIBED',
    'REJECTED',
    'CANCEL',
  ];

  if (optInKeywords.includes(str)) return 'OPTED_IN';
  if (optOutKeywords.includes(str)) return 'OPTED_OUT';

  // If any other text is provided (or unknown), default to PENDING_VERIFICATION
  return 'PENDING_VERIFICATION';
}

/**
 * Parse date values from Excel serial numbers, ISO strings, or localized text
 */
export function parseConsentDate(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // Handle Excel serial date numbers (e.g., 45365)
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    // Excel date epoch is 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) return date;
  }

  // Handle string dates
  const str = String(val).trim();
  if (!str) return null;

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Intelligent and prioritized column detection avoiding false collisions
 * (e.g. "Consent Source" or "Consent Date" must NEVER be mistaken for "Marketing Consent")
 */
function detectColumnKeys(row: Record<string, any>) {
  const keys = Object.keys(row);

  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findKeyExactOrPattern = (preferredPatterns: string[], secondaryPatterns: string[] = []) => {
    // 1. Try exact matches first
    for (const pat of preferredPatterns) {
      const match = keys.find((k) => clean(k) === pat);
      if (match) return match;
    }
    // 2. Try secondary substring matches
    for (const pat of secondaryPatterns) {
      const match = keys.find((k) => clean(k).includes(pat));
      if (match) return match;
    }
    return undefined;
  };

  // Specific detection for Marketing Consent column
  // (strictly excluding keys that contain 'source', 'date', 'time', 'proof', or 'evidence')
  const consentCandidateKeys = keys.filter((k) => {
    const c = clean(k);
    return !c.includes('source') && !c.includes('date') && !c.includes('time') && !c.includes('proof') && !c.includes('evidence');
  });

  const consentKey =
    consentCandidateKeys.find((k) => {
      const c = clean(k);
      return (
        c === 'marketingconsent' ||
        c === 'whatsappmarketingconsent' ||
        c === 'whatsappconsent' ||
        c === 'consentstatus' ||
        c === 'optinstatus' ||
        c === 'optinconsent' ||
        c === 'marketingoptin' ||
        c === 'consent' ||
        c === 'optin' ||
        c === 'permission'
      );
    }) ||
    consentCandidateKeys.find((k) => {
      const c = clean(k);
      return c.includes('consent') || c.includes('optin');
    });

  return {
    nameKey: findKeyExactOrPattern(
      ['fullname', 'name', 'contactname', 'customername', 'clientname', 'person'],
      ['fullname', 'name', 'customer', 'person', 'client']
    ),
    mobileKey: findKeyExactOrPattern(
      ['mobilenumber', 'mobile', 'phonenumber', 'phone', 'contactnumber', 'whatsappnumber', 'whatsapp'],
      ['mobile', 'phone', 'contact', 'whatsapp', 'tel']
    ),
    countryCodeKey: findKeyExactOrPattern(
      ['countrycode', 'dialcode', 'countrydialcode', 'isocode', 'country'],
      ['countrycode', 'dialcode']
    ),
    emailKey: findKeyExactOrPattern(
      ['email', 'emailaddress', 'mail'],
      ['email', 'mail']
    ),
    consentKey,
    consentSourceKey: findKeyExactOrPattern(
      ['consentsource', 'sourceofconsent', 'optinsource', 'consentsourceref'],
      ['source']
    ),
    consentDateKey: findKeyExactOrPattern(
      ['consentdate', 'dateofconsent', 'optindate', 'consenttimestamp', 'optintimestamp'],
      ['date', 'timestamp']
    ),
    consentEvidenceKey: findKeyExactOrPattern(
      ['consentevidence', 'evidence', 'proof', 'referencenumber', 'reference', 'formid', 'docref'],
      ['evidence', 'proof', 'ref']
    ),
    businessKey: findKeyExactOrPattern(
      ['businessname', 'companyname', 'business', 'company', 'organization', 'firm', 'agency'],
      ['business', 'company', 'agency']
    ),
    categoryKey: findKeyExactOrPattern(
      ['category', 'segment', 'industry', 'group', 'tag', 'type'],
      ['category', 'segment', 'industry']
    ),
  };
}

export function parseRawDataRows(rows: Record<string, any>[]): RawParsedRow[] {
  if (!rows || rows.length === 0) return [];

  const detected = detectColumnKeys(rows[0]);

  return rows.map((row, idx) => {
    const fullName = String(
      (detected.nameKey && row[detected.nameKey]) ||
      row['Full Name'] ||
      row['Name'] ||
      `Contact ${idx + 1}`
    ).trim();

    const mobileNumber = String(
      (detected.mobileKey && row[detected.mobileKey]) ||
      row['Mobile Number'] ||
      row['Mobile'] ||
      row['Phone Number'] ||
      row['Phone'] ||
      ''
    ).trim();

    const countryCode = detected.countryCodeKey ? String(row[detected.countryCodeKey] || '').trim() : undefined;
    const email = detected.emailKey ? String(row[detected.emailKey] || '').trim() : undefined;
    const businessName = detected.businessKey ? String(row[detected.businessKey] || '').trim() : undefined;
    const category = detected.categoryKey ? String(row[detected.categoryKey] || '').trim() : undefined;

    // Consent metadata
    const marketingConsent = detected.consentKey ? row[detected.consentKey] : undefined;
    const consentSource = detected.consentSourceKey ? String(row[detected.consentSourceKey] || '').trim() : undefined;
    const consentDate = detected.consentDateKey ? row[detected.consentDateKey] : undefined;
    const consentEvidence = detected.consentEvidenceKey ? String(row[detected.consentEvidenceKey] || '').trim() : undefined;

    return {
      rowIndex: idx + 1,
      fullName,
      mobileNumber,
      countryCode,
      email,
      marketingConsent,
      consentSource,
      consentDate,
      consentEvidence,
      businessName,
      category,
    };
  });
}

export async function processAndValidateRows(
  rawRows: RawParsedRow[],
  fileName: string,
  existingDbNumbers: Set<string>,
  suppressedNumbers: Set<string>
): Promise<FileParseSummary> {
  const seenBatchNumbers = new Set<string>();
  const validatedRows: ValidatedContactRow[] = [];

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let eligibleOptedInCount = 0;
  let pendingVerificationCount = 0;
  let optedOutCount = 0;
  let suppressedCount = 0;

  for (const raw of rawRows) {
    const phoneResult: PhoneValidationResult = validateAndNormalizePhone(raw.mobileNumber, (raw.countryCode as any) || 'IN');
    const consentStatus: ConsentStatusType = parseConsentString(raw.marketingConsent);
    const parsedDate = parseConsentDate(raw.consentDate);

    // If opted in but no date in file, fallback to current import timestamp
    const resolvedConsentDate = consentStatus === 'OPTED_IN' ? (parsedDate || new Date()) : parsedDate;
    const resolvedConsentSource = raw.consentSource || (consentStatus === 'OPTED_IN' ? 'EXCEL_IMPORT' : 'UNKNOWN');
    const resolvedConsentEvidence = raw.consentEvidence || `File: ${fileName} (Row ${raw.rowIndex})`;

    let isDuplicateInBatch = false;
    let isExistingInDb = false;
    let isSuppressed = false;
    let validationError = phoneResult.error;

    if (phoneResult.isValid) {
      if (seenBatchNumbers.has(phoneResult.e164)) {
        isDuplicateInBatch = true;
        duplicateCount++;
        validationError = 'Duplicate number in upload file';
      } else {
        seenBatchNumbers.add(phoneResult.e164);
      }

      if (existingDbNumbers.has(phoneResult.e164)) {
        isExistingInDb = true;
      }

      if (suppressedNumbers.has(phoneResult.e164)) {
        isSuppressed = true;
        suppressedCount++;
        validationError = 'Number is on the opt-out / suppression list';
      }

      if (!isDuplicateInBatch && !validationError) {
        validCount++;
      } else if (!isDuplicateInBatch && validationError) {
        invalidCount++;
      }
    } else {
      invalidCount++;
    }

    // STRICT COMPLIANCE RULES:
    // 1. Only valid, non-duplicate, non-suppressed contacts WITH verified OPTED_IN status are eligible.
    // 2. Contacts with PENDING_VERIFICATION, OPTED_OUT, or missing consent MUST NEVER enter promotional campaigns.
    const isEligibleForMarketing =
      phoneResult.isValid &&
      !isDuplicateInBatch &&
      !isSuppressed &&
      consentStatus === 'OPTED_IN';

    if (isEligibleForMarketing) {
      eligibleOptedInCount++;
    } else if (consentStatus === 'OPTED_OUT' || isSuppressed) {
      optedOutCount++;
    } else {
      pendingVerificationCount++;
    }

    validatedRows.push({
      rowIndex: raw.rowIndex,
      fullName: raw.fullName || 'Unnamed Contact',
      rawMobile: raw.mobileNumber,
      normalizedMobile: phoneResult.e164 || raw.mobileNumber,
      countryCode: phoneResult.countryCode || '91',
      nationalNumber: phoneResult.nationalNumber || raw.mobileNumber,
      email: raw.email || '',
      businessName: raw.businessName || '',
      category: raw.category || 'General',
      consentStatus,
      consentSource: resolvedConsentSource,
      consentDate: resolvedConsentDate,
      consentEvidence: resolvedConsentEvidence,
      isValidNumber: phoneResult.isValid,
      isDuplicateInBatch,
      isExistingInDb,
      isSuppressed,
      isEligibleForMarketing,
      validationError,
      selected: phoneResult.isValid && !isDuplicateInBatch && !isSuppressed,
    });
  }

  return {
    fileName,
    totalRows: rawRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    eligibleOptedInCount,
    pendingVerificationCount,
    optedOutCount,
    suppressedCount,
    rows: validatedRows,
  };
}

/**
 * Generate comprehensive CSV sample template supporting all 7 standard columns
 */
export function generateSampleCsv(): string {
  const sampleData = [
    {
      'Full Name': 'Amit Sharma',
      'Mobile Number': '+919876543210',
      'Country Code': '91',
      'Email': 'amit@sharmatech.in',
      'Marketing Consent': 'YES',
      'Consent Source': 'Website Contact Form',
      'Consent Date': '2026-03-15',
      'Consent Evidence': 'Form submission #W1042',
      'Business Name': 'Sharma Tech Solutions',
      'Category': 'Corporate & SME',
    },
    {
      'Full Name': 'Pooja Verma',
      'Mobile Number': '9898989898',
      'Country Code': '91',
      'Email': 'pooja@vermaboutique.com',
      'Marketing Consent': 'OPTED_IN',
      'Consent Source': 'Customer WhatsApp Enquiry',
      'Consent Date': '2026-03-10',
      'Consent Evidence': 'Enquiry ID #8942',
      'Business Name': 'Verma Boutique & Apparel',
      'Category': 'E-Commerce Prospects',
    },
    {
      'Full Name': 'Suresh Patel (Pending Consent)',
      'Mobile Number': '+919820011999',
      'Country Code': '91',
      'Email': 'suresh@pateltrading.in',
      'Marketing Consent': 'PENDING',
      'Consent Source': 'Business Directory',
      'Consent Date': '',
      'Consent Evidence': '',
      'Business Name': 'Patel Trading Co',
      'Category': 'Wholesale',
    },
    {
      'Full Name': 'Kunal Singhania (Opted Out)',
      'Mobile Number': '+919820012345',
      'Country Code': '91',
      'Email': 'kunal@singhaniarealty.in',
      'Marketing Consent': 'NO',
      'Consent Source': 'Unsubscribe Request',
      'Consent Date': '2026-02-20',
      'Consent Evidence': 'Opt-out via email',
      'Business Name': 'Singhania Real Estate',
      'Category': 'Real Estate',
    },
  ];

  return Papa.unparse(sampleData);
}
