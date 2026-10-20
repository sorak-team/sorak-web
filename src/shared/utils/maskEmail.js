/**
 * Mask email address for security and privacy protection.
 * Examples:
 * - maith@sorak.vn -> ma***h@sorak.vn
 * - vinhnd@sorak.vn -> vi***d@sorak.vn
 * - ab@sorak.vn -> a***@sorak.vn
 * - admin@sorak.edu.vn -> ad***n@sorak.edu.vn
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx === -1) return trimmed;

  const username = trimmed.substring(0, atIdx);
  const domain = trimmed.substring(atIdx + 1);

  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  if (username.length <= 4) {
    return `${username.slice(0, 1)}***${username.slice(-1)}@${domain}`;
  }
  return `${username.slice(0, 2)}***${username.slice(-1)}@${domain}`;
}
