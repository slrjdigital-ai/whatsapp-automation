import prisma from '../src/lib/prisma';
import { processAndValidateRows, parseRawDataRows } from '../src/lib/file-parser';
import { validateAndNormalizePhone } from '../src/lib/phone';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('SLRJ DIGITAL — WhatsApp Campaign Eligibility & Consent Test Suite');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 7;

  // Mock database existing numbers and suppression set
  const existingDbNumbers = new Set<string>();
  const suppressedNumbers = new Set<string>(['+919811088990']);

  // Define the 7 test scenarios as requested in the requirements
  const testBatch = [
    // Case 1: Genuine Opt-In Consent
    {
      'Full Name': 'Case 1 - Genuine OptIn Lead',
      'Mobile Number': '+919820100001',
      'Country Code': '91',
      'Email': 'lead1@company.com',
      'Marketing Consent': 'YES',
      'Consent Source': 'Website Enquiry Form',
      'Consent Date': '2026-03-15',
      'Consent Evidence': 'Form submission #W101',
    },
    // Case 2: Contact without consent (blank/missing)
    {
      'Full Name': 'Case 2 - No Consent Lead',
      'Mobile Number': '+919820100002',
      'Country Code': '91',
      'Email': 'lead2@company.com',
      'Marketing Consent': '',
      'Consent Source': 'Cold Contact Scrape',
      'Consent Date': '',
      'Consent Evidence': '',
    },
    // Case 3: Contact who opted out ("NO")
    {
      'Full Name': 'Case 3 - Opted Out Customer',
      'Mobile Number': '+919820100003',
      'Country Code': '91',
      'Email': 'lead3@company.com',
      'Marketing Consent': 'NO',
      'Consent Source': 'Unsubscribe Request',
      'Consent Date': '2026-02-10',
      'Consent Evidence': 'User replied STOP',
    },
    // Case 4: Invalid phone number
    {
      'Full Name': 'Case 4 - Malformed Phone Number',
      'Mobile Number': '12345',
      'Country Code': '91',
      'Email': 'lead4@company.com',
      'Marketing Consent': 'YES',
      'Consent Source': 'Website Form',
      'Consent Date': '2026-03-15',
    },
    // Case 5: Duplicate phone number (same number as Case 1)
    {
      'Full Name': 'Case 5 - Duplicate of Case 1',
      'Mobile Number': '+919820100001',
      'Country Code': '91',
      'Email': 'dup1@company.com',
      'Marketing Consent': 'YES',
      'Consent Source': 'Website Form',
      'Consent Date': '2026-03-15',
    },
    // Case 6: Missing consent date with affirmative opt-in
    {
      'Full Name': 'Case 6 - OptIn Missing Date',
      'Mobile Number': '+919820100006',
      'Country Code': '91',
      'Email': 'lead6@company.com',
      'Marketing Consent': 'TRUE',
      'Consent Source': 'Customer WhatsApp Chat',
      'Consent Date': '', // Missing date
      'Consent Evidence': 'Chat screenshot #99',
    },
    // Case 7: Valid imported historical consent record
    {
      'Full Name': 'Case 7 - Historical Documented Lead',
      'Mobile Number': '+919820100007',
      'Country Code': '91',
      'Email': 'lead7@company.com',
      'Marketing Consent': 'OPTED_IN',
      'Consent Source': 'Contract Agreement 2025',
      'Consent Date': '2025-11-20',
      'Consent Evidence': 'MSA Signed Contract Annexure D',
    },
  ];

  console.log(`Running analysis on ${testBatch.length} test cases through parsing and validation engine...\n`);

  const rawRows = parseRawDataRows(testBatch);
  const summary = await processAndValidateRows(rawRows, 'test_suite.csv', existingDbNumbers, suppressedNumbers);

  const row1 = summary.rows.find((r) => r.fullName.includes('Case 1'));
  const row2 = summary.rows.find((r) => r.fullName.includes('Case 2'));
  const row3 = summary.rows.find((r) => r.fullName.includes('Case 3'));
  const row4 = summary.rows.find((r) => r.fullName.includes('Case 4'));
  const row5 = summary.rows.find((r) => r.fullName.includes('Case 5'));
  const row6 = summary.rows.find((r) => r.fullName.includes('Case 6'));
  const row7 = summary.rows.find((r) => r.fullName.includes('Case 7'));

  // TEST 1: Contact with genuine opt-in consent
  console.log('TEST 1: Contact with Genuine Opt-In Consent');
  if (row1 && row1.isValidNumber && row1.consentStatus === 'OPTED_IN' && row1.isEligibleForMarketing) {
    console.log('  ✓ PASSED: Correctly recognized as OPTED_IN and eligible for campaigns.');
    console.log(`    Source: ${row1.consentSource}, Date: ${row1.consentDate?.toISOString().slice(0, 10)}`);
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 1 to be OPTED_IN and eligible.', row1);
  }

  // TEST 2: Contact without consent
  console.log('\nTEST 2: Contact Without Consent');
  if (row2 && row2.consentStatus === 'PENDING_VERIFICATION' && !row2.isEligibleForMarketing) {
    console.log('  ✓ PASSED: Never automatically marked as opted-in. Flagged PENDING_VERIFICATION and excluded from campaign.');
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 2 to be PENDING_VERIFICATION and excluded.', row2);
  }

  // TEST 3: Contact who opted out ("NO")
  console.log('\nTEST 3: Contact Who Opted Out');
  if (row3 && row3.consentStatus === 'OPTED_OUT' && !row3.isEligibleForMarketing) {
    console.log('  ✓ PASSED: Correctly marked OPTED_OUT and excluded from promotional campaigns.');
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 3 to be OPTED_OUT and excluded.', row3);
  }

  // TEST 4: Invalid phone number
  console.log('\nTEST 4: Invalid Phone Number ("12345")');
  if (row4 && !row4.isValidNumber && !row4.isEligibleForMarketing) {
    console.log(`  ✓ PASSED: Correctly rejected malformed phone format. Error: "${row4.validationError}"`);
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 4 to fail phone validation.', row4);
  }

  // TEST 5: Duplicate phone number
  console.log('\nTEST 5: Duplicate Phone Number in Upload Batch');
  if (row5 && row5.isDuplicateInBatch && !row5.isEligibleForMarketing) {
    console.log('  ✓ PASSED: Second instance flagged as duplicate in batch and excluded from double send.');
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 5 to be marked duplicate.', row5);
  }

  // TEST 6: Missing consent date with genuine affirmative opt-in
  console.log('\nTEST 6: Contact with Affirmative Opt-In but Missing Consent Date');
  if (row6 && row6.consentStatus === 'OPTED_IN' && row6.consentDate && row6.isEligibleForMarketing) {
    console.log('  ✓ PASSED: Handled gracefully. Fallback import timestamp assigned without rejecting genuine consent.');
    console.log(`    Assigned timestamp: ${row6.consentDate.toISOString()}`);
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 6 to resolve date and be eligible.', row6);
  }

  // TEST 7: Valid imported historical consent record
  console.log('\nTEST 7: Valid Imported Historical Consent Record');
  if (
    row7 &&
    row7.consentStatus === 'OPTED_IN' &&
    row7.consentDate?.toISOString().startsWith('2025-11-20') &&
    row7.isEligibleForMarketing
  ) {
    console.log('  ✓ PASSED: Historical consent date (2025-11-20) and evidence reference preserved perfectly.');
    console.log(`    Evidence: "${row7.consentEvidence}"`);
    passedTests++;
  } else {
    console.error('  ✗ FAILED: Expected row 7 historical consent to be preserved.', row7);
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    console.log('ALL COMPLIANCE AND CONSENT VALIDATION TEST CASES SUCCEEDED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test Suite Fatal Error:', e);
  process.exit(1);
});
