import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Papa from 'papaparse';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        campaignContacts: {
          include: { contact: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const reportRows = campaign.campaignContacts.map((cc) => ({
      'Contact Name': cc.contact.fullName,
      'Mobile Number': cc.contact.mobileNumber,
      'Business Name': cc.contact.businessName || '',
      'Status': cc.status,
      'WhatsApp Message ID': cc.whatsappMessageId || '',
      'Sent At': cc.sentAt ? cc.sentAt.toISOString() : '',
      'Delivered At': cc.deliveredAt ? cc.deliveredAt.toISOString() : '',
      'Read At': cc.readAt ? cc.readAt.toISOString() : '',
      'Error Code': cc.errorCode || '',
      'Error Message': cc.errorMessage || '',
    }));

    const csvData = Papa.unparse(reportRows);
    const sanitizedTitle = campaign.name.replace(/[^a-zA-Z0-9]/g, '_');

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Campaign_Report_${sanitizedTitle}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to export report' }, { status: 500 });
  }
}
