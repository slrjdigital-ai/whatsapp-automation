import prisma from './prisma';
import { sendWhatsAppMessage } from './whatsapp';
import { isNumberSuppressed } from './phone';

export interface BatchProcessingResult {
  success: boolean;
  campaignId: string;
  status: string;
  processedInBatch: number;
  remainingPending: number;
  isCompleted: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  error?: string;
}

/**
 * Pause Campaign Execution: Persistent DB update
 */
export async function pauseCampaignExecution(campaignId: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  });

  await prisma.automationJob.updateMany({
    where: { campaignId, status: { in: ['QUEUED', 'PROCESSING'] } },
    data: { status: 'PAUSED' },
  });
}

/**
 * Resume Campaign Execution: Persistent DB update & trigger next batch
 */
export async function resumeCampaignExecution(campaignId: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'RUNNING' },
  });

  await prisma.automationJob.updateMany({
    where: { campaignId, status: 'PAUSED' },
    data: { status: 'PROCESSING' },
  });

  return executeCampaignBatch(campaignId, 25);
}

/**
 * Cancel Campaign Execution: Persistent DB update
 */
export async function cancelCampaignExecution(campaignId: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'CANCELLED' },
  });

  await prisma.automationJob.updateMany({
    where: { campaignId, status: { in: ['QUEUED', 'PROCESSING', 'PAUSED'] } },
    data: { status: 'FAILED', errorLog: 'Campaign cancelled by operator' },
  });
}

/**
 * Check if campaign is active based on database state
 */
export async function isCampaignActive(campaignId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });
  return campaign?.status === 'RUNNING';
}

/**
 * Serverless-Native Campaign Batch Runner
 * Processes a chunk of contacts (default 25) per invocation, safely completing within serverless lambda timeout limits.
 * Progress is committed to the database after each dispatch.
 */
export async function executeCampaignBatch(
  campaignId: string,
  batchSize: number = 25
): Promise<BatchProcessingResult> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
      },
    });

    if (!campaign) {
      return {
        success: false,
        campaignId,
        status: 'NOT_FOUND',
        processedInBatch: 0,
        remainingPending: 0,
        isCompleted: false,
        isPaused: false,
        isCancelled: false,
        error: 'Campaign not found',
      };
    }

    // Check if campaign is paused or cancelled in database
    if (campaign.status === 'PAUSED') {
      return {
        success: true,
        campaignId,
        status: 'PAUSED',
        processedInBatch: 0,
        remainingPending: await prisma.campaignContact.count({
          where: { campaignId, status: { in: ['PENDING', 'QUEUED'] } },
        }),
        isCompleted: false,
        isPaused: true,
        isCancelled: false,
      };
    }

    if (campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') {
      return {
        success: true,
        campaignId,
        status: campaign.status,
        processedInBatch: 0,
        remainingPending: 0,
        isCompleted: campaign.status === 'COMPLETED',
        isPaused: false,
        isCancelled: campaign.status === 'CANCELLED',
      };
    }

    // Ensure status is RUNNING
    if (campaign.status !== 'RUNNING') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'RUNNING',
          startedAt: campaign.startedAt || new Date(),
        },
      });
    }

    // Upsert or update AutomationJob in DB
    const existingJob = await prisma.automationJob.findFirst({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    let jobId = existingJob?.id;
    if (!existingJob || existingJob.status === 'COMPLETED') {
      const newJob = await prisma.automationJob.create({
        data: {
          campaignId,
          jobType: 'CAMPAIGN_BATCH_SEND',
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });
      jobId = newJob.id;
    } else if (existingJob.status !== 'PROCESSING') {
      await prisma.automationJob.update({
        where: { id: existingJob.id },
        data: { status: 'PROCESSING' },
      });
    }

    // Fetch batch of pending contacts
    const pendingContacts = await prisma.campaignContact.findMany({
      where: {
        campaignId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
      include: {
        contact: true,
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let processedCount = 0;

    for (const item of pendingContacts) {
      // Re-verify campaign status from DB before each message to handle pauses/cancellations immediately
      const currentCampaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (currentCampaign?.status === 'CANCELLED') {
        break;
      }
      if (currentCampaign?.status === 'PAUSED') {
        break;
      }

      const contact = item.contact;

      // 1. Mandatory Safety: Suppression List verification
      const suppression = await isNumberSuppressed(contact.mobileNumber);
      if (suppression.suppressed) {
        await prisma.campaignContact.update({
          where: { id: item.id },
          data: {
            status: 'SKIPPED',
            errorMessage: `Suppressed: ${suppression.reason || 'User opted out'}`,
          },
        });
        processedCount++;
        continue;
      }

      // 2. Mandatory Safety: Marketing Opt-In Consent verification
      if (contact.consentStatus !== 'OPTED_IN') {
        await prisma.campaignContact.update({
          where: { id: item.id },
          data: {
            status: 'SKIPPED',
            errorMessage: 'Excluded: Contact lacks verified marketing consent opt-in.',
          },
        });
        processedCount++;
        continue;
      }

      // 3. Mark contact as SENDING
      await prisma.campaignContact.update({
        where: { id: item.id },
        data: { status: 'SENDING' },
      });

      // Prepare template components
      const customerName = contact.fullName || 'Valued Customer';
      let templateComponents: any[] = [];

      if (campaign.type === 'TEMPLATE' && campaign.template) {
        templateComponents = [
          {
            type: 'body',
            parameters: [{ type: 'text', text: customerName }],
          },
        ];
      }

      const personalizedBody = campaign.messageBody
        ? campaign.messageBody
            .replace(/\{\{name\}\}/gi, customerName)
            .replace(/\{\{business_name\}\}/gi, contact.businessName || 'your business')
        : undefined;

      // 4. Dispatch authentic message via Meta WhatsApp Cloud API
      const sendResult = await sendWhatsAppMessage({
        to: contact.mobileNumber,
        templateName: campaign.type === 'TEMPLATE' && campaign.template ? campaign.template.name : undefined,
        templateLanguage: campaign.template?.language || 'en',
        components: templateComponents,
        customBody: personalizedBody,
      });

      const now = new Date();

      if (sendResult.success && sendResult.whatsappMessageId) {
        // Successful submission to Meta
        await prisma.campaignContact.update({
          where: { id: item.id },
          data: {
            status: 'SUBMITTED',
            whatsappMessageId: sendResult.whatsappMessageId,
            submittedAt: now,
            errorMessage: null,
            errorCode: null,
          },
        });

        // Create Message record
        const messageRecord = await prisma.message.create({
          data: {
            whatsappMessageId: sendResult.whatsappMessageId,
            campaignId: campaign.id,
            contactId: contact.id,
            recipientNumber: contact.mobileNumber,
            senderNumber: 'SLRJ DIGITAL (+91 84669 74408)',
            direction: 'OUTBOUND',
            messageType: campaign.type,
            templateName: campaign.type === 'TEMPLATE' && campaign.template ? campaign.template.name : undefined,
            content: personalizedBody || campaign.template?.bodyText || 'WhatsApp Outreach Message',
            submissionStatus: 'SUBMITTED',
            deliveryStatus: 'SUBMITTED',
            status: 'SUBMITTED',
            submittedAt: now,
            rawPayload: JSON.stringify(sendResult.rawRequest || {}),
            rawResponse: JSON.stringify(sendResult.rawResponse || {}),
          },
        });

        // Record status event
        await prisma.messageStatusEvent.create({
          data: {
            messageId: messageRecord.id,
            whatsappMessageId: sendResult.whatsappMessageId,
            eventType: 'SUBMITTED',
            timestamp: now,
          },
        });
      } else {
        // Dispatch failed
        await prisma.campaignContact.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            failedAt: now,
            errorMessage: sendResult.error || 'Failed to dispatch via WhatsApp Cloud API',
            errorCode: sendResult.errorCode || 'DISPATCH_ERROR',
          },
        });

        await prisma.message.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            recipientNumber: contact.mobileNumber,
            direction: 'OUTBOUND',
            messageType: campaign.type,
            content: personalizedBody || campaign.template?.bodyText || 'WhatsApp Outreach Message',
            submissionStatus: 'FAILED',
            deliveryStatus: 'FAILED',
            status: 'FAILED',
            failedAt: now,
            errorCode: sendResult.errorCode || 'DISPATCH_ERROR',
            errorDescription: sendResult.error || 'Failed to dispatch via WhatsApp Cloud API',
            rawPayload: JSON.stringify(sendResult.rawRequest || {}),
            rawResponse: JSON.stringify(sendResult.rawResponse || {}),
          },
        });
      }

      processedCount++;

      // Meta safe throttle: 80ms between requests
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    // Recalculate campaign counters
    await updateCampaignCounters(campaignId);

    // Count remaining pending contacts
    const remainingPending = await prisma.campaignContact.count({
      where: {
        campaignId,
        status: { in: ['PENDING', 'QUEUED', 'SENDING'] },
      },
    });

    const isCompleted = remainingPending === 0;

    if (isCompleted) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      if (jobId) {
        await prisma.automationJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            finishedAt: new Date(),
          },
        });
      }
    } else if (jobId) {
      // Calculate progress percentage
      const total = campaign.totalContacts || 1;
      const sent = campaign.sentCount || 0;
      const progressPct = Math.min(Math.round((sent / total) * 100), 99);

      await prisma.automationJob.update({
        where: { id: jobId },
        data: { progress: progressPct },
      });
    }

    return {
      success: true,
      campaignId,
      status: isCompleted ? 'COMPLETED' : 'RUNNING',
      processedInBatch: processedCount,
      remainingPending,
      isCompleted,
      isPaused: false,
      isCancelled: false,
    };
  } catch (error: any) {
    console.error('Error during campaign batch execution:', error);
    return {
      success: false,
      campaignId,
      status: 'ERROR',
      processedInBatch: 0,
      remainingPending: 0,
      isCompleted: false,
      isPaused: false,
      isCancelled: false,
      error: error.message || 'Execution error',
    };
  }
}

/**
 * Re-calculate real-time stats for the campaign
 */
export async function updateCampaignCounters(campaignId: string) {
  const counts = await prisma.campaignContact.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { status: true },
  });

  let submitted = 0;
  let sent = 0;
  let delivered = 0;
  let read = 0;
  let failed = 0;
  let pending = 0;

  for (const c of counts) {
    const num = c._count.status;
    if (c.status === 'SUBMITTED') submitted += num;
    if (c.status === 'SENT') {
      sent += num;
    }
    if (c.status === 'DELIVERED') {
      delivered += num;
      sent += num; // Delivered implies it was sent
    }
    if (c.status === 'READ') {
      read += num;
      delivered += num; // Read implies delivered
      sent += num;
    }
    if (c.status === 'FAILED') failed += num;
    if (c.status === 'PENDING' || c.status === 'QUEUED' || c.status === 'SENDING') pending += num;
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: sent,
      deliveredCount: delivered,
      readCount: read,
      failedCount: failed,
      pendingCount: pending + submitted, // Submitted contacts awaiting webhook status update
    },
  });
}
