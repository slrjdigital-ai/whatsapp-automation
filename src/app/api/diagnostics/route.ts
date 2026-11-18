import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWhatsAppConfig, verifyMetaConnection } from '@/lib/whatsapp';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow SUPER_ADMIN or MARKETING_MANAGER
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'MARKETING_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const config = await getWhatsAppConfig();
    const metaCheck = await verifyMetaConnection();

    const account = await prisma.whatsAppAccount.findFirst();

    // Mask access token for security
    let maskedToken = 'NOT_CONFIGURED';
    if (config.accessToken && config.accessToken.length > 10) {
      const start = config.accessToken.substring(0, 6);
      const end = config.accessToken.substring(config.accessToken.length - 4);
      maskedToken = `${start}••••••••••••••••${end}`;
    }

    // Recent 30 messages
    const recentMessages = await prisma.message.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        whatsappMessageId: true,
        recipientNumber: true,
        senderNumber: true,
        direction: true,
        messageType: true,
        templateName: true,
        submissionStatus: true,
        deliveryStatus: true,
        status: true,
        submittedAt: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
        errorCode: true,
        errorDescription: true,
        rawPayload: true,
        rawResponse: true,
        createdAt: true,
      },
    });

    // Aggregated message counts
    const messageStats = {
      total: await prisma.message.count(),
      submitted: await prisma.message.count({ where: { submissionStatus: 'SUBMITTED' } }),
      sent: await prisma.message.count({ where: { deliveryStatus: { in: ['SENT', 'DELIVERED', 'READ'] } } }),
      delivered: await prisma.message.count({ where: { deliveryStatus: { in: ['DELIVERED', 'READ'] } } }),
      read: await prisma.message.count({ where: { deliveryStatus: 'READ' } }),
      failed: await prisma.message.count({ where: { deliveryStatus: 'FAILED' } }),
    };

    const origin = request.nextUrl.origin || 'http://localhost:3000';

    return NextResponse.json({
      metaConnection: metaCheck,
      account: {
        id: account?.id,
        accountName: account?.accountName || 'SLRJ DIGITAL Official',
        wabaId: account?.wabaId || 'NOT_CONFIGURED',
        phoneNumberId: account?.phoneNumberId || 'NOT_CONFIGURED',
        displayPhoneNumber: account?.displayPhoneNumber || metaCheck.displayPhoneNumber || 'NOT_CONFIGURED',
        verifiedName: account?.verifiedName || metaCheck.verifiedName || 'SLRJ DIGITAL',
        qualityRating: account?.qualityRating || metaCheck.qualityRating || 'UNKNOWN',
        messagingLimitTier: account?.messagingLimitTier || 'TIER_1K',
        apiVersion: account?.apiVersion || 'v21.0',
        hasAccessToken: Boolean(config.accessToken && config.accessToken.length > 20),
        maskedAccessToken: maskedToken,
        hasAppSecret: Boolean(config.appSecret),
        webhookVerifyToken: account?.webhookVerifyToken || 'slrj_digital_secure_wh_2026',
        isConnected: metaCheck.connected,
        isTestNumber: Boolean(account?.isTestNumber || metaCheck.isTestNumber),
        lastVerifiedAt: account?.lastVerifiedAt,
        lastSuccessfulRequestAt: account?.lastSuccessfulRequestAt,
        lastApiError: account?.lastApiError,
        lastApiErrorCode: account?.lastApiErrorCode,
        lastWebhookReceivedAt: account?.lastWebhookReceivedAt,
        lastWebhookPayload: account?.lastWebhookPayload,
      },
      webhookInfo: {
        url: `${origin}/api/webhooks/whatsapp`,
        verifyToken: account?.webhookVerifyToken || 'slrj_digital_secure_wh_2026',
        subscribedFields: ['messages'],
      },
      messageStats,
      recentMessages,
    });
  } catch (err: any) {
    console.error('Error in diagnostics API:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve diagnostics' },
      { status: 500 }
    );
  }
}

/**
 * Developer utility: Dispatch a synthetic or simulated Meta webhook event to verify
 * the application's internal event processing, timestamp tracking, and status transitions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, wamid, eventType, errorCode, errorMessage } = body;

    if (action === 'simulate_webhook_status') {
      if (!wamid || !eventType) {
        return NextResponse.json({ error: 'wamid and eventType are required' }, { status: 400 });
      }

      // Construct authentic Meta Webhook payload format
      const syntheticMetaPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '919876543210',
                    phone_number_id: '109847291847192',
                  },
                  statuses: [
                    {
                      id: wamid,
                      status: eventType.toLowerCase(), // sent, delivered, read, failed
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      recipient_id: '919876543210',
                      ...(eventType.toUpperCase() === 'FAILED'
                        ? {
                            errors: [
                              {
                                code: errorCode || 131026,
                                title: errorMessage || 'Message undeliverable',
                                message: errorMessage || 'Message undeliverable',
                              },
                            ],
                          }
                        : {}),
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      // Call our internal webhook handler with this payload
      const webhookUrl = new URL('/api/webhooks/whatsapp', request.url);
      const res = await fetch(webhookUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syntheticMetaPayload),
      });

      const resData = await res.json();
      return NextResponse.json({
        success: res.ok,
        message: `Webhook simulated with event ${eventType} for ${wamid}`,
        webhookResponse: resData,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
