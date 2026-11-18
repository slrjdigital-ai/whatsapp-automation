import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { wamid: string } }
) {
  try {
    const wamid = params.wamid;

    if (!wamid) {
      return NextResponse.json({ error: 'WhatsApp Message ID (wamid) is required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { whatsappMessageId: wamid },
      include: {
        events: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found for the given wamid' }, { status: 404 });
    }

    return NextResponse.json({
      id: message.id,
      whatsappMessageId: message.whatsappMessageId,
      recipientNumber: message.recipientNumber,
      senderNumber: message.senderNumber,
      submissionStatus: message.submissionStatus,
      deliveryStatus: message.deliveryStatus,
      status: message.deliveryStatus,
      templateName: message.templateName,
      submittedAt: message.submittedAt,
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      failedAt: message.failedAt,
      errorCode: message.errorCode,
      errorDescription: message.errorDescription,
      events: message.events.map((e) => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        errorDetails: e.errorDetails,
      })),
      rawPayload: message.rawPayload ? JSON.parse(message.rawPayload) : null,
      rawResponse: message.rawResponse ? JSON.parse(message.rawResponse) : null,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve message status' },
      { status: 500 }
    );
  }
}
