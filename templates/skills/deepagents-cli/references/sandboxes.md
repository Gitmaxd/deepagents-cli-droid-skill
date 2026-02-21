# Sandboxes

> **Official docs:** [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes) · [Backends](https://docs.langchain.com/oss/python/deepagents/backends)

Isolated execution environments for safe code execution via Modal, Runloop, or Daytona.

## Table of Contents

1. [Overview](#overview)
2. [Integration Patterns](#integration-patterns)
3. [CLI Usage](#cli-usage)
4. [Providers](#providers)
5. [Setup Scripts](#setup-scripts)
6. [SDK Usage](#sdk-usage)
7. [File Transfer](#file-transfer)
8. [Security Considerations](#security-considerations)
9. [Lifecycle and Cleanup](#lifecycle-and-cleanup)

---

## Overview

In deep agents, sandboxes are [backends](sdk-customization.md#backend-types) that define the environment where the agent operates. Unlike other backends (State, Filesystem, Store) which only expose file operations, sandbox backends also provide the `execute` tool for running shell commands.

- **Safety** — Protect local machine from harmful code
- **Clean environments** — Specific deps/OS without local setup
- **Parallel execution** — Multiple agents in isolated environments
- **Reproducibility** — Consistent environments across teams

When a sandbox backend is configured, the agent gets:
- All standard filesystem tools (`ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`)
- The `execute` tool for running shell commands inside the sandbox
- A secure boundary protecting the host system

**Without a sandbox**, code runs locally with the `shell` tool (or no shell access in non-interactive mode).

---

## Integration Patterns

There are two architecture patterns for integrating agents with sandboxes:

### Agent in Sandbox

The agent runs inside the sandbox and you communicate with it over the network. Build a Docker or VM image with your agent framework pre-installed, run it inside the sandbox, and connect from outside.

**Benefits:** Mirrors local development closely. Tight coupling between agent and environment.

**Trade-offs:** API keys must live inside the sandbox (security risk). Updates require rebuilding images. Requires infrastructure for communication (WebSocket or HTTP layer).

### Sandbox as Tool

The agent runs on your machine or server. When it needs to execute code, it calls sandbox tools (`execute`, `read_file`, `write_file`) which invoke the provider's APIs to run operations in a remote sandbox.

**Benefits:** Update agent code instantly without rebuilding images. API keys stay outside the sandbox. Pay only for execution time.

**Trade-offs:** Network latency on each execution call.

The examples in this document follow the sandbox-as-tool pattern. Choose the agent-in-sandbox pattern when your provider's SDK handles the communication layer and you want production to mirror local development.

---

## CLI Usage

See [CLI Reference — Launch Options](cli-reference.md#launch-options) for the full list of sandbox-related flags.

```bash
# Modal sandbox
deepagents --sandbox modal --sandbox-setup ./setup.sh

# Runloop sandbox
export RUNLOOP_API_KEY="your-key"
deepagents --sandbox runloop

# Daytona sandbox
export DAYTONA_API_KEY="your-key"
deepagents --sandbox daytona

# Reuse existing sandbox
deepagents --sandbox-id EXISTING_SANDBOX_ID
```

---

## Providers

| Provider | Package | Best For | Setup |
|----------|---------|----------|-------|
| **Modal** | `langchain-modal` | ML/AI workloads, GPU access | `modal setup` |
| **Runloop** | `langchain-runloop` | Disposable devboxes | `RUNLOOP_API_KEY` env var |
| **Daytona** | `langchain-daytona` | TS/Python dev, fast cold starts | `DAYTONA_API_KEY` env var |

E2B is also integrated into deepagents as a sandbox provider.

---

## Setup Scripts

Create `setup.sh` to configure your sandbox environment:

```bash
#!/bin/bash
set -e

# Clone repository
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/org/repo.git $HOME/workspace
cd $HOME/workspace

# Make env vars persistent
cat >> ~/.bashrc <<'EOF'
export GITHUB_TOKEN="${GITHUB_TOKEN}"
cd $HOME/workspace
EOF

source ~/.bashrc
```

Use with: `deepagents --sandbox modal --sandbox-setup ./setup.sh`

Store secrets in a local `.env` file for the setup script to access.

---

## SDK Usage

All examples use [`create_deep_agent()`](sdk-customization.md#create_deep_agent-signature) with a sandbox backend. See [Backend Types](sdk-customization.md#backend-types) for the full backend reference.

### Modal

```python
import modal
from langchain_modal import ModalSandbox
from deepagents import create_deep_agent

app = modal.App.lookup("your-app")
modal_sandbox = modal.Sandbox.create(app=app)
backend = ModalSandbox(sandbox=modal_sandbox)

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-5",
    backend=backend,
)
result = agent.invoke({"messages": [{"role": "user", "content": "Run pytest"}]})
modal_sandbox.terminate()
```

### Runloop

```python
import os
from runloop_api_client import RunloopSDK
from langchain_runloop import RunloopSandbox
from deepagents import create_deep_agent

client = RunloopSDK(bearer_token=os.environ["RUNLOOP_API_KEY"])
devbox = client.devbox.create()
backend = RunloopSandbox(devbox=devbox)

agent = create_deep_agent(model="anthropic:claude-sonnet-4-5", backend=backend)
try:
    result = agent.invoke({"messages": [...]})
finally:
    devbox.shutdown()
```

### Daytona

```python
from daytona import Daytona
from langchain_daytona import DaytonaSandbox
from deepagents import create_deep_agent

sandbox = Daytona().create()
backend = DaytonaSandbox(sandbox=sandbox)

agent = create_deep_agent(model="anthropic:claude-sonnet-4-5", backend=backend)
result = agent.invoke({"messages": [...]})
sandbox.stop()
```

---

## File Transfer

Two ways to interact with sandbox files:

### Agent Tools (During Execution)

Agent uses `read_file`, `write_file`, `execute`, etc. inside the sandbox.

### Application APIs (Before/After Execution)

```python
# Seed sandbox before agent runs
backend.upload_files([
    ("/src/index.py", b"print('Hello')\n"),
    ("/pyproject.toml", b"[project]\nname = 'my-app'\n"),
])

# Retrieve artifacts after agent finishes
results = backend.download_files(["/src/index.py", "/output.txt"])
for result in results:
    if result.content is not None:
        print(f"{result.path}: {result.content.decode()}")
    else:
        print(f"Failed to download {result.path}: {result.error}")
```

- Paths must be absolute
- Contents must be `bytes`

---

## Security Considerations

### What Sandboxes Protect Against

- Agent filesystem operations affecting host
- Agent shell commands damaging host system
- Process interference between agent and host

### What Sandboxes DON'T Protect Against

**Context injection:** Attacker-controlled input can instruct agent to run arbitrary commands inside sandbox.

**Network exfiltration:** Unless blocked, injected agent can send data out via HTTP/DNS.

### Secrets Management

**❌ NEVER put secrets inside a sandbox:**
- API keys, tokens, credentials can be read and exfiltrated
- Even short-lived or scoped credentials are unsafe

If you must inject secrets into a sandbox (not recommended), take these precautions:
- Enable [human-in-the-loop](sdk-customization.md#human-in-the-loop) approval for **all** tool calls, not just sensitive ones
- Block or restrict network access from the sandbox
- Use the narrowest possible credential scope and shortest possible lifetime
- Monitor sandbox network traffic for unexpected outbound requests

Even with these safeguards, this remains an unsafe workaround.

**✅ Keep secrets in host-side tools:**

```python
# Tool runs on HOST, not in sandbox
def authenticated_api_call(query: str) -> str:
    api_key = os.environ["SECRET_API_KEY"]  # Host only
    return make_api_request(query, api_key)

agent = create_deep_agent(
    tools=[authenticated_api_call],
    backend=sandbox_backend  # Agent in sandbox, tool on host
)
```

**✅ Use network proxies** that inject credentials — agent never sees the secret.

### Best Practices

- **Block network** when possible (Modal supports `blockNetwork: true`)
- **Review all outputs** — treat sandbox output as untrusted
- **Monitor traffic** — watch for unexpected outbound requests
- **Use [middleware](sdk-customization.md#middleware-stack)** — filter/redact sensitive patterns
- **Minimize exposure** — don't put anything sensitive in sandbox

---

## Lifecycle and Cleanup

Sandboxes consume resources and cost money until shut down. Always terminate sandboxes when your application no longer needs them.

For chat applications where users may re-engage after idle time, configure a time-to-live (TTL) on the sandbox so the provider automatically cleans up idle instances. Many sandbox providers support TTL to archive or TTL to delete.

### Per-Conversation Pattern

In chat applications, each `thread_id` should typically use its own sandbox. Store the mapping between sandbox ID and thread_id in your application:

```python
import uuid
from daytona import CreateSandboxFromSnapshotParams, Daytona

client = Daytona()
thread_id = str(uuid.uuid4())

try:
    sandbox = client.find_one(labels={"thread_id": thread_id})
except Exception:
    params = CreateSandboxFromSnapshotParams(
        labels={"thread_id": thread_id},
        auto_delete_interval=3600,
    )
    sandbox = client.create(params)
```
