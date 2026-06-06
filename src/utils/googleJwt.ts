/** Decode Google ID token payload (prefill only — server verifies on submit). */
export function decodeGoogleJwt(idToken: string): { email?: string; name?: string } {
  try {
    const part = idToken.split('.')[1];
    if (!part) return {};
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { email?: string; name?: string };
    return { email: payload.email, name: payload.name };
  } catch {
    return {};
  }
}
