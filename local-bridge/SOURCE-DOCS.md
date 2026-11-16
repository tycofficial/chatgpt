# Official protocol references

Reviewed 2026-11-16. Source code implements these public contracts; it does not claim access to OpenAI's private ChatGPT services.

- [Open-source Sign in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in.md): dynamic registration, stable host ID, issued client ID, PKCE, exact callback, state/nonce, JWKS validation, scope consent.
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference.md): account model catalog and public Responses API, streaming/non-stored requests, terminal SSE status.
- [Profiles and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md): separate account registrations, protected local tokens, rotating refresh serialization and revocation.
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations.md): complete stateless input history, developer instructions, omitted parameters and tool restrictions.
- [Token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference.md): resource audience, issued-client binding, opaque access subject, refresh metadata.
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery.md): explicit scope recovery, structured usage pause and request identifiers.
- [Website OIDC example](https://developers.openai.com/siwc/website.md): issuer discovery, ID-token validation and access-token hash checking. Its commercial identity-registration flow is separate; this program uses the open-source dynamic-client flow above.
- [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create): namespace function/custom definitions and streamed response events.

Remaining live verification requires the user's explicit official consent and a request against the actual authorized catalog. Fixture tests do not establish that the user's account or plan is eligible.
