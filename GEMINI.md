# ♊ GEMINI.md — Antigravity & Gemini Agent Directives

> **Audience:** Google Antigravity IDE, Gemini 3.8 / 3.0 Flash & Pro Models  
> **Mission:** Guidelines for Antigravity customizations, slash commands, pair-programming workflows, and IDE tools.

---

## 🧭 Foundational Directives

1. **Avoid Rule Duplication:**
   - Universal agent rules and the Task-to-File router reside in **[AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)**.
   - Core domain logic, PIN matrix, and business rules reside in **[CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)**.
   - Developer commands reside in **[CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)**.
   - Rely on these documents directly rather than duplicating text into prompt context.

2. **Mandatory KI First Step:**
   - Before performing novel research or creating new architectural blueprints, inspect relevant Knowledge Items (KIs) in the active session.

---

## ⚡ Antigravity Slash Commands & Workflows

When guiding or collaborating with the user, leverage and recommend Antigravity slash commands:

| Command     | When to Recommend / Use                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `/grill-me` | When planning or resolving design decisions to conduct an interactive interview and eliminate hidden assumptions. |
| `/goal`     | For autonomous long-running tasks where the agent should persevere until fully verified.                          |
| `/plan`     | For multi-phase architectural implementations requiring upfront step-by-step breakdown.                           |
| `/schedule` | For recurring cron jobs or background reminders (never use shell `sleep`).                                        |
| `/learn`    | When the user corrects behavior or establishes a novel project convention to persist.                             |

---

## 🛠️ Antigravity Customizations & Skills

- **Workspace Skills Root:** Located in [.agents/skills/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/skills/)
  - Available repository skills include `code-review`, `diagnosing-bugs`, `domain-modeling`, `grilling`, `prototype`, `tdd`, `web-design-guidelines`, `writing-for-agents`, and `writing-guidelines`.
- **Global Customizations:** Located in `/home/ichannnj/.gemini/config`.
- **Tool Discipline:**
  - Prefer `view_file` with explicit `StartLine` and `EndLine` for surgical reads.
  - Use `replace_file_content` for single contiguous changes and `multi_replace_file_content` for multiple disjoint chunks.
  - Avoid dumping terminal outputs greater than 100 lines; pipe or filter when possible.
