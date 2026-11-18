import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAndNormalizePhone, isNumberSuppressed } from '@/lib/phone';
import { logAudit } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const consent = searchParams.get('consent') || 'ALL'; // ALL, OPTED_IN, PENDING_VERIFICATION, OPTED_OUT
    const category = searchParams.get('category') || 'ALL';
    const status = searchParams.get('status') || 'ALL'; // ALL, VALID, INVALID
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { mobileNumber: { contains: search } },
        { businessName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (consent !== 'ALL') {
      // Support legacy 'UNKNOWN' mapped to 'PENDING_VERIFICATION'
      if (consent === 'PENDING_VERIFICATION') {
        where.consentStatus = { in: ['PENDING_VERIFICATION', 'UNKNOWN'] };
      } else {
        where.consentStatus = consent;
      }
    }

    if (category !== 'ALL') {
      where.category = category;
    }

    if (status !== 'ALL') {
      where.status = status;
    }

    const [
      total,
      contacts,
      categories,
      countAll,
      countOptedIn,
      countPending,
      countOptedOut,
      countInvalid,
    ] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          consents: { orderBy: { createdAt: 'desc' }, take: 5 },
          groups: {
            include: {
              group: true,
            },
          },
        },
      }),
      prisma.contact.findMany({
        where: { category: { not: null } },
        distinct: ['category'],
        select: { category: true },
      }),
      prisma.contact.count(),
      prisma.contact.count({ where: { consentStatus: 'OPTED_IN', status: 'VALID' } }),
      prisma.contact.count({ where: { consentStatus: { in: ['PENDING_VERIFICATION', 'UNKNOWN'] } } }),
      prisma.contact.count({ where: { consentStatus: 'OPTED_OUT' } }),
      prisma.contact.count({ where: { status: 'INVALID' } }),
    ]);

    return NextResponse.json({
      success: true,
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        all: countAll,
        optedIn: countOptedIn,
        pendingVerification: countPending,
        optedOut: countOptedOut,
        invalid: countInvalid,
      },
      categories: categories.map((c) => c.category).filter(Boolean),
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      mobileNumber,
      countryCode = '91',
      businessName,
      email,
      category = 'General',
      consentStatus = 'PENDING_VERIFICATION',
      consentSource = 'MANUAL_ADMIN',
      consentEvidence,
      groupId,
      notes,
    } = body;

    if (!fullName || !mobileNumber) {
      return NextResponse.json({ error: 'Full Name and Mobile Number are required.' }, { status: 400 });
    }

    const phoneValidation = validateAndNormalizePhone(mobileNumber, countryCode as any);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error || 'Invalid phone number format' }, { status: 400 });
    }

    // Check suppression
    const suppression = await isNumberSuppressed(phoneValidation.e164);
    if (suppression.suppressed) {
      return NextResponse.json({
        error: `Cannot add contact: Mobile number is on the suppression list (${suppression.reason})`,
      }, { status: 400 });
    }

    // Check for duplicate in database
    const existing = await prisma.contact.findUnique({
      where: { mobileNumber: phoneValidation.e164 },
    });

    if (existing) {
      return NextResponse.json({
        error: `Contact with number ${phoneValidation.e164} already exists.`,
      }, { status: 409 });
    }

    const resolvedConsentDate = consentStatus === 'OPTED_IN' ? new Date() : null;

    const contact = await prisma.contact.create({
      data: {
        fullName: fullName.trim(),
        mobileNumber: phoneValidation.e164,
        countryCode: phoneValidation.countryCode,
        nationalNumber: phoneValidation.nationalNumber,
        businessName: businessName?.trim() || null,
        email: email?.trim() || null,
        category: category?.trim() || 'General',
        status: 'VALID',
        consentStatus: consentStatus,
        consentSource: consentSource || 'MANUAL_ADMIN',
        consentDate: resolvedConsentDate,
        consentEvidence: consentEvidence || null,
        notes: notes || null,
      },
    });

    // Link to group if provided
    if (groupId) {
      await prisma.contactGroupMember.create({
        data: {
          contactId: contact.id,
          groupId,
        },
      });
    }

    // Record consent history
    await prisma.contactConsent.create({
      data: {
        contactId: contact.id,
        status: consentStatus,
        source: consentSource || 'MANUAL_ADMIN',
        evidence: consentEvidence || null,
        optInDate: resolvedConsentDate,
        optOutDate: consentStatus === 'OPTED_OUT' ? new Date() : null,
        notes: notes || 'Manually created by administrator with documented consent check',
      },
    });

    // If added as OPTED_OUT, enforce suppression
    if (consentStatus === 'OPTED_OUT') {
      await prisma.suppressionList.upsert({
        where: { mobileNumber: contact.mobileNumber },
        update: {
          reason: 'MANUAL_ADMIN',
          notes: 'Manually added as opted-out',
          suppressedBy: user?.id || null,
        },
        create: {
          mobileNumber: contact.mobileNumber,
          reason: 'MANUAL_ADMIN',
          notes: 'Manually added as opted-out',
          suppressedBy: user?.id || null,
        },
      });
    }

    await logAudit({
      userId: user?.id,
      action: 'CONTACT_CREATE',
      entityType: 'Contact',
      entityId: contact.id,
      details: {
        fullName: contact.fullName,
        mobileNumber: contact.mobileNumber,
        consentStatus,
        consentSource,
      },
    });

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create contact' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { contactIds } = await request.json();

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'No contact IDs provided for deletion.' }, { status: 400 });
    }

    const result = await prisma.contact.deleteMany({
      where: { id: { in: contactIds } },
    });

    await logAudit({
      userId: user?.id,
      action: 'CONTACT_BULK_DELETE',
      entityType: 'Contact',
      details: { count: result.count, contactIds },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error('Error deleting contacts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete contacts' }, { status: 500 });
  }
}
