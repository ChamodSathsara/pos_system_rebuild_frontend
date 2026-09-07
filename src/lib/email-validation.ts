const EMAIL_MESSAGE = "Enter a valid email address, e.g. name@example.com.";

/** Validates optional email fields without rejecting an intentionally empty value. */
export function validateEmail(value?: string | null): true | string {
  if (!value?.trim()) return true;
  const email = value.trim();
  if (email.length > 254 || email.includes("..")) return EMAIL_MESSAGE;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || EMAIL_MESSAGE;
}
