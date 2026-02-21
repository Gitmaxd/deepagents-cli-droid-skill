# Memory & Persistence

> **Official docs:** [Long-term Memory](https://docs.langchain.com/oss/python/deepagents/long-term-memory) · [Customization](https://docs.langchain.com/oss/python/deepagents/customization)

Auto-memory, AGENTS.md context, and SDK long-term memory patterns.

## Table of Contents

1. [CLI Memory System](#cli-memory-system)
2. [AGENTS.md Context](#agentsmd-context)
3. [Auto-Memory](#auto-memory)
4. [Memory Commands](#memory-commands)
5. [SDK Long-Term Memory](#sdk-long-term-memory)
6. [CompositeBackend Setup](#compositebackend-setup)
7. [Cross-Thread Persistence](#cross-thread-persistence)
8. [Store Implementations](#store-implementations)
9. [FileData Schema](#filedata-schema)
10. [SDK Memory Parameter](#sdk-memory-parameter)
11. [Best Practices](#best-practices)

---

## CLI Memory System

The CLI uses a memory-first protocol:

1. **Research** — Searches memory for relevant context before starting tasks
2. **Response** — Checks memory when uncertain during execution
3. **Learning** — Automatically saves new information for future sessions

### Agent Directory Structure

```
~/.deepagents/<agent_name>/
├── AGENTS.md          # Always-loaded context
├── memories/          # Auto-saved topic memories
│   ├── api-conventions.md
│   ├── database-schema.md
│   └── deployment-process.md
└── skills/            # User skills (see [Skills System](skills-system.md))
```

---

## AGENTS.md Context

Two levels of AGENTS.md, both loaded at startup and appended to system prompt:

### Global AGENTS.md

Location: `~/.deepagents/<agent>/AGENTS.md`

Best for:
- Personality, style, communication preferences
- Universal coding preferences (formatting, types)
- Tool usage patterns that apply everywhere

### Project AGENTS.md

Location: `<project-root>/.deepagents/AGENTS.md`

Best for:
- Project architecture and design patterns
- Coding conventions specific to this codebase
- Testing strategies and deployment processes

The project must use git (have a `.git` folder). The CLI finds the project root by checking for a containing `.git` directory. See the [AGENTS.md specification](https://agents.md/) for the full standard.

Both global and project AGENTS.md files are loaded together at startup. The agent updates them as you interact — providing feedback, instructions, or preferences causes the agent to refine these files automatically.

---

## Auto-Memory

The agent automatically organizes memories by topic with descriptive filenames:

```bash
deepagents -a backend-dev
> Our API uses snake_case and includes created_at/updated_at timestamps
# → Automatically saved to memories/api-conventions.md
```

Memories persist across sessions for the same agent.

**Tip:** If memories become stale or unhelpful, use the reset commands to clean up:

```bash
# Nuclear option: reset everything
deepagents reset --agent NAME

# Copy good memories to fresh agent
deepagents reset --agent NAME-v2 --target NAME
```

---

## Memory Commands

| Command | Description |
|---------|-------------|
| `/remember` | Review conversation and update memory and skills. Optionally pass `[context]` to guide the update |
| `deepagents reset --agent NAME` | Clear all memory for agent |
| `deepagents reset --agent NAME --target SRC` | Copy memory from another agent |

See [CLI Reference](cli-reference.md) for the complete command reference.

---

## SDK Long-Term Memory

For programmatic use, the SDK supports persistent cross-thread memory via `CompositeBackend`.

### Two Storage Systems

| System | Backend | Scope | Use Case |
|--------|---------|-------|----------|
| **Transient** | `StateBackend` | Single thread | Working files, drafts |
| **Persistent** | `StoreBackend` | Cross-thread | Preferences, knowledge |

Files at `/memories/*` route to persistent storage; everything else is transient.

---

## CompositeBackend Setup

See [SDK Customization — Backend Types](sdk-customization.md#backend-types) for all backend options and `create_deep_agent()` configuration.

```python
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langgraph.store.memory import InMemoryStore
from langgraph.checkpoint.memory import MemorySaver

def make_backend(runtime):
    return CompositeBackend(
        default=StateBackend(runtime),          # Transient
        routes={"/memories/": StoreBackend(runtime)}  # Persistent
    )

agent = create_deep_agent(
    store=InMemoryStore(),    # Dev; omit for LangSmith deployment
    backend=make_backend,
    checkpointer=MemorySaver()
)
```

### Path Routing

- `/memories/preferences.txt` → Store (persistent, survives across threads)
- `/draft.txt` → State (transient, lost when thread ends)

**Path stripping:** CompositeBackend strips the route prefix before storing. Agent path `/memories/file.txt` is stored as `/file.txt` in StoreBackend.

---

## Cross-Thread Persistence

```python
import uuid

# Thread 1: Save preferences
config1 = {"configurable": {"thread_id": str(uuid.uuid4())}}
agent.invoke({
    "messages": [{"role": "user", "content": "Save my preferences to /memories/preferences.txt"}]
}, config=config1)

# Thread 2: Read preferences (different conversation!)
config2 = {"configurable": {"thread_id": str(uuid.uuid4())}}
agent.invoke({
    "messages": [{"role": "user", "content": "What are my preferences?"}]
}, config=config2)
```

### External Access (LangSmith)

```python
from langgraph_sdk import get_client
client = get_client(url="<DEPLOYMENT_URL>")

# Read (note: no /memories/ prefix — stripped by CompositeBackend)
item = await client.store.get_item((assistant_id, "filesystem"), "/preferences.txt")

# Write
await client.store.put_item(
    (assistant_id, "filesystem"), "/preferences.txt",
    {"content": ["line 1", "line 2"], "created_at": "...", "modified_at": "..."}
)

# Search for stored items
items = await client.store.search_items((assistant_id, "filesystem"))
```

---

## Store Implementations

| Store | Use Case | Persistence |
|-------|----------|:-----------:|
| `InMemoryStore` | Development/testing | ❌ (lost on restart) |
| `PostgresStore` | Production | ✅ |
| LangSmith (auto) | Cloud deployment | ✅ |

### PostgresStore

```python
from langgraph.store.postgres import PostgresStore
import os

store_ctx = PostgresStore.from_conn_string(os.environ["DATABASE_URL"])
store = store_ctx.__enter__()
store.setup()

agent = create_deep_agent(store=store, backend=make_backend)
```

### LangSmith Deployment

Omit `store` — platform auto-provisions:

```python
agent = create_deep_agent(backend=make_backend)  # No store needed
```

---

## FileData Schema

Files stored via `StoreBackend` use the following schema:

```python
{
    "content": ["line 1", "line 2", "line 3"],  # List of strings (one per line)
    "created_at": "2024-01-15T10:30:00Z",       # ISO 8601 timestamp
    "modified_at": "2024-01-15T11:45:00Z"        # ISO 8601 timestamp
}
```

Use the `create_file_data` helper to create properly formatted file data:

```python
from deepagents.backends.utils import create_file_data

file_data = create_file_data("Hello\nWorld")
# {'content': ['Hello', 'World'], 'created_at': '...', 'modified_at': '...'}
```

---

## SDK Memory Parameter

When using the SDK programmatically, pass `AGENTS.md`-style context files via the `memory` parameter:

```python
agent = create_deep_agent(
    memory=["/AGENTS.md"],
    checkpointer=MemorySaver(),
)

result = agent.invoke(
    {"messages": [...], "files": {"/AGENTS.md": create_file_data(agents_md)}},
    config={"configurable": {"thread_id": "123"}}
)
```

The `memory` parameter accepts a list of file paths. These files are loaded at startup and appended to the system prompt, mirroring how the CLI loads `AGENTS.md` files. See [SDK Customization](sdk-customization.md#create_deep_agent-signature) for all `create_deep_agent()` parameters.

---

## Best Practices

### CLI Memory

- **Use descriptive agent names** — `coder`, `researcher`, `project-x`
- **Project AGENTS.md for team context** — check into git
- **Global AGENTS.md for personal style** — follows you everywhere
- **Periodically reset** agents with stale memories
- **Use `/remember`** after important conversations to ensure key info is saved

### SDK Memory

- **Organize paths hierarchically:**
  ```
  /memories/user/preferences.txt
  /memories/project/requirements.md
  /memories/research/findings.md
  ```
- **Document memory structure** in system prompt
- **Choose right store:** InMemoryStore for dev, PostgresStore for production
- **Prune old data** periodically if memories become stale
- For multi-tenant deployments, use `assistant_id`-based namespacing in your store.

### Memory vs Skills Decision

See [Skills System](skills-system.md) for full skills documentation including SKILL.md format and SDK skill loading.

| Use `/memories/` for | Use Skills for |
|---------------------|----------------|
| User preferences | Task-specific workflows |
| Accumulated knowledge | Domain expertise instructions |
| Project context | Procedural knowledge |
| Research notes | Context loaded only when relevant |
| Always-relevant info | Large, situational instructions |
