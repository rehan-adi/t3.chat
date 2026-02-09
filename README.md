# t3.chat - Multi-Model AI Chat Platform

**t3.chat** is a production-grade, full-stack AI chat platform designed for high performance, security, and scalability. It features a robust backend built with **Bun** and **Hono** that handles real-time AI streaming, secure BYOK (Bring-Your-Own-Key) integration, and subscription billing, paired with a modern React frontend (currently in beta).

This repository contains the complete source code for both the backend API and the frontend client.

---

## System Architecture

The system is architected as a monolithic API that leverages managed services for state and heavy lifting, ensuring low latency and strictly typed interactions.

---

## Backend Architecture Deep Dive

The backend is engineered for speed and developer experience, running on **Bun** to minimize startup time and request overhead.

### Tech Stack
*   **Runtime: [Bun](https://bun.sh/)**: Selected for its blistering fast startup and execution, critical for serverless-like responsiveness in a containerized environment.
*   **Framework: [Hono](https://hono.dev/)**: A lightweight, web-standards oriented framework that offers first-class TypeScript support and runs anywhere (Node, Bun, Edge).
*   **Database: PostgreSQL + Prisma**:
    *   **PostgreSQL**: providing ACID compliance for critical user data (accounts, billing, chat history).
    *   **Prisma**: serves as the type-safe ORM, ensuring database queries match the application schema at compile time.
*   **Cache & Queue: Redis**:
    *   **Rate Limiting**: Distributed sliding window limits (via `rate-limiter-flexible`) to protect LLM endpoints.
    *   **OTP Storage**: Ephemeral storage for authentication codes with strict TTLs.

---

## Authentication & Security Model

We implement a **Trade-off Balanced Security Model** that prioritizes user convenience without sacrificing safety.

### 1. Hybrid Authentication
*   **OTP (One-Time Password)**: Passwordless email login. Codes are generated cryptographically, stored in Redis with a 10-minute TTL, and strictly rate-limited (max 3 verify attempts) to prevent brute-force attacks.
*   **JWT Sessions**: Once verified, the server issues a generic JWT.
    *   **Storage**: strictly `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
    *   **Benefit**: This prevents XSS tokens theft, as JavaScript cannot read the session cookie.

### 2. User Isolation
middleware ensures that every request is scoped to the `userId` extracted from the JWT. Cross-tenant data access is blocked at the ORM level by always requiring `where: { userId }` clauses.

---

## AI Streaming & Chat Lifecycle

Real-time interaction is the core value proposition. We use **Server-Sent Events (SSE)** over WebSockets.

### Why SSE?
For a chat application where the primary real-time requirement is **server-to-client** text generation, SSE is superior to WebSockets:
1.  **Standard HTTP**: simpler to load balance and inspect.
2.  **Firewall Friendly**: works over standard ports without upgrade headers.
3.  **Auto-Reconnection**: built-in browser support for retries.

### Chat Flow
1.  **Context Assembly**: Backend fetches the last 5 messages and any pre-computed summaries from Postgres.
2.  **Prompt Engineering**: System prompts + Context + User Input are combined.
3.  **Stream Proxy**: The backend opens a stream to OpenRouter. As chunks arrive, they are immediately flushed to the client.
4.  **Async Persistence**: To keep the UI responsive, the full message is constructed in memory and saved to PostgreSQL **asynchronously** after the stream closes.

### Bring-Your-Own-Key (BYOK)
Users can supply their own OpenRouter keys. These are:
*   **Encrypted** (recommended for production deployment).
*   **Masked** when returned to the UI (e.g., `sk-or-...abcd`).
*   **Prioritized**: BYOK requests bypass internal credit checks.

---

## Payments & Subscription Flow

Subscription billing is handled via **Cashfree**, designed for transactional consistency.

1.  **Order Creation**: User selects a plan -> Backend creates an impending order in Cashfree.
2.  **Payment Processing**: User completes payment on Cashfree gateway.
3.  **Webhook Verification**: Cashfree calls our webhook. We verify the timestamp and signature (HMAC-SHA256) to ensure authenticity.
4.  **Idempotent Fulfillment**: The webhook handler checks if the order is already `PAID`. If not, it upgrades the user subscription and logs the transaction. This handles cases where the user closes the browser before redirection.

---

## File Upload & Storage

We use the **Presigned URL** pattern to keep the API server stateless and efficient.

1.  Client requests an upload URL for a specific file type/size.
2.  API validates user quotas and generates a strictly scoped AWS S3 PUT URL (valid for 5 minutes).
3.  Client uploads the file **directly to S3**.
4.  This prevents large file uploads from blocking API threads and saturating server bandwidth.

---

## Frontend Status

🚧 **Status: Beta / Work In Progress**

The frontend is a modern SPA built with:
*   **Vite + React**: For fast HMR and optimized builds.
*   **Tailwind CSS**: For utility-first styling.
*   **Radix UI**: For accessible, headless UI components.

Contributions to the frontend are strictly welcome! Please check the `frontend/` directory for specific tasks.

---

## Local Development Setup (Backend)

### Prerequisites
*   [Bun](https://bun.sh/) (v1.0+)
*   Docker (for local Postgres/Redis)

### Steps
1.  **Clone & Install**
    ```bash
    git clone https://github.com/rehan-adi/t3.chat.git
    cd t3.chat/backend
    bun install
    ```

2.  **Environment Setup**
    Copy `.env.example` to `.env` and fill in your credentials (DB, Redis, API Keys).

3.  **Infrastructure**
    Start local databases:
    ```bash
    docker-compose up -d
    ```

4.  **Database Migration**
    Push the schema to your local Postgres:
    ```bash
    bun run prisma db push
    ```

5.  **Start Server**
    ```bash
    bun run dev
    ```
    The API will be available at `http://localhost:3000`.

---

## Engineering Trade-offs

*   **Monolith vs Microservices**: We chose a **modular monolith** to maximize development velocity. Breaking auth, billing, and chat into separate services would introduce network latency and deployment complexity that is premature for the current scale.
*   **Consistency Choices**:
    *   **Billing**: Strong Consistency (CP). We never compromise on payment state.
    *   **Chat History**: Eventual Consistency. We allow the DB write to lag slightly behind the live stream to ensure the UI feels instantaneous.
*   **Bun vs Node**: Bun was chosen for its performance, but it is newer. We accept the risk of potential edge-case bugs in the runtime in exchange for higher throughput and better standard library APIs.

---

## Contribution Guidelines

1.  **Fork & Branch**: Create a feature branch (`feat/amazing-feature`).
2.  **Lint**: Ensure code passes `bun run lint`.
3.  **Test**: Add tests for new business logic.
4.  **PR**: Open a Pull Request with a clear description of the problem and solution.

For frontend contributions, please verify all UI components are responsive and accessible.
