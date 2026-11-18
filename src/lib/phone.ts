import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import prisma from './prisma';

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  countryCode: string;
  nationalNumber: string;
  countryIso?: string;
  formattedInternational: string;
  error?: string;
}

export const normalizePhoneNumber = (rawInput: string | number, defaultCountry: CountryCode = 'IN') =>
  validateAndNormalizePhone(rawInput, defaultCountry);

export function validateAndNormalizePhone(
  rawInput: string | number,
  defaultCountry: CountryCode = 'IN'
): PhoneValidationResult {
  if (!rawInput) {
    return {
      isValid: false,
      e164: '',
      countryCode: '',
      nationalNumber: '',
      formattedInternational: '',
      error: 'Empty mobile number',
    };
  }

  let cleanString = String(rawInput).trim().replace(/[\s\-\(\)\.]/g, '');

  // Handle common format without '+' but with country code (e.g. '919820011223')
  if (!cleanString.startsWith('+') && cleanString.length === 12 && cleanString.startsWith('91')) {
    cleanString = `+${cleanString}`;
  } else if (!cleanString.startsWith('+') && cleanString.length === 10) {
    cleanString = `+91${cleanString}`;
  } else if (!cleanString.startsWith('+')) {
    cleanString = `+${cleanString}`;
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(cleanString, defaultCountry);

    if (phoneNumber && phoneNumber.isValid()) {
      return {
        isValid: true,
        e164: phoneNumber.number, // e.g. +919820011223
        countryCode: String(phoneNumber.countryCallingCode), // e.g. 91
        nationalNumber: phoneNumber.nationalNumber, // e.g. 9820011223
        countryIso: phoneNumber.country,
        formattedInternational: phoneNumber.formatInternational(), // e.g. +91 98200 11223
      };
    }

    return {
      isValid: false,
      e164: cleanString,
      countryCode: '',
      nationalNumber: cleanString.replace(/^\+/, ''),
      formattedInternational: cleanString,
      error: 'Invalid phone number format or length',
    };
  } catch (err: any) {
    return {
      isValid: false,
      e164: cleanString,
      countryCode: '',
      nationalNumber: cleanString,
      formattedInternational: cleanString,
      error: err?.message || 'Phone number parsing failed',
    };
  }
}

/**
 * Checks whether the mobile number is on the suppression list
 */
export async function isNumberSuppressed(normalizedE164: string): Promise<{ suppressed: boolean; reason?: string }> {
  try {
    const entry = await prisma.suppressionList.findUnique({
      where: { mobileNumber: normalizedE164 },
    });

    if (entry) {
      return { suppressed: true, reason: entry.reason };
    }
    return { suppressed: false };
  } catch (error) {
    console.error('Error checking suppression list:', error);
    return { suppressed: false };
  }
}
