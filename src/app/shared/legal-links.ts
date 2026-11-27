/** Public agreement shared by the Landing, Web and Mobile applications. */
export const TERMS_URL = 'https://upc-1asi0732-202620-9112-arquitech.github.io/ArquiTech-LandingPage/terms/';

/** Support channel shown in the Landing Page footer, reused for password recovery (audit finding 5). */
export const SUPPORT_EMAIL = 'contacto@arquitech.com';

export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
