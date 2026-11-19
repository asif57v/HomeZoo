/**
 * Utility functions for Indian phone number sanitization and validation
 */

/**
 * Strips non-digits, strips leading +91 / 91 / 0 if longer than 10 digits, and caps at 10 digits.
 * @param {string|number} val 
 * @returns {string} Cleaned 10-digit maximum string
 */
export const sanitizePhoneNumber = (val) => {
  let cleaned = String(val || '').replace(/\D/g, '');
  if ((cleaned.startsWith('91') || cleaned.startsWith('0')) && cleaned.length > 10) {
    cleaned = cleaned.replace(/^(91|0)/, '');
  }
  return cleaned.slice(0, 10);
};

/**
 * Validates whether string is a valid 10-digit Indian mobile number (starts with 6, 7, 8, 9)
 * @param {string} val 
 * @returns {boolean}
 */
export const isValidPhoneNumber = (val) => {
  return /^[6-9]\d{9}$/.test(String(val || '').trim());
};
