#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getConfig() {
  const root = process.cwd();
  const cfg = loadJson(path.join(root, "openclaw.json"));
  const sec = loadJson(path.join(root, "secrets.local.json"));
  return {
    appId: cfg.channels.feishu.accounts.taibai.appId,
    appSecret: sec.channels.feishu.accounts.taibai.appSecret
  };
}

async function postJson(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-json response from ${url}: ${text.slice(0, 300)}`);
  }
}

async function tenantToken(appId, appSecret) {
  const data = await postJson(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    "",
    { app_id: appId, app_secret: appSecret }
  );
  if (data.code !== 0) throw new Error(`token failed: ${data.msg}`);
  return data.tenant_access_token;
}

async function uploadFile(token, filePath) {
  const fileName = path.basename(filePath);
  const form = new FormData();
  form.append("file_type", "stream");
  form.append("file_name", fileName);
  form.append("file", new Blob([fs.readFileSync(filePath)]), fileName);

  const res = await fetch("https://open.feishu.cn/open-apis/im/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`upload non-json response: ${text.slice(0, 300)}`);
  }
  if (data.code !== 0) throw new Error(`upload failed: ${data.msg}`);
  return data.data.file_key;
}

async function sendFileMessage(token, receiveId, fileKey, receiveIdType = "open_id") {
  const data = await postJson(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
    token,
    {
      receive_id: receiveId,
      msg_type: "file",
      content: JSON.stringify({ file_key: fileKey })
    }
  );
  if (data.code !== 0) throw new Error(`send message failed: ${data.msg}`);
  return data.data.message_id;
}

async function main() {
  const receiveId = process.argv[2];
  const filePath = process.argv[3];
  const receiveIdType = process.argv[4] || "open_id";

  if (!receiveId || !filePath) {
    console.error("usage: node scripts/feishu_trade_send_file.js <receive-id> <file-path> [receive-id-type]");
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`file not found: ${filePath}`);
    process.exit(1);
  }

  const { appId, appSecret } = getConfig();
  const token = await tenantToken(appId, appSecret);
  const fileKey = await uploadFile(token, filePath);
  const messageId = await sendFileMessage(token, receiveId, fileKey, receiveIdType);

  console.log(JSON.stringify({
    receiveId,
    receiveIdType,
    filePath,
    fileKey,
    messageId
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
