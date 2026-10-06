/**
 * Phone number validation and normalization utility.
 * Enforces country code prefix (+254..., +255..., etc.) as required for
 * public unclaimed listing contact numbers in East Africa and internationally.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes an input phone number.
 * Requires a leading country code (+...).
 * Valid E.164-style range: +[1-9] followed by 7 to 14 digits (8-15 digits total).
 */
export function validateAndNormalizePhone(rawPhone: unknown): PhoneValidationResult {
  if (typeof rawPhone !== "string" || !rawPhone.trim()) {
    return {
      isValid: false,
      normalized: "",
      error: "Phone number is required.",
    };
  }

  const trimmed = rawPhone.trim();

  // Strip whitespace, brackets, hyphens, and periods
  let cleaned = trimmed.replace(/[\s\(\)\-\.]/g, "");

  // Convert leading 00 to +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Must start with +
  if (!cleaned.startsWith("+")) {
    // Helpful error if user entered a local number like 0712345678
    if (/^0[17]\d{8}$/.test(cleaned)) {
      return {
        isValid: false,
        normalized: "",
        error: `Please include the country code (e.g. +254${cleaned.slice(1)} or +255${cleaned.slice(1)}).`,
      };
    }
    return {
      isValid: false,
      normalized: "",
      error: "Phone number must start with a country code (e.g. +254 or +255).",
    };
  }

  // Check digits after '+'
  const digits = cleaned.slice(1);
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    return {
      isValid: false,
      normalized: "",
      error: "Invalid phone number format. Must include valid country code and 7-14 digits (e.g. +254712345678).",
    };
  }

  return {
    isValid: true,
    normalized: cleaned,
  };
}

/**
 * Returns a tel: link safe for anchor tags.
 */
export function getTelLink(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

/**
 * Returns a wa.me link for WhatsApp contact.
 */
export function getWhatsAppLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

/**
 * Friendly formatting for display (e.g. +254 712 345 678).
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  // Format standard Kenyan/Tanzanian (+254 or +255 followed by 9 digits)
  const match = cleaned.match(/^(\+\d{3})(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return cleaned;
}
