import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeCampaignBatch } from '@/lib/campaign-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Endpoint for Background Campaign Progression
 * Configured in vercel.json to run every minute (* * * * *).
 * Picks up all RUNNING campaigns and executes the next batch safely.
 */
export async function GET(request: NextRequest) {
  try {
    // Optional Vercel Cron Secret authentication
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    // 1. Process any scheduled campaigns whose scheduledAt <= now
    const now = new Date();
    const scheduledDue = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      select: { id: true },
    });

    for (const sc of scheduledDue) {
      await prisma.campaign.update({
        where: { id: sc.id },
        data: { status: 'RUNNING', startedAt: now },
      });
    }

    // 2. Fetch all RUNNING campaigns
    const runningCampaigns = await prisma.campaign.findMany({
      where: { status: 'RUNNING' },
      select: { id: true, name: true },
      take: 5,
    });

    const results = [];

    for (const camp of runningCampaigns) {
      const batchResult = await executeCampaignBatch(camp.id, 20);
      results.push({
        campaignId: camp.id,
        name: camp.name,
        batchResult,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processedCampaigns: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[Cron Error] Campaign runner error:', error);
    return NextResponse.json({ error: error.message || 'Cron error' }, { status: 500 });
  }
}
