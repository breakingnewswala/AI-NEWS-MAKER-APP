# WhatsApp Cloud API + Gemini integration

## Selected Meta WhatsApp identity

- Display/sender number: +1 555-706-1955
- Phone Number ID: 1474022642460639
- WhatsApp Business Account ID (WABA ID): 1136242015583003

These IDs are identifiers, not access tokens. Do not commit tokens, app secrets, verify tokens, OTPs, or customer message exports.

## Runtime secrets and configuration

Configure these in the hosting platform's runtime secret/environment settings (not in source code, Vite variables, or client-side settings):

| Variable | Purpose |
| --- | --- |
| `META_APP_SECRET` | Validates `X-Hub-Signature-256` webhook signatures |
| `META_WEBHOOK_VERIFY_TOKEN` | Private string chosen by the operator and entered in Meta webhook configuration |
| `WHATSAPP_ACCESS_TOKEN` | Server-only Meta Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Set to `1474022642460639` |
| `WHATSAPP_GRAPH_API_VERSION` | A currently supported Graph API version, e.g. `vXX.0`; set the version available for the Meta app |
| `GEMINI_API_KEY` | Existing server-side Gemini key |
| `WHATSAPP_GEMINI_MODEL` | Supported Gemini model name enabled for the project |
| `WHATSAPP_AI_ENABLED` | Set to `true` only after knowledge-base content has been reviewed |
| `WHATSAPP_TASK_QUEUE_LOCATION` | Region where the Cloud Tasks queue is created |
| `WHATSAPP_TASK_QUEUE` | Cloud Tasks queue name (recommended: `whatsapp-inbound`) |
| `WHATSAPP_TASK_SERVICE_ACCOUNT` | Dedicated service account used for Cloud Tasks OIDC tokens |
| `WHATSAPP_TASK_BASE_URL` | Public HTTPS origin of the deployed App Hosting backend, without a trailing slash |
| `WHATSAPP_TASK_AUDIENCE` | Optional OIDC audience; defaults to the full task handler URL |

Do not place these values in the browser, mobile app, GitHub, or public build artifacts.

## Meta webhook configuration

- Callback URL: `https://YOUR_PRODUCTION_HOST/api/whatsapp/webhook`
- Verify token: the exact value stored in `META_WEBHOOK_VERIFY_TOKEN`
- Subscribe the WhatsApp Business Account webhook to the `messages` field.
- The GET endpoint handles Meta's verification challenge.
- The POST endpoint checks the raw-body HMAC SHA-256 signature before accepting the event.

## Server-side Firestore collections

- `whatsapp_webhook_events`: webhook event idempotency/status.
- `whatsapp_messages`: inbound/outbound message history.
- `whatsapp_conversations`: current support conversation and human handoff status.
- `whatsapp_knowledge_base`: approved support Q&A/content. Each document should contain a title/question, content/answer, and optional `isActive` boolean.
- `whatsapp_subscribers`: separate news-alert consent state. A verified phone number must never imply news-alert consent.

The integration uses the existing central Firestore service. Do not grant browser/mobile clients direct access to these collections. Server-side access must be controlled by authenticated admin/support APIs.

## Current behavior and limits

- Incoming text messages are stored and can receive a Gemini answer only when an active knowledge-base entry exists.
- If the knowledge base cannot ground an answer, the conversation is marked for human follow-up rather than guessing.
- `STOP` and `UNSUBSCRIBE` turn off news-alert consent for that WhatsApp identity; customer support remains available.
- Requests for a human/representative mark the conversation for human handoff.
- Outbound free-form replies are subject to Meta's customer-service messaging window. Approved templates are needed where Meta requires them.
- This first phase is customer-support webhook plumbing only. It does not yet implement OTP delivery, the admin inbox UI, a durable background queue, or editor-triggered news broadcasts.
- For production reliability, move post-acknowledgement message processing to Cloud Tasks or another durable queue before enabling at scale. The current implementation is a limited first-pass webhook handler.

## Cloud Tasks infrastructure setup (required before deployment)

1. Enable the Cloud Tasks API in the same Google Cloud project as Firebase App Hosting.
2. Create a queue named `whatsapp-inbound` in the same region as the App Hosting backend (the queue location must match `WHATSAPP_TASK_QUEUE_LOCATION`). Set bounded retries, for example 10 attempts, 10-second minimum backoff, 300-second maximum backoff, and a 1-hour maximum retry duration.
3. Create a dedicated service account for task OIDC identity. Grant the App Hosting runtime service account `roles/cloudtasks.enqueuer` on the queue.
4. Grant the Cloud Tasks service agent (`service-PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com`) `roles/iam.serviceAccountTokenCreator` on the dedicated task service account so Cloud Tasks can mint OIDC tokens.
5. Set the five `WHATSAPP_TASK_*` runtime variables above. `WHATSAPP_TASK_BASE_URL` must point to the deployed App Hosting backend origin; do not guess it or use a browser-only frontend hosting URL.
6. Keep the task service account dedicated to this integration. Do not put service-account keys in GitHub or app environment variables; Cloud Tasks uses the service account identity directly.

## Suggested initial test sequence

1. Deploy the backend with secrets configured and `WHATSAPP_AI_ENABLED=false`.
2. Complete Meta webhook verification and subscribe to `messages`.
3. Confirm inbound events are written to Firestore and webhook retries do not duplicate processed message records.
4. Add reviewed Q&A entries to `whatsapp_knowledge_base`.
5. Enable AI for a restricted test cohort and confirm grounded answers/human handoff.
6. Only after separate consent capture is implemented and tested, build the news-alert subscriber workflow.
