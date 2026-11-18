import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { validateAndNormalizePhone } from '@/lib/phone';
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testMobileNumber } = await request.json();

    if (!testMobileNumber) {
      return NextResponse.json({ error: 'Test mobile number is required' }, { status: 400 });
    }

    const phoneValidation = validateAndNormalizePhone(testMobileNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error || 'Invalid test phone number' }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { template: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const adminName = user?.name || 'Administrator';

    const sendResult = await sendWhatsAppMessage({
      to: phoneValidation.e164,
      templateName: campaign.type === 'TEMPLATE' && campaign.template ? campaign.template.name : undefined,
      templateLanguage: campaign.template?.language || 'en',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: `${adminName} (TEST PREVIEW)` }],
        },
      ],
      customBody: campaign.messageBody
        ? `[TEST MESSAGE] ${campaign.messageBody.replace(/\{\{name\}\}/gi, adminName)}`
        : undefined,
    });

    await logAudit({
      userId: user?.id,
      action: 'CAMPAIGN_TEST_SEND',
      entityType: 'Campaign',
      entityId: campaign.id,
      details: { testNumber: phoneValidation.e164, success: sendResult.success },
    });

    return NextResponse.json({
      success: sendResult.success,
      status: sendResult.status || (sendResult.success ? 'SUBMITTED' : 'FAILED'),
      whatsappMessageId: sendResult.whatsappMessageId,
      error: sendResult.error,
      errorCode: sendResult.errorCode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send test message' }, { status: 500 });
  }
}
