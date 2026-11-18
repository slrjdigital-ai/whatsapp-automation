import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { executeCampaignBatch } from '@/lib/campaign-runner';
import { getWhatsAppConfig } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type = 'TEMPLATE', // 'TEMPLATE' or 'CUSTOM_SESSION'
      templateId,
      customBody,
      mediaUrl,
      targetType = 'ALL_OPTED_IN', // 'ALL_OPTED_IN', 'GROUP', 'CUSTOM_IDS'
      targetGroupId,
      contactIds,
      scheduledAt,
      startImmediately = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    if (type === 'TEMPLATE' && !templateId) {
      return NextResponse.json({ error: 'A WhatsApp message template must be selected' }, { status: 400 });
    }

    // Fetch candidate contacts based on target type
    let candidateContacts: { id: string; mobileNumber: string; consentStatus: string }[] = [];

    if (targetType === 'GROUP' && targetGroupId) {
      const memberships = await prisma.contactGroupMember.findMany({
        where: { groupId: targetGroupId },
        include: {
          contact: {
            select: { id: true, mobileNumber: true, consentStatus: true },
          },
        },
      });
      candidateContacts = memberships.map((m) => m.contact);
    } else if (targetType === 'CUSTOM_IDS' && Array.isArray(contactIds) && contactIds.length > 0) {
      candidateContacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, mobileNumber: true, consentStatus: true },
      });
    } else {
      // Default: ALL_OPTED_IN
      candidateContacts = await prisma.contact.findMany({
        where: { status: 'VALID' },
        select: { id: true, mobileNumber: true, consentStatus: true },
      });
    }

    // MANDATORY COMPLIANCE FILTER:
    // Only contacts that have verified consent (OPTED_IN) are eligible
    // Non-opted-in contacts are strictly excluded!
    const suppressedList = await prisma.suppressionList.findMany({
      select: { mobileNumber: true },
    });
    const suppressedSet = new Set(suppressedList.map((s) => s.mobileNumber));

    let missingConsentCount = 0;
    let optedOutCount = 0;
    let suppressedCount = 0;

    for (const c of candidateContacts) {
      if (suppressedSet.has(c.mobileNumber)) {
        suppressedCount++;
      } else if (c.consentStatus === 'OPTED_OUT') {
        optedOutCount++;
      } else if (c.consentStatus !== 'OPTED_IN') {
        missingConsentCount++;
      }
    }

    const eligibleContacts = candidateContacts.filter(
      (c) => c.consentStatus === 'OPTED_IN' && !suppressedSet.has(c.mobileNumber)
    );

    if (eligibleContacts.length === 0) {
      return NextResponse.json({
        error: 'No eligible opted-in contacts found in the selected audience. WhatsApp policies strictly require verified marketing opt-in consent before promotional messaging.',
        code: 'NO_ELIGIBLE_CONTACTS',
        breakdown: {
          totalEvaluated: candidateContacts.length,
          eligibleOptedIn: 0,
          missingConsentCount,
          optedOutCount,
          suppressedCount,
        },
        explanation: `Out of ${candidateContacts.length} contacts evaluated, ${missingConsentCount} are pending verification, ${optedOutCount} opted out, and ${suppressedCount} are suppressed. Meta WhatsApp Business policy strictly bars unsolicited promotional template messages without documented customer consent.`,
      }, { status: 400 });
    }

    const config = await getWhatsAppConfig();

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type,
        templateId: templateId || null,
        messageBody: customBody?.trim() || null,
        mediaUrl: mediaUrl || null,
        status: scheduledAt ? 'SCHEDULED' : startImmediately ? 'RUNNING' : 'DRAFT',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        startedAt: startImmediately && !scheduledAt ? new Date() : null,
        totalContacts: candidateContacts.length,
        eligibleContacts: eligibleContacts.length,
        pendingCount: eligibleContacts.length,
        isDemo: config.isDemoMode,
        createdById: user?.id || null,
      },
    });

    // Create CampaignContact records for all eligible contacts
    const campaignContactRows = eligibleContacts.map((contact) => ({
      campaignId: campaign.id,
      contactId: contact.id,
      status: 'PENDING',
    }));

    await prisma.campaignContact.createMany({
      data: campaignContactRows,
    });

    await logAudit({
      userId: user?.id,
      action: 'CAMPAIGN_CREATE',
      entityType: 'Campaign',
      entityId: campaign.id,
      details: {
        name: campaign.name,
        totalCandidate: candidateContacts.length,
        eligibleContacts: eligibleContacts.length,
        isDemo: config.isDemoMode,
        startImmediately,
      },
    });

    // Start serverless batch execution if startImmediately is true and not scheduled
    let initialBatchResult = null;
    if (startImmediately && !scheduledAt) {
      initialBatchResult = await executeCampaignBatch(campaign.id, 25);
    }

    return NextResponse.json({
      success: true,
      campaign,
      summary: {
        totalEvaluated: candidateContacts.length,
        eligibleOptedIn: eligibleContacts.length,
        excludedNonConsent: candidateContacts.length - eligibleContacts.length,
      },
    });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create campaign' }, { status: 500 });
  }
}
