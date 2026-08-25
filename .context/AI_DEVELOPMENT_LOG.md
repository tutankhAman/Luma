# AI Development Log

This log documents our use of AI and agentic coding tools during the development of Luma (Loan Data Verification Copilot), as required by the hackathon prompt.

> [!IMPORTANT]
> This is a **live document** — append prompts, decisions, and rejected outputs as they happen during Phases 0–5. Do not backfill at hour 45. §10 requires 5–10 representative prompts and ≥2 rejected-output examples; judges score authenticity.

## 1. Tools Used
*   **Antigravity (Powered by Gemini 3.1 Pro / Claude Sonnet 4.6):** Used as our primary agentic architect and pair programmer. It helped design the system architecture, write the API contracts, generate the 48-hour implementation plan, and research library integrations (Better Auth).
*   *(Add other tools here, e.g., Cursor, GitHub Copilot, ChatGPT)*

## 2. Use Cases
We leveraged AI across the full stack lifecycle:
*   **Architecture & Planning:** Processing the 300-line hackathon prompt to generate a 6-phase implementation plan split between Frontend (Person A) and Backend (Person B).
*   **API & Schema Design:** Generating the full Prisma schema and Zod API contracts.
*   **Library Research:** Using Context7 via MCP (Model Context Protocol) to pull live documentation for `better-auth` integration with a decoupled Express backend.
*   *(Add UI generation, test generation, debugging examples here as you build)*

## 3. Representative Prompts (5-10 required)
Here are some of the key prompts we used to drive the development:

1.  **System Architecture Design:**
    > *"based on the problem.md, I want you to design an architecture and flow.md as well as an api-contract.md . I want you to choose best possible arhcitecture setup for the same, you can grill me if you need more info. Frontend: Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query. Backend: Node.js, Express, TypeScript, Zod, Prisma. Database: PostgreSQL. auth: better auth."*
2.  **Implementation Planning:**
    > *"the development of this would be divided between two people A and B, A will be dealing mainly with the frontend part of the development, B will deal with everything else. Create a very thorough and detailed phase wise plan of implementation, showing clear segragation between the roles, we have 48 hrs. Ensure you take every feature, every guidelines into account."*
3.  **Enterprise Scalability Check:**
    > *"would we need a monorepo in the first place? wouldnt next.js by default work for it? ... what if the sheet is much more than 1000 rows, what if its a million"*
4.  *(Add Prompt 4)*
5.  *(Add Prompt 5)*
6.  *(Add Prompt 6)*
7.  *(Add Prompt 7)*

## 4. Human Review Process
*   **AI-Generated Code Percentage Estimate:** *(e.g., 50-60%)*
*   **Review Process:** We treated the AI as a junior developer proposing PRs. All AI-generated architectures were manually reviewed against the hackathon constraints. We established explicit "Handoff Contracts" between Person A and Person B so that AI-generated frontend code could be tested against AI-generated backend endpoints independently.

## 5. What Was Rejected (Required)
We actively challenged and rejected AI output when it didn't meet enterprise standards.

*   **Rejected Output 1: In-Memory CSV Parsing (OOM Risk)**
    *   **What AI proposed:** Initially, the AI proposed using Next.js API routes or `papaparse` in Express to read the uploaded CSV files directly into memory before bulk-inserting them into PostgreSQL.
    *   **Why we rejected it:** We challenged the AI by asking how it would handle a 1-million-row CSV. The AI admitted that the initial in-memory design would cause an Out-Of-Memory (OOM) crash and Vercel serverless timeouts.
    *   **How we fixed it:** We forced a redesign to use a **Stream + Batch** architecture. We switched to `csv-parser` with `fs.createReadStream`, accumulating rows into chunks of 5,000, and pausing the stream to run `prisma.createMany`. We also added a `processedCount` cursor to the database to ensure the job could resume if the Express server crashed mid-stream.
*   **Rejected Output 2: *(Add your second rejection here)***
    *   **What AI proposed:** 
    *   **Why we rejected it:** 
    *   **How we fixed it:** 

## 6. Lessons Learned
*   **Where AI helped most:** System design and boilerplate generation. The AI was exceptionally fast at translating a raw markdown problem statement into a structured set of database tables and REST endpoints.
*   **Where human engineering judgment was necessary:** Scalability and fault tolerance. The AI tends to choose the "easiest" path first (like loading a whole file into memory). It requires strong human prompting to design for edge cases, disconnects, and server crashes.
