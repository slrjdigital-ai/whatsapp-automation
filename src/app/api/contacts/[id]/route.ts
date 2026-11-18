import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAndNormalizePhone } from '@/lib/phone';
import { logAudit } from '@/lib/audit';
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

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        consents: { orderBy: { createdAt: 'desc' } },
        groups: { include: { group: true } },
        campaignContacts: {
          include: { campaign: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch contact' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, businessName, email, category, consentStatus, consentSource, consentEvidence, notes } = body;

    const existing = await prisma.contact.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const consentChanged = consentStatus && consentStatus !== existing.consentStatus;
    const resolvedConsentDate = consentStatus === 'OPTED_IN' ? (existing.consentDate || new Date()) : existing.consentDate;

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: {
        fullName: fullName ? fullName.trim() : existing.fullName,
        businessName: businessName !== undefined ? businessName?.trim() : existing.businessName,
        email: email !== undefined ? email?.trim() : existing.email,
        category: category !== undefined ? category?.trim() : existing.category,
        consentStatus: consentStatus || existing.consentStatus,
        consentSource: consentSource !== undefined ? consentSource : existing.consentSource,
        consentDate: consentChanged && consentStatus === 'OPTED_IN' ? new Date() : resolvedConsentDate,
        consentEvidence: consentEvidence !== undefined ? consentEvidence : existing.consentEvidence,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    // If consent status changed, record consent trail
    if (consentChanged) {
      await prisma.contactConsent.create({
        data: {
          contactId: updated.id,
          status: consentStatus,
          source: consentSource || 'MANUAL_ADMIN',
          evidence: consentEvidence || null,
          optInDate: consentStatus === 'OPTED_IN' ? new Date() : null,
          optOutDate: consentStatus === 'OPTED_OUT' ? new Date() : null,
          notes: notes || `Consent status updated to ${consentStatus} by administrator ${user?.name || ''}`,
        },
      });

      // If opted out, also add to suppression list
      if (consentStatus === 'OPTED_OUT') {
        await prisma.suppressionList.upsert({
          where: { mobileNumber: updated.mobileNumber },
          update: { reason: 'MANUAL_ADMIN', notes: 'Manually opted-out by administrator' },
          create: {
            mobileNumber: updated.mobileNumber,
            reason: 'MANUAL_ADMIN',
            notes: 'Manually opted-out by administrator',
            suppressedBy: user?.id,
          },
        });
      }
    }

    await logAudit({
      userId: user?.id,
      action: 'CONTACT_UPDATE',
      entityType: 'Contact',
      entityId: updated.id,
      details: { fullName: updated.fullName, consentStatus: updated.consentStatus },
    });

    return NextResponse.json({ success: true, contact: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Login required.' }, { status: 401 });
    }

    await prisma.contact.delete({
      where: { id: params.id },
    });

    await logAudit({
      userId: user?.id,
      action: 'CONTACT_DELETE',
      entityType: 'Contact',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete contact' }, { status: 500 });
  }
}
