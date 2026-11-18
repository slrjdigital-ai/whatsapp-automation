import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeCampaignBatch } from '@/lib/campaign-runner';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Campaign is already completed' }, { status: 400 });
    }

    // Execute first batch safely within serverless window
    const batchResult = await executeCampaignBatch(campaign.id, 25);

    await logAudit({
      userId: user.id,
      action: 'CAMPAIGN_START',
      entityType: 'Campaign',
      entityId: campaign.id,
      details: batchResult,
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign execution started',
      batchResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to start campaign' }, { status: 500 });
  }
}
