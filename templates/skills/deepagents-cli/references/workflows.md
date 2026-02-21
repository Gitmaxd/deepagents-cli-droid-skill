# Workflows & Patterns

Automation patterns, CI/CD integration, subagent strategies, and troubleshooting.

## Table of Contents

1. [Automation Patterns](#automation-patterns)
2. [Agent Lifecycle](#agent-lifecycle)
3. [Subagent Patterns](#subagent-patterns)
4. [Project Setup](#project-setup)
5. [Troubleshooting](#troubleshooting)

---

## Automation Patterns

### Basic Non-Interactive

```bash
# Analysis (no shell needed)
deepagents -n "Analyze code quality in src/"

# With safe shell access
deepagents -n "Run tests and report failures" --shell-allow-list recommended

# With explicit commands
deepagents -n "Count lines of code" --shell-allow-list find,wc,xargs

# Full automation (file writing + shell)
deepagents --auto-approve -n "Generate changelog from git history" --shell-allow-list recommended
```

### Scripted Workflows

```bash
#!/bin/bash
# analyze-and-fix.sh

# Step 1: Analyze (read-only)
deepagents -a coder -n "Analyze src/ for type safety issues. List all problems found."

# Step 2: Fix (with file writing)
deepagents --auto-approve -a coder -n "Fix all type safety issues in src/"

# Step 3: Verify
deepagents -a coder -n "Verify the type safety fixes are correct" --shell-allow-list recommended
```

### Model-Specific Tasks

```bash
# Quick tasks with local model
deepagents -M ollama:qwen3:8b -n "Explain what this function does"

# Complex tasks with cloud model
deepagents -M anthropic:claude-sonnet-4-5 -n "Refactor the auth module for better security"

# Cost-sensitive batch processing
for f in src/*.py; do
    deepagents -M ollama:qwen3:8b -n "Add docstrings to $f" --auto-approve
done
```

### Session Continuation

```bash
# Start analysis session
deepagents -a project-analyst -m "Analyze the authentication system"

# Later: resume to continue
deepagents -a project-analyst -r
```

---

## Agent Lifecycle

### Creation

```bash
# Agent created on first use — just specify the name
deepagents -a my-agent
# Creates ~/.deepagents/my-agent/ with AGENTS.md, memories/, skills/
```

### Customization

```bash
# Edit global context
$EDITOR ~/.deepagents/my-agent/AGENTS.md

# Add skills
deepagents -a my-agent skills create code-review
$EDITOR ~/.deepagents/my-agent/skills/code-review/SKILL.md
```

### Maintenance

```bash
# Check what agents exist
deepagents list

# Check accumulated memories
ls ~/.deepagents/my-agent/memories/

# Clean up stale memories manually
rm ~/.deepagents/my-agent/memories/outdated-topic.md

# Full reset
deepagents reset --agent my-agent

# Fork an agent (copy memories to new agent)
deepagents reset --agent my-agent-v2 --target my-agent
```

---

## Subagent Patterns

### Research + Implementation

```python
from deepagents import create_deep_agent

# web_search, fetch_url are your own tool callables — define or import them
researcher = {
    "name": "researcher",
    "description": "Research questions thoroughly before implementation",
    "tools": [web_search, fetch_url],
    "model": "openai:gpt-4o"  # Cheaper model for research
}

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-5",
    subagents=[researcher]
)
# Main agent delegates research, then implements based on findings
```

### Parallel Processing

Main agent can spawn multiple subagents concurrently via the `task` tool. Each subagent:
- Gets its own context window
- Runs independently
- Returns a single report
- Cannot communicate with other subagents

### Skill-Specialized Subagents

```python
# Tools referenced below are your own callables — define or import them
security_auditor = {
    "name": "security-auditor",
    "description": "Audit code for security vulnerabilities",
    "skills": ["/skills/security-audit/"],
    "tools": [read_file, grep, glob]
}

doc_writer = {
    "name": "doc-writer",
    "description": "Generate documentation from code",
    "skills": ["/skills/documentation/"],
    "tools": [read_file, write_file]
}

agent = create_deep_agent(subagents=[security_auditor, doc_writer])
```

**Note:** Custom subagents do NOT inherit main agent skills — must specify explicitly.

---

## Project Setup

### Minimal Setup

```bash
cd my-project
mkdir -p .deepagents
cat > .deepagents/AGENTS.md << 'EOF'
# Project: My App
- Language: Python 3.12
- Framework: FastAPI
- Database: PostgreSQL
- Tests: pytest
- Style: black, ruff
EOF

deepagents -m "Help me add a new endpoint"
```

### Full Setup

```bash
cd my-project

# Project context
mkdir -p .deepagents/skills

# AGENTS.md with conventions
cat > .deepagents/AGENTS.md << 'EOF'
# My Project

## Architecture
- Monorepo: frontend (React), backend (FastAPI), shared types
- API: REST, snake_case, always include timestamps

## Development
- Build: `make build`
- Test: `pytest -x`
- Lint: `ruff check .`

## Conventions
- Type hints required everywhere
- Docstrings for public functions
- Tests required for new features
EOF

# Project-specific skill
deepagents skills create api-patterns --project
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `command not found: deepagents` | Not installed or not in PATH | `uv tool install deepagents-cli` |
| No model selected | No API keys set | Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| Wrong model used | Resolution order confusion | Check config.toml or use explicit `-M` flag |
| Tool calls rejected | HITL enabled (default) | Use `--auto-approve` or `Shift+Tab` |
| No shell in `-n` mode | Security default | Add `--shell-allow-list recommended` |
| Memory not persisting | Using different agent names | Consistent `-a` flag across sessions |
| Slow responses | Large context or complex task | Try smaller model, reset memory |
| Ollama model failures | Poor tool-calling support | Use cloud models for tool-heavy tasks |
| Skills not loading | Missing `.git` in project root | Initialize git: `git init` |
| Skills not found | Wrong directory | Check `deepagents skills list` output |

### Performance Tips

- **Local models** (Ollama) are fast but limited — use for simple tasks
- **Reset memory** periodically to prevent context bloat
- **Use project AGENTS.md** to front-load context instead of conversation
- **Break large tasks** into subagent-friendly chunks
- **Non-interactive mode** (`-n`) is faster than interactive for single tasks

### Debug Checklist

```bash
# 1. Check version
deepagents --version

# 2. Check API keys
echo $ANTHROPIC_API_KEY | head -c 10
echo $OPENAI_API_KEY | head -c 10

# 3. Check config
cat ~/.deepagents/config.toml

# 4. Check agent state
ls ~/.deepagents/
ls ~/.deepagents/<agent>/memories/

# 5. Check skills
deepagents skills list
deepagents skills list --project

# 6. Enable LangSmith tracing for detailed debugging
export LANGCHAIN_TRACING=true
export LANGCHAIN_API_KEY="your-key"
deepagents -n "test task"
```

### Known Limitations

1. **Global config.toml** — `~/.deepagents/config.toml` applies to all agents; use `--model-params` for per-invocation overrides
2. **Auto-memory accumulation** — memories may become stale over time; use `deepagents reset` to clean up
3. **Context window limits** — large codebases may exceed model limits
4. **Local model tool-calling** — Qwen3:8b and similar struggle with complex tool usage
5. **Non-interactive shell restriction** — default is no shell access for safety
6. **Path stripping in CompositeBackend** — `/memories/file.txt` stored as `/file.txt`
