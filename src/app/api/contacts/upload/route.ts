import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processAndValidateRows, parseRawDataRows, RawParsedRow } from '@/lib/file-parser';
import { logAudit } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      rows,
      fileName = 'uploaded_contacts.csv',
      action = 'PREVIEW', // 'PREVIEW' or 'COMMIT'
      groupName,
      overrideExistingConsent = false,
    } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided.' }, { status: 400 });
    }

    // Load existing phone numbers and suppression numbers for fast lookup
    const [existingContacts, suppressionRecords] = await Promise.all([
      prisma.contact.findMany({ select: { mobileNumber: true } }),
      prisma.suppressionList.findMany({ select: { mobileNumber: true } }),
    ]);

    const existingDbNumbers = new Set(existingContacts.map((c) => c.mobileNumber));
    const suppressedNumbers = new Set(suppressionRecords.map((s) => s.mobileNumber));

    // Parse raw rows if needed
    const rawParsedRows: RawParsedRow[] =
      rows[0]?.fullName !== undefined && (rows[0]?.rawMobile !== undefined || rows[0]?.normalizedMobile !== undefined || rows[0]?.mobileNumber !== undefined)
        ? rows.map((r, i) => ({
            rowIndex: i + 1,
            fullName: r.fullName,
            mobileNumber: r.normalizedMobile || r.mobileNumber || r.rawMobile,
            countryCode: r.countryCode,
            email: r.email,
            businessName: r.businessName,
            category: r.category,
            marketingConsent: r.marketingConsent !== undefined ? r.marketingConsent : r.consentStatus,
            consentSource: r.consentSource,
            consentDate: r.consentDate,
            consentEvidence: r.consentEvidence,
          }))
        : parseRawDataRows(rows);

    const summary = await processAndValidateRows(
      rawParsedRows,
      fileName,
      existingDbNumbers,
      suppressedNumbers
    );

    // If PREVIEW action, return the validation report immediately without writing to database
    if (action === 'PREVIEW') {
      return NextResponse.json({
        success: true,
        action: 'PREVIEW',
        summary,
      });
    }

    // ACTION: COMMIT -> Insert valid rows into the database
    let targetGroupId: string | null = null;
    if (groupName && groupName.trim()) {
      const cleanGroupName = groupName.trim();
      const group = await prisma.contactGroup.upsert({
        where: { name: cleanGroupName },
        update: {},
        create: {
          name: cleanGroupName,
          description: `Imported via file ${fileName} on ${new Date().toLocaleDateString()}`,
        },
      });
      targetGroupId = group.id;
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of summary.rows) {
      // Skip invalid or duplicate numbers within the batch
      if (!row.isValidNumber || row.isDuplicateInBatch) {
        skippedCount++;
        continue;
      }

      // Check if contact already exists
      const existing = await prisma.contact.findUnique({
        where: { mobileNumber: row.normalizedMobile },
      });

      let contactRecord;

      if (existing) {
        const updateData: any = {
          fullName: row.fullName || existing.fullName,
          businessName: row.businessName || existing.businessName,
          email: row.email || existing.email,
          category: row.category || existing.category,
        };

        // Always update consent if affirmative consent evidence is provided, or if overrideExistingConsent is enabled
        if (
          (row.consentStatus === 'OPTED_IN' && existing.consentStatus !== 'OPTED_IN') ||
          row.consentStatus === 'OPTED_OUT' ||
          overrideExistingConsent
        ) {
          updateData.consentStatus = row.consentStatus;
          updateData.consentSource = row.consentSource || existing.consentSource;
          updateData.consentDate = row.consentDate || existing.consentDate;
          updateData.consentEvidence = row.consentEvidence || existing.consentEvidence;
        }

        contactRecord = await prisma.contact.update({
          where: { id: existing.id },
          data: updateData,
        });
        updatedCount++;
      } else {
        contactRecord = await prisma.contact.create({
          data: {
            fullName: row.fullName,
            mobileNumber: row.normalizedMobile,
            countryCode: row.countryCode,
            nationalNumber: row.nationalNumber,
            email: row.email || null,
            businessName: row.businessName || null,
            category: row.category || 'General',
            status: 'VALID',
            consentStatus: row.consentStatus,
            consentSource: row.consentSource || null,
            consentDate: row.consentDate || null,
            consentEvidence: row.consentEvidence || null,
          },
        });
        importedCount++;
      }

      // Link to ContactGroup if specified
      if (targetGroupId) {
        await prisma.contactGroupMember.upsert({
          where: {
            contactId_groupId: {
              contactId: contactRecord.id,
              groupId: targetGroupId,
            },
          },
          update: {},
          create: {
            contactId: contactRecord.id,
            groupId: targetGroupId,
          },
        });
      }

      // Record full consent audit history in ContactConsent
      await prisma.contactConsent.create({
        data: {
          contactId: contactRecord.id,
          status: row.consentStatus,
          source: row.consentSource || 'EXCEL_UPLOAD',
          evidence: row.consentEvidence || null,
          optInDate: row.consentStatus === 'OPTED_IN' ? (row.consentDate || new Date()) : null,
          optOutDate: row.consentStatus === 'OPTED_OUT' ? (row.consentDate || new Date()) : null,
          notes: `Batch upload from file ${fileName}`,
        },
      });

      // If contact is explicitly OPTED_OUT, enforce permanent suppression
      if (row.consentStatus === 'OPTED_OUT') {
        await prisma.suppressionList.upsert({
          where: { mobileNumber: row.normalizedMobile },
          update: {
            reason: 'USER_STOP',
            notes: `Opted out during file import: ${fileName}`,
            suppressedBy: user?.id || 'FILE_IMPORT',
          },
          create: {
            mobileNumber: row.normalizedMobile,
            reason: 'USER_STOP',
            notes: `Opted out during file import: ${fileName}`,
            suppressedBy: user?.id || 'FILE_IMPORT',
          },
        });
      }
    }

    await logAudit({
      userId: user?.id,
      action: 'CONTACT_BULK_IMPORT',
      entityType: 'Contact',
      details: {
        fileName,
        importedCount,
        updatedCount,
        skippedCount,
        eligibleOptedInCount: summary.eligibleOptedInCount,
        pendingVerificationCount: summary.pendingVerificationCount,
        targetGroup: groupName || null,
      },
    });

    return NextResponse.json({
      success: true,
      action: 'COMMIT',
      summary: {
        ...summary,
        importedCount,
        updatedCount,
        skippedCount,
      },
    });
  } catch (error: any) {
    console.error('Error processing bulk upload:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process bulk upload' }, { status: 500 });
  }
}
