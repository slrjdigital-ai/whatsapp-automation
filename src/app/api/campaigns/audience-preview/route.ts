import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    const targetType = searchParams.get('targetType') || 'ALL_OPTED_IN';
    const targetGroupId = searchParams.get('targetGroupId');

    let candidateContacts: any[] = [];

    if (targetType === 'GROUP' && targetGroupId) {
      const memberships = await prisma.contactGroupMember.findMany({
        where: { groupId: targetGroupId },
        include: {
          contact: true,
        },
      });
      candidateContacts = memberships.map((m) => m.contact);
    } else {
      candidateContacts = await prisma.contact.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    // Load suppression list
    const suppressedList = await prisma.suppressionList.findMany({
      select: { mobileNumber: true },
    });
    const suppressedSet = new Set(suppressedList.map((s) => s.mobileNumber));

    let eligibleOptedIn = 0;
    let missingConsent = 0;
    let optedOut = 0;
    let invalidContacts = 0;

    for (const c of candidateContacts) {
      const isSuppressed = suppressedSet.has(c.mobileNumber);
      const isInvalid = c.status === 'INVALID';

      if (isInvalid) {
        invalidContacts++;
      } else if (c.consentStatus === 'OPTED_OUT' || isSuppressed) {
        optedOut++;
      } else if (c.consentStatus === 'OPTED_IN') {
        eligibleOptedIn++;
      } else {
        missingConsent++;
      }
    }

    return NextResponse.json({
      success: true,
      audience: {
        totalContacts: candidateContacts.length,
        eligibleOptedIn,
        missingConsent,
        optedOut,
        invalidContacts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to preview audience' }, { status: 500 });
  }
}
