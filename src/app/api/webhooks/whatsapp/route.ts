import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getWhatsAppConfig } from '@/lib/whatsapp';
import { updateCampaignCounters } from '@/lib/campaign-runner';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Status hierarchy levels to prevent out-of-order webhook delivery regressions
const STATUS_PRIORITY: Record<string, number> = {
  QUEUED: 0,
  SUBMITTED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

/**
 * Meta Webhook Verification Handler (GET)
 * Meta calls this when configuring or verifying the webhook URL in App Dashboard:
 * Query parameters: hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const config = await getWhatsAppConfig();
  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    config.webhookVerifyToken ||
    'slrj_digital_secure_wh_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Webhook Verification] Meta verification handshake succeeded. Returning challenge token.');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn(
    `[Webhook Verification] Verification failed. Mode: ${mode || 'missing'}, Provided token matched: ${Boolean(token === expectedToken)}`
  );
  return NextResponse.json({ error: 'Forbidden. Verification token mismatch.' }, { status: 403 });
}

/**
 * Meta Webhook Inbound Events Handler (POST)
 * Authenticates Meta HMAC-SHA256 signature, processes sent, delivered, read, failed status updates and inbound messages.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const config = await getWhatsAppConfig();
    const appSecret = process.env.WHATSAPP_APP_SECRET || config.appSecret;

    // 1. Verify Meta Signature (X-Hub-Signature-256) if App Secret is configured
    const signature = request.headers.get('x-hub-signature-256');
    if (appSecret) {
      if (!signature) {
        console.warn('[Webhook Security] Rejected request: Missing X-Hub-Signature-256 header.');
        return NextResponse.json({ error: 'Missing X-Hub-Signature-256 header' }, { status: 401 });
      }

      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')}`;

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        console.warn('[Webhook Security] Rejected request: Invalid HMAC-SHA256 signature.');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.warn('[Webhook] Parse error: Invalid JSON body received.');
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Verify Meta payload structure
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored', message: 'Not a whatsapp_business_account object' }, { status: 200 });
    }

    // Record last webhook timestamp & sanitized snippet on account
    await prisma.whatsAppAccount.updateMany({
      data: {
        lastWebhookReceivedAt: new Date(),
        lastWebhookPayload: rawBody.length > 4000 ? rawBody.substring(0, 4000) : rawBody,
      },
    });

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // ========================================================
        // 1. PROCESS STATUS UPDATES (sent, delivered, read, failed)
        // ========================================================
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const statusType = (statusObj.status || '').toUpperCase(); // SENT, DELIVERED, READ, FAILED
            const timestamp = statusObj.timestamp ? new Date(parseInt(statusObj.timestamp) * 1000) : new Date();

            let errorCode: string | null = null;
            let errorMessage: string | null = null;

            if (statusObj.errors && statusObj.errors.length > 0) {
              const err = statusObj.errors[0];
              errorCode = String(err.code || '');
              errorMessage = err.message || err.title || 'Delivery failed';
            }

            // Match message STRICTLY by exact WhatsApp message ID (wamid)
            const message = await prisma.message.findUnique({
              where: { whatsappMessageId: wamid },
            });

            if (message) {
              const currentPriority = STATUS_PRIORITY[message.deliveryStatus] ?? 0;
              const newPriority = STATUS_PRIORITY[statusType] ?? 0;

              // Build granular update payload
              const messageUpdate: any = {
                metadata: JSON.stringify(statusObj),
              };

              // Prevent downgrade (e.g. if DELIVERED arrives after READ, keep READ)
              if (newPriority >= currentPriority || statusType === 'FAILED') {
                messageUpdate.deliveryStatus = statusType;
                messageUpdate.status = statusType;
              }

              if (statusType === 'SENT') {
                messageUpdate.sentAt = message.sentAt || timestamp;
              } else if (statusType === 'DELIVERED') {
                messageUpdate.deliveredAt = message.deliveredAt || timestamp;
                messageUpdate.sentAt = message.sentAt || timestamp;
              } else if (statusType === 'READ') {
                messageUpdate.readAt = message.readAt || timestamp;
                messageUpdate.deliveredAt = message.deliveredAt || timestamp;
                messageUpdate.sentAt = message.sentAt || timestamp;
              } else if (statusType === 'FAILED') {
                messageUpdate.failedAt = timestamp;
                messageUpdate.errorCode = errorCode;
                messageUpdate.errorDescription = errorMessage;
              }

              await prisma.message.update({
                where: { id: message.id },
                data: messageUpdate,
              });

              // Duplicate event protection: avoid creating duplicate MessageStatusEvent for same wamid + eventType
              const existingEvent = await prisma.messageStatusEvent.findFirst({
                where: {
                  whatsappMessageId: wamid,
                  eventType: statusType,
                },
              });

              if (!existingEvent) {
                await prisma.messageStatusEvent.create({
                  data: {
                    messageId: message.id,
                    whatsappMessageId: wamid,
                    eventType: statusType,
                    timestamp,
                    errorDetails: errorMessage ? `${errorCode}: ${errorMessage}` : null,
                    rawPayload: JSON.stringify(statusObj),
                  },
                });
              }

              // Update corresponding CampaignContact by exact wamid
              const contactUpdate: any = {};
              if (newPriority >= currentPriority || statusType === 'FAILED') {
                contactUpdate.status = statusType;
              }

              if (statusType === 'SENT') contactUpdate.sentAt = message.sentAt || timestamp;
              if (statusType === 'DELIVERED') contactUpdate.deliveredAt = message.deliveredAt || timestamp;
              if (statusType === 'READ') contactUpdate.readAt = message.readAt || timestamp;
              if (statusType === 'FAILED') {
                contactUpdate.failedAt = timestamp;
                contactUpdate.errorCode = errorCode;
                contactUpdate.errorMessage = errorMessage;
              }

              await prisma.campaignContact.updateMany({
                where: { whatsappMessageId: wamid },
                data: contactUpdate,
              });

              // Refresh campaign counters
              if (message.campaignId) {
                await updateCampaignCounters(message.campaignId);
              }

              console.log(`[Webhook Event] ${statusType} processed for wamid: ${wamid}`);
            } else {
              console.log(`[Webhook Notice] Received status ${statusType} for unindexed wamid: ${wamid}`);
            }
          }
        }

        // ========================================================
        // 2. PROCESS INBOUND MESSAGES (Opt-out STOP & customer replies)
        // ========================================================
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const fromRaw = msg.from; // e.g. "919811088990"
            const fromFormatted = fromRaw.startsWith('+') ? fromRaw : `+${fromRaw}`;
            const textBody = (msg.text?.body || msg.button?.text || '').trim();
            const textUpper = textBody.toUpperCase();

            // Duplicate message protection: upsert inbound message by unique msg.id
            await prisma.message.upsert({
              where: { whatsappMessageId: msg.id },
              update: {
                content: textBody,
                metadata: JSON.stringify(msg),
              },
              create: {
                whatsappMessageId: msg.id,
                recipientNumber: fromFormatted,
                direction: 'INBOUND',
                messageType: msg.type || 'TEXT',
                content: textBody,
                status: 'RECEIVED',
                rawPayload: JSON.stringify(msg),
              },
            });

            // CHECK OPT-OUT STOP KEYWORDS
            const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'REMOVE', 'CANCEL', 'QUIT', 'OPT OUT', 'OPTOUT', 'NO'];
            const isOptOut = optOutKeywords.includes(textUpper) || textUpper.startsWith('STOP ');

            if (isOptOut) {
              console.log(`[Opt-Out] Inbound STOP detected from ${fromFormatted}`);

              // Add to Suppression List
              await prisma.suppressionList.upsert({
                where: { mobileNumber: fromFormatted },
                update: {
                  reason: 'USER_STOP',
                  notes: `Customer sent STOP message: "${textBody}"`,
                  suppressedBy: 'SYSTEM_WEBHOOK',
                },
                create: {
                  mobileNumber: fromFormatted,
                  reason: 'USER_STOP',
                  notes: `Customer sent STOP message: "${textBody}"`,
                  suppressedBy: 'SYSTEM_WEBHOOK',
                },
              });

              // Update Contact record if found
              const contact = await prisma.contact.findFirst({
                where: { mobileNumber: fromFormatted },
              });

              if (contact) {
                await prisma.contact.update({
                  where: { id: contact.id },
                  data: { consentStatus: 'OPTED_OUT' },
                });

                // Record Consent Opt-Out Trail
                await prisma.contactConsent.create({
                  data: {
                    contactId: contact.id,
                    status: 'OPTED_OUT',
                    source: 'INBOUND_STOP',
                    optOutDate: new Date(),
                    notes: `Opted out automatically via inbound WhatsApp message: "${textBody}"`,
                  },
                });
              }

              await logAudit({
                action: 'AUTOMATIC_OPT_OUT',
                entityType: 'SuppressionList',
                entityId: fromFormatted,
                details: { mobileNumber: fromFormatted, incomingMessage: textBody },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Error] Processing error:', error?.message);
    return NextResponse.json({ status: 'error', message: error?.message }, { status: 500 });
  }
}
