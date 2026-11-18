import { NextRequest, NextResponse } from 'next/server';
import { resumeCampaignExecution } from '@/lib/campaign-runner';
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

    const batchResult = await resumeCampaignExecution(params.id);

    await logAudit({
      userId: user.id,
      action: 'CAMPAIGN_RESUME',
      entityType: 'Campaign',
      entityId: params.id,
      details: batchResult,
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign execution resumed',
      batchResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to resume campaign' }, { status: 500 });
  }
}
