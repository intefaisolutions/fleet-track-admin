/**
 * Copy text to clipboard. Uses Clipboard API when available (secure context),
 * otherwise falls back to execCommand — needed on HTTP LAN IPs where
 * navigator.clipboard is undefined / blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = text?.trim();
  if (!value) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy path (common on insecure HTTP origins).
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
