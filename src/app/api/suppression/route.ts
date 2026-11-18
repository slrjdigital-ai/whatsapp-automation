import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAndNormalizePhone } from '@/lib/phone';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

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

    const where: any = {};
    if (search) {
      where.OR = [
        { mobileNumber: { contains: search } },
        { reason: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const suppressionList = await prisma.suppressionList.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, suppressionList });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch suppression list' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mobileNumber, reason = 'MANUAL_ADMIN', notes } = await request.json();

    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const phoneValidation = validateAndNormalizePhone(mobileNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error || 'Invalid mobile number' }, { status: 400 });
    }

    const entry = await prisma.suppressionList.upsert({
      where: { mobileNumber: phoneValidation.e164 },
      update: {
        reason,
        notes: notes || 'Manually added by administrator',
        suppressedBy: user?.id || null,
      },
      create: {
        mobileNumber: phoneValidation.e164,
        reason,
        notes: notes || 'Manually added by administrator',
        suppressedBy: user?.id || null,
      },
    });

    // Also update any matching contact record to OPTED_OUT
    await prisma.contact.updateMany({
      where: { mobileNumber: phoneValidation.e164 },
      data: { consentStatus: 'OPTED_OUT' },
    });

    await logAudit({
      userId: user?.id,
      action: 'SUPPRESSION_ADD',
      entityType: 'SuppressionList',
      entityId: entry.id,
      details: { mobileNumber: entry.mobileNumber, reason },
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to add to suppression list' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mobileNumber } = await request.json();

    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    await prisma.suppressionList.delete({
      where: { mobileNumber },
    });

    await logAudit({
      userId: user?.id,
      action: 'SUPPRESSION_REMOVE',
      entityType: 'SuppressionList',
      entityId: mobileNumber,
    });

    return NextResponse.json({ success: true, message: 'Removed from suppression list' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to remove from suppression list' }, { status: 500 });
  }
}
