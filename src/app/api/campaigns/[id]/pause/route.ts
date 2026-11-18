import { NextRequest, NextResponse } from 'next/server';
import { pauseCampaignExecution } from '@/lib/campaign-runner';
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

    await pauseCampaignExecution(params.id);

    await logAudit({
      userId: user.id,
      action: 'CAMPAIGN_PAUSE',
      entityType: 'Campaign',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Campaign execution paused' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to pause campaign' }, { status: 500 });
  }
}
