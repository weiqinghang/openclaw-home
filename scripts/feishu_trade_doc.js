#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getConfig() {
  const root = process.cwd();
  const cfg = loadJson(path.join(root, 'openclaw.json'));
  const secrets = loadJson(path.join(root, 'secrets.local.json'));
  const userRules =
    cfg?.hooks?.internal?.entries?.['user-permissions']?.config?.userRules || [];
  const ownerRule = userRules.find((rule) => rule.name === 'owner-feishu');
  const ownerOpenId =
    ownerRule?.match?.userIds?.[0] ||
    cfg?.channels?.feishu?.userAllowlist?.[0] ||
    'ou_127b9bf41eae8201c7b6062bca18b0ec';
  return {
    appId: cfg.channels.feishu.accounts.taibai.appId,
    appSecret: secrets.channels.feishu.accounts.taibai.appSecret,
    ownerOpenId
  };
}

async function postJson(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`non-json response from ${url}: ${text.slice(0, 300)}`);
  }
}

async function tenantToken(appId, appSecret) {
  const data = await postJson(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    '',
    { app_id: appId, app_secret: appSecret }
  );
  if (data.code !== 0) throw new Error(`token failed: ${data.msg}`);
  return data.tenant_access_token;
}

async function createDoc(token, title) {
  const data = await postJson(
    'https://open.feishu.cn/open-apis/docx/v1/documents',
    token,
    { title }
  );
  if (data.code !== 0) throw new Error(`create doc failed: ${data.msg}`);
  return data.data.document.document_id;
}

function markdownToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    let blockType = 2;
    let key = 'text';
    let content = line;
    if (line.startsWith('# ')) {
      blockType = 3;
      key = 'heading1';
      content = line.slice(2);
    } else if (line.startsWith('## ')) {
      blockType = 4;
      key = 'heading2';
      content = line.slice(3);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blockType = 12;
      key = 'bullet';
      content = line.slice(2);
    }
    blocks.push({
      block_type: blockType,
      [key]: {
        elements: [
          {
            text_run: {
              content,
              text_element_style: {}
            }
          }
        ]
      }
    });
  }
  return blocks;
}

async function appendBlocks(token, docToken, blocks) {
  const batchSize = 20;
  for (let i = 0; i < blocks.length; i += batchSize) {
    const chunk = blocks.slice(i, i + batchSize);
    const data = await postJson(
      `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/children`,
      token,
      { children: chunk }
    );
    if (data.code !== 0) throw new Error(`append blocks failed: ${data.msg}`);
  }
}

async function grantAccess(token, docToken, openId) {
  const data = await postJson(
    `https://open.feishu.cn/open-apis/drive/v1/permissions/${docToken}/members?type=docx&need_notification=false`,
    token,
    {
      member_type: 'openid',
      member_id: openId,
      perm: 'full_access'
    }
  );
  if (data.code !== 0) throw new Error(`grant access failed: ${data.msg}`);
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node scripts/feishu_trade_doc.js <markdown-file>');
    process.exit(1);
  }
  const { appId, appSecret, ownerOpenId } = getConfig();
  const markdown = fs.readFileSync(input, 'utf8');
  const token = await tenantToken(appId, appSecret);
  const title = `太白 SKU主数据 ${new Date().toISOString().slice(0, 10)}`;
  const docToken = await createDoc(token, title);
  await appendBlocks(token, docToken, markdownToBlocks(markdown));
  let grantError = null;
  try {
    await grantAccess(token, docToken, ownerOpenId);
  } catch (err) {
    grantError = err.message;
  }
  console.log(JSON.stringify({
    title,
    docToken,
    url: `https://feishu.cn/docx/${docToken}`,
    ownerOpenId,
    grantError
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
