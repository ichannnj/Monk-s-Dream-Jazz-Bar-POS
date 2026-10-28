---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- For codebase or architecture questions, when `graphify-out/graph.json` exists, first run `graphify query "<question>"` (CLI) or `query_graph` (MCP). Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context
- **Automated Sync & Token Preservation Invariant:**
  - After modifying or creating any code files in any session, ALWAYS run `pnpm sync:knowledge` (or `bash scripts/sync-knowledge.sh`) to keep `graph.json` and `GRAPH_TREE.html` in sync.
  - Whenever introducing new features, screen routes, domain models, or architectural patterns, proactively review and update [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md) and [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md) to keep routing tables and domain invariants aligned.
  - Never dump monolithic files into context; leverage Graphify queries and surgical file slices (250–350 LOC max).
