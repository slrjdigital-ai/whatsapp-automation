import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SLRJ DIGITAL WhatsApp Outreach Platform...');

  // 1. Create Default Users
  const superAdminPassword = await bcrypt.hash('Admin@123456', 10);
  const marketingPassword = await bcrypt.hash('Marketing@123456', 10);
  const operatorPassword = await bcrypt.hash('Operator@123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@slrjdigital.in' },
    update: {},
    create: {
      email: 'admin@slrjdigital.in',
      name: 'SLRJ Digital Admin',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'marketing@slrjdigital.in' },
    update: {},
    create: {
      email: 'marketing@slrjdigital.in',
      name: 'Rohan Sharma (Marketing)',
      passwordHash: marketingPassword,
      role: 'MARKETING_MANAGER',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'operator@slrjdigital.in' },
    update: {},
    create: {
      email: 'operator@slrjdigital.in',
      name: 'Priya Patel (Campaign Ops)',
      passwordHash: operatorPassword,
      role: 'CAMPAIGN_OPERATOR',
      status: 'ACTIVE',
    },
  });

  // 2. Default WhatsApp Account Config
  const existingAccount = await prisma.whatsAppAccount.findFirst();
  if (!existingAccount) {
    await prisma.whatsAppAccount.create({
      data: {
        accountName: 'SLRJ DIGITAL Official WABA',
        wabaId: '108472918471928',
        phoneNumberId: '109847291847192',
        displayPhoneNumber: '+91 98765 43210',
        verifiedName: 'SLRJ DIGITAL',
        qualityRating: 'GREEN',
        messagingLimitTier: 'TIER_1K',
        webhookVerifyToken: 'slrj_digital_secure_wh_2026',
        apiVersion: 'v21.0',
        status: 'CONNECTED',
        isConnected: true,
        isDemoMode: true, // Seamless interactive simulation until live Meta credentials are provided
        lastVerifiedAt: new Date(),
      },
    });
  }

  // 3. Pre-approved Message Templates
  const templates = [
    {
      name: 'slrj_digital_intro',
      displayName: 'SLRJ Digital - Business Introduction',
      category: 'BUSINESS_INTRO',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Greetings from SLRJ DIGITAL!',
      bodyText: `Hello {{name}}!

Greetings from SLRJ DIGITAL!

We help businesses build a powerful online presence through modern digital solutions.

Our services include:
• Website Development
• E-commerce Website Development
• Mobile Application Development
• UI/UX Design
• Digital Marketing
• Branding and Creative Design
• AI-Powered Solutions

Are you looking to grow your business online?
Let's discuss how SLRJ DIGITAL can help your business.

Website: https://slrjdigital.in
Instagram: https://www.instagram.com/slrj_digital/

Reply STOP if you do not wish to receive further promotional messages.`,
      footerText: 'SLRJ DIGITAL • Modern Tech & Design Agency',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'Visit Website', url: 'https://slrjdigital.in' },
        { type: 'QUICK_REPLY', text: 'Book Free Call' },
        { type: 'QUICK_REPLY', text: 'STOP' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Rahul' }),
    },
    {
      name: 'slrj_website_promo',
      displayName: 'High-Converting Website Development Promo',
      category: 'WEBSITE_DEV',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Transform Your Digital Storefront',
      bodyText: `Hi {{name}}, is your current website driving the conversions your business deserves?

At SLRJ DIGITAL, we craft ultra-fast, mobile-first, and SEO-optimized custom websites tailored for modern brands.

🚀 Included in our Package:
- 100% Responsive & High-Speed Performance
- Modern UI/UX with High Conversion Funnels
- Free SEO & Analytics Integration
- 30-Day Post-Launch Support

Explore our work at https://slrjdigital.in or reply to this message to see live client case studies.

Reply STOP to opt out.`,
      footerText: 'SLRJ DIGITAL Website Development',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'View Portfolio', url: 'https://slrjdigital.in/portfolio' },
        { type: 'QUICK_REPLY', text: 'Get Free Quote' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Business Owner' }),
    },
    {
      name: 'slrj_ecommerce_suite',
      displayName: 'E-commerce Growth & Custom Store Setup',
      category: 'ECOMMERCE',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Scale Your E-Commerce Sales',
      bodyText: `Hello {{name}}, take your product catalog directly to millions of customers.

SLRJ DIGITAL specializes in end-to-end e-commerce store architecture:
🛒 Custom Shopify, WooCommerce & Headless Stores
⚡ Fast Checkout & Payment Gateway Integration
📦 Automated Inventory & Order Tracking
📈 Cart Abandonment Recovery Funnels

Let's discuss scaling your digital revenues. Visit https://slrjdigital.in or reply to connect with our lead architect.

Reply STOP to opt out.`,
      footerText: 'SLRJ DIGITAL E-commerce Solutions',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'Explore E-commerce', url: 'https://slrjdigital.in' },
        { type: 'QUICK_REPLY', text: 'Schedule Demo' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Founder' }),
    },
    {
      name: 'slrj_mobile_app',
      displayName: 'iOS & Android Mobile App Solutions',
      category: 'MOBILE_APP',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Bring Your App Vision to Life',
      bodyText: `Hi {{name}}, reach your customers right in their pocket.

SLRJ DIGITAL develops stunning, high-performance native and cross-platform mobile apps for iOS and Android.

📱 What we deliver:
- Smooth 60fps Flutter & React Native Apps
- Seamless Backend & API Integrations
- Secure In-App Payments & Push Notifications
- Complete App Store & Play Store Publishing

Visit https://slrjdigital.in or reply here for a confidential discovery call.

Reply STOP to opt out.`,
      footerText: 'SLRJ DIGITAL Mobile Apps',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'Learn More', url: 'https://slrjdigital.in' },
        { type: 'QUICK_REPLY', text: 'Discuss My App' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Entrepreneur' }),
    },
    {
      name: 'slrj_digital_marketing',
      displayName: 'Performance Marketing & Lead Generation',
      category: 'MARKETING',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Supercharge Your Customer Acquisition',
      bodyText: `Hello {{name}}, ready to 3X your qualified inbound leads?

SLRJ DIGITAL provides data-driven performance marketing:
🎯 Meta & Google Ads Campaign Management
🔍 Targeted SEO & Organic Search Growth
📊 Social Media Content & Creative Strategy
⚡ WhatsApp Funnels & Automation

Check out our client results at https://slrjdigital.in or reply directly to speak with our growth specialist.

Reply STOP to opt out.`,
      footerText: 'SLRJ DIGITAL Growth & Performance',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'See Results', url: 'https://slrjdigital.in' },
        { type: 'QUICK_REPLY', text: 'Audit My Marketing' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Marketing Lead' }),
    },
    {
      name: 'slrj_special_offer',
      displayName: 'Exclusive 20% Growth Consultation Offer',
      category: 'SPECIAL_OFFER',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Exclusive Offer from SLRJ DIGITAL',
      bodyText: `Special announcement for {{name}}!

For a limited time, SLRJ DIGITAL is offering an exclusive 20% discount on all new Web Development, App Development, and Digital Strategy projects booked this month.

Claim your complimentary digital audit and strategy blueprint today:
🔗 https://slrjdigital.in

Reply STOP if you wish to opt out.`,
      footerText: 'Limited Period Offer • SLRJ DIGITAL',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'Claim 20% Off', url: 'https://slrjdigital.in' },
        { type: 'QUICK_REPLY', text: 'Claim Voucher' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Valued Partner' }),
    },
    {
      name: 'slrj_client_followup',
      displayName: 'Project Consultation & Follow-up',
      category: 'FOLLOW_UP',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'Following up from SLRJ DIGITAL',
      bodyText: `Hi {{name}},

Following up regarding your interest in digital solutions with SLRJ DIGITAL. We have reserved time this week for a brief 15-minute consultation to understand your project roadmap and provide actionable recommendations.

Would Thursday or Friday suit you best?

Warm regards,
SLRJ DIGITAL Team
https://slrjdigital.in

Reply STOP to opt out.`,
      footerText: 'SLRJ DIGITAL Client Success',
      buttonsJson: JSON.stringify([
        { type: 'QUICK_REPLY', text: 'Book Thursday' },
        { type: 'QUICK_REPLY', text: 'Book Friday' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Client' }),
    },
    {
      name: 'slrj_client_feedback',
      displayName: 'Customer Feedback & Review Request',
      category: 'FEEDBACK',
      language: 'en',
      status: 'APPROVED',
      headerType: 'TEXT',
      headerContent: 'We Value Your Feedback',
      bodyText: `Hello {{name}},

Thank you for choosing SLRJ DIGITAL. Your feedback empowers us to continuously elevate our digital services and support.

Could you spare 60 seconds to share your experience with us?

Review us: https://slrjdigital.in

Thank you for being an esteemed partner!

Reply STOP to opt out.`,
      footerText: 'SLRJ DIGITAL Quality Team',
      buttonsJson: JSON.stringify([
        { type: 'URL', text: 'Leave Review', url: 'https://slrjdigital.in' }
      ]),
      sampleValuesJson: JSON.stringify({ name: 'Client' }),
    }
  ];

  let introTemplateId: string | null = null;
  for (const t of templates) {
    const createdTpl = await prisma.messageTemplate.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
    if (t.name === 'slrj_digital_intro') {
      introTemplateId = createdTpl.id;
    }
  }

  // 4. Contact Groups
  const group1 = await prisma.contactGroup.upsert({
    where: { name: 'E-Commerce Prospects' },
    update: {},
    create: {
      name: 'E-Commerce Prospects',
      description: 'Online store brands and D2C prospects interested in e-commerce overhaul',
      color: '#3b82f6',
    },
  });

  const group2 = await prisma.contactGroup.upsert({
    where: { name: 'Startup Founders & Tech' },
    update: {},
    create: {
      name: 'Startup Founders & Tech',
      description: 'Founders looking for custom mobile apps and MVP engineering',
      color: '#10b981',
    },
  });

  const group3 = await prisma.contactGroup.upsert({
    where: { name: 'Corporate & SME Clients' },
    update: {},
    create: {
      name: 'Corporate & SME Clients',
      description: 'Established businesses seeking branding, modern portals and SEO',
      color: '#8b5cf6',
    },
  });

  // 5. Sample Opted-In Contacts (Demonstrating verified marketing consent)
  const sampleContacts = [
    {
      fullName: 'Vikram Malhotra',
      mobileNumber: '+919820011223',
      countryCode: '91',
      nationalNumber: '9820011223',
      businessName: 'Malhotra Retail & Apparel',
      email: 'vikram@malhotraretails.com',
      category: 'Retail & E-commerce',
      status: 'VALID',
      consentStatus: 'OPTED_IN',
      groupId: group1.id,
      consentSource: 'WEB_FORM',
    },
    {
      fullName: 'Aarav Mehta',
      mobileNumber: '+919819022334',
      countryCode: '91',
      nationalNumber: '9819022334',
      businessName: 'NextGen FinTech Solutions',
      email: 'aarav@nextgenfin.in',
      category: 'Fintech & SaaS',
      status: 'VALID',
      consentStatus: 'OPTED_IN',
      groupId: group2.id,
      consentSource: 'EXCEL_UPLOAD',
    },
    {
      fullName: 'Ananya Sharma',
      mobileNumber: '+919821033445',
      countryCode: '91',
      nationalNumber: '9821033445',
      businessName: 'GlowSkin Organics',
      email: 'ananya@glowskin.in',
      category: 'D2C Brand',
      status: 'VALID',
      consentStatus: 'OPTED_IN',
      groupId: group1.id,
      consentSource: 'WEB_FORM',
    },
    {
      fullName: 'Rajesh Varma',
      mobileNumber: '+919833044556',
      countryCode: '91',
      nationalNumber: '9833044556',
      businessName: 'Varma Logistics & Freight',
      email: 'rajesh@varmalogistics.com',
      category: 'Logistics',
      status: 'VALID',
      consentStatus: 'OPTED_IN',
      groupId: group3.id,
      consentSource: 'API',
    },
    {
      fullName: 'Kavita Singhania',
      mobileNumber: '+919845055667',
      countryCode: '91',
      nationalNumber: '9845055667',
      businessName: 'Singhania Jewels',
      email: 'kavita@singhaniajewels.com',
      category: 'Luxury Goods',
      status: 'VALID',
      consentStatus: 'OPTED_IN',
      groupId: group3.id,
      consentSource: 'WEB_FORM',
    },
    {
      fullName: 'Devansh Roy',
      mobileNumber: '+919867066778',
      countryCode: '91',
      nationalNumber: '9867066778',
      businessName: 'Pulse Fitness Labs',
      email: 'dev@pulsefitness.in',
      category: 'Health & Wellness',
      status: 'VALID',
      consentStatus: 'OPTED_IN',
      groupId: group2.id,
      consentSource: 'EXCEL_UPLOAD',
    },
    {
      fullName: 'Sneha Kulkarni',
      mobileNumber: '+919890077889',
      countryCode: '91',
      nationalNumber: '9890077889',
      businessName: 'Kulkarni Architecture & Interiors',
      email: 'sneha@kulkarni-arch.in',
      category: 'Architecture',
      status: 'VALID',
      consentStatus: 'UNKNOWN', // Demonstrates strict compliance rule: UNKNOWN cannot be messaged!
      groupId: group3.id,
      consentSource: 'EXCEL_UPLOAD',
    },
    {
      fullName: 'Naveen Kumar',
      mobileNumber: '+919811088990',
      countryCode: '91',
      nationalNumber: '9811088990',
      businessName: 'Urban Bistro Cafe',
      email: 'naveen@urbanbistro.in',
      category: 'Hospitality',
      status: 'VALID',
      consentStatus: 'OPTED_OUT', // Explicitly opted out
      groupId: group3.id,
      consentSource: 'INBOUND_STOP',
    }
  ];

  for (const c of sampleContacts) {
    const contact = await prisma.contact.upsert({
      where: { mobileNumber: c.mobileNumber },
      update: {
        fullName: c.fullName,
        businessName: c.businessName,
        email: c.email,
        category: c.category,
        consentStatus: c.consentStatus,
      },
      create: {
        fullName: c.fullName,
        mobileNumber: c.mobileNumber,
        countryCode: c.countryCode,
        nationalNumber: c.nationalNumber,
        businessName: c.businessName,
        email: c.email,
        category: c.category,
        status: c.status,
        consentStatus: c.consentStatus,
      },
    });

    // Link to group
    await prisma.contactGroupMember.upsert({
      where: {
        contactId_groupId: {
          contactId: contact.id,
          groupId: c.groupId,
        },
      },
      update: {},
      create: {
        contactId: contact.id,
        groupId: c.groupId,
      },
    });

    // Record consent trail
    await prisma.contactConsent.create({
      data: {
        contactId: contact.id,
        status: c.consentStatus,
        source: c.consentSource,
        optInDate: c.consentStatus === 'OPTED_IN' ? new Date() : null,
        optOutDate: c.consentStatus === 'OPTED_OUT' ? new Date() : null,
        notes: `Recorded during platform initialization via ${c.consentSource}`,
      },
    });
  }

  // 6. Suppression list entry (for Naveen Kumar who opted out via STOP)
  await prisma.suppressionList.upsert({
    where: { mobileNumber: '+919811088990' },
    update: {},
    create: {
      mobileNumber: '+919811088990',
      reason: 'USER_STOP',
      notes: 'Customer replied STOP to marketing outreach. Suppressed automatically.',
      suppressedBy: 'SYSTEM_WEBHOOK',
    },
  });

  // 7. Initial Campaign (Completed sample for rich dashboard analytics)
  const sampleCampaign = await prisma.campaign.create({
    data: {
      name: 'SLRJ Digital - Q1 Tech & Marketing Outreach',
      description: 'Official WhatsApp outreach introducing SLRJ DIGITAL web and digital services to opted-in prospects',
      status: 'COMPLETED',
      type: 'TEMPLATE',
      templateId: introTemplateId,
      totalContacts: 6,
      eligibleContacts: 6,
      sentCount: 6,
      deliveredCount: 6,
      readCount: 5,
      failedCount: 0,
      pendingCount: 0,
      isDemo: true,
      createdById: admin.id,
      startedAt: new Date(Date.now() - 3600000 * 2),
      completedAt: new Date(Date.now() - 3600000 * 1.5),
    },
  });

  // Create Campaign Contacts and Messages for the sample campaign
  const optedInContacts = await prisma.contact.findMany({
    where: { consentStatus: 'OPTED_IN' },
    take: 6,
  });

  for (let i = 0; i < optedInContacts.length; i++) {
    const contact = optedInContacts[i];
    const isRead = i < 5;
    const msgId = `wamid.HBgLMTE5ODIwMDExMjIzFQIAERgSMzc1ODIyNDM1MDQ2NzU5NDAy${i}`;

    await prisma.campaignContact.create({
      data: {
        campaignId: sampleCampaign.id,
        contactId: contact.id,
        status: isRead ? 'READ' : 'DELIVERED',
        whatsappMessageId: msgId,
        sentAt: new Date(Date.now() - 3600000 * 2 + i * 15000),
        deliveredAt: new Date(Date.now() - 3600000 * 2 + i * 15000 + 4000),
        readAt: isRead ? new Date(Date.now() - 3600000 * 2 + i * 15000 + 35000) : null,
      },
    });

    const msg = await prisma.message.create({
      data: {
        whatsappMessageId: msgId,
        campaignId: sampleCampaign.id,
        contactId: contact.id,
        recipientNumber: contact.mobileNumber,
        direction: 'OUTBOUND',
        messageType: 'TEMPLATE',
        content: `Hello ${contact.fullName}! Greetings from SLRJ DIGITAL!...`,
        status: isRead ? 'READ' : 'DELIVERED',
      },
    });

    await prisma.messageStatusEvent.createMany({
      data: [
        {
          messageId: msg.id,
          whatsappMessageId: msgId,
          eventType: 'SENT',
          timestamp: new Date(Date.now() - 3600000 * 2 + i * 15000),
        },
        {
          messageId: msg.id,
          whatsappMessageId: msgId,
          eventType: 'DELIVERED',
          timestamp: new Date(Date.now() - 3600000 * 2 + i * 15000 + 4000),
        },
        ...(isRead ? [{
          messageId: msg.id,
          whatsappMessageId: msgId,
          eventType: 'READ',
          timestamp: new Date(Date.now() - 3600000 * 2 + i * 15000 + 35000),
        }] : []),
      ],
    });
  }

  // 8. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'SYSTEM',
      details: JSON.stringify({ message: 'SLRJ DIGITAL Outreach Platform initialized with security defaults and templates' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Seeding completed successfully!');
  console.log('Super Admin login: admin@slrjdigital.in / Admin@123456');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
