# pi-openai-fast-mode

Pi extension for toggling OpenAI fast mode on OpenAI providers.

## What it does

- adds a `/fast` command in Pi
- persists the fast-mode toggle across sessions
- adds a small `fast` status badge when enabled on an OpenAI provider
- injects `service_tier: "priority"` into OpenAI provider requests when no `service_tier` already exists
- preserves any existing `service_tier` value set by Pi, the provider, or another extension

## Supported providers

The extension applies only when Pi's current provider id is:

- `openai`
- starts with `openai-`, such as `openai-codex`

It does not target Azure OpenAI, OpenRouter, or other OpenAI-compatible gateways by default.

## Install

From a local checkout:

```bash
pi install ./pi-openai-fast-mode
```

Or add it to `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "git:github.com/adstastic/pi-openai-fast-mode"
  ]
}
```

If you use `@anthnykr/pi-codex-fast-mode`, remove it first so `/fast` is not registered twice.

## Usage

Start Pi with an OpenAI provider/model, then run:

```text
/fast
```

Run `/fast` again to turn it off.

## Failure behavior

This extension preserves an existing `service_tier` value. It does not retry provider failures without `service_tier`; Pi's `before_provider_request` hook can rewrite outgoing payloads but cannot transparently replay failed provider calls.

## Security

Pi extensions run with your full user permissions. Only install packages you trust.
