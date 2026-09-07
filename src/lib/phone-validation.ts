const PHONE_MESSAGE = "Enter a valid Sri Lankan number, e.g. 0112345678 or +94112345678.";
const MOBILE_MESSAGE = "Enter a valid Sri Lankan mobile number, e.g. 0771234567 or +94771234567.";

function digitsOnly(value: string) {
  return value.replace(/[\s()-]/g, "");
}

/** Optional Sri Lankan fixed-line or mobile number. Accepts 0XXXXXXXXX, 94XXXXXXXXX, and +94XXXXXXXXX. */
export function validateSriLankanPhone(value?: string | null): true | string {
  if (!value?.trim()) return true;
  return /^(?:0|\+?94)\d{9}$/.test(digitsOnly(value)) || PHONE_MESSAGE;
}

/** Optional Sri Lankan mobile number. Accepts 07XXXXXXXX, 947XXXXXXXX, and +947XXXXXXXX. */
export function validateSriLankanMobile(value?: string | null): true | string {
  if (!value?.trim()) return true;
  return /^(?:0|\+?94)7\d{8}$/.test(digitsOnly(value)) || MOBILE_MESSAGE;
}
