# Request form — synthetic validation exercise
Fields: name, email, service type, description. Persistent visible labels.
Trim required text for validation; do not silently rewrite meaningful content. Empty name/email/service: field-specific error. Email: practical format validation, not proof of mailbox ownership. Description: optional, bounded length agreed before implementation.
Validate on blur after interaction and on submit. Link errors with aria-describedby; mark invalid fields; focus first error after submit; announce form-level status. Preserve input. Maintain keyboard access and visible focus.
Synthetic success: “This is a demonstration. No request was sent.” External requests prohibited in the exercise adapter.
Test: all blank; whitespace only; malformed email; valid values; edit after error; submit twice; keyboard only; error focus; busy; synthetic failure; narrow viewport.
Production transport, server validation, abuse controls, privacy notice and retention require separate design and verification.
