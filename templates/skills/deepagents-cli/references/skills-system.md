# Skills System

> **Official docs:** [Skills](https://docs.langchain.com/oss/python/deepagents/skills) · [Customization](https://docs.langchain.com/oss/python/deepagents/customization)

How Deep Agents skills work: creation, progressive disclosure, SKILL.md format, and SDK loading.

Deep agent skills follow the [Agent Skills standard](https://agentskills.io/) and the [Agent Skills specification](https://agentskills.io/specification).

## Table of Contents

1. [Skills vs Memory](#skills-vs-memory)
2. [SKILL.md Format](#skillmd-format)
3. [Progressive Disclosure](#progressive-disclosure)
4. [CLI Skill Commands](#cli-skill-commands)
5. [Skill Directories](#skill-directories)
6. [Skills for Subagents](#skills-for-subagents)
7. [SDK Skill Loading](#sdk-skill-loading)
8. [Source Precedence](#source-precedence)
9. [Constraints](#constraints)

---

## Skills vs Memory

| Aspect | Skills | Memory |
|--------|--------|--------|
| **Purpose** | On-demand capabilities via progressive disclosure | Persistent context always loaded at startup |
| **Loading** | Read only when agent determines relevance | Always injected into system prompt |
| **Format** | `SKILL.md` in named directories | `AGENTS.md` files + `memories/` directory |
| **Layering** | User → project (last wins) | User → project (combined) |
| **Use when** | Instructions are task-specific and potentially large | Context is always relevant |

**Rule of thumb:** If the agent should always know it, put it in `AGENTS.md`. If it's situational, make it a skill.

See [Memory & Persistence](memory-and-persistence.md) for AGENTS.md context, auto-memory, and SDK long-term memory patterns.

---

## SKILL.md Format

### Required Fields

```markdown
---
name: my-skill
description: When to use this skill (max 1024 chars, truncated if exceeded)
---

# Skill Title

Instructions for the agent...
```

### Optional Fields

```markdown
---
name: my-skill
description: Description of when and how to use this skill
license: MIT
compatibility: Requires internet access
metadata:
  author: username
  version: "1.0"
allowed-tools: fetch_url, web_search
---
```

### Full Example

```markdown
---
name: langgraph-docs
description: Use this skill for requests related to LangGraph to fetch relevant documentation and provide accurate guidance.
---

# LangGraph Documentation

## Instructions

### 1. Fetch the documentation index
Use fetch_url to read: https://docs.langchain.com/llms.txt

### 2. Select relevant documentation
Based on the question, identify 2-4 most relevant URLs. Prioritize:
- How-to guides for implementation questions
- Concept pages for understanding questions
- Tutorials for end-to-end examples

### 3. Fetch and respond
Read selected docs, then complete the user's request with accurate guidance.
```

---

## Progressive Disclosure

Skills load in three steps:

1. **Match** — Agent checks if any skill's `description` matches the current task
2. **Read** — If relevant, agent reads the full `SKILL.md` file
3. **Execute** — Agent follows skill instructions, accesses supporting files as needed

**Key:** Write clear, specific descriptions. The agent decides whether to use a skill based on the description alone.

### What the Agent Sees

At startup, a "Skills System" section is injected into the system prompt containing:
- Skill names and descriptions (from all configured sources)
- Instructions on how to read and use skills
- Paths to skill directories

---

## CLI Skill Commands

See [CLI Reference](cli-reference.md#skills-commands) for the complete command table.

### Create

```bash
# User skill (global, for this agent)
deepagents skills create my-skill

# Project skill (local, requires .git in project root)
deepagents skills create my-skill --project
```

Creates a `SKILL.md` template at the appropriate location.

### List

```bash
deepagents skills list              # User skills (alias: `ls`)
deepagents skills list --project    # Project skills (alias: `ls`)
```

### Info

```bash
deepagents skills info my-skill             # User skill details
deepagents skills info my-skill --project   # Project skill details
```

### Delete

```bash
deepagents skills delete my-skill             # Delete user skill
deepagents skills delete my-skill --project   # Delete project skill
deepagents skills delete my-skill -f          # Force delete without confirmation
```

### Manual Installation

Copy existing skills directly into the skills directory:

```bash
mkdir -p ~/.deepagents/<agent>/skills
cp -r path/to/web-research ~/.deepagents/<agent>/skills/
```

---

## Skill Directories

| Scope | Location | Purpose |
|-------|----------|---------|
| User | `~/.deepagents/<agent>/skills/` | Personal skills, follow you across projects |
| Project | `<project-root>/.deepagents/skills/` | Shared with team, project-specific |

### Directory Structure

```
skills/
├── langgraph-docs/
│   └── SKILL.md
└── arxiv-search/
    ├── SKILL.md
    └── arxiv_search.py    # Optional supporting script
```

**Important:** Additional assets (scripts, docs, templates) must be referenced in `SKILL.md` with usage instructions.

---

## Skills for Subagents

See [SDK Customization — Subagents](sdk-customization.md#subagents) for full subagent configuration including `CompiledSubAgent` and the general-purpose subagent.

| Subagent Type | Skill Inheritance |
|---------------|------------------|
| General-purpose (default `task` tool) | Automatically inherits main agent's skills |
| Custom subagents | Must explicitly specify skills; no inheritance |

Skill state is fully isolated: the main agent's skills are not visible to subagents, and subagent skills are not visible to the main agent. Only the general-purpose subagent (the default `task` tool) inherits the main agent's skills automatically.

```python
# Custom subagent with its own skills
research_subagent = {
    "name": "researcher",
    "description": "Research assistant",
    "tools": [web_search],
    "skills": ["/skills/research/"],  # Subagent-specific
}

agent = create_deep_agent(
    skills=["/skills/main/"],          # Main agent + general-purpose subagent
    subagents=[research_subagent],     # Custom subagent gets only its own skills
)
```

---

## SDK Skill Loading

Skills loading depends on the backend type. See [SDK Customization — Backend Types](sdk-customization.md#backend-types) for all backend options.

### StateBackend (Default)

Provide skills via `invoke(files={...})`:

```python
from deepagents import create_deep_agent
from deepagents.backends.utils import create_file_data
from langgraph.checkpoint.memory import MemorySaver

skills_files = {
    "/skills/my-skill/SKILL.md": create_file_data(skill_content)
}

agent = create_deep_agent(
    skills=["./skills/"],
    checkpointer=MemorySaver(),
)

result = agent.invoke(
    {"messages": [...], "files": skills_files},
    config={"configurable": {"thread_id": "123"}}
)
```

### StoreBackend

Pre-populate store with skill files:

```python
from deepagents.backends import StoreBackend
from deepagents.backends.utils import create_file_data
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()
store.put(
    namespace=("filesystem",),
    key="/skills/my-skill/SKILL.md",
    value=create_file_data(skill_content)
)

agent = create_deep_agent(
    backend=(lambda rt: StoreBackend(rt)),
    store=store,
    skills=["/skills/"]
)
```

### FilesystemBackend

Skills loaded from disk relative to `root_dir`:

```python
from deepagents.backends.filesystem import FilesystemBackend

agent = create_deep_agent(
    backend=FilesystemBackend(root_dir="/path/to/project"),
    skills=["/path/to/project/skills/"],
)
```

---

## Source Precedence

When multiple sources contain a skill with the same name, **last source wins**:

```python
agent = create_deep_agent(
    skills=["/skills/user/", "/skills/project/"],
    # If both have "web-search", project version is used
)
```

CLI behavior mirrors this: project skills override user skills.

---

## Constraints

| Constraint | Limit |
|------------|-------|
| `description` field | Truncated at 1024 characters |
| `SKILL.md` file size | Must be under 10 MB (skipped if exceeded) |
| Paths | Must use forward slashes |
| Virtual paths (StateBackend) | Must start with "/" |
| Supporting files | Must be referenced in SKILL.md |

Refer to the full [Agent Skills Specification](https://agentskills.io/specification) for additional constraints and best practices when authoring skill files.

---

## When to Use Skills vs Tools

**Use skills when:**
- Lots of context needed to reduce system prompt tokens
- Bundling capabilities into larger workflows
- Instructions are task-specific and potentially large
- Progressive disclosure desired (load only when relevant)

**Use tools when:**
- Simple, single-purpose operations
- Always-needed functionality
- Direct API interactions
- Agent doesn't have filesystem access
