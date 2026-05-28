# Coding With AI Template


## Development Workflow

The workflow we follow throughout the course for every feature:

1. **Document** — Write the feature spec in `context/current-feature.md`
2. **Branch** — Create a new branch (`feature/[name]` or `fix/[name]`)
3. **Implement** — Build the feature with AI assistance
4. **Create Tests** - Create unit tests for server actions
5. **Run Tests** — Verify in the browser, run `npm run build` and `npm run test`
6. **Iterate** — Adjust as needed
7. **Commit** — Only after the build passes
8. **Merge** — Merge to main
9. **Delete Branch** — Clean up after merge
10. **Review** — Review AI-generated code
11. **Complete** — Mark as done in `current-feature.md`

---

## 📁 Folder Structure

```
coding-with-ai-course-resources/
├── context/                 # Project context files (specs, features, research)
├── docs/                    # Detailed project documentation
├── skills/                  # Custom Claude Code skills
├── custom-subagents/        # AI subagent definitions
├── diagrams-notes/          # Visual diagrams used in lessons
├── ai-tool-equivilents.md   # AI tool feature equivalents & comparisons
├── CLAUDE.md                # Claude Code project instructions
└── README.md
```


### `/context`

The project context files used by Claude Code during development. These are the files that live in the DevStash repo and guide AI behavior.

- **Root files** — `project-overview.md`, `coding-standards.md`, `ai-interaction.md`, `current-feature.md`
- **`/features`** — Individual feature specs (30+ files covering auth, dashboard, items, collections, AI, etc.)
- **`/fixes`** — Fix specifications (e.g., GitHub OAuth redirect fix)
- **`/research`** — Technical research docs (AI integration, item CRUD patterns, Stripe)
- **`/screenshots`** — UI mockups and design references

### `/docs`

Detailed project documentation and architecture plans:

| File                         | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `project-spec.md`            | Master project specification                   |
| `item-types.md`              | All 7 system item types with field definitions |
| `item-crud-architecture.md`  | CRUD operation architecture                    |
| `stripe-integration-plan.md` | Stripe payment integration plan                |
| `ai-integration-plan.md`     | AI features integration plan                   |

### `/skills`

Custom Claude Code skills created during the course:

| Skill              | Description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `feature/`         | Feature implementation workflow with actions (load, start, review, explain, complete, test) |
| `cleanup/`         | Code cleanup and file removal                                                               |
| `research/`        | Technical research documentation                                                            |
| `list-components/` | List and catalog all components in a codebase                                               |

### `/custom-subagents`

Specialized AI subagent definitions:

| Subagent              | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `code-scanner.md`     | Scans for code quality, performance, and security issues |
| `ui-reviewer.md`      | Reviews UI/UX against design specifications              |
| `refactor-scanner.md` | Identifies refactoring opportunities                     |

### `/diagrams-notes`

Visual diagrams used in lesson slides — levels of AI assistance, prototyping, context & tokens, migrations workflow, MCP architecture, and more.


## 🔀 AI Tool Equivalents

The course uses **Claude Code** as the primary AI tool, but all major concepts transfer to other tools. See [`ai-tool-equivilents.md`](ai-tool-equivilents.md) for a full comparison covering:

| Feature | Claude Code | Cursor | Gemini CLI | Codex CLI | Windsurf |
|---|---|---|---|---|---|
| **Project context** | `CLAUDE.md` | `.cursor/rules/*.mdc` | `GEMINI.md` | `AGENTS.md` | `.windsurfrules` |
| **Custom commands** | `.claude/commands/` | `.cursor/commands/` | `.gemini/commands/` | Built-in `/` commands | Workflows (`.md`) |
| **Skills** | `.claude/skills/` | — | `.gemini/skills/` | `.agents/skills/` | — |
| **Subagents** | `.claude/agents/` | — | `.gemini/agents/` | `config.toml` | Cascade parallel |
| **MCP servers** | `claude mcp add` | `.cursor/mcp.json` | `settings.json` | `~/.codex/config.toml` | Settings UI |
| **Hooks** | `settings.json` | — | — | Partial | — |
| **Headless mode** | `claude -p` | — | `gemini -p` | `codex exec` | — |

The guide also covers agent mode, parallel agents, session resume, model selection, IDE integration, and pricing.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

