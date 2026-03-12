#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";

const PROTOCOL_VERSION = 1;
const DEFAULT_PERMISSION_MODE = process.env.CLAUDE_ACP_PERMISSION_MODE || "acceptEdits";
const argv = process.argv.slice(2);

function parseArgs(args) {
  let agent = "";
  let claudeBin = process.env.CLAUDE_BIN || "";
  let permissionMode = DEFAULT_PERMISSION_MODE;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--agent") {
      agent = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--claude-bin") {
      claudeBin = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (value === "--permission-mode") {
      permissionMode = args[index + 1] || permissionMode;
      index += 1;
    }
  }

  if (!agent) {
    throw new Error("Missing required --agent <name>.");
  }

  return {
    agent,
    claudeBin: resolveClaudeBin(claudeBin),
    permissionMode
  };
}

function resolveClaudeBin(explicit) {
  const candidates = [
    explicit,
    process.env.CLAUDE_BIN,
    path.join(os.homedir(), ".local", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Claude CLI not found. Set CLAUDE_BIN or pass --claude-bin /absolute/path/to/claude."
  );
}

function nowIso() {
  return new Date().toISOString();
}

function createSession(cwd, agentName) {
  return {
    sessionId: randomUUID(),
    claudeSessionId: randomUUID(),
    cwd,
    agentName,
    updatedAt: nowIso(),
    pending: null
  };
}

function promptToText(prompt) {
  return (prompt || [])
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      if (item.type === "text") {
        return item.text || "";
      }
      if (item.type === "resource_link") {
        return `[resource] ${item.name || item.title || item.uri || ""}`;
      }
      if (item.type === "resource" && item.resource?.text) {
        return item.resource.text;
      }
      if (item.type === "image") {
        return "[image omitted]";
      }
      if (item.type === "audio") {
        return "[audio omitted]";
      }
      return `[unsupported content: ${item.type || "unknown"}]`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function writeResult(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function writeError(id, code, message, data) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data
    }
  });
}

function sendSessionText(sessionId, text) {
  writeMessage({
    jsonrpc: "2.0",
    method: "session/update",
    params: {
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text
        }
      }
    }
  });
}

function spawnClaude(session, promptText, runtime) {
  const args = [
    "--print",
    "--output-format",
    "text",
    "--permission-mode",
    runtime.permissionMode,
    "--session-id",
    session.claudeSessionId,
    "--agent",
    session.agentName,
    promptText
  ];

  return spawn(runtime.claudeBin, args, {
    cwd: session.cwd,
    env: {
      ...process.env
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function collectProcess(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({
        code,
        signal,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

const runtime = parseArgs(argv);
const sessions = new Map();

async function handleInitialize(id) {
  writeResult(id, {
    protocolVersion: PROTOCOL_VERSION,
    agentInfo: {
      name: `claude-${runtime.agent}`,
      version: "0.1.0"
    },
    agentCapabilities: {
      loadSession: true,
      promptCapabilities: {
        audio: false,
        embeddedContext: false,
        image: false
      },
      mcpCapabilities: {
        http: false,
        sse: false
      },
      sessionCapabilities: {
        list: {},
        resume: {}
      }
    },
    authMethods: []
  });
}

async function handleNewSession(id, params) {
  const session = createSession(params.cwd, runtime.agent);
  sessions.set(session.sessionId, session);
  writeResult(id, {
    sessionId: session.sessionId
  });
}

async function handleLoadSession(id, params) {
  const session = sessions.get(params.sessionId);
  if (!session) {
    writeError(id, -32002, `Resource not found: ${params.sessionId}`);
    return;
  }

  session.cwd = params.cwd || session.cwd;
  session.updatedAt = nowIso();
  writeResult(id, {});
}

async function handleListSessions(id) {
  writeResult(id, {
    sessions: [...sessions.values()].map((session) => ({
      sessionId: session.sessionId,
      cwd: session.cwd,
      title: `${session.agentName}:${path.basename(session.cwd) || session.cwd}`,
      updatedAt: session.updatedAt
    }))
  });
}

async function handleResumeSession(id, params) {
  const session = sessions.get(params.sessionId);
  if (!session) {
    writeError(id, -32002, `Resource not found: ${params.sessionId}`);
    return;
  }

  session.cwd = params.cwd || session.cwd;
  session.updatedAt = nowIso();
  writeResult(id, {});
}

async function handlePrompt(id, params) {
  const session = sessions.get(params.sessionId);
  if (!session) {
    writeError(id, -32002, `Resource not found: ${params.sessionId}`);
    return;
  }

  if (session.pending?.child && !session.pending.child.killed) {
    session.pending.cancelled = true;
    session.pending.child.kill("SIGTERM");
  }

  const promptText = promptToText(params.prompt);
  const child = spawnClaude(session, promptText, runtime);
  const pending = {
    child,
    cancelled: false
  };
  session.pending = pending;
  session.updatedAt = nowIso();

  try {
    const result = await collectProcess(child);
    if (session.pending !== pending) {
      writeResult(id, { stopReason: "cancelled" });
      return;
    }

    session.pending = null;
    session.updatedAt = nowIso();

    if (pending.cancelled) {
      writeResult(id, { stopReason: "cancelled" });
      return;
    }

    if (result.code === 0) {
      sendSessionText(
        session.sessionId,
        result.stdout || "(Claude returned no text output.)"
      );
      writeResult(id, { stopReason: "end_turn" });
      return;
    }

    const detail = [result.stderr, result.stdout]
      .filter(Boolean)
      .join("\n")
      .trim();

    sendSessionText(
      session.sessionId,
      `Claude bridge error (exit=${result.code}${result.signal ? `, signal=${result.signal}` : ""})\n${detail || "No error output."}`
    );
    writeResult(id, { stopReason: "end_turn" });
  } catch (error) {
    session.pending = null;
    writeError(id, -32603, "Internal error", {
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleCancel(params) {
  const session = sessions.get(params.sessionId);
  if (!session?.pending?.child) {
    return;
  }
  session.pending.cancelled = true;
  session.pending.child.kill("SIGTERM");
}

async function handleRequest(message) {
  const { id, method, params = {} } = message;

  switch (method) {
    case "initialize":
      await handleInitialize(id);
      return;
    case "authenticate":
      writeResult(id, {});
      return;
    case "session/new":
      await handleNewSession(id, params);
      return;
    case "session/load":
      await handleLoadSession(id, params);
      return;
    case "session/list":
      await handleListSessions(id);
      return;
    case "session/resume":
      await handleResumeSession(id, params);
      return;
    case "session/set_mode":
      writeResult(id, {});
      return;
    case "session/prompt":
      await handlePrompt(id, params);
      return;
    default:
      writeError(id, -32601, `"Method not found": ${method}`, { method });
  }
}

async function handleNotification(message) {
  if (message.method === "session/cancel") {
    await handleCancel(message.params || {});
  }
}

const input = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

input.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (error) {
    writeError(null, -32700, "Parse error", {
      details: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  try {
    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      await handleRequest(message);
      return;
    }
    if (message.method) {
      await handleNotification(message);
      return;
    }
    writeError(message.id ?? null, -32600, "Invalid request");
  } catch (error) {
    writeError(message.id ?? null, -32603, "Internal error", {
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

input.on("close", () => {
  for (const session of sessions.values()) {
    if (session.pending?.child && !session.pending.child.killed) {
      session.pending.child.kill("SIGTERM");
    }
  }
});
