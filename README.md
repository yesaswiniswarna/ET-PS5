# Graph-Based Data Modeling and Query System (Order to Cash)

This project transforms fragmented Order-to-Cash (O2C) business data into a unified, explorable graph, coupled with an AI assistant that can answer natural-language queries about the dataset using structured executions context.

   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
5. Open your browser at `http://localhost:8000`.

---

## Architecture Decisions

### 1. Database / Storage Choice
- **NetworkX:** We use an in-memory graph (`NetworkX`) to build node-edge structures for the UI visualization. This easily handles mapping Sales Orders -> Deliveries -> Invoices -> Journal Entries, creating a clear chain of events for rendering.
- **DuckDB (with Pandas):** For answering questions natively, we use DuckDB operating over Pandas dataframes. Instead of using complex and specialized Cypher/Gremlin graph databases which require heavy infrastructure, DuckDB provides incredibly fast query capability straight from in-memory objects. It integrates well when dynamically generating translation steps via the LLM.

### 2. Graph Modeling
- Nodes represent business entities (`SalesOrder`, `Delivery`, `BillingDocument`, `JournalEntry`, `Product`, `Customer`).
- Edges represent the transaction flows:
    - Customer `PLACED` SalesOrder
    - SalesOrder `CONTAINS` Product
    - SalesOrder `DELIVERED_IN` Delivery
    - Delivery `BILLED_IN` BillingDocument
    - BillingDocument `ACCOUNTED_IN` JournalEntry
- This establishes clear causal paths to follow.

### 3. LLM Prompting Strategy (Natural Language to SQL)
- We use a two-step RAG/Tool approach with Google Gemini's API.
- **Translation:** The LLM is provided the schema of all `duckdb` (Pandas) tables along with the user's natural language question. It formulates an ANSI SQL query.
- **Execution:** The SQL query runs internally on our server against duckdb.
- **Formulation:** The resulting rows/columns are fed back to the LLM to format a concise, natural language final response back to the user.
- This grounds the AI purely to data results rather than risking hallucinations (RAG pattern).

### 4. Guardrails
- In the initial system prompt, the LLM is explicitly ordered to evaluate the user's intent:
  "If the question is completely unrelated (e.g. general knowledge, creative writing, 'What is the capital of France?'), you MUST reject it with exactly this message: 'This system is designed to answer questions related to the provided dataset only.'"
- If the AI evaluates that a topic violates this rule, the entire SQL processing pipeline halts and directly returns the rejection message. This forcefully limits it to the domain.
