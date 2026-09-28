# SupportMemory

SupportMemory is a compact internal support tool that demonstrates how long-term memory changes a support agent's behavior. The app shows a normal support workspace, stores customer ticket history in a local data store, and uses Hindsight for customer-specific retention and recall.

## Why memory matters

Stateless support systems make customers repeat themselves across tickets and often miss the prior troubleshooting that solved a similar issue. SupportMemory uses Hindsight to retain a ticket as a coherent document, recall the most relevant facts when a new issue arrives, and inject that context into the support response. Without memory, the system responds generically; with memory, it acknowledges prior incidents, preferences, and attempted fixes.

## Architecture

```text
Frontend
   ↓
Backend
   ↓
Agent
   ├── Hindsight Recall
   ├── LLM reasoning
   └── Hindsight Retain
```

The frontend is a small Next.js app. The backend exposes customer and support endpoints, and the agent layer uses Hindsight to recall relevant historical memories and to retain support interactions as structured memory records.

## Hindsight integration

The application uses the official TypeScript client, `@vectorize-io/hindsight-client`, with the documented `retain`, `recall`, and `reflect` methods. Each customer gets a deterministic bank ID of the form `customer-{customerId}` and each ticket is retained as a coherent document with a stable `document_id` such as `ticket-1042`.

During the demo flow:

- ticket history is retained into the customer's bank using a single coherent ticket transcript
- a new customer message triggers a targeted recall query against that bank
- relevant memories are surfaced in the UI memory panel and injected into the response path
- the final support answer references historical facts while still acknowledging uncertainty when the current issue differs from the prior incident

### Memory API

The backend memory operations are exported from `lib/memory.ts`:

```ts
retrieveMemories(customerId, message)
storeMemory(customerId, memory)
```

`POST /api/support/chat` accepts an authenticated customer/project/case context and a message. It performs the membership check before retrieval and returns:

```json
{
   "response": "...",
   "memoriesUsed": [],
   "recommendedActions": [],
   "memoryCandidates": [],
   "memoryStatus": "available"
}
```

The client cannot submit its own memories to this route. `POST /api/support/memories` stores a candidate only when `approved: true` is supplied, and validates that the signed-in employee can access the project and that the case belongs to the customer. Hindsight bank IDs are customer-scoped; retained records also carry project, customer, and case metadata.

Configure `HINDSIGHT_BASE_URL` and, when required, `HINDSIGHT_API_KEY` in `.env`. If the Hindsight service is unavailable, chat returns an empty `memoriesUsed` list with `memoryStatus: "unavailable"`; it does not claim that a historical incident was found. The app cannot perform a live Cloud retain/recall until a reachable Hindsight service is configured.

## Local development

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

Open the app at http://localhost:3000.

## Environment variables

Required for the Hindsight-enabled flow:

- `HINDSIGHT_BASE_URL` — base URL for the Hindsight service
- `HINDSIGHT_API_KEY` — optional API key if the service requires auth
- `HINDSIGHT_BANK_PREFIX` — optional prefix used for bank IDs; defaults to `customer`

Optional for response generation:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_APP_NAME`

## Workspace flow

The app opens with a normal Apex Consulting sign-in form. Local development uses seeded demo credentials handled by the server-side session route:

| Account | Password | Role |
| --- | --- | --- |
| `kevin@apex.consulting` | `ApexDemo123!` | Support Engineer |
| `maya@apex.consulting` | `ApexDemo123!` | Delivery Lead |
| `omar@apex.consulting` | `ApexDemo123!` | Customer Success Manager |

These are development-only accounts. The session is an HTTP-only signed cookie; passwords are never sent to the client. Customer listing, project workspace, recall, and support routes enforce project membership on the backend.

Inside the workspace:

- the project dashboard shows open cases, budget, AI spend, and owning team
- the case queue selects a dedicated customer case context
- the case detail shows environment, known issues, previous fixes, and customer preferences
- the memory mode switch controls whether the backend performs Hindsight recall
- completed support interactions are retained into the customer's Hindsight bank when configured
- the "I'm stuck" workflow routes the employee to requirements, teammate, repository, or cloud context

## Demo

The seeded data includes Acme Cloud, Northstar Labs, and Meridian Health Systems. The Acme Cloud scenario demonstrates the core product loop:

1. Open the Acme Cloud customer profile.
2. Review prior ticket #1042, which documents a memory-pressure deployment failure.
3. Submit a new message: "The deployment is failing again after today's configuration update."
4. Switch the memory mode between With memory and Without memory.
5. Compare the more context-aware response to the generic one.

## Limitations

This repo intentionally does not claim production readiness. It is a deliberate demo implementation designed to make the Hindsight memory path inspectable and demonstrable. The local app uses static seed data and is best suited for local validation and engineering review rather than production deployment.
# Code_Alchemists
