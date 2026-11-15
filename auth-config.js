/**
 * Create your own OAuth 2.0 "Web application" client in Google Cloud.
 * Authorized JavaScript origins for this deployment:
 *   https://tycofficial.github.io
 * Add http://localhost:5173 only when using the local preview.
 * No client secret belongs in a browser application.
 *
 * Setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
 * API: https://developers.google.com/identity/gsi/web/reference/js-reference
 *
 * A client ID was not supplied for this project. Leave this empty until the
 * website owner creates a client. An unrelated site's ID will not work.
 */
export const GOOGLE_CLIENT_ID = '';

// An explicitly configured value in this browser can override the file above.
export const GOOGLE_CLIENT_ID_STORAGE_KEY = 'cg-google-client-id';
