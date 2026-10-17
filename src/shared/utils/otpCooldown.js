import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'sorak_otp_cooldown_';

/**
 * Get remaining cooldown seconds for a given key.
 * If expired or non-existent, cleans up and returns 0.
 *
 * @param {string} key Unique identifier (e.g. 'forgot_admin@sorak.edu.vn', '2fa_GV001')
 * @returns {number} Seconds remaining (0 if expired)
 */
export function getOtpCooldown(key) {
  if (!key) return 0;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key.toLowerCase().trim()}`);
    if (!raw) return 0;
    const expiresAt = parseInt(raw, 10);
    if (!expiresAt || isNaN(expiresAt)) {
      clearOtpCooldown(key);
      return 0;
    }
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    if (remaining <= 0) {
      clearOtpCooldown(key);
      return 0;
    }
    return remaining;
  } catch {
    return 0;
  }
}

/**
 * Set cooldown for a given key.
 *
 * @param {string} key Unique identifier
 * @param {number} [seconds=60] Number of seconds to cooldown
 * @returns {number} The seconds set
 */
export function setOtpCooldown(key, seconds = 60) {
  if (!key) return seconds;
  try {
    const expiresAt = Date.now() + seconds * 1000;
    localStorage.setItem(`${STORAGE_PREFIX}${key.toLowerCase().trim()}`, expiresAt.toString());
    return seconds;
  } catch {
    return seconds;
  }
}

/**
 * Clear cooldown for a given key.
 *
 * @param {string} key Unique identifier
 */
export function clearOtpCooldown(key) {
  if (!key) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key.toLowerCase().trim()}`);
  } catch {}
}

/**
 * React hook to track and manage OTP cooldown with real wall-clock persistence.
 * Persists through F5 reloads, tab switching, and browser navigation.
 *
 * @param {string|null} key Unique identifier
 * @param {number} [defaultSeconds=60]
 */
export function useOtpCooldown(key, defaultSeconds = 60) {
  const [cooldown, setCooldown] = useState(() => getOtpCooldown(key));

  useEffect(() => {
    if (!key) {
      setCooldown(0);
      return;
    }

    const sync = () => {
      const remaining = getOtpCooldown(key);
      setCooldown(remaining);
    };

    sync();
    const timer = setInterval(sync, 1000);
    return () => clearInterval(timer);
  }, [key]);

  const startCooldown = useCallback(
    (seconds = defaultSeconds) => {
      if (!key) return;
      setOtpCooldown(key, seconds);
      setCooldown(seconds);
    },
    [key, defaultSeconds],
  );

  const resetCooldown = useCallback(() => {
    if (!key) return;
    clearOtpCooldown(key);
    setCooldown(0);
  }, [key]);

  return {
    cooldown,
    isCooldown: cooldown > 0,
    startCooldown,
    resetCooldown,
  };
}
