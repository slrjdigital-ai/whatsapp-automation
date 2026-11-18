import { NextResponse } from 'next/server';
import { verifyMetaConnection } from '@/lib/whatsapp';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ connected: false, error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    const result = await verifyMetaConnection();

    await logAudit({
      userId: user?.id,
      action: 'WHATSAPP_TEST_CONNECTION',
      entityType: 'WhatsAppAccount',
      details: result,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error?.message || 'Connection test failed' }, { status: 500 });
  }
}
