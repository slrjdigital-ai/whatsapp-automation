import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWhatsAppConfig, sendWhatsAppMessage } from '@/lib/whatsapp';
import { getCurrentUser } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientMobileNumber, templateName, customText, variables } = body;

    if (!recipientMobileNumber || typeof recipientMobileNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Recipient mobile number is required.' },
        { status: 400 }
      );
    }

    // 1. Validate & Normalize Phone Number to E.164
    const phoneNorm = normalizePhoneNumber(recipientMobileNumber);
    if (!phoneNorm.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid mobile number: ${recipientMobileNumber}. Reason: ${phoneNorm.error || 'Invalid phone format'}`,
          errorCode: 'INVALID_PHONE_NUMBER',
        },
        { status: 400 }
      );
    }

    const cleanRecipientE164 = phoneNorm.e164; // e.g. "+919876543210"
    const digitsOnly = cleanRecipientE164.replace(/\D/g, ''); // e.g. "919876543210"

    // 2. Check WhatsApp Configuration
    const config = await getWhatsAppConfig();
    if (!config.phoneNumberId || !config.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Official WhatsApp Business Cloud API is not configured. Please enter your Phone Number ID and System User Access Token in Settings.',
          errorCode: 'MISSING_CREDENTIALS',
        },
        { status: 400 }
      );
    }

    // Prepare message options
    // Meta Cloud API comes standard with the approved sample template "hello_world" (en_US)
    const effectiveTemplate = templateName || 'hello_world';
    const templateLang = effectiveTemplate === 'hello_world' ? 'en_US' : 'en';

    let components: any[] | undefined = undefined;
    if (variables && Array.isArray(variables) && variables.length > 0) {
      components = [
        {
          type: 'body',
          parameters: variables.map((v: string) => ({ type: 'text', text: v })),
        },
      ];
    }

    // 3. Dispatch Authentic WhatsApp API Request
    const sendResult = await sendWhatsAppMessage({
      to: digitsOnly,
      templateName: effectiveTemplate,
      templateLanguage: templateLang,
      components,
      customBody: customText,
    });

    const now = new Date();
    const wamid = sendResult.whatsappMessageId || null;

    // 4. Record outgoing message in database with SUBMITTED or FAILED status
    const messageRecord = await prisma.message.create({
      data: {
        whatsappMessageId: wamid,
        recipientNumber: cleanRecipientE164,
        senderNumber: config.displayPhoneNumber || config.phoneNumberId,
        direction: 'OUTBOUND',
        messageType: 'TEMPLATE',
        templateName: effectiveTemplate,
        content: customText || `Template: ${effectiveTemplate}`,
        submissionStatus: sendResult.success ? 'SUBMITTED' : 'FAILED',
        deliveryStatus: sendResult.success ? 'SUBMITTED' : 'FAILED',
        status: sendResult.success ? 'SUBMITTED' : 'FAILED',
        submittedAt: sendResult.success ? now : null,
        failedAt: sendResult.success ? null : now,
        errorCode: sendResult.errorCode,
        errorDescription: sendResult.error,
        rawPayload: JSON.stringify(sendResult.rawRequest || {}),
        rawResponse: JSON.stringify(sendResult.rawResponse || {}),
      },
    });

    if (sendResult.success && wamid) {
      await prisma.messageStatusEvent.create({
        data: {
          messageId: messageRecord.id,
          whatsappMessageId: wamid,
          eventType: 'SUBMITTED',
          timestamp: now,
          rawPayload: JSON.stringify(sendResult.rawResponse || {}),
        },
      });
    }

    await logAudit({
      userId: user?.id,
      action: 'WHATSAPP_TEST_DISPATCH',
      entityType: 'Message',
      entityId: messageRecord.id,
      details: {
        recipient: cleanRecipientE164,
        wamid,
        success: sendResult.success,
        errorCode: sendResult.errorCode,
      },
    });

    return NextResponse.json({
      success: sendResult.success,
      messageId: messageRecord.id,
      whatsappMessageId: wamid,
      submissionStatus: sendResult.success ? 'SUBMITTED' : 'FAILED',
      deliveryStatus: sendResult.success ? 'SUBMITTED' : 'FAILED',
      status: sendResult.success ? 'SUBMITTED' : 'FAILED',
      recipient: cleanRecipientE164,
      isTestNumber: config.isTestNumber,
      testNumberWarning: config.isTestNumber
        ? "Warning: Your WhatsApp configuration uses a Meta Sandbox Test Number. Outbound messages can only be received if the recipient mobile number has been added to the Allowed Test Recipients list in Meta App Dashboard (WhatsApp > API Setup)."
        : null,
      error: sendResult.error,
      errorCode: sendResult.errorCode,
      rawRequest: sendResult.rawRequest,
      rawResponse: sendResult.rawResponse,
    });
  } catch (err: any) {
    console.error('Error in send-test route:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error while dispatching test message',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
