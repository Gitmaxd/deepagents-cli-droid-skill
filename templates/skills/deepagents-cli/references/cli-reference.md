# CLI Reference

> **Official docs:** [CLI Overview](https://docs.langchain.com/oss/python/deepagents/cli/overview)

Complete reference for all commands, flags, slash commands, and keyboard shortcuts.

## Table of Contents

1. [Top-Level Commands](#top-level-commands)
2. [Launch Options](#launch-options)
3. [Skills Commands](#skills-commands)
4. [Thread Commands](#thread-commands)
5. [Slash Commands](#slash-commands)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Built-in Tools](#built-in-tools)
8. [Non-Interactive Mode](#non-interactive-mode)

---

## Top-Level Commands

| Command | Description |
|---------|-------------|
| `deepagents` | Start interactive REPL |
| `deepagents list` | List all agents |
| `deepagents skills <cmd>` | Manage skills (create, list, info, delete) |
| `deepagents threads <cmd>` | Manage threads (list, delete) |
| `deepagents reset --agent NAME` | Clear agent memory and reset |
| `deepagents reset --agent NAME --target SRC` | Copy memory from another agent |
| `deepagents help` | Show help |

---

## Launch Options

| Flag | Short | Description |
|------|-------|-------------|
| `--agent NAME` | `-a` | Use named agent with separate memory |
| `--model MODEL` | `-M` | Use specific model (`provider:model`). See [Providers & Models](providers.md) |
| `--model-params JSON` | | Extra kwargs passed to the model as a JSON string (e.g., `'{"temperature": 0.7}'`) |
| `--message TEXT` | `-m` | Initial prompt to auto-submit on start |
| `--non-interactive MSG` | `-n` | Run single task and exit |
| `--quiet` | `-q` | Clean output for piping — only the agent's response goes to stdout. Requires `-n` or piped stdin |
| `--no-stream` | | Buffer the full response and write to stdout at once instead of streaming. Requires `-n` or piped stdin |
| `--resume [ID]` | `-r` | Resume thread: `-r` for recent, `-r ID` for specific |
| `--auto-approve` | | Auto-approve all tool calls without prompting. Toggle with `Shift+Tab` during interactive session |
| `--sandbox TYPE` | | Remote sandbox: `none` (default), `modal`, `daytona`, `runloop`, `langsmith`. See [Sandboxes](sandboxes.md) |
| `--sandbox-id ID` | | Reuse existing sandbox |
| `--sandbox-setup PATH` | | Run setup script in sandbox |
| `--shell-allow-list CMDS` | | Comma-separated shell commands to auto-approve, or `recommended` for safe defaults. Applies to both `-n` and interactive modes |
| `--default-model [MODEL]` | | Set, show, or manage default model |
| `--clear-default-model` | | Clear default model |
| `--version` | `-v` | Show version |
| `--help` | `-h` | Show help |

### Examples

```bash
# Interactive with agent and model
deepagents -a coder -M anthropic:claude-sonnet-4-5

# Non-interactive with shell access
deepagents -n "Find TODO comments" --shell-allow-list grep,find

# Resume last session
deepagents -r

# Resume specific thread
deepagents -r abc-123-def

# Sandbox execution
deepagents --sandbox modal --sandbox-setup ./setup.sh
```

---

## Skills Commands

See [Skills System](skills-system.md) for skill creation details, SKILL.md format, and progressive disclosure. See also the [official skills docs](https://docs.langchain.com/oss/python/deepagents/skills).

| Command | Description |
|---------|-------------|
| `deepagents skills create NAME` | Create user skill |
| `deepagents skills create NAME --project` | Create project skill |
| `deepagents skills list` | List user skills (alias: `ls`) |
| `deepagents skills list --project` | List project skills (alias: `ls`) |
| `deepagents skills info NAME` | Show user skill details |
| `deepagents skills info NAME --project` | Show project skill details |
| `deepagents skills delete NAME [--project] [-f]` | Delete a skill and its contents |

### Skill Directories

| Scope | Location |
|-------|----------|
| User (global) | `~/.deepagents/<agent>/skills/` |
| Project (local) | `<project-root>/.deepagents/skills/` |

Project skills override user skills with the same name (last wins).

---

## Thread Commands

| Command | Description |
|---------|-------------|
| `deepagents threads list [--agent NAME] [--limit N]` | List sessions (alias: `ls`). Default limit: 20 |
| `deepagents threads delete ID` | Delete a specific thread |

---

## Slash Commands

Available in interactive mode:

| Command | Description |
|---------|-------------|
| `/model` | Interactive model selector. See [Providers & Models](providers.md) |
| `/model <provider:model>` | Switch to specific model |
| `/model --default <model>` | Set default model |
| `/model --default --clear` | Clear default model |
| `/remember [context]` | Review conversation, update memory and skills. See [Memory & Persistence](memory-and-persistence.md). Optionally pass additional context |
| `/tokens` | Display token usage |
| `/clear` | Clear conversation history and start a new thread |
| `/threads` | Browse and resume previous conversation threads |
| `/trace` | Open the current thread in LangSmith (requires `LANGSMITH_API_KEY`) |
| `/changelog` | Open the CLI changelog in your browser |
| `/docs` | Open the documentation in your browser |
| `/feedback` | Open the GitHub issues page for bug reports or feature requests |
| `/version` | Show version |
| `/quit` | Exit CLI (alias: `/q`) |
| `/help` | Show available commands |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit prompt |
| `Shift+Enter`, `Ctrl+J`, `Alt+Enter`, or `Ctrl+Enter` | Insert newline |
| `Ctrl+E` | Expand/collapse the most recent tool output |
| `Ctrl+A` | Select all text in input |
| `Shift+Tab` or `Ctrl+T` | Toggle auto-approve |
| `@filename` | Auto-complete files, inject content |
| `Escape` | Interrupt current operation |
| `Ctrl+C` | Interrupt or quit |
| `Ctrl+D` | Exit CLI |

---

## Bash Commands

Execute shell commands directly by prefixing with `!`:

```
!git status
!npm test
!ls -la
```

---

## Built-in Tools

### Filesystem Tools (Always Available)

| Tool | Description | Approval |
|------|-------------|----------|
| `ls` | List files and directories | No |
| `read_file` | Read file contents; supports images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) as multimodal content | No |
| `write_file` | Create or overwrite files | Yes |
| `edit_file` | Make targeted edits to existing files | Yes |
| `glob` | Find files matching patterns (e.g., `**/*.py`) | No |
| `grep` | Search for text patterns across files | No |

### Execution Tools

| Tool | Description | Approval |
|------|-------------|----------|
| `shell` | Execute shell commands (local mode) | Yes |
| `execute` | Execute commands in remote [sandbox](sandboxes.md) | Yes |

### Web Tools

| Tool | Description | Approval |
|------|-------------|----------|
| `web_search` | Search web using Tavily API (`TAVILY_API_KEY` required) | Yes |
| `fetch_url` | Fetch and convert web pages to markdown | Yes |

### Agent Tools

| Tool | Description | Approval |
|------|-------------|----------|
| `task` | Delegate work to [subagents](sdk-customization.md#subagents) for parallel execution | Yes |
| `write_todos` | Create and manage task lists for complex work | No |

### Approval Bypass

- **Interactive:** Toggle with `Shift+Tab` or launch with `--auto-approve`
- **Non-interactive:** Use `--auto-approve` flag

---

## Non-Interactive Mode

Run with `-n` flag. Key behaviors:

- **No shell access by default** — add `--shell-allow-list` to enable
- **Runs task to completion** and exits
- **Reads from project context** (AGENTS.md, skills)
- **Can write files** with `--auto-approve`

### Shell Allow Lists

| Value | Description |
|-------|-------------|
| `recommended` | Safe defaults |
| `ls,cat,grep,...` | Explicit comma-separated list |

### Examples

```bash
# Analysis only (no shell needed)
deepagents -n "Analyze code quality in src/"

# With safe shell access
deepagents -n "Find large files" --shell-allow-list ls,find,du

# Full automation
deepagents --auto-approve -n "Generate tests for all modules" --shell-allow-list recommended

# Specific agent and model
deepagents -a coder -M openai:gpt-4o -n "Refactor auth module"
```

### Piping and stdin

The CLI accepts piped input via stdin, automatically running in non-interactive mode:

```bash
echo "Explain this code" | deepagents
cat error.log | deepagents -n "What's causing this error?"
git diff | deepagents -n "Review these changes"
```

When piped input is combined with `-n` or `-m`, the piped content is prepended to the flag's value. The maximum piped input size is 10 MiB.

Use `-q` for clean output suitable for piping into other commands, and `--no-stream` to buffer the full response before writing to stdout:

```bash
deepagents -n "Generate a .gitignore for Python" -q > .gitignore
deepagents -n "List dependencies" -q --no-stream | sort
```

---

## See Also

- [Providers & Models](providers.md) — All providers, API keys, config.toml format
- [Skills System](skills-system.md) — Skill creation, SKILL.md format
- [Memory & Persistence](memory-and-persistence.md) — AGENTS.md, auto-memory, /remember
- [Sandboxes](sandboxes.md) — Sandbox setup, providers, security
- [SDK Customization](sdk-customization.md) — create_deep_agent(), subagents, middleware, backends
- [Streaming](streaming.md) — Streaming modes, subagent streaming, frontend integration
- [ACP](acp.md) — Agent Client Protocol, editor integrations
- [Official CLI Documentation](https://docs.langchain.com/oss/python/deepagents/cli/overview)
