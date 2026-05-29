import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

type FastModeState = {
  enabled: boolean;
};

const stateFile = join(homedir(), ".pi", "agent", "state", "openai-fast-mode.json");
const legacyStateFile = join(homedir(), ".pi", "agent", "state", "codex-fast-mode.json");
const defaultState: FastModeState = { enabled: false };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOwn = (value: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const readStateFile = (path: string): FastModeState | undefined => {
  try {
    if (!existsSync(path)) return undefined;
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!isRecord(parsed)) return undefined;
    return { enabled: parsed.enabled === true };
  } catch {
    return undefined;
  }
};

const loadState = (): FastModeState => {
  return readStateFile(stateFile) ?? readStateFile(legacyStateFile) ?? defaultState;
};

const saveState = (state: FastModeState): void => {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
};

const isOpenAIProvider = (ctx: ExtensionContext | ExtensionCommandContext): boolean => {
  const provider = ctx.model?.provider.toLowerCase();
  if (!provider) return false;
  return provider === "openai" || provider.startsWith("openai-");
};

const syncStatus = (
  state: FastModeState,
  ctx: ExtensionContext | ExtensionCommandContext,
): void => {
  const status = state.enabled && isOpenAIProvider(ctx) ? "fast" : undefined;
  ctx.ui.setStatus("openai-fast-mode", status);
};

export default function openaiFastMode(pi: ExtensionAPI): void {
  let state = loadState();

  const setEnabled = (
    enabled: boolean,
    ctx: ExtensionContext | ExtensionCommandContext,
  ): void => {
    state = { enabled };
    saveState(state);
    syncStatus(state, ctx);
  };

  pi.on("session_start", async (_event, ctx) => {
    syncStatus(state, ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    syncStatus(state, ctx);
  });

  pi.registerCommand("fast", {
    description: "Toggle OpenAI fast mode",
    handler: async (args, ctx) => {
      if (args.trim().length > 0) {
        ctx.ui.notify("Use /fast with no arguments.", "warning");
        return;
      }

      const enabled = !state.enabled;
      setEnabled(enabled, ctx);
      ctx.ui.notify(`OpenAI fast mode ${enabled ? "enabled" : "disabled"}.`, "info");
    },
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (!state.enabled) return;
    if (!isOpenAIProvider(ctx)) return;
    if (!isRecord(event.payload)) return;
    if (hasOwn(event.payload, "service_tier")) return;

    return {
      ...event.payload,
      service_tier: "priority",
    };
  });
}
