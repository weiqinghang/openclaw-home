#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_TOKEN = 'L3t3bcP0LaDQcSsz3cDcpEjknTf';
const TABLE_ID = 'tblI6bexYECqDOnj';
const REPO_ROOT = path.resolve(__dirname, '../../../..');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function getConfig() {
  const cfg = loadJson(path.join(REPO_ROOT, 'openclaw.json'));
  const sec = loadJson(path.join(REPO_ROOT, 'secrets.local.json'));
  return {
    cfg,
    appId: cfg.channels.feishu.accounts.taibai.appId,
    appSecret: sec.channels.feishu.accounts.taibai.appSecret
  };
}

function getPendingFile(cfg) {
  const taibai = (cfg.agents?.list || []).find((agent) => agent.id === 'taibai');
  if (!taibai?.workspace) {
    throw new Error('taibai workspace not found in openclaw.json');
  }
  return path.join(taibai.workspace, 'state', 'pending-sku-upsert.json');
}

async function request(url, token, method = 'GET', body = null) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`non-json response from ${url}: ${text.slice(0, 300)}`);
  }
}

async function tenantToken(appId, appSecret) {
  const data = await request(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    '',
    'POST',
    { app_id: appId, app_secret: appSecret }
  );
  if (data.code !== 0) throw new Error(`token failed: ${data.msg}`);
  return data.tenant_access_token;
}

async function findRecord(token, targetField, targetValue) {
  const filter = encodeURIComponent(`CurrentValue.[${targetField}] = "${targetValue}"`);
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?filter=${filter}`,
    token
  );
  if (data.code !== 0) throw new Error(`find record failed: ${data.msg}`);
  return (data.data.items || [])[0] || null;
}

async function createRecord(token, fields) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`,
    token,
    'POST',
    { fields }
  );
  if (data.code !== 0) throw new Error(`create record failed: ${data.msg}`);
  return data.data.record;
}

async function updateRecord(token, recordId, fields) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    token,
    'PUT',
    { fields }
  );
  if (data.code !== 0) throw new Error(`update record failed: ${data.msg}`);
  return data.data.record;
}

function normalizeChanges(changes) {
  const out = {};
  for (const [k, v] of Object.entries(changes || {})) {
    if (['unitPriceUsd', 'moq', 'pcsPerPackage', 'cartonLengthCm', 'cartonWidthCm', 'cartonHeightCm'].includes(k)) {
      out[k] = Number(v);
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

function propose(request, existing) {
  const before = existing?.fields || {};
  const changes = normalizeChanges(request.changes || {});
  const after = { ...before, ...changes };
  return {
    action: 'sku.upsert',
    mode: 'proposed',
    target: request.target,
    targetField: request.targetField,
    recordId: existing?.record_id || null,
    exists: Boolean(existing),
    changes,
    before,
    after,
    rejectedFields: request.rejectedFields || []
  };
}

async function main() {
  const mode = process.argv[2];
  if (!mode || !['propose', 'apply'].includes(mode)) {
    console.error('usage: node <script> <propose|apply> <request-json>');
    process.exit(1);
  }

  const { cfg, appId, appSecret } = getConfig();
  const pendingFile = getPendingFile(cfg);
  const token = await tenantToken(appId, appSecret);

  if (mode === 'propose') {
    const request = JSON.parse(process.argv[3]);
    const existing = request.targetField && request.target
      ? await findRecord(token, request.targetField, request.target)
      : null;
    const proposal = propose(request, existing);
    ensureDir(pendingFile);
    fs.writeFileSync(pendingFile, JSON.stringify(proposal, null, 2));
    console.log(JSON.stringify(proposal, null, 2));
    return;
  }

  if (!fs.existsSync(pendingFile)) {
    console.error('No pending proposal');
    process.exit(1);
  }
  const proposal = loadJson(pendingFile);
  let record;
  if (proposal.recordId) {
    record = await updateRecord(token, proposal.recordId, proposal.changes);
  } else {
    const base = proposal.targetField === 'skuId' ? { skuId: proposal.target } : { productCode: proposal.target };
    record = await createRecord(token, { ...base, ...proposal.changes });
  }
  fs.unlinkSync(pendingFile);
  console.log(JSON.stringify({
    action: 'sku.upsert',
    mode: 'applied',
    target: proposal.target,
    recordId: record.record_id,
    changes: proposal.changes
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
