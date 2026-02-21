# SDK Customization

> **Official docs:** [Customization](https://docs.langchain.com/oss/python/deepagents/customization)

Programmatic usage via `create_deep_agent()`: models, tools, middleware, subagents, and backends.

## Table of Contents

1. [create_deep_agent Signature](#create_deep_agent-signature)
2. [Model Configuration](#model-configuration)
3. [Custom Tools](#custom-tools)
4. [System Prompt](#system-prompt)
5. [Middleware Stack](#middleware-stack)
6. [Subagents](#subagents)
7. [Backend Types](#backend-types)
8. [Human-in-the-Loop](#human-in-the-loop)
9. [Context Management](#context-management)
10. [Structured Output](#structured-output)

---

## create_deep_agent Signature

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    name="my-agent",
    model="claude-sonnet-4-5-20250929",
    tools=[custom_tool],
    system_prompt="You are a research assistant.",
    # Plus keyword-only: middleware, subagents, backend, store,
    # skills, interrupt_on, checkpointer, memory, response_format
)
```

Returns a `CompiledStateGraph` (LangGraph). The `system_prompt` parameter accepts either a string or a `SystemMessage` object.

---

## Model Configuration

See also [Providers & Models](providers.md) for CLI-based model configuration via `config.toml`.

Three approaches:

```python
# 1. String identifier (recommended)
agent = create_deep_agent(model="openai:gpt-5.2")
agent = create_deep_agent(model="claude-sonnet-4-5-20250929")

# 2. init_chat_model (more control)
from langchain.chat_models import init_chat_model
model = init_chat_model(model="openai:gpt-4.1")
agent = create_deep_agent(model=model)

# 3. Direct class instantiation
from langchain_anthropic import ChatAnthropic
model = ChatAnthropic(model="claude-sonnet-4-5-20250929")
agent = create_deep_agent(model=model)
```

Default model: `claude-sonnet-4-5-20250929`

For providers that require explicit identification, use the `model_provider` parameter:

```python
# AWS Bedrock
agent = create_deep_agent(
    model="anthropic.claude-3-5-sonnet-20240620-v1:0",
    model_provider="bedrock_converse",
)

# HuggingFace
agent = create_deep_agent(
    model="microsoft/Phi-3-mini-4k-instruct",
    model_provider="huggingface",
    temperature=0.7,
    max_tokens=1024,
)
```

---

## Custom Tools

```python
from deepagents import create_deep_agent

def internet_search(query: str, max_results: int = 5) -> dict:
    """Run a web search."""
    return tavily_client.search(query, max_results=max_results)

agent = create_deep_agent(tools=[internet_search])
```

Tools can be plain functions, `@tool` decorated functions, `BaseTool` subclasses, or dictionaries.

---

## System Prompt

Custom prompt is prepended to built-in instructions:

```python
agent = create_deep_agent(
    system_prompt="You are an expert researcher. Write polished reports."
)
```

Deep agents come with a built-in system prompt containing detailed instructions for using planning tools, filesystem tools, and subagents. When middleware add special tools, the corresponding instructions are appended to the system prompt. Your custom `system_prompt` is combined with these built-in instructions.

---

## Middleware Stack

> **Official docs:** [Middleware](https://docs.langchain.com/oss/python/deepagents/middleware)

### Default Stack (Always Included)

| Middleware | Purpose |
|-----------|---------|
| `TodoListMiddleware` | Task planning/tracking |
| `FilesystemMiddleware` | File operations |
| `SubAgentMiddleware` | Subagent spawning |
| `SummarizationMiddleware` | Context compression |
| `AnthropicPromptCachingMiddleware` | Token optimization (Anthropic) |
| `PatchToolCallsMiddleware` | Fix interrupted tool calls |

### Conditional Stack

| Middleware | Trigger |
|-----------|---------|
| `MemoryMiddleware` | `memory` argument provided |
| `SkillsMiddleware` | `skills` argument provided — see [Skills System](skills-system.md) |
| `HumanInTheLoopMiddleware` | `interrupt_on` argument provided |

### Built-in Middleware Options

| Middleware | Description |
|-----------|-------------|
| `SummarizationMiddleware` | Auto-summarize when approaching token limits |
| `HumanInTheLoopMiddleware` | Pause for approval on tool calls |
| `ModelCallLimitMiddleware` | Limit API calls to prevent cost overrun |
| `ToolCallLimitMiddleware` | Control tool execution counts |
| `ModelFallbackMiddleware` | Fallback to alternative models |
| `PIIMiddleware` | Detect/redact PII (email, credit card, etc.) |
| `ToolRetryMiddleware` | Retry failed tool calls with backoff |
| `ModelRetryMiddleware` | Retry failed model calls with backoff |
| `LLMToolSelectorMiddleware` | LLM-based tool filtering (for 10+ tools) |
| `ContextEditingMiddleware` | Trim/clear old tool outputs |
| `LLMToolEmulator` | Emulate tool execution using an LLM for testing |
| `ShellToolMiddleware` | Expose a persistent shell session to agents |
| `FilesystemFileSearchMiddleware` | Provide glob and grep search tools over filesystem files |

### Custom Middleware Example

```python
from langchain.agents.middleware import wrap_tool_call

@wrap_tool_call
def log_tool_calls(request, handler):
    """Log every tool call."""
    print(f"Tool: {request.name}, Args: {request.args}")
    result = handler(request)
    print(f"Completed: {request.name}")
    return result

agent = create_deep_agent(middleware=[log_tool_calls])
```

**Thread safety:** Do not mutate middleware instance attributes (e.g., `self.x += 1`) in hooks. Subagents, parallel tools, and concurrent invocations run simultaneously, causing race conditions. Use graph state instead:

```python
# Correct — use graph state
class CustomMiddleware(AgentMiddleware):
    def before_agent(self, state, runtime):
        return {"x": state.get("x", 0) + 1}

# Incorrect — mutation causes race conditions
class CustomMiddleware(AgentMiddleware):
    def __init__(self):
        self.x = 1
    def before_agent(self, state, runtime):
        self.x += 1  # Race condition
```

---

## Subagents

> **Official docs:** [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents) · See also: [Streaming](streaming.md) for subagent streaming

Delegate isolated work to specialized agents.

### SubAgent Configuration

Define subagents as dictionaries with these fields:

| Field | Required | Inherits | Description |
|-------|:--------:|:--------:|-------------|
| `name` | Yes | — | Unique identifier. Used when calling the `task` tool |
| `description` | Yes | — | What this subagent does. The main agent uses this to decide when to delegate |
| `system_prompt` | Yes | No | Instructions for the subagent |
| `tools` | Yes | No | Tools the subagent can use |
| `model` | No | Yes | Override the main agent's model |
| `skills` | No | No | Skill source paths for this subagent |
| `middleware` | No | No | Additional middleware for custom behavior |
| `interrupt_on` | No | Yes | Human-in-the-loop configuration for specific tools |

```python
research_subagent = {
    "name": "research-agent",
    "description": "Conducts in-depth research using web search",
    "system_prompt": "You are a thorough researcher. Synthesize findings concisely.",
    "tools": [internet_search],
    "model": "openai:gpt-4.1",
    "skills": ["/skills/research/"],
}

agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",
    subagents=[research_subagent]
)
```

### CompiledSubAgent

For complex workflows, use a pre-built LangGraph graph as a subagent:

```python
from deepagents import create_deep_agent, CompiledSubAgent
from langchain.agents import create_agent

custom_graph = create_agent(
    model=your_model,
    tools=specialized_tools,
    prompt="You are a specialized agent for data analysis..."
)

custom_subagent = CompiledSubAgent(
    name="data-analyzer",
    description="Specialized agent for complex data analysis tasks",
    runnable=custom_graph
)

agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",
    subagents=[custom_subagent]
)
```

### The General-Purpose Subagent

In addition to user-defined subagents, deep agents always have access to a general-purpose subagent. This subagent shares the main agent's system prompt, tools, model, and skills. It is ideal for context isolation without specialized behavior — the main agent can delegate a complex multi-step task and receive a concise result without context bloat from intermediate tool calls.

### How Subagents Work

- Main agent uses `task` tool to spawn subagent
- Subagent gets a fresh context window (isolated)
- Runs autonomously to completion
- Returns a single final report to the main agent
- Stateless — cannot send multiple messages back

---

## Backend Types

> **Official docs:** [Backends](https://docs.langchain.com/oss/python/deepagents/backends) · See also: [Sandboxes](sandboxes.md) for sandbox backend details, [Memory & Persistence](memory-and-persistence.md) for CompositeBackend patterns

| Backend | Storage | Scope | Execute Tool |
|---------|---------|-------|:------------:|
| `StateBackend` | Agent state | Single thread | No |
| `FilesystemBackend` | Local disk | Persistent | No |
| `LocalShellBackend` | Local disk + shell | Persistent | Yes |
| `StoreBackend` | LangGraph Store | Cross-thread | No |
| `CompositeBackend` | Mixed routing | Configurable | No |
| `ModalSandbox` | Modal cloud | Session | Yes |
| `DaytonaSandbox` | Daytona cloud | Session | Yes |

```python
# Default (StateBackend - ephemeral)
agent = create_deep_agent()

# Local filesystem
from deepagents.backends import FilesystemBackend
agent = create_deep_agent(backend=FilesystemBackend(root_dir=".", virtual_mode=True))

# Hybrid persistent + transient
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
agent = create_deep_agent(
    backend=lambda rt: CompositeBackend(
        default=StateBackend(rt),
        routes={"/memories/": StoreBackend(rt)}
    ),
    store=InMemoryStore()
)
```

### LocalShellBackend

Extends `FilesystemBackend` with the `execute` tool for running shell commands directly on the host. Commands run via `subprocess.run(shell=True)` with no sandboxing. Use only in controlled development environments.

```python
from deepagents.backends import LocalShellBackend
agent = create_deep_agent(
    backend=LocalShellBackend(root_dir=".", env={"PATH": "/usr/bin:/bin"})
)
```

**Security:** Always use `virtual_mode=True` with `FilesystemBackend` to enable path-based access restrictions. The default (`virtual_mode=False`) provides no security even with `root_dir` set.

---

## Human-in-the-Loop

> **Official docs:** [Human-in-the-Loop](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_deep_agent(
    tools=[delete_file, read_file, send_email],
    interrupt_on={
        "delete_file": True,                                    # approve/edit/reject
        "read_file": False,                                     # no interrupt
        "send_email": {"allowed_decisions": ["approve", "reject"]},  # no editing
    },
    checkpointer=MemorySaver()  # Required for HITL!
)
```

### Handling Interrupts

When an interrupt is triggered, the agent pauses and returns control. Check for interrupts and resume with decisions:

```python
import uuid
from langgraph.types import Command

config = {"configurable": {"thread_id": str(uuid.uuid4())}}
result = agent.invoke({"messages": [...]}, config=config)

if result.get("__interrupt__"):
    interrupts = result["__interrupt__"][0].value
    action_requests = interrupts["action_requests"]

    decisions = [
        {"type": "approve"},   # approve the tool call
        {"type": "reject"},    # skip the tool call
        {"type": "edit", "edited_action": {"name": "...", "args": {...}}},  # modify args
    ]

    result = agent.invoke(
        Command(resume={"decisions": decisions}),
        config=config  # Must use same config
    )
```

Decision types: `"approve"` executes with original arguments, `"edit"` modifies arguments before execution, `"reject"` skips the tool call entirely. When multiple tools require approval, all interrupts are batched — provide decisions in the same order as `action_requests`.

---

## Context Management

> See also: [Memory & Persistence](memory-and-persistence.md) for long-term memory patterns · **Official docs:** [Long-term Memory](https://docs.langchain.com/oss/python/deepagents/long-term-memory)

### Auto-Summarization

The `SummarizationMiddleware` automatically compresses conversation history when approaching context window limits. When triggered, the LLM generates a structured summary that replaces older messages while preserving recent context. The trigger threshold and keep amount are configurable via `ContextSize` tuples specifying fractions, token counts, or message counts.

### Content Offloading

The `StateBackend` automatically evicts large tool outputs from agent state. When tool results exceed the configured threshold, they are saved to the virtual filesystem and replaced with a path reference. The agent can re-read the full content via `read_file` or search tools as needed.

### MCP Integration

Extend capabilities via Model Context Protocol using [`langchain-mcp-adapters`](https://github.com/langchain-ai/langchain-mcp-adapters):

```python
# Via langchain-mcp-adapters package
# See: https://github.com/langchain-ai/langchain-mcp-adapters
```

---

## Structured Output

Deep agents support structured output via the `response_format` parameter. Pass a Pydantic model to validate and capture the agent's response:

```python
from pydantic import BaseModel, Field

class WeatherReport(BaseModel):
    location: str = Field(description="The location for this weather report")
    temperature: float = Field(description="Current temperature in Celsius")
    condition: str = Field(description="Current weather condition")

agent = create_deep_agent(
    response_format=WeatherReport,
    tools=[internet_search]
)

result = agent.invoke({"messages": [{"role": "user", "content": "Weather in SF?"}]})
print(result["structured_response"])
```

The validated structured object is returned in the `structured_response` key of the agent's state. Subagents also support structured output via the `response_format` argument to `create_agent()`.
