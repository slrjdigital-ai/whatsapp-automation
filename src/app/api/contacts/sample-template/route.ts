import { NextResponse } from 'next/server';
import { generateSampleCsv } from '@/lib/file-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const csvContent = generateSampleCsv();
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="SLRJ_DIGITAL_Contacts_Template.csv"',
    },
  });
}
