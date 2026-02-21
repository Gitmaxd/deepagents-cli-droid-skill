# Streaming

> **Official docs:** [Streaming Overview](https://docs.langchain.com/oss/python/deepagents/streaming/overview) · [Frontend Integration](https://docs.langchain.com/oss/python/deepagents/streaming/frontend)

Real-time streaming from deep agent execution: subagent progress, LLM tokens, tool calls, custom events, and React frontend integration.

## Table of Contents

1. [Overview](#overview)
2. [Streaming Modes](#streaming-modes)
3. [Subgraph Streaming](#subgraph-streaming)
4. [Namespaces](#namespaces)
5. [Subagent Progress](#subagent-progress)
6. [LLM Token Streaming](#llm-token-streaming)
7. [Tool Call Streaming](#tool-call-streaming)
8. [Custom Updates](#custom-updates)
9. [Multiple Stream Modes](#multiple-stream-modes)
10. [Agent Metadata](#agent-metadata)
11. [Frontend Integration](#frontend-integration)
12. [Common Patterns](#common-patterns)

---

## Overview

Deep agents have built-in streaming for real-time updates from agent execution. Built on LangGraph's streaming infrastructure, deep agents extend it with first-class support for subagent streams. When a deep agent delegates work to subagents, you can stream updates from each subagent independently — tracking progress, LLM tokens, and tool calls in real time.

What's possible with deep agent streaming:

- **Stream subagent progress** — track each subagent's execution as it runs in parallel
- **Stream LLM tokens** — stream tokens from the main agent and each subagent
- **Stream tool calls** — see tool calls and results from within subagent execution
- **Stream custom updates** — emit user-defined signals from inside subagent nodes

---

## Streaming Modes

Deep agents support several LangGraph stream modes, each surfacing different types of events:

| Stream Mode | What It Surfaces | Use Case |
|-------------|-----------------|----------|
| `"updates"` | Node step completions with state deltas | Tracking subagent lifecycle and progress |
| `"messages"` | Individual LLM tokens and message chunks | Token-by-token display, tool call streaming |
| `"custom"` | User-defined events via `get_stream_writer` | Progress bars, status updates from tools |

You can combine multiple modes in a single stream call to get a complete picture of agent execution:

```python
for namespace, chunk in agent.stream(
    {"messages": [...]},
    stream_mode=["updates", "messages", "custom"],
    subgraphs=True,
):
    mode, data = chunk[0], chunk[1]
    # mode is "updates", "messages", or "custom"
```

---

## Subgraph Streaming

Deep agents use LangGraph's subgraph streaming to surface events from subagent execution. For subagent configuration, see the [official subagents docs](https://docs.langchain.com/oss/python/deepagents/subagents) and [SDK subagents section](sdk-customization.md#subagents). To receive subagent events, enable `subgraphs=True` when streaming:

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    system_prompt="You are a helpful research assistant",
    subagents=[
        {
            "name": "researcher",
            "description": "Researches a topic in depth",
            "system_prompt": "You are a thorough researcher.",
        },
    ],
)

for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research quantum computing advances"}]},
    stream_mode="updates",
    subgraphs=True,
):
    if namespace:
        # Subagent event — namespace identifies the source
        print(f"[subagent: {namespace}]")
    else:
        # Main agent event
        print("[main agent]")
    print(chunk)
```

When `subgraphs=True`, each streaming event is a `(namespace, chunk)` tuple. An empty namespace `()` indicates the main agent; a non-empty namespace identifies a subagent.

---

## Namespaces

Each streaming event includes a **namespace** — a tuple of node names and task IDs that represents the agent hierarchy. Use namespaces to route events to the correct UI component.

| Namespace | Source |
|-----------|--------|
| `()` (empty) | Main agent |
| `("tools:abc123",)` | A subagent spawned by the main agent's `task` tool call `abc123` |
| `("tools:abc123", "model_request:def456")` | The model request node inside a subagent |

```python
for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Plan my vacation"}]},
    stream_mode="updates",
    subgraphs=True,
):
    is_subagent = any(
        segment.startswith("tools:") for segment in namespace
    )

    if is_subagent:
        tool_call_id = next(
            s.split(":")[1] for s in namespace if s.startswith("tools:")
        )
        print(f"Subagent {tool_call_id}: {chunk}")
    else:
        print(f"Main agent: {chunk}")
```

---

## Subagent Progress

Use `stream_mode="updates"` to track subagent progress as each step completes. This is useful for showing which subagents are active and what work they've completed.

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    system_prompt=(
        "You are a project coordinator. Always delegate research tasks "
        "to your researcher subagent using the task tool."
    ),
    subagents=[
        {
            "name": "researcher",
            "description": "Researches topics thoroughly",
            "system_prompt": "You are a thorough researcher.",
        },
    ],
)

for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Write a short summary about AI safety"}]},
    stream_mode="updates",
    subgraphs=True,
):
    if not namespace:
        for node_name, data in chunk.items():
            if node_name == "tools":
                for msg in data.get("messages", []):
                    if msg.type == "tool":
                        print(f"\nSubagent complete: {msg.name}")
                        print(f"  Result: {str(msg.content)[:200]}...")
            else:
                print(f"[main agent] step: {node_name}")
    else:
        for node_name, data in chunk.items():
            print(f"  [{namespace[0]}] step: {node_name}")
```

Example output:

```
[main agent] step: model_request
  [tools:call_abc123] step: model_request
  [tools:call_abc123] step: tools
  [tools:call_abc123] step: model_request

Subagent complete: task
  Result: ## AI Safety Report...
[main agent] step: model_request
```

---

## LLM Token Streaming

Use `stream_mode="messages"` to stream individual tokens from both the main agent and subagents. Each message event includes metadata that identifies the source agent.

```python
current_source = ""

for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research quantum computing advances"}]},
    stream_mode="messages",
    subgraphs=True,
):
    token, metadata = chunk

    is_subagent = any(s.startswith("tools:") for s in namespace)

    if is_subagent:
        subagent_ns = next(s for s in namespace if s.startswith("tools:"))
        if subagent_ns != current_source:
            print(f"\n\n--- [subagent: {subagent_ns}] ---")
            current_source = subagent_ns
        if token.content:
            print(token.content, end="", flush=True)
    else:
        if "main" != current_source:
            print("\n\n--- [main agent] ---")
            current_source = "main"
        if token.content:
            print(token.content, end="", flush=True)
```

---

## Tool Call Streaming

When subagents use tools, you can stream tool call events to display what each subagent is doing. Tool call chunks appear in the `messages` stream mode.

```python
for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research recent quantum computing advances"}]},
    stream_mode="messages",
    subgraphs=True,
):
    token, metadata = chunk

    is_subagent = any(s.startswith("tools:") for s in namespace)
    source = next(
        (s for s in namespace if s.startswith("tools:")), "main"
    ) if is_subagent else "main"

    # Tool call chunks (streaming tool invocations)
    if token.tool_call_chunks:
        for tc in token.tool_call_chunks:
            if tc.get("name"):
                print(f"\n[{source}] Tool call: {tc['name']}")
            if tc.get("args"):
                print(tc["args"], end="", flush=True)

    # Tool results
    if token.type == "tool":
        print(f"\n[{source}] Tool result [{token.name}]: {str(token.content)[:150]}")

    # Regular AI content
    if token.type == "ai" and token.content and not token.tool_call_chunks:
        print(token.content, end="", flush=True)
```

---

## Custom Updates

Use `get_stream_writer` from LangGraph inside your subagent tools to emit custom progress events:

```python
import time
from langchain.tools import tool
from langgraph.config import get_stream_writer
from deepagents import create_deep_agent

@tool
def analyze_data(topic: str) -> str:
    """Run a data analysis on a given topic."""
    writer = get_stream_writer()

    writer({"status": "starting", "topic": topic, "progress": 0})
    time.sleep(0.5)

    writer({"status": "analyzing", "progress": 50})
    time.sleep(0.5)

    writer({"status": "complete", "progress": 100})
    return f'Analysis of "{topic}": Customer sentiment is 85% positive.'

agent = create_deep_agent(
    system_prompt="You are a coordinator. Delegate analysis to the analyst subagent.",
    subagents=[
        {
            "name": "analyst",
            "description": "Performs data analysis with real-time progress tracking",
            "system_prompt": "You are a data analyst. Call analyze_data for every request.",
            "tools": [analyze_data],
        },
    ],
)

for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Analyze customer satisfaction trends"}]},
    stream_mode="custom",
    subgraphs=True,
):
    is_subagent = any(s.startswith("tools:") for s in namespace)
    if is_subagent:
        subagent_ns = next(s for s in namespace if s.startswith("tools:"))
        print(f"[{subagent_ns}]", chunk)
    else:
        print("[main]", chunk)
```

Output:

```
[tools:call_abc123] {'status': 'starting', 'topic': 'customer satisfaction trends', 'progress': 0}
[tools:call_abc123] {'status': 'analyzing', 'progress': 50}
[tools:call_abc123] {'status': 'complete', 'progress': 100}
```

---

## Multiple Stream Modes

Combine multiple stream modes for a complete picture of agent execution:

```python
INTERESTING_NODES = {"model_request", "tools"}

last_source = ""
mid_line = False

for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Analyze the impact of remote work"}]},
    stream_mode=["updates", "messages", "custom"],
    subgraphs=True,
):
    mode, data = chunk[0], chunk[1]

    is_subagent = any(s.startswith("tools:") for s in namespace)
    source = "subagent" if is_subagent else "main"

    if mode == "updates":
        for node_name in data:
            if node_name not in INTERESTING_NODES:
                continue
            if mid_line:
                print()
                mid_line = False
            print(f"[{source}] step: {node_name}")

    elif mode == "messages":
        token, metadata = data
        if token.content:
            if source != last_source:
                if mid_line:
                    print()
                    mid_line = False
                print(f"\n[{source}] ", end="")
                last_source = source
            print(token.content, end="", flush=True)
            mid_line = True

    elif mode == "custom":
        if mid_line:
            print()
            mid_line = False
        print(f"[{source}] custom event:", data)
```

---

## Agent Metadata

When streaming or reviewing traces, each agent's name is available as `lc_agent_name` in metadata. This allows you to differentiate which agent produced a given event in streaming output and in tracing tools like LangSmith.

Set the agent name via the `name` parameter on [`create_deep_agent`](sdk-customization.md#create_deep_agent-signature). Subagent names come from the `name` field in the subagent configuration dictionary:

```python
from deepagents import create_deep_agent

research_subagent = {
    "name": "research-agent",
    "description": "Used to research more in depth questions",
    "system_prompt": "You are a great researcher",
    "tools": [internet_search],
}

agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",
    subagents=[research_subagent],
    name="main-agent"
)
```

All agent runs executed by a subagent or deep agent will have the agent name in their metadata. For example, the subagent `"research-agent"` will have `{'lc_agent_name': 'research-agent'}` in any associated agent run metadata. This is visible in LangSmith traces and accessible when consuming streaming events.

---

## Frontend Integration

> **Official docs:** [Frontend Streaming Guide](https://docs.langchain.com/oss/python/deepagents/streaming/frontend)

The `useStream` React hook from `@langchain/langgraph-sdk` provides built-in support for deep agent streaming. It automatically tracks subagent lifecycles, separates subagent messages from the main conversation, and exposes a rich API for building multi-agent UIs.

### Installation

```bash
npm install @langchain/langgraph-sdk
```

### Basic Usage

Configure `useStream` with `filterSubagentMessages` and pass `streamSubgraphs: true` when submitting:

```tsx
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function DeepAgentChat() {
  const stream = useStream<typeof agent>({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,  // Keep subagent messages separate
  });

  const handleSubmit = (message: string) => {
    stream.submit(
      { messages: [{ content: message, type: "human" }] },
      { streamSubgraphs: true }  // Enable subagent streaming
    );
  };

  return (
    <div>
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>
          {message.type}: {message.content}
        </div>
      ))}

      {stream.activeSubagents.length > 0 && (
        <div>
          <h3>Active subagents:</h3>
          {stream.activeSubagents.map((subagent) => (
            <SubagentCard key={subagent.id} subagent={subagent} />
          ))}
        </div>
      )}

      {stream.isLoading && <div>Loading...</div>}
    </div>
  );
}
```

### useStream Parameters (Deep Agent)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filterSubagentMessages` | `boolean` | `false` | When `true`, subagent messages are excluded from the main `stream.messages` array. Access them via `stream.subagents.get(id).messages` instead. |
| `subagentToolNames` | `string[]` | `['task']` | Tool names that spawn subagents. Only change if you've customized the tool name. |

### useStream Return Values (Deep Agent)

| Property | Type | Description |
|----------|------|-------------|
| `subagents` | `Map<string, SubagentStream>` | Map of all subagents, keyed by tool call ID |
| `activeSubagents` | `SubagentStream[]` | Currently running subagents (status `"pending"` or `"running"`) |
| `getSubagent` | `(toolCallId: string) => SubagentStream \| undefined` | Get a specific subagent by tool call ID |
| `getSubagentsByMessage` | `(messageId: string) => SubagentStream[]` | Get all subagents triggered by a specific AI message |
| `getSubagentsByType` | `(type: string) => SubagentStream[]` | Filter subagents by `subagent_type` |

### SubagentStream Interface

Each subagent in the `stream.subagents` map exposes:

```typescript
interface SubagentStream {
  // Identity
  id: string;                    // Tool call ID
  toolCall: {
    subagent_type: string;
    description: string;
  };

  // Lifecycle
  status: "pending" | "running" | "complete" | "error";
  startedAt: Date | null;
  completedAt: Date | null;
  isLoading: boolean;

  // Content
  messages: Message[];           // Subagent's messages
  values: Record<string, any>;   // Subagent's state
  result: string | null;         // Final result
  error: string | null;          // Error message

  // Tool calls
  toolCalls: ToolCallWithResult[];
  getToolCalls: (message: Message) => ToolCallWithResult[];

  // Hierarchy
  depth: number;                 // Nesting depth (0 for top-level)
  parentId: string | null;       // Parent subagent ID (for nested subagents)
}
```

### Subagent Card Component

Build cards that show each subagent's streaming content, status, and progress:

```tsx
function SubagentCard({ subagent }: { subagent: SubagentStream }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon status={subagent.status} />
        <span className="font-medium">{subagent.toolCall.subagent_type}</span>
        <span className="text-sm text-gray-500">
          {subagent.toolCall.description}
        </span>
      </div>

      {subagent.status === "complete" && subagent.result && (
        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
          {subagent.result}
        </div>
      )}

      {subagent.status === "error" && subagent.error && (
        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
          {subagent.error}
        </div>
      )}
    </div>
  );
}
```

### Thread Persistence

Persist thread IDs across page reloads so users can return to their deep agent conversations. When a page reloads, `useStream` reconstructs subagent state from thread history — completed subagents are restored with their final status and result.

```tsx
import { useCallback, useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function useThreadIdParam() {
  const [threadId, setThreadId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("threadId");
  });

  const updateThreadId = useCallback((id: string) => {
    setThreadId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("threadId", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return [threadId, updateThreadId] as const;
}

function PersistentChat() {
  const [threadId, onThreadId] = useThreadIdParam();

  const stream = useStream<typeof agent>({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
    threadId,
    onThreadId,
    reconnectOnMount: true,  // Auto-resume stream after page reload
  });

  // ... render messages and subagents
}
```

---

## Common Patterns

### Track Subagent Lifecycle

Monitor when subagents start, run, and complete:

```python
active_subagents = {}

for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research the latest AI safety developments"}]},
    stream_mode="updates",
    subgraphs=True,
):
    for node_name, data in chunk.items():
        # Detect subagent spawning
        if not namespace and node_name == "model_request":
            for msg in data.get("messages", []):
                for tc in getattr(msg, "tool_calls", []):
                    if tc["name"] == "task":
                        active_subagents[tc["id"]] = {
                            "type": tc["args"].get("subagent_type"),
                            "description": tc["args"].get("description", "")[:80],
                            "status": "pending",
                        }
                        print(f'[lifecycle] PENDING  → subagent "{tc["args"].get("subagent_type")}"')

        # Detect subagent running
        if namespace and namespace[0].startswith("tools:"):
            for sub_id, sub in active_subagents.items():
                if sub["status"] == "pending":
                    sub["status"] = "running"
                    print(f'[lifecycle] RUNNING  → subagent "{sub["type"]}"')
                    break

        # Detect subagent completing
        if not namespace and node_name == "tools":
            for msg in data.get("messages", []):
                if msg.type == "tool":
                    sub = active_subagents.get(msg.tool_call_id)
                    if sub:
                        sub["status"] = "complete"
                        print(f'[lifecycle] COMPLETE → subagent "{sub["type"]}"')
                        print(f"  Result preview: {str(msg.content)[:120]}...")
```

### Filter Internal Middleware Steps

When combining stream modes, skip internal middleware nodes and only show meaningful steps:

```python
INTERESTING_NODES = {"model_request", "tools"}

for namespace, chunk in agent.stream(...):
    mode, data = chunk[0], chunk[1]
    if mode == "updates":
        for node_name in data:
            if node_name in INTERESTING_NODES:
                print(f"step: {node_name}")
```

### Map Subagents to Messages (React)

Use `getSubagentsByMessage` to associate subagent cards with the AI message that triggered them:

```tsx
const subagentsByMessage = useMemo(() => {
  const result = new Map();
  for (let i = 0; i < stream.messages.length; i++) {
    if (stream.messages[i].type !== "human") continue;
    const next = stream.messages[i + 1];
    if (!next || next.type !== "ai" || !next.id) continue;
    const subagents = stream.getSubagentsByMessage(next.id);
    if (subagents.length > 0) {
      result.set(stream.messages[i].id, subagents);
    }
  }
  return result;
}, [stream.messages, stream.subagents]);
```
