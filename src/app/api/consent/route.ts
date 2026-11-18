import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAndNormalizePhone, isNumberSuppressed } from '@/lib/phone';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      mobileNumber,
      countryCode = '91',
      email,
      businessName,
      consentAgreed,
      consentSource = 'WEBSITE_FORM',
    } = body;

    // 1. Mandatory Consent Check: Must explicitly check the box
    if (!consentAgreed) {
      return NextResponse.json({
        error: 'Explicit marketing consent must be provided by checking the opt-in checkbox.',
      }, { status: 400 });
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
    }

    // 2. Validate and normalize phone number to ITU E.164
    const phoneValidation = validateAndNormalizePhone(mobileNumber, countryCode as any);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error || 'Invalid mobile number format' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser Webform';
    const submissionTime = new Date();

    // 3. Check if previously on suppression list
    const suppression = await isNumberSuppressed(phoneValidation.e164);
    if (suppression.suppressed) {
      // If customer is re-optin voluntary, remove from suppression list
      await prisma.suppressionList.deleteMany({
        where: { mobileNumber: phoneValidation.e164 },
      });
    }

    // 4. Upsert Contact with OPTED_IN status and genuine consent evidence
    const contact = await prisma.contact.upsert({
      where: { mobileNumber: phoneValidation.e164 },
      update: {
        fullName: fullName.trim(),
        email: email?.trim() || undefined,
        businessName: businessName?.trim() || undefined,
        status: 'VALID',
        consentStatus: 'OPTED_IN',
        consentSource: consentSource,
        consentDate: submissionTime,
        consentEvidence: `Voluntary web form opt-in from IP: ${ipAddress}`,
      },
      create: {
        fullName: fullName.trim(),
        mobileNumber: phoneValidation.e164,
        countryCode: phoneValidation.countryCode,
        nationalNumber: phoneValidation.nationalNumber,
        email: email?.trim() || null,
        businessName: businessName?.trim() || null,
        status: 'VALID',
        consentStatus: 'OPTED_IN',
        consentSource: consentSource,
        consentDate: submissionTime,
        consentEvidence: `Voluntary web form opt-in from IP: ${ipAddress}`,
      },
    });

    // 5. Record verified audit trail in ContactConsent
    await prisma.contactConsent.create({
      data: {
        contactId: contact.id,
        status: 'OPTED_IN',
        source: consentSource,
        evidence: `Direct web form consent (IP: ${ipAddress})`,
        optInDate: submissionTime,
        ipAddress,
        userAgent,
        notes: `Customer voluntarily registered for promotional WhatsApp messages via ${consentSource}`,
      },
    });

    await logAudit({
      action: 'CUSTOMER_VOLUNTARY_OPT_IN',
      entityType: 'Contact',
      entityId: contact.id,
      details: {
        fullName: contact.fullName,
        mobileNumber: contact.mobileNumber,
        source: consentSource,
        ipAddress,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your WhatsApp marketing consent has been successfully registered with SLRJ DIGITAL.',
      contact: {
        fullName: contact.fullName,
        mobileNumber: contact.mobileNumber,
        consentStatus: contact.consentStatus,
        consentDate: contact.consentDate,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Consent registration error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to register consent' }, { status: 500 });
  }
}
