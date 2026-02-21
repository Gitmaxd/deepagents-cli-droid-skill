<div align="center">
  <img
    src="https://images.unsplash.com/REPLACE_WITH_PHOTO_ID?w=1200&q=80&auto=format&fit=crop"
    alt="Deep Agents CLI Droid Skill"
    width="100%"
  />
</div>

<br />

<div align="center">

# deepagents-cli-droid-skill

**A Factory.ai Droid Skill for the LangChain Deep Agents CLI**

[![npm version](https://img.shields.io/npm/v/deepagents-cli-droid-skill.svg)](https://www.npmjs.com/package/deepagents-cli-droid-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![npm downloads](https://img.shields.io/npm/dm/deepagents-cli-droid-skill.svg)](https://www.npmjs.com/package/deepagents-cli-droid-skill)

Scaffold a production-grade Droid Skill that gives Factory.ai Droid comprehensive, structured knowledge of the Deep Agents CLI — commands, providers, memory, sandboxes, streaming, and SDK customization.

[Installation](#installation) · [What Gets Installed](#what-gets-installed) · [Skill Resources](#skill-resources) · [Official Documentation](#official-documentation)

</div>

---

## Overview

The Deep Agents CLI is LangChain's terminal coding agent — a LangGraph-powered assistant with persistent memory, 20+ LLM provider integrations, sandboxed code execution, and a composable skills system. Its surface area spans interactive and non-interactive modes, a rich slash-command REPL, programmatic SDK customization, streaming output, and the Agent Client Protocol for editor integration.

This package scaffolds a [Factory.ai Droid Skill](https://docs.factory.ai/cli/configuration/skills) that encodes that entire surface area as structured, on-demand knowledge. When the skill is active, Factory.ai Droid can accurately assist with any Deep Agents CLI task — from launching a first session to building production subagent pipelines — without requiring repeated context or pasted documentation.

The skill loads automatically when relevant and can also be invoked directly with `/deepagents-cli`.

---

## Installation

### Workspace (recommended)

Installs the skill into the current project's `.factory/skills/` directory. Check it into version control to share it with your team.

```bash
npx deepagents-cli-droid-skill init
```

### Personal

Installs the skill to `~/.factory/skills/` so it is available across all projects on your machine.

```bash
npx deepagents-cli-droid-skill init --personal
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--personal` | Install to `~/.factory/skills/` (personal scope) | `false` |
| `--path <dir>` | Target directory for workspace installation | Current directory |
| `--force` | Skip confirmation when skill directory already exists | `false` |
| `--help` | Show usage information | — |
| `--version` | Show installed version | — |

### Updating

To update the skill after a new release, re-run the init command. Existing files are never overwritten; only files added in the new release will be created.

---

## What Gets Installed

```
.factory/skills/deepagents-cli/
├── SKILL.md                        Main skill definition and quick-start reference
└── references/
    ├── cli-reference.md            Complete CLI commands, flags, and keyboard shortcuts
    ├── providers.md                LLM provider configuration and config.toml schema
    ├── skills-system.md            Skills creation, SKILL.md format, progressive disclosure
    ├── memory-and-persistence.md   Memory system, AGENTS.md, SDK long-term memory
    ├── sandboxes.md                Sandbox providers: Modal, Runloop, Daytona, LangSmith
    ├── sdk-customization.md        create_deep_agent(), middleware, subagents, backends, HITL
    ├── streaming.md                Streaming modes, subgraph streaming, frontend integration
    ├── acp.md                      Agent Client Protocol and editor integrations
    └── workflows.md                Automation patterns, CI/CD, troubleshooting
```

The skill follows the Factory.ai progressive disclosure model: `SKILL.md` is the primary context loaded by the Droid, and the reference files are surfaced on-demand as the task requires them. This keeps the token footprint minimal while making the full surface area available.

---

## Skill Resources

Each reference file is a structured knowledge document scoped to a specific area of the Deep Agents CLI. All content is sourced from the [official LangChain Deep Agents documentation](https://docs.langchain.com/oss/python/deepagents/overview) and aligned with the documented API.

### SKILL.md

**Purpose:** Entry point for the skill. Contains a concise overview, quick-start examples, core concept summaries, and links to all reference files.

**Value:** The Droid reads this file first when the skill is activated. It provides enough context to handle the most common tasks immediately and directs the Droid to the appropriate reference file for deeper questions, keeping initial token usage minimal.

---

### CLI Reference

**File:** `references/cli-reference.md`
**Source:** [CLI Overview](https://docs.langchain.com/oss/python/deepagents/cli/overview)

Complete reference for every command, flag, slash command, and keyboard shortcut in the Deep Agents CLI. Covers top-level commands (`deepagents list`, `deepagents reset`, `deepagents skills`), all launch flags (`-M`, `-a`, `-n`, `-r`, `-q`, `--auto-approve`, `--shell-allow-list`), all slash commands (`/model`, `/remember`, `/threads`, `/trace`, `/clear`, `/tokens`), keyboard shortcuts for the interactive REPL, the built-in tool inventory with approval requirements, and non-interactive mode behavior in detail.

---

### Providers and Models

**File:** `references/providers.md`
**Source:** [Model Providers](https://docs.langchain.com/oss/python/deepagents/cli/providers)

Configuration reference for all 20+ supported LLM providers including OpenAI, Anthropic, Google Gemini, AWS Bedrock, Azure OpenAI, Ollama, Groq, DeepSeek, Mistral AI, Perplexity, xAI, OpenRouter, and more. Covers API key environment variables per provider, the `~/.deepagents/config.toml` schema in full, model resolution order (`-M` flag → config default → recent → API key detection), and provider-specific parameters for local models such as Ollama.

---

### Skills System

**File:** `references/skills-system.md`
**Source:** [Skills](https://docs.langchain.com/oss/python/deepagents/skills)

Detailed guide to the Deep Agents skills system: the `SKILL.md` format and frontmatter fields, directory conventions for user-level (`~/.deepagents/<agent>/skills/`) and project-level (`.deepagents/skills/`) skills, the progressive disclosure loading model, override behavior when user and project skills share a name, and the full CLI for creating, listing, inspecting, and deleting skills.

---

### Memory and Persistence

**File:** `references/memory-and-persistence.md`
**Source:** [Long-term Memory](https://docs.langchain.com/oss/python/deepagents/long-term-memory)

Covers both layers of the Deep Agents memory system: the file-based layer (`AGENTS.md` and `memories/`) that persists across sessions per agent, and the SDK layer (`InMemoryStore`, `AsyncPostgresStore`) for programmatic long-term memory backends. Includes the agent directory layout, the `/remember` command and its optional context argument, `deepagents reset` behavior, and the distinction between agent-scoped and project-scoped `AGENTS.md` files.

---

### Sandboxes

**File:** `references/sandboxes.md`
**Source:** [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes)

Setup and configuration guide for all four supported sandbox providers: Modal (GPU and ML workloads), Runloop (disposable devboxes), Daytona (fast cold starts for TypeScript and Python development), and LangSmith (cloud-hosted execution). Covers `--sandbox`, `--sandbox-setup`, and `--sandbox-id` flags, provider-specific environment variables, setup script patterns, sandbox reuse across sessions, and the security isolation properties of each provider.

---

### SDK Customization

**File:** `references/sdk-customization.md`
**Sources:** [Customization](https://docs.langchain.com/oss/python/deepagents/customization), [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents), [Backends](https://docs.langchain.com/oss/python/deepagents/backends), [Human-in-the-Loop](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop), [Middleware](https://docs.langchain.com/oss/python/deepagents/middleware)

Programmatic usage of the Deep Agents SDK via `create_deep_agent()`. Covers the full function signature, model configuration, custom tool registration, system prompt customization, the middleware stack (request and response hooks for logging, rate limiting, and guardrails), subagent patterns (spawning agents as tools within a parent agent), backend types (local, sandbox, ACP), Human-in-the-Loop approval gates with interrupt and resume patterns, context management, and structured output configuration.

---

### Streaming

**File:** `references/streaming.md`
**Sources:** [Streaming Overview](https://docs.langchain.com/oss/python/deepagents/streaming/overview), [Streaming Frontend](https://docs.langchain.com/oss/python/deepagents/streaming/frontend)

Streaming output reference for both CLI and SDK usage. Covers the three streaming modes (`text`, `events`, `full`), subgraph streaming for multi-agent pipelines where each agent emits its own stream, Server-Sent Events integration for web frontends, WebSocket alternatives, and the frontend streaming protocol including event types and client-side consumption patterns.

---

### Agent Client Protocol

**File:** `references/acp.md`
**Source:** [Agent Client Protocol](https://docs.langchain.com/oss/python/deepagents/acp)

Reference for the Agent Client Protocol (ACP) — the open standard that allows editors and external clients to communicate with a running Deep Agents instance over a local socket. Covers the ACP server (`deepagents serve`), the request and response protocol, capability negotiation, and integration guides for Zed, VS Code, JetBrains IDEs, and Neovim.

---

### Workflows and Patterns

**File:** `references/workflows.md`

Practical reference for automation and scripted usage. Covers non-interactive mode recipes for common tasks, CI/CD integration patterns with environment configuration, piped input workflows using stdin, multi-step subagent orchestration, shell access configuration with `--shell-allow-list`, output formatting with `-q` and `--no-stream` for downstream piping, and a troubleshooting index for the most common runtime errors.

---

## Droid Skill Compliance

This skill is built to the [Factory.ai Droid Skill specification](https://docs.factory.ai/cli/configuration/skills):

| Requirement | Implementation |
|-------------|----------------|
| `SKILL.md` with YAML frontmatter | `name` and `description` fields present; description written for accurate Droid invocation matching |
| Narrow, outcome-focused scope | Skill scoped entirely to Deep Agents CLI knowledge; single domain, single responsibility |
| Co-located supporting files | `references/` directory co-located with `SKILL.md` inside the skill directory |
| Progressive disclosure | `SKILL.md` is the primary context; reference files are surfaced on-demand by topic |
| Flexible invocation | Droid loads the skill automatically when relevant; user can also invoke with `/deepagents-cli` |
| Composable | Reference files are structured to be surfaced independently within a Droid plan |
| Personal and workspace scopes | `--personal` targets `~/.factory/skills/`; default targets `<project>/.factory/skills/` |
| Never overwrites existing files | The installer skips any file that already exists at the target path |

---

## Official Documentation

All technical content in this skill is sourced from and cross-referenced against the official LangChain Deep Agents documentation:

| Topic | URL |
|-------|-----|
| Deep Agents Overview | https://docs.langchain.com/oss/python/deepagents/overview |
| Quickstart | https://docs.langchain.com/oss/python/deepagents/quickstart |
| CLI Overview | https://docs.langchain.com/oss/python/deepagents/cli/overview |
| Model Providers | https://docs.langchain.com/oss/python/deepagents/cli/providers |
| Customization | https://docs.langchain.com/oss/python/deepagents/customization |
| Harness Capabilities | https://docs.langchain.com/oss/python/deepagents/harness |
| Backends | https://docs.langchain.com/oss/python/deepagents/backends |
| Subagents | https://docs.langchain.com/oss/python/deepagents/subagents |
| Human-in-the-Loop | https://docs.langchain.com/oss/python/deepagents/human-in-the-loop |
| Long-term Memory | https://docs.langchain.com/oss/python/deepagents/long-term-memory |
| Skills | https://docs.langchain.com/oss/python/deepagents/skills |
| Sandboxes | https://docs.langchain.com/oss/python/deepagents/sandboxes |
| Streaming Overview | https://docs.langchain.com/oss/python/deepagents/streaming/overview |
| Streaming Frontend | https://docs.langchain.com/oss/python/deepagents/streaming/frontend |
| Agent Client Protocol | https://docs.langchain.com/oss/python/deepagents/acp |
| Middleware | https://docs.langchain.com/oss/python/deepagents/middleware |

Factory.ai Droid Skill specification: https://docs.factory.ai/cli/configuration/skills

---

## Requirements

- Node.js >= 18
- [Factory.ai Droid](https://factory.ai)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

[GitMaxd](https://github.com/Gitmaxd) · [@gitmaxd](https://x.com/gitmaxd)

---

<div align="center">
  <a href="https://github.com/Gitmaxd/deepagents-cli-droid-skill">GitHub</a>
  &nbsp;·&nbsp;
  <a href="https://www.npmjs.com/package/deepagents-cli-droid-skill">npm</a>
  &nbsp;·&nbsp;
  <a href="https://docs.factory.ai/cli/configuration/skills">Droid Skills Docs</a>
  &nbsp;·&nbsp;
  <a href="https://docs.langchain.com/oss/python/deepagents/overview">Deep Agents Docs</a>
</div>
