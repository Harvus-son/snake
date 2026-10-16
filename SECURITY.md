# Security Policy

## Reporting a vulnerability

Please do not publish exploitable details in a public issue. Contact the repository owner privately through GitHub's private vulnerability reporting feature, if available, or use the owner's GitHub profile to request a private contact channel.

Include the affected file or endpoint, impact, reproduction steps, and any safe mitigation you know.

## Project security baseline

- Never commit passwords, API secrets, access tokens, private keys, or production data.
- Use environment variables or a secrets manager for server-side credentials. Browser-visible configuration is public.
- Validate and limit all untrusted input on the server; do not rely on browser-side validation.
- Restrict database access with least-privilege permissions and row-level security where supported.
- Keep dependencies updated and review automated security alerts.
- Do not include secrets, personal data, or internal exception details in logs or API responses.
