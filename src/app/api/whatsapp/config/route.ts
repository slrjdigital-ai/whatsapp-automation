import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await prisma.whatsAppAccount.findFirst();

    // Mask sensitive token for security
    const maskedToken = account?.accessToken
      ? `${account.accessToken.substring(0, 8)}••••••••${account.accessToken.slice(-6)}`
      : '';

    return NextResponse.json({
      success: true,
      config: {
        accountName: account?.accountName || 'SLRJ DIGITAL Official WABA',
        wabaId: account?.wabaId || '',
        phoneNumberId: account?.phoneNumberId || '',
        displayPhoneNumber: account?.displayPhoneNumber || '+91 84669 74408',
        verifiedName: account?.verifiedName || 'SLRJ DIGITAL',
        qualityRating: account?.qualityRating || 'GREEN',
        messagingLimitTier: account?.messagingLimitTier || 'TIER_1K',
        webhookVerifyToken: account?.webhookVerifyToken || 'slrj_digital_secure_wh_2026',
        hasAppSecret: Boolean(account?.appSecret),
        apiVersion: account?.apiVersion || 'v21.0',
        isConnected: account?.isConnected || false,
        isDemoMode: false,
        isTestNumber: account?.isTestNumber || false,
        lastVerifiedAt: account?.lastVerifiedAt,
        hasAccessToken: Boolean(account?.accessToken),
        maskedAccessToken: maskedToken,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch WhatsApp config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin role required to modify API credentials.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      accountName,
      wabaId,
      phoneNumberId,
      accessToken,
      webhookVerifyToken,
      appSecret,
      apiVersion = 'v21.0',
      isDemoMode,
      displayPhoneNumber,
      verifiedName,
    } = body;

    const existing = await prisma.whatsAppAccount.findFirst();

    const updateData: any = {
      accountName: accountName?.trim() || 'SLRJ DIGITAL Official WABA',
      wabaId: wabaId?.trim() || null,
      phoneNumberId: phoneNumberId?.trim() || null,
      webhookVerifyToken: webhookVerifyToken?.trim() || 'slrj_digital_secure_wh_2026',
      appSecret: appSecret?.trim() || null,
      apiVersion: apiVersion?.trim() || 'v21.0',
      isDemoMode: isDemoMode !== undefined ? isDemoMode : false,
      displayPhoneNumber: displayPhoneNumber?.trim() || null,
      verifiedName: verifiedName?.trim() || 'SLRJ DIGITAL',
    };

    // Only update access token if a non-empty string that isn't masked is provided
    if (accessToken && !accessToken.includes('••••')) {
      updateData.accessToken = accessToken.trim();
    }

    let account;
    if (existing) {
      account = await prisma.whatsAppAccount.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      account = await prisma.whatsAppAccount.create({
        data: updateData,
      });
    }

    await logAudit({
      userId: user.id,
      action: 'WHATSAPP_CONFIG_UPDATE',
      entityType: 'WhatsAppAccount',
      entityId: account.id,
      details: {
        wabaId: account.wabaId,
        phoneNumberId: account.phoneNumberId,
        isDemoMode: account.isDemoMode,
      },
    });

    return NextResponse.json({ success: true, message: 'WhatsApp configuration updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update WhatsApp configuration' }, { status: 500 });
  }
}
