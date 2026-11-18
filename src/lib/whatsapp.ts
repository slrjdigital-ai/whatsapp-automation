import prisma from './prisma';

export interface WhatsAppConfig {
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  apiVersion: string;
  isDemoMode: boolean;
  webhookVerifyToken?: string;
  appSecret?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  messagingLimitTier?: string;
  isConnected: boolean;
  isTestNumber: boolean;
  lastVerifiedAt?: Date | null;
  lastSuccessfulRequestAt?: Date | null;
  lastApiError?: string | null;
  lastApiErrorCode?: string | null;
  lastWebhookReceivedAt?: Date | null;
}

export interface SendMessageOptions {
  to: string; // E.164 phone number
  templateName?: string;
  templateLanguage?: string;
  components?: any[];
  customBody?: string;
  headerMediaUrl?: string;
}

export interface SendMessageResponse {
  success: boolean;
  whatsappMessageId?: string;
  status?: string; // SUBMITTED or FAILED
  error?: string;
  errorCode?: string;
  rawRequest?: any;
  rawResponse?: any;
}

/**
 * Retrieve current active WhatsApp configuration from database (or environment variables fallback)
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const account = await prisma.whatsAppAccount.findFirst();

  const apiVersion = account?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v21.0';
  const wabaId = account?.wabaId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  const phoneNumberId = account?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = account?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
  const webhookVerifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    account?.webhookVerifyToken ||
    'slrj_digital_secure_wh_2026';
  const appSecret = process.env.WHATSAPP_APP_SECRET || account?.appSecret || '';
  const displayPhoneNumber = account?.displayPhoneNumber || process.env.WHATSAPP_DISPLAY_PHONE || '';
  const verifiedName = account?.verifiedName || process.env.WHATSAPP_VERIFIED_NAME || 'SLRJ DIGITAL';

  const isConnected = Boolean(account?.isConnected && accessToken && phoneNumberId);
  const isTestNumber = Boolean(account?.isTestNumber || displayPhoneNumber?.includes('555') || verifiedName?.toLowerCase().includes('test'));

  return {
    wabaId,
    phoneNumberId,
    accessToken,
    apiVersion,
    isDemoMode: false, // Strict: Never simulate delivery or read status
    webhookVerifyToken,
    appSecret,
    displayPhoneNumber,
    verifiedName,
    qualityRating: account?.qualityRating || 'UNKNOWN',
    messagingLimitTier: account?.messagingLimitTier || 'TIER_1K',
    isConnected,
    isTestNumber,
    lastVerifiedAt: account?.lastVerifiedAt,
    lastSuccessfulRequestAt: account?.lastSuccessfulRequestAt,
    lastApiError: account?.lastApiError,
    lastApiErrorCode: account?.lastApiErrorCode,
    lastWebhookReceivedAt: account?.lastWebhookReceivedAt,
  };
}

/**
 * Test & verify authentic live connection to Meta Cloud API
 * Performs genuine Graph API query for the registered Phone Number ID.
 */
export async function verifyMetaConnection(): Promise<{
  connected: boolean;
  verifiedName?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
  messagingLimitTier?: string;
  isTestNumber?: boolean;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}> {
  const config = await getWhatsAppConfig();

  if (!config.phoneNumberId || !config.accessToken) {
    return {
      connected: false,
      error: 'WhatsApp Phone Number ID and Access Token must be configured in Settings.',
      errorCode: 'MISSING_CREDENTIALS',
    };
  }

  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status,throughput`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      const fbError = data?.error;
      const errMsg = fbError?.message || `Meta API HTTP ${res.status}`;
      const errCode = String(fbError?.code || res.status);

      await prisma.whatsAppAccount.updateMany({
        data: {
          isConnected: false,
          status: 'ERROR',
          lastApiError: errMsg,
          lastApiErrorCode: errCode,
        },
      });

      return {
        connected: false,
        error: errMsg,
        errorCode: errCode,
        rawResponse: data,
      };
    }

    const verifiedName = data.verified_name || 'SLRJ DIGITAL';
    const displayPhone = data.display_phone_number || '';
    const isTestNumber = displayPhone.includes('555') || verifiedName.toLowerCase().includes('test') || data.code_verification_status === 'NOT_VERIFIED';

    // Update database record with authentic Meta details
    await prisma.whatsAppAccount.updateMany({
      data: {
        isConnected: true,
        status: 'CONNECTED',
        verifiedName,
        displayPhoneNumber: displayPhone || undefined,
        qualityRating: data.quality_rating || 'GREEN',
        isTestNumber,
        lastVerifiedAt: new Date(),
        lastSuccessfulRequestAt: new Date(),
        lastApiError: null,
        lastApiErrorCode: null,
      },
    });

    return {
      connected: true,
      verifiedName,
      displayPhoneNumber: displayPhone,
      qualityRating: data.quality_rating || 'GREEN',
      isTestNumber,
      rawResponse: data,
    };
  } catch (err: any) {
    const errMsg = err?.message || 'Network connection failed while connecting to Meta Graph API';
    await prisma.whatsAppAccount.updateMany({
      data: {
        isConnected: false,
        status: 'ERROR',
        lastApiError: errMsg,
        lastApiErrorCode: 'NETWORK_ERROR',
      },
    });

    return {
      connected: false,
      error: errMsg,
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Fetch approved message templates from Meta WABA
 */
export async function syncMetaTemplates(): Promise<{ success: boolean; count: number; error?: string }> {
  const config = await getWhatsAppConfig();

  if (!config.wabaId || !config.accessToken) {
    const count = await prisma.messageTemplate.count();
    return { success: true, count, error: 'WABA ID or Access Token not configured. Using local templates.' };
  }

  try {
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.wabaId}/message_templates?limit=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, count: 0, error: data?.error?.message || 'Failed to fetch Meta templates' };
    }

    const metaTemplates = data.data || [];
    let synced = 0;

    for (const tpl of metaTemplates) {
      const bodyComponent = tpl.components?.find((c: any) => c.type === 'BODY');
      const headerComponent = tpl.components?.find((c: any) => c.type === 'HEADER');
      const footerComponent = tpl.components?.find((c: any) => c.type === 'FOOTER');
      const buttonComponent = tpl.components?.find((c: any) => c.type === 'BUTTONS');

      await prisma.messageTemplate.upsert({
        where: { name: tpl.name },
        update: {
          displayName: tpl.name.replace(/_/g, ' ').toUpperCase(),
          category: tpl.category || 'MARKETING',
          language: tpl.language || 'en',
          status: tpl.status || 'APPROVED',
          metaTemplateId: tpl.id,
          headerType: headerComponent?.format || 'NONE',
          headerContent: headerComponent?.text || null,
          bodyText: bodyComponent?.text || '',
          footerText: footerComponent?.text || null,
          buttonsJson: buttonComponent?.buttons ? JSON.stringify(buttonComponent.buttons) : null,
        },
        create: {
          name: tpl.name,
          displayName: tpl.name.replace(/_/g, ' ').toUpperCase(),
          category: tpl.category || 'MARKETING',
          language: tpl.language || 'en',
          status: tpl.status || 'APPROVED',
          metaTemplateId: tpl.id,
          headerType: headerComponent?.format || 'NONE',
          headerContent: headerComponent?.text || null,
          bodyText: bodyComponent?.text || '',
          footerText: footerComponent?.text || null,
          buttonsJson: buttonComponent?.buttons ? JSON.stringify(buttonComponent.buttons) : null,
        },
      });
      synced++;
    }

    return { success: true, count: synced };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Template synchronization error' };
  }
}

/**
 * Dispatch message via official Meta WhatsApp Cloud API
 * STRICT: ZERO simulation, ZERO synthetic WAMIDs, ZERO fake read receipts.
 */
export async function sendWhatsAppMessage(options: SendMessageOptions): Promise<SendMessageResponse> {
  const config = await getWhatsAppConfig();

  // Strip non-digits and leading plus for Meta Cloud API requirement
  const cleanRecipient = options.to.replace(/\D/g, '');

  if (!cleanRecipient || cleanRecipient.length < 10 || cleanRecipient.length > 15) {
    return {
      success: false,
      errorCode: 'INVALID_RECIPIENT_NUMBER',
      error: `Invalid recipient phone number: '${options.to}'. Recipient must be formatted in E.164 without spaces (e.g. 919876543210).`,
    };
  }

  // Live Meta Cloud API Dispatch verification
  if (!config.phoneNumberId || !config.accessToken) {
    return {
      success: false,
      errorCode: 'MISSING_CREDENTIALS',
      error: 'WhatsApp Phone Number ID and Access Token are not configured in Settings. Please configure valid Meta credentials.',
    };
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  let payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
  };

  if (options.templateName) {
    payload.type = 'template';
    payload.template = {
      name: options.templateName,
      language: {
        code: options.templateLanguage || 'en',
      },
      components: options.components && options.components.length > 0 ? options.components : undefined,
    };
  } else {
    // Custom session message (strictly permitted within 24h of customer initiated message)
    payload.type = 'text';
    payload.text = {
      preview_url: true,
      body: options.customBody || 'SLRJ DIGITAL Notification',
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const fbError = data?.error;
      const rawCode = fbError?.code || res.status;
      let detailedError = fbError?.message || `Meta API Error (${res.status})`;

      // Provide precise Meta debugging guidance for common WhatsApp Cloud API errors
      if (rawCode === 131030) {
        detailedError = `Meta Error 131030: Recipient phone number (${cleanRecipient}) is not in the allowed test list. When using Meta's temporary sandbox test number, you must add this recipient number to your 'To' Allowed Recipients list in Meta App Dashboard (WhatsApp > API Setup).`;
      } else if (rawCode === 190) {
        detailedError = `Meta Error 190: Access token is invalid or has expired. Please generate a new System User Permanent Token in Meta Business Manager and update Settings.`;
      } else if (rawCode === 132001) {
        detailedError = `Meta Error 132001: Template '${options.templateName}' does not exist or is not approved in language '${options.templateLanguage || 'en'}'. Use 'hello_world' or check Meta template status.`;
      } else if (rawCode === 131047) {
        detailedError = `Meta Error 131047: Re-engagement window expired. More than 24 hours have passed since the customer last replied. Outbound messages require an approved WhatsApp template.`;
      } else if (rawCode === 100) {
        detailedError = `Meta Error 100: Invalid parameter or payload. Details: ${fbError?.error_data?.details || fbError?.message}`;
      }

      // Record API error on account
      await prisma.whatsAppAccount.updateMany({
        data: {
          lastApiError: detailedError,
          lastApiErrorCode: String(rawCode),
        },
      });

      return {
        success: false,
        errorCode: String(rawCode),
        error: detailedError,
        rawRequest: payload,
        rawResponse: data,
      };
    }

    const wamid = data?.messages?.[0]?.id;

    // Successful Meta submission
    await prisma.whatsAppAccount.updateMany({
      data: {
        lastSuccessfulRequestAt: new Date(),
        lastApiError: null,
        lastApiErrorCode: null,
      },
    });

    return {
      success: true,
      whatsappMessageId: wamid,
      status: 'SUBMITTED',
      rawRequest: payload,
      rawResponse: data,
    };
  } catch (err: any) {
    const networkError = err?.message || 'Failed to connect to Meta Graph API';
    await prisma.whatsAppAccount.updateMany({
      data: {
        lastApiError: networkError,
        lastApiErrorCode: 'NETWORK_ERROR',
      },
    });

    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: networkError,
      rawRequest: payload,
    };
  }
}
