# Agent Client Protocol (ACP)

> **Official docs:** [ACP Guide](https://docs.langchain.com/oss/python/deepagents/acp) · [ACP Introduction](https://agentclientprotocol.com/get-started/introduction) · [ACP Clients](https://agentclientprotocol.com/get-started/clients)

Standardized communication between deep agents and code editors or IDEs via the Agent Client Protocol.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Server Setup](#server-setup)
4. [Editor Clients](#editor-clients)
5. [Zed Integration](#zed-integration)
6. [Toad Runner](#toad-runner)
7. [Further Resources](#further-resources)

---

## Overview

The [Agent Client Protocol (ACP)](https://agentclientprotocol.com/get-started/introduction) standardizes how coding agents communicate with code editors and IDEs. With ACP, a custom deep agent can be exposed to any ACP-compatible client, allowing the editor to provide project context and receive rich updates in return.

ACP is purpose-built for **agent-editor integrations** — connecting your deep agent directly to your development environment. This is distinct from MCP (Model Context Protocol), which is used when an agent needs to call tools hosted by external servers.

Key characteristics:

- **Stdio transport** — ACP servers run in stdio mode, reading requests from stdin and writing responses to stdout
- **Editor-launched** — The ACP server is typically started as a subprocess by the editor/client
- **Rich context exchange** — Editors supply project context; agents return structured updates
- **Protocol standard** — Works with any ACP-compatible client without custom integration code

---

## Installation

Install the ACP integration package:

```bash
# pip
pip install deepagents-acp

# uv
uv pip install deepagents-acp
```

The `deepagents-acp` package provides the `AgentServerACP` class and everything needed to expose a deep agent over the ACP protocol.

---

## Server Setup

Expose a deep agent over ACP using the `AgentServerACP` class and the `run_agent()` function from the `acp` package. This starts an ACP server in stdio mode — in practice, you run this as a command launched by an ACP client (your editor), which communicates with the server over stdio.

```python
import asyncio

from acp import run_agent
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver

from deepagents_acp.server import AgentServerACP

async def main() -> None:
    agent = create_deep_agent(
        # Customize your deep agent here: set a custom prompt,
        # add your own tools, attach middleware, or compose subagents.
        system_prompt="You are a helpful coding assistant",
        checkpointer=MemorySaver(),
    )

    server = AgentServerACP(agent)
    await run_agent(server)

if __name__ == "__main__":
    asyncio.run(main())
```

| Component | Purpose |
|-----------|---------|
| `create_deep_agent()` | Creates a customizable deep agent — see [SDK Customization](sdk-customization.md) |
| `MemorySaver()` | In-memory checkpointer for conversation persistence |
| `AgentServerACP(agent)` | Wraps the agent in an ACP-compatible server |
| `run_agent(server)` | Starts the stdio ACP server loop |

> **Example coding agent** — The `deepagents-acp` package includes a [demo coding agent](https://github.com/langchain-ai/deepagents/blob/main/libs/acp/examples/demo_agent.py) with filesystem and shell tools that you can run out of the box.

---

## Editor Clients

Deep agents work anywhere you can run an ACP agent server. For a complete list, see the [official ACP clients page](https://agentclientprotocol.com/get-started/clients). Notable ACP-compatible clients:

| Editor | Status | Link |
|--------|--------|------|
| **Zed** | Native support | [Zed external agents docs](https://zed.dev/docs/ai/external-agents) |
| **JetBrains IDEs** | Native support | [JetBrains ACP docs](https://www.jetbrains.com/help/ai-assistant/acp.html) |
| **Visual Studio Code** | Via extension | [vscode-acp](https://github.com/formulahendry/vscode-acp) |
| **Neovim** | Via plugin | ACP-compatible plugins |

Each client connects to the ACP server by launching the server command as a subprocess and communicating over stdio.

---

## Zed Integration

The `deepagents` repo includes a demo ACP entrypoint that can be registered with Zed.

### Step 1 — Clone and install

```bash
git clone https://github.com/langchain-ai/deepagents.git
cd deepagents/libs/acp
uv sync --all-groups
chmod +x run_demo_agent.sh
```

### Step 2 — Configure credentials

```bash
cp .env.example .env
```

Then set `ANTHROPIC_API_KEY` in `.env`.

### Step 3 — Register in Zed settings

Add the agent server command to Zed's `settings.json`:

```json
{
  "agent_servers": {
    "DeepAgents": {
      "type": "custom",
      "command": "/your/absolute/path/to/deepagents/libs/acp/run_demo_agent.sh"
    }
  }
}
```

### Step 4 — Use

Open Zed's Agents panel and start a DeepAgents thread. The editor will launch the ACP server and communicate with your deep agent.

---

## Toad Runner

> **Note:** The Toad repository (`https://github.com/batrachian/toad`) and its package may be unavailable. The official LangChain ACP docs still reference it, but verify the link and package before use.

Toad is a lightweight runner referenced in the [official ACP docs](https://docs.langchain.com/oss/python/deepagents/acp) for managing ACP agent server processes as local dev tools.

```bash
# Install (verify package availability first)
uv tool install -U batrachian-toad

# Run an ACP server with Toad
toad acp "python path/to/your_server.py" .

# Or via uv
toad acp "uv run python path/to/your_server.py" .
```

If Toad is unavailable, you can run ACP servers directly via `python path/to/your_server.py` — the server communicates over stdio and does not require Toad.

---

## Further Resources

| Resource | URL |
|----------|-----|
| ACP Introduction | [agentclientprotocol.com/get-started/introduction](https://agentclientprotocol.com/get-started/introduction) |
| ACP Clients/Editors | [agentclientprotocol.com/get-started/clients](https://agentclientprotocol.com/get-started/clients) |
| Demo agent source | [github.com/langchain-ai/deepagents/.../demo_agent.py](https://github.com/langchain-ai/deepagents/blob/main/libs/acp/examples/demo_agent.py) |
| Demo runner script | [github.com/langchain-ai/deepagents/.../run_demo_agent.sh](https://github.com/langchain-ai/deepagents/blob/main/libs/acp/run_demo_agent.sh) |
