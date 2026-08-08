/**
 * lane.js — cross-CLI lane contract for Astrolabe hooks.
 *
 * PROBLEM. The hooks in `.claude/hooks/` are the ONLY enforcement for canon
 * protection (canon-guard) and the convergence gate (vet-gate). They speak the
 * Claude Code hook dialect: PascalCase event names, `tool_name`/`tool_input` on
 * stdin, and a `hookSpecificOutput.permissionDecision` verdict on stdout. Run
 * the same repo under Codex or Gemini CLI and none of that matches — the canon
 * becomes an ordinary writable file and the gate silently never fires.
 *
 * THIS MODULE is the pure translation layer: lane enum, event-name map, tool-name
 * map, inbound payload normalization, outbound verdict rendering. It has NO fs and
 * NO process side effects so every mapping is unit-testable on synthetic payloads.
 * The fs/spawn wiring lives in `lane-adapter.js`.
 *
 * DESIGN NOTE — why exit 2 is the universal deny signal. Each CLI has its own
 * preferred verdict JSON, and those shapes drift between releases. Exit code 2,
 * however, means "block this tool call" on all three lanes (CC PreToolUse, Codex
 * hooks, Gemini BeforeTool) and is the one signal that cannot be missed by a
 * schema change. So a deny emits BOTH the lane's native JSON on stdout AND
 * exit 2 with the reason on stderr. The JSON is the nice path; the exit code is
 * the one that must never fail. Never "improve" this to JSON-only.
 */

"use strict";

const LANES = ["cc", "codex", "gemini"];

// CC (canonical) event name → lane-native event name.
// Verified against loom's cc/codex/gemini architect references (2026-08).
// Codex uses CC's PascalCase names verbatim; Gemini renames most of them.
const EVENT_MAP = {
  cc: {
    PreToolUse: "PreToolUse",
    PostToolUse: "PostToolUse",
    UserPromptSubmit: "UserPromptSubmit",
    SessionStart: "SessionStart",
    Stop: "Stop",
  },
  codex: {
    PreToolUse: "PreToolUse",
    PostToolUse: "PostToolUse",
    UserPromptSubmit: "UserPromptSubmit",
    SessionStart: "SessionStart",
    Stop: "Stop",
  },
  gemini: {
    PreToolUse: "BeforeTool",
    PostToolUse: "AfterTool",
    UserPromptSubmit: "BeforeModel",
    SessionStart: "SessionStart",
    Stop: "SessionEnd",
  },
};

// Lane-native tool name → CC canonical tool name. The hooks branch on the CC
// names ("Bash" vs. a file-editing tool), so everything must land in that space.
//
// Codex note: hooks fire on the SHELL lane only — `apply_patch`/`write` do not
// emit PreToolUse at all (openai/codex#16732, #14754). They are mapped here so
// that IF a future Codex release starts emitting them the guard already covers
// them; today the shell mapping is what actually fires. See the residual note in
// the emitter and `rules/multi-cli.md`.
const TOOL_MAP = {
  cc: {},
  codex: {
    shell: "Bash",
    bash: "Bash",
    local_shell: "Bash",
    apply_patch: "Edit",
    write: "Write",
    read: "Read",
  },
  gemini: {
    run_shell_command: "Bash",
    write_file: "Write",
    replace: "Edit",
    read_file: "Read",
    grep_search: "Grep",
    glob: "Glob",
    list_directory: "Glob",
  },
};

// CC tool name → lane-native, for emitting agent frontmatter `tools:` lists.
const CC_TO_LANE_TOOLS = {
  cc: {},
  codex: {},
  gemini: {
    Bash: "run_shell_command",
    Read: "read_file",
    Write: "write_file",
    Edit: "replace",
    Grep: "grep_search",
    Glob: "glob",
    WebFetch: "web_fetch",
    WebSearch: "google_web_search",
  },
};

function isLane(l) {
  return LANES.includes(l);
}

function assertLane(l) {
  if (!isLane(l)) {
    throw new Error(`lane '${l}' invalid; must be one of ${LANES.join(", ")}`);
  }
  return l;
}

function laneEvent(ccEvent, lane) {
  assertLane(lane);
  return EVENT_MAP[lane][ccEvent] || ccEvent;
}

function laneTools(ccTools, lane) {
  assertLane(lane);
  const map = CC_TO_LANE_TOOLS[lane];
  return ccTools.map((t) => map[t] || t);
}

/**
 * Normalize a lane-native hook payload into the CC shape the hooks consume.
 * Tolerant by design: unknown tool names pass through unchanged rather than
 * throwing, because a hook that crashes on an unrecognized payload fails OPEN,
 * which on the canon lane is the exact failure we are preventing. The adapter's
 * fail-closed logic handles genuine breakage; this function only translates.
 *
 * @param {object} data - parsed lane-native payload
 * @param {string} lane - cc | codex | gemini
 * @returns {object} CC-shaped payload: { tool_name, tool_input, ... }
 */
function normalizeInbound(data, lane) {
  assertLane(lane);
  const out = { ...data };

  // Tool name may arrive as tool_name, tool.name, or toolName.
  const rawName =
    data.tool_name ??
    (data.tool && data.tool.name) ??
    data.toolName ??
    data.tool_use?.name ??
    "";
  out.tool_name = TOOL_MAP[lane][rawName] || rawName;

  // Tool input may arrive as tool_input, tool.input, args, or arguments.
  const rawInput =
    data.tool_input ??
    (data.tool && data.tool.input) ??
    data.toolInput ??
    data.args ??
    data.arguments ??
    {};
  const ti = { ...rawInput };

  // Field aliases: the shell command and the target path are the two fields the
  // guard reads, and each lane names them differently.
  if (ti.command == null) {
    ti.command = rawInput.cmd ?? rawInput.script ?? rawInput.shell_command ?? undefined;
  }
  // Gemini's shell tool passes argv as an array on some releases; the guard's
  // scanner expects one string.
  if (Array.isArray(ti.command)) ti.command = ti.command.join(" ");

  if (ti.file_path == null) {
    ti.file_path =
      rawInput.path ?? rawInput.absolute_path ?? rawInput.filePath ?? rawInput.file ?? undefined;
  }
  out.tool_input = ti;

  if (data.hook_event_name) out.hook_event_name = data.hook_event_name;
  out.cwd = data.cwd ?? data.workdir ?? process.cwd();
  return out;
}

/**
 * Render a CC-shaped hook verdict into the lane-native wire form.
 *
 * @param {object} cc - the CC hook's parsed stdout
 * @param {string} lane
 * @returns {{stdout: string, stderr: string, exitCode: number, denied: boolean}}
 */
function renderDecision(cc, lane) {
  assertLane(lane);
  const hso = cc && cc.hookSpecificOutput;
  const denied =
    (hso && hso.permissionDecision === "deny") ||
    cc?.decision === "block" ||
    cc?.continue === false;

  if (!denied) {
    // Allow. Preserve any additionalContext the hook injected (inject-canon /
    // calc-reminder ride this path on UserPromptSubmit).
    const ctx = hso && hso.additionalContext;
    if (lane === "gemini" && ctx) {
      return { stdout: JSON.stringify({ additionalContext: ctx }), stderr: "", exitCode: 0, denied: false };
    }
    if (lane === "codex" && ctx) {
      return { stdout: JSON.stringify({ additional_context: ctx }), stderr: "", exitCode: 0, denied: false };
    }
    return { stdout: JSON.stringify(cc ?? { continue: true }), stderr: "", exitCode: 0, denied: false };
  }

  const reason =
    (hso && hso.permissionDecisionReason) || cc?.reason || cc?.stopReason || "blocked by hook";

  // Deny. Native JSON per lane + the universal exit-2/stderr signal (see header).
  let body;
  if (lane === "cc") {
    body = cc; // already native — pass through byte-for-byte
  } else if (lane === "codex") {
    body = { decision: "block", reason };
  } else {
    body = { decision: "block", reason, blocked: true };
  }
  return { stdout: JSON.stringify(body), stderr: reason, exitCode: 2, denied: true };
}

module.exports = {
  LANES,
  EVENT_MAP,
  TOOL_MAP,
  CC_TO_LANE_TOOLS,
  isLane,
  assertLane,
  laneEvent,
  laneTools,
  normalizeInbound,
  renderDecision,
};
