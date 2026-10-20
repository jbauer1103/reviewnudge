import * as Linking from 'expo-linking';

/**
 * Where the magic link sends the owner back to.
 * In Expo Go this looks like exp://192.168.1.20:8081/--/auth-callback,
 * in the real app reviewnudge://auth-callback.
 */
export function getAuthRedirectUrl() {
  return Linking.createURL('/auth-callback');
}

/**
 * Reads the values Supabase adds to the end of the login link, e.g.
 * ...auth-callback#access_token=...&refresh_token=...
 * or ...auth-callback#error=access_denied&error_code=otp_expired&...
 */
export function readAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  for (const part of [...query.split('&'), ...hash.split('&')]) {
    if (!part) continue;
    const [key, value = ''] = part.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
  }
  return params;
}
