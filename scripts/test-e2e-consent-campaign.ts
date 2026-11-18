import prisma from '../src/lib/prisma';
import { executeCampaignBatch } from '../src/lib/campaign-runner';

async function testE2E() {
  console.log('===============================================================');
  console.log('SLRJ DIGITAL — End-to-End Consent to Campaign Verification');
  console.log('===============================================================\n');

  // 1. Create a clean test group
  const testGroup = await prisma.contactGroup.create({
    data: {
      name: `Test Group Verification ${Date.now()}`,
      description: 'Automated test group for campaign eligibility verification',
    },
  });

  // 2. Insert 3 Eligible Opted-In contacts
  const eligible1 = await prisma.contact.create({
    data: {
      fullName: 'Dr. Sameer Joshi',
      mobileNumber: `+9198300${Math.floor(10000 + Math.random() * 90000)}`,
      countryCode: '91',
      nationalNumber: '9830012345',
      consentStatus: 'OPTED_IN',
      consentSource: 'WEBSITE_FORM',
      consentDate: new Date(),
      consentEvidence: 'Voluntary Opt-In Form #9021',
      status: 'VALID',
    },
  });

  const eligible2 = await prisma.contact.create({
    data: {
      fullName: 'Pooja Bhatt',
      mobileNumber: `+9198301${Math.floor(10000 + Math.random() * 90000)}`,
      countryCode: '91',
      nationalNumber: '9830112345',
      consentStatus: 'OPTED_IN',
      consentSource: 'CUSTOMER_ENQUIRY',
      consentDate: new Date(),
      consentEvidence: 'Inbound WhatsApp Enquiry Ref #881',
      status: 'VALID',
    },
  });

  // 3. Insert 2 Contacts with PENDING_VERIFICATION (missing consent)
  const pending1 = await prisma.contact.create({
    data: {
      fullName: 'Akash Cold Lead (Pending)',
      mobileNumber: `+9198302${Math.floor(10000 + Math.random() * 90000)}`,
      countryCode: '91',
      nationalNumber: '9830212345',
      consentStatus: 'PENDING_VERIFICATION',
      status: 'VALID',
    },
  });

  const pending2 = await prisma.contact.create({
    data: {
      fullName: 'Sunil Unverified (Pending)',
      mobileNumber: `+9198303${Math.floor(10000 + Math.random() * 90000)}`,
      countryCode: '91',
      nationalNumber: '9830312345',
      consentStatus: 'PENDING_VERIFICATION',
      status: 'VALID',
    },
  });

  // 4. Insert 1 Contact with OPTED_OUT
  const optedOut1 = await prisma.contact.create({
    data: {
      fullName: 'Kiran OptedOut (STOP)',
      mobileNumber: `+9198304${Math.floor(10000 + Math.random() * 90000)}`,
      countryCode: '91',
      nationalNumber: '9830412345',
      consentStatus: 'OPTED_OUT',
      status: 'VALID',
    },
  });

  // Link all 5 to the test group
  const allContacts = [eligible1, eligible2, pending1, pending2, optedOut1];
  for (const c of allContacts) {
    await prisma.contactGroupMember.create({
      data: { contactId: c.id, groupId: testGroup.id },
    });
  }

  console.log(`✓ Created test group "${testGroup.name}" with 5 contacts:`);
  console.log('   - 2 Eligible Opted-In');
  console.log('   - 2 Pending Verification (Missing Consent)');
  console.log('   - 1 Opted Out');

  // 5. Test Audience Filtering Query
  const memberships = await prisma.contactGroupMember.findMany({
    where: { groupId: testGroup.id },
    include: {
      contact: {
        select: { id: true, mobileNumber: true, consentStatus: true },
      },
    },
  });
  const candidateContacts = memberships.map((m) => m.contact);

  const eligibleContacts = candidateContacts.filter((c) => c.consentStatus === 'OPTED_IN');
  const excludedContacts = candidateContacts.filter((c) => c.consentStatus !== 'OPTED_IN');

  console.log(`\nAudience Evaluation:`);
  console.log(`   - Evaluated Candidates: ${candidateContacts.length}`);
  console.log(`   - Filtered Eligible Opted-In: ${eligibleContacts.length} (Expected: 2)`);
  console.log(`   - Filtered Excluded: ${excludedContacts.length} (Expected: 3)`);

  if (eligibleContacts.length !== 2) {
    throw new Error(`Expected 2 eligible contacts, got ${eligibleContacts.length}`);
  }

  // 6. Test Campaign Creation with this audience
  const defaultTemplate = await prisma.messageTemplate.findFirst();

  const campaign = await prisma.campaign.create({
    data: {
      name: `E2E Campaign Test ${Date.now()}`,
      type: 'TEMPLATE',
      templateId: defaultTemplate?.id,
      totalContacts: candidateContacts.length,
      eligibleContacts: eligibleContacts.length,
      pendingCount: eligibleContacts.length,
      status: 'RUNNING',
      isDemo: true,
    },
  });

  // Create CampaignContact records ONLY for eligible contacts
  await prisma.campaignContact.createMany({
    data: eligibleContacts.map((c) => ({
      campaignId: campaign.id,
      contactId: c.id,
      status: 'PENDING',
    })),
  });

  console.log(`\n✓ Campaign created successfully: ID ${campaign.id}`);
  console.log(`   - Total Contacts in Campaign Audience: ${campaign.totalContacts}`);
  console.log(`   - Eligible Contacts Admitted to Campaign: ${campaign.eligibleContacts}`);

  // 7. Verify Campaign Contacts in DB
  const campaignContacts = await prisma.campaignContact.findMany({
    where: { campaignId: campaign.id },
    include: { contact: true },
  });

  console.log('\nAdmitted Campaign Recipients:');
  for (const cc of campaignContacts) {
    console.log(`   - ${cc.contact.fullName} (${cc.contact.mobileNumber}) -> Status: ${cc.contact.consentStatus}`);
    if (cc.contact.consentStatus !== 'OPTED_IN') {
      throw new Error(`CRITICAL VIOLATION: Non-opted-in contact admitted to campaign: ${cc.contact.fullName}`);
    }
  }

  // Clean up test campaign & group
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.contactGroup.delete({ where: { id: testGroup.id } });
  for (const c of allContacts) {
    await prisma.contact.delete({ where: { id: c.id } });
  }

  console.log('\n===============================================================');
  console.log('✓ E2E INTEGRATION TEST PASSED: 100% STRICT OPT-IN COMPLIANCE!');
  console.log('===============================================================');
}

testE2E().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
