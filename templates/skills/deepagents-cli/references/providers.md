# Providers & Models

> **Official docs:** [Model Providers](https://docs.langchain.com/oss/python/deepagents/cli/providers)

Complete guide to LLM provider configuration, model switching, and config.toml format.

## Table of Contents

1. [Provider Reference](#provider-reference)
2. [Installation](#installation)
3. [API Key Setup](#api-key-setup)
4. [Model Resolution Order](#model-resolution-order)
5. [config.toml Format](#configtoml-format)
6. [Model Switching](#model-switching)
7. [Per-Model Parameters](#per-model-parameters)
8. [Ollama (Local Models)](#ollama-local-models)
9. [Compatible APIs](#compatible-apis)
10. [Model Routers and Proxies](#model-routers-and-proxies)
11. [Arbitrary Providers](#arbitrary-providers)

---

## Provider Reference

| Provider | Package | API Key Env Var | Profiles |
|----------|---------|-----------------|:--------:|
| OpenAI | `langchain-openai` | `OPENAI_API_KEY` | Yes |
| Azure OpenAI | `langchain-openai` | `AZURE_OPENAI_API_KEY` | Yes |
| Anthropic | `langchain-anthropic` | `ANTHROPIC_API_KEY` | Yes |
| Google Gemini | `langchain-google-genai` | `GOOGLE_API_KEY` | Yes |
| Google Vertex AI | `langchain-google-vertexai` | `GOOGLE_CLOUD_PROJECT` | Yes |
| AWS Bedrock | `langchain-aws` | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Yes |
| AWS Bedrock Converse | `langchain-aws` | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Yes |
| Hugging Face | `langchain-huggingface` | `HUGGINGFACEHUB_API_TOKEN` | Yes |
| Ollama | `langchain-ollama` | Optional | No |
| Groq | `langchain-groq` | `GROQ_API_KEY` | Yes |
| Cohere | `langchain-cohere` | `COHERE_API_KEY` | No |
| Fireworks | `langchain-fireworks` | `FIREWORKS_API_KEY` | Yes |
| Together | `langchain-together` | `TOGETHER_API_KEY` | No |
| Mistral AI | `langchain-mistralai` | `MISTRAL_API_KEY` | Yes |
| DeepSeek | `langchain-deepseek` | `DEEPSEEK_API_KEY` | Yes |
| IBM watsonx | `langchain-ibm` | `WATSONX_APIKEY` | No |
| Nvidia | `langchain-nvidia-ai-endpoints` | `NVIDIA_API_KEY` | No |
| xAI | `langchain-xai` | `XAI_API_KEY` | Yes |
| Perplexity | `langchain-perplexity` | `PPLX_API_KEY` | Yes |
| OpenRouter | `langchain-openrouter` | `OPENROUTER_API_KEY` | Yes |

A **model profile** is a bundle of metadata (model name, default parameters, capabilities) that ships with a provider package, powered by the [models.dev](https://models.dev/) project. Providers with model profiles have their models listed automatically in the `/model` interactive selector. Providers without profiles require specifying the model name directly.

---

## Installation

```bash
# Single provider
uv tool install 'deepagents-cli[anthropic]'

# Multiple providers
uv tool install 'deepagents-cli[anthropic,openai,groq]'

# Add provider later
uv tool upgrade deepagents-cli --with langchain-ollama

# All providers
uv tool install 'deepagents-cli[anthropic,bedrock,cohere,deepseek,fireworks,google-genai,groq,huggingface,ibm,mistralai,nvidia,ollama,openai,openrouter,perplexity,vertexai,xai]'
```

---

## API Key Setup

```bash
# In ~/.zshrc or ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Or .env file in project root
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

---

## Model Resolution Order

When launching, the CLI resolves the model in this order:

1. **`-M` flag** — always wins
2. **`[models].default`** in config.toml — user's long-term preference
3. **`[models].recent`** in config.toml — last `/model` switch (auto-written)
4. **Environment auto-detection** — first valid key: `OPENAI_API_KEY` → `ANTHROPIC_API_KEY` → `GOOGLE_API_KEY` → `GOOGLE_CLOUD_PROJECT`

---

## config.toml Format

Location: `~/.deepagents/config.toml`

```toml
[models]
default = "anthropic:claude-sonnet-4-5"    # Long-term preference
recent = "openai:gpt-4o"                   # Auto-written by /model

# Provider configuration
[models.providers.<name>]
models = ["model-a", "model-b"]     # Models for /model selector
api_key_env = "API_KEY_VAR"         # Override env var name
base_url = "https://..."            # Override endpoint
class_path = "pkg:ClassName"        # For arbitrary providers

[models.providers.<name>.params]
temperature = 0                     # Applies to all models
max_tokens = 4096

[models.providers.<name>.params."model-a"]
temperature = 0.7                   # Override for specific model
```

### Key Behaviors

- `default` takes priority over `recent`
- `/model` command writes to `recent`, never overwrites `default`
- Provider-level params apply to all models; model-specific params override (shallow merge)

---

## Model Switching

### At Launch

```bash
deepagents -M anthropic:claude-opus-4-6
deepagents -M openai:gpt-4o
deepagents -M ollama:qwen3:8b
```

See [CLI Reference — Launch Options](cli-reference.md#launch-options) for the full list of model-related flags.

### During Session

```bash
/model                                # Interactive picker
/model anthropic:claude-sonnet-4-5    # Direct switch (any model, not just listed ones)
```

### Default Management

```bash
# Set default
deepagents --default-model anthropic:claude-sonnet-4-5
/model --default anthropic:claude-sonnet-4-5

# Show current
deepagents --default-model

# Clear
deepagents --clear-default-model
/model --default --clear
```

In interactive selector: `Ctrl+S` to pin/unpin default.

---

## Per-Model Parameters

### Provider-Level (All Models)

```toml
[models.providers.anthropic.params]
temperature = 0
max_tokens = 8192
```

### Model-Specific Override

```toml
[models.providers.ollama]
models = ["qwen3:8b", "llama3"]

[models.providers.ollama.params]
temperature = 0
num_ctx = 8192

[models.providers.ollama.params."qwen3:8b"]
temperature = 0.5    # Override for this model only
num_ctx = 4000
```

Result: `qwen3:8b` gets `{temperature: 0.5, num_ctx: 4000}`, `llama3` gets `{temperature: 0, num_ctx: 8192}`.

### CLI One-Off Override

```bash
deepagents -M ollama:llama3 --model-params '{"temperature": 0.9, "num_ctx": 16384}'
```

CLI params override config file values. For programmatic model configuration, see [SDK Model Configuration](sdk-customization.md#model-configuration).

---

## Ollama (Local Models)

Ollama doesn't ship model profiles, so configure explicitly:

```toml
[models.providers.ollama]
base_url = "http://localhost:11434"    # Default; change for remote
models = ["qwen3:8b", "llama3", "mistral", "codellama"]

[models.providers.ollama.params]
temperature = 0
num_ctx = 8192
num_predict = -1
```

Some providers, including Ollama, do not bundle model profile data. The interactive `/model` switcher will not list models for these providers by default. Define a `models` list in your config file for the provider to populate the switcher. This is entirely optional — you can always switch to any model by specifying its full name directly with `/model ollama:llama3`.

For providers that already ship with model profiles, any names you add to the `models` list appear **alongside** the bundled ones — useful for newly released models that haven't been added to the package yet.

**Note:** Local models often have limited tool-calling capability. Use cloud models (Anthropic, OpenAI) for complex multi-tool tasks.

---

## Compatible APIs

Many providers expose OpenAI/Anthropic-compatible APIs. Use existing packages with custom `base_url`:

```toml
# OpenAI-compatible provider
[models.providers.openai]
base_url = "https://api.example.com/v1"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]

# Anthropic-compatible provider
[models.providers.anthropic]
base_url = "https://api.example.com"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]
```

Any features added on top of the official spec by the provider will not be captured. If the provider offers a dedicated LangChain integration package, prefer that instead.

---

## Model Routers and Proxies

Model routers like [OpenRouter](https://openrouter.ai/) and [LiteLLM](https://docs.litellm.ai/) provide access to models from multiple providers through a single endpoint. Use the dedicated integration packages for these services:

| Router | Package | Config |
|--------|---------|--------|
| OpenRouter | `langchain-openrouter` | `openrouter:<model>` (built-in provider) |

OpenRouter is a built-in provider — install the package and use it directly:

```bash
uv tool install 'deepagents-cli[openrouter]'
```

---

## Arbitrary Providers

Use any LangChain `BaseChatModel` subclass:

```toml
[models.providers.custom_llm]
class_path = "my_package.models:MyChatModel"
api_key_env = "MY_API_KEY"
base_url = "https://internal-llm.company.com"
models = ["company-model-v1"]

[models.providers.custom_llm.params]
temperature = 0
```

The package must be installed in the same Python environment:

```bash
uv tool upgrade deepagents-cli --with my_package
```

**Security:** `class_path` executes arbitrary Python code — same trust model as `pyproject.toml` build scripts. See [SDK Customization](sdk-customization.md#model-configuration) for programmatic custom model integration.

When you switch to `my_custom:my-model-v1`, the model name (`my-model-v1`) is passed as the `model` kwarg to the class constructor. Your provider package may optionally provide model profiles at a `_PROFILES` dict in `<package>.data._profiles`.

---

## LangSmith Tracing

Enable observability:

```bash
export LANGCHAIN_TRACING=true
export LANGCHAIN_API_KEY="your-api-key"
export DEEPAGENTS_LANGSMITH_PROJECT="my-project"  # Optional project name
```

When configured, CLI displays: `✓ LangSmith tracing: 'my-project'`

---

## Complete Example

```toml
# ~/.deepagents/config.toml

[models]
default = "anthropic:claude-sonnet-4-5"

# Ollama for local testing
[models.providers.ollama]
base_url = "http://localhost:11434"
models = ["qwen3:8b", "llama3"]

[models.providers.ollama.params]
temperature = 0
num_ctx = 8192

# Anthropic tweaks
[models.providers.anthropic.params]
temperature = 0
max_tokens = 8192

# OpenRouter for exotic models
[models.providers.openrouter]
models = ["meta-llama/llama-4-maverick"]

[models.providers.openrouter.params]
temperature = 0.1
```
