import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWhatsAppConfig } from '@/lib/whatsapp';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [
      totalContacts,
      validContacts,
      invalidContacts,
      optedInContacts,
      optedOutContacts,
      unknownConsentContacts,
      totalSuppressed,
      totalCampaigns,
      allCampaigns,
      recentCampaigns,
      recentMessages,
      whatsAppAccount,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'VALID' } }),
      prisma.contact.count({ where: { status: 'INVALID' } }),
      prisma.contact.count({ where: { consentStatus: 'OPTED_IN', status: 'VALID' } }),
      prisma.contact.count({ where: { consentStatus: 'OPTED_OUT' } }),
      prisma.contact.count({ where: { consentStatus: { in: ['PENDING_VERIFICATION', 'UNKNOWN'] } } }),
      prisma.suppressionList.count(),
      prisma.campaign.count(),
      prisma.campaign.findMany({
        select: {
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          failedCount: true,
          pendingCount: true,
        },
      }),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { displayName: true } },
        },
      }),
      prisma.messageStatusEvent.findMany({
        take: 50,
        orderBy: { timestamp: 'desc' },
        select: {
          eventType: true,
          timestamp: true,
        },
      }),
      prisma.whatsAppAccount.findFirst(),
    ]);

    // Aggregate message stats across all campaigns and direct messages
    let totalSent = await prisma.message.count({ where: { deliveryStatus: { in: ['SENT', 'DELIVERED', 'READ'] } } });
    let totalDelivered = await prisma.message.count({ where: { deliveryStatus: { in: ['DELIVERED', 'READ'] } } });
    let totalRead = await prisma.message.count({ where: { deliveryStatus: 'READ' } });
    let totalFailed = await prisma.message.count({ where: { deliveryStatus: 'FAILED' } });
    let totalPending = await prisma.message.count({ where: { deliveryStatus: { in: ['QUEUED', 'SUBMITTED'] } } });

    for (const c of allCampaigns) {
      if (totalSent === 0) {
        totalSent += c.sentCount;
        totalDelivered += c.deliveredCount;
        totalRead += c.readCount;
        totalFailed += c.failedCount;
        totalPending += c.pendingCount;
      }
    }

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    // Build timeline chart data for the last 7 days
    const chartDays: Record<string, { date: string; sent: number; delivered: number; read: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chartDays[key] = { date: key, sent: 0, delivered: 0, read: 0, failed: 0 };
    }

    // Populate chart points from events
    for (const ev of recentMessages) {
      const key = new Date(ev.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (chartDays[key]) {
        if (ev.eventType === 'SENT') chartDays[key].sent++;
        if (ev.eventType === 'DELIVERED') chartDays[key].delivered++;
        if (ev.eventType === 'READ') chartDays[key].read++;
        if (ev.eventType === 'FAILED') chartDays[key].failed++;
      }
    }

    const chartData = Object.values(chartDays);
    const config = await getWhatsAppConfig();

    return NextResponse.json({
      success: true,
      stats: {
        totalContacts,
        validContacts,
        invalidContacts,
        optedInContacts,
        optedOutContacts,
        unknownConsentContacts,
        totalSuppressed,
        totalCampaigns,
        messages: {
          sent: totalSent,
          delivered: totalDelivered,
          read: totalRead,
          failed: totalFailed,
          pending: totalPending,
          deliveryRate,
          readRate,
        },
      },
      chartData,
      recentCampaigns,
      whatsapp: {
        isConnected: whatsAppAccount?.isConnected || false,
        status: whatsAppAccount?.status || 'DISCONNECTED',
        displayPhoneNumber: whatsAppAccount?.displayPhoneNumber || '+91 84669 74408',
        verifiedName: whatsAppAccount?.verifiedName || 'SLRJ DIGITAL',
        qualityRating: whatsAppAccount?.qualityRating || 'GREEN',
        messagingLimitTier: whatsAppAccount?.messagingLimitTier || 'TIER_1K',
        isDemoMode: config.isDemoMode,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
