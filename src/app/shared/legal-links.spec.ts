import { SUPPORT_EMAIL, supportMailto } from './legal-links';

describe('Audit correction 5: support contact for password recovery', () => {
  it('builds a mailto link to support with the subject already written', () => {
    expect(SUPPORT_EMAIL).toBe('contacto@arquitech.com');
    expect(supportMailto('Restablecer contraseña')).toBe(
      'mailto:contacto@arquitech.com?subject=Restablecer%20contrase%C3%B1a',
    );
  });
});
