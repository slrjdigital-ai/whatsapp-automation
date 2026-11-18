import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncMetaTemplates } from '@/lib/whatsapp';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'ALL';

    const where: any = {};
    if (category !== 'ALL') {
      where.category = category;
    }

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'CREATE', ...templateData } = body;

    if (action === 'SYNC') {
      const syncResult = await syncMetaTemplates();
      await logAudit({
        userId: user?.id,
        action: 'TEMPLATES_SYNC_META',
        entityType: 'MessageTemplate',
        details: syncResult,
      });
      return NextResponse.json(syncResult);
    }

    // Create Template
    const {
      name,
      displayName,
      category = 'MARKETING',
      language = 'en',
      headerType = 'NONE',
      headerContent,
      bodyText,
      footerText,
      buttons,
    } = templateData;

    if (!name || !displayName || !bodyText) {
      return NextResponse.json({ error: 'Name, Display Name, and Body Text are required' }, { status: 400 });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const template = await prisma.messageTemplate.create({
      data: {
        name: cleanName,
        displayName: displayName.trim(),
        category,
        language,
        status: 'APPROVED',
        headerType,
        headerContent: headerContent?.trim() || null,
        bodyText: bodyText.trim(),
        footerText: footerText?.trim() || null,
        buttonsJson: buttons ? JSON.stringify(buttons) : null,
      },
    });

    await logAudit({
      userId: user?.id,
      action: 'TEMPLATE_CREATE',
      entityType: 'MessageTemplate',
      entityId: template.id,
      details: { name: template.name },
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to process template request' }, { status: 500 });
  }
}
