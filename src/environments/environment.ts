/**
 * Production environment.
 *
 * `useMockApi` keeps the application usable without the Spring Boot backend:
 * requests to `apiBaseUrl` are answered by an in-browser mock that follows the
 * same REST contract (/api/v1/...). Set it to `false` to call the real backend.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://arquitech-backend-production.up.railway.app/api/v1',
  useMockApi: true,
  mockLatencyMs: 250,
  defaultLanguage: 'es',
  supportedLanguages: ['es', 'en'],
};
