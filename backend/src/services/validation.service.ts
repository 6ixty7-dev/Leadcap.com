// ============================================================
// Lead Intelligence OS — Validation Service
// ============================================================
// Deterministic validation for phone, email, website, Instagram

export interface PhoneValidation {
  valid: boolean;
  details: string;
}

export interface EmailValidation {
  valid: boolean;
  details: string;
}

export interface WebsiteValidation {
  valid: boolean;
  details: string;
}

export interface InstagramValidation {
  valid: boolean;
  details: string;
}

export interface FullValidationResult {
  phone: PhoneValidation | null;
  email: EmailValidation | null;
  website: WebsiteValidation | null;
  instagram: InstagramValidation | null;
}

// ---- Phone Validation ----

export function validatePhone(phone: string | null | undefined): PhoneValidation {
  if (!phone || phone.trim() === '') {
    return { valid: false, details: 'No phone number provided' };
  }

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check minimum length
  if (cleaned.length < 7) {
    return { valid: false, details: 'Phone number too short' };
  }

  // Check maximum length
  if (cleaned.length > 15) {
    return { valid: false, details: 'Phone number too long' };
  }

  // Check for valid characters
  if (!/^\+?\d+$/.test(cleaned)) {
    return { valid: false, details: 'Phone contains invalid characters' };
  }

  // Check for suspicious repeated digits (e.g., 0000000, 1111111)
  if (/^(\d)\1{5,}$/.test(cleaned.replace(/^\+/, ''))) {
    return { valid: false, details: 'Suspicious repeated digits detected' };
  }

  // Check for obviously fake numbers
  const fakePatterns = ['1234567890', '0987654321', '0000000000', '1111111111'];
  if (fakePatterns.includes(cleaned.replace(/^\+\d{1,3}/, ''))) {
    return { valid: false, details: 'Known fake number pattern' };
  }

  return { valid: true, details: 'Phone number format is valid' };
}

// ---- Email Validation ----

export function validateEmail(email: string | null | undefined): EmailValidation {
  if (!email || email.trim() === '') {
    return { valid: false, details: 'No email provided' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic syntax check
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, details: 'Invalid email syntax' };
  }

  // Check for disposable/temporary email domains
  const disposableDomains = [
    'tempmail.com', 'throwaway.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'fakeinbox.com',
    'trashmail.com', 'sharklasers.com', 'guerrillamailblock.com',
    'temp-mail.org', '10minutemail.com'
  ];

  const domain = trimmed.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { valid: false, details: 'Disposable email domain detected' };
  }

  // Check for common typos in popular domains
  const suspiciousDomains = ['gmial.com', 'gmal.com', 'yahooo.com', 'hotmal.com'];
  if (suspiciousDomains.includes(domain)) {
    return { valid: false, details: `Possible typo in domain: ${domain}` };
  }

  return { valid: true, details: 'Email format is valid' };
}

// ---- Website Validation ----

export function validateWebsite(website: string | null | undefined): WebsiteValidation {
  if (!website || website.trim() === '') {
    return { valid: false, details: 'No website provided' };
  }

  let url = website.trim();

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);

    // Check for valid hostname
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, details: 'Invalid hostname' };
    }

    // Check for TLD
    if (!parsed.hostname.includes('.')) {
      return { valid: false, details: 'No TLD found in URL' };
    }

    // Check for localhost or IP-only addresses
    if (parsed.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      return { valid: false, details: 'Local/IP address, not a public website' };
    }

    return { valid: true, details: `Website URL is valid: ${url}` };
  } catch {
    return { valid: false, details: 'Malformed URL' };
  }
}

// ---- Instagram Validation ----

export function validateInstagram(instagram: string | null | undefined): InstagramValidation {
  if (!instagram || instagram.trim() === '') {
    return { valid: false, details: 'No Instagram provided' };
  }

  let handle = instagram.trim();

  // Extract handle from URL
  if (handle.includes('instagram.com')) {
    const match = handle.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
    if (match) {
      handle = match[1];
    } else {
      return { valid: false, details: 'Could not extract Instagram handle from URL' };
    }
  }

  // Remove @ prefix
  handle = handle.replace(/^@/, '');

  // Instagram handle rules: 1-30 chars, alphanumeric, periods, underscores
  if (!/^[a-zA-Z0-9_.]{1,30}$/.test(handle)) {
    return { valid: false, details: 'Invalid Instagram handle format' };
  }

  // Check for obviously fake handles
  if (['test', 'example', 'username', 'user', 'admin'].includes(handle.toLowerCase())) {
    return { valid: false, details: 'Suspicious/placeholder Instagram handle' };
  }

  return { valid: true, details: `Instagram handle is valid: @${handle}` };
}

// ---- Full Validation ----

export function validateLead(lead: {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
}): FullValidationResult {
  return {
    phone: lead.phone ? validatePhone(lead.phone) : null,
    email: lead.email ? validateEmail(lead.email) : null,
    website: lead.website ? validateWebsite(lead.website) : null,
    instagram: lead.instagram ? validateInstagram(lead.instagram) : null,
  };
}

export function runValidationPipeline(leadId: number): FullValidationResult | null {
  const { queryOne, runSql } = require('../database');
  const lead = queryOne('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) return null;

  const result = validateLead(lead);

  // Update validation table
  runSql(`
    INSERT INTO validation_results (
      lead_id, phone_valid, phone_details, email_valid, email_details, 
      website_valid, website_details, instagram_valid, instagram_details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lead_id) DO UPDATE SET
      phone_valid = excluded.phone_valid,
      phone_details = excluded.phone_details,
      email_valid = excluded.email_valid,
      email_details = excluded.email_details,
      website_valid = excluded.website_valid,
      website_details = excluded.website_details,
      instagram_valid = excluded.instagram_valid,
      instagram_details = excluded.instagram_details,
      validated_at = CURRENT_TIMESTAMP
  `, [
    leadId,
    result.phone ? (result.phone.valid ? 1 : 0) : null,
    result.phone?.details || null,
    result.email ? (result.email.valid ? 1 : 0) : null,
    result.email?.details || null,
    result.website ? (result.website.valid ? 1 : 0) : null,
    result.website?.details || null,
    result.instagram ? (result.instagram.valid ? 1 : 0) : null,
    result.instagram?.details || null
  ]);

  return result;
}
