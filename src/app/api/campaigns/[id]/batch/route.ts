import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeCampaignBatch } from '@/lib/campaign-runner';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'RUNNING') {
      return NextResponse.json({
        success: true,
        status: campaign.status,
        message: `Campaign is not in RUNNING state (current: ${campaign.status})`,
      });
    }

    // Process up to 25 contacts per invocation
    const batchResult = await executeCampaignBatch(campaign.id, 25);

    return NextResponse.json({
      success: true,
      batchResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Batch execution failed' }, { status: 500 });
  }
}
