#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_APP_TOKEN = 'L3t3bcP0LaDQcSsz3cDcpEjknTf';
const DEFAULT_TABLE_ID = 'tblI6bexYECqDOnj';

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
    'ou_127b9bf41eae8201c7b6062bca18b0ec';
  return {
    appId: cfg.channels.feishu.accounts.taibai.appId,
    appSecret: secrets.channels.feishu.accounts.taibai.appSecret,
    ownerOpenId
  };
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

async function listFields(token, appToken, tableId) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    token
  );
  if (data.code !== 0) throw new Error(`list fields failed: ${data.msg}`);
  return data.data.items || [];
}

async function updateField(token, appToken, tableId, fieldId, fieldName, type) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields/${fieldId}`,
    token,
    'PUT',
    { field_name: fieldName, type }
  );
  if (data.code !== 0 && data.msg !== 'DataNotChange') {
    throw new Error(`update field failed: ${data.msg}`);
  }
}

async function deleteField(token, appToken, tableId, fieldId) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields/${fieldId}`,
    token,
    'DELETE'
  );
  if (data.code !== 0) throw new Error(`delete field failed: ${data.msg}`);
}

async function createField(token, appToken, tableId, fieldName, type) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    token,
    'POST',
    { field_name: fieldName, type }
  );
  if (data.code !== 0) throw new Error(`create field ${fieldName} failed: ${data.msg}`);
}

async function listRecords(token, appToken, tableId) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=500`,
    token
  );
  if (data.code !== 0) throw new Error(`list records failed: ${data.msg}`);
  return data.data.items || [];
}

async function batchDeleteRecords(token, appToken, tableId, recordIds) {
  if (!recordIds.length) return;
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_delete`,
    token,
    'POST',
    { records: recordIds }
  );
  if (data.code !== 0) throw new Error(`delete records failed: ${data.msg}`);
}

async function batchCreateRecords(token, appToken, tableId, records) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
    token,
    'POST',
    { records }
  );
  if (data.code !== 0) throw new Error(`create records failed: ${data.msg}`);
  return data.data.records || [];
}

async function getBitableMeta(token, appToken) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}`,
    token
  );
  if (data.code !== 0) throw new Error(`get bitable failed: ${data.msg}`);
  return data.data.app;
}

async function grantAccess(token, appToken, openId) {
  const data = await request(
    `https://open.feishu.cn/open-apis/drive/v1/permissions/${appToken}/members?type=bitable&need_notification=false`,
    token,
    'POST',
    {
      member_type: 'openid',
      member_id: openId,
      perm: 'full_access'
    }
  );
  if (data.code !== 0) throw new Error(`grant access failed: ${data.msg}`);
}

function normalizeItems(items) {
  return items.map((item) => {
    const dims = item.quoteTemplateFields?.ctnMeasCm || [];
    return {
      skuId: item.skuId,
      productCode: item.productCode,
      productNameEn: item.productNameEn || '',
      spec: item.spec || '',
      unitPriceUsd: Number(item.listPriceUsd || 0),
      mainImageRef: item.mainImageRef || '',
      supplierId: item.supplierId || '',
      status: item.status || '',
      moq: Number(item.quoteTemplateFields?.moq || 0),
      notes: item.quoteTemplateFields?.others || '',
      pcsPerPackage: Number(item.quoteTemplateFields?.pcsPerPackage || 0),
      cartonLengthCm: Number(dims[0] || 0),
      cartonWidthCm: Number(dims[1] || 0),
      cartonHeightCm: Number(dims[2] || 0)
    };
  });
}

function buildRecords(items) {
  return items.map((item) => ({
    fields: {
      skuId: item.skuId,
      productCode: item.productCode,
      productNameEn: item.productNameEn,
      spec: item.spec,
      unitPriceUsd: item.unitPriceUsd,
      mainImageRef: item.mainImageRef,
      supplierId: item.supplierId,
      status: item.status,
      moq: item.moq,
      notes: item.notes,
      pcsPerPackage: item.pcsPerPackage,
      cartonLengthCm: item.cartonLengthCm,
      cartonWidthCm: item.cartonWidthCm,
      cartonHeightCm: item.cartonHeightCm
    }
  }));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node scripts/feishu_trade_bitable_sync.js <sku-master.json> [appToken] [tableId]');
    process.exit(1);
  }
  const appToken = process.argv[3] || DEFAULT_APP_TOKEN;
  const tableId = process.argv[4] || DEFAULT_TABLE_ID;

  const payload = loadJson(input);
  const normalized = normalizeItems(payload.items || []);
  const { appId, appSecret, ownerOpenId } = getConfig();
  const token = await tenantToken(appId, appSecret);

  const records = await listRecords(token, appToken, tableId);
  await batchDeleteRecords(token, appToken, tableId, records.map((r) => r.record_id));

  const fields = await listFields(token, appToken, tableId);
  const primary = fields[0];
  await updateField(token, appToken, tableId, primary.field_id, 'skuId', 1);

  const desired = [
    ['productCode', 1],
    ['productNameEn', 1],
    ['spec', 1],
    ['unitPriceUsd', 2],
    ['mainImageRef', 1],
    ['supplierId', 1],
    ['status', 1],
    ['moq', 2],
    ['notes', 1],
    ['pcsPerPackage', 2],
    ['cartonLengthCm', 2],
    ['cartonWidthCm', 2],
    ['cartonHeightCm', 2]
  ];

  const desiredNames = new Set(['skuId', ...desired.map(([name]) => name)]);
  for (const field of (await listFields(token, appToken, tableId)).slice(1)) {
    if (!desiredNames.has(field.field_name)) {
      await deleteField(token, appToken, tableId, field.field_id);
    }
  }

  const refreshed = await listFields(token, appToken, tableId);
  const byName = new Map(refreshed.map((f) => [f.field_name, f]));
  for (const [name, type] of desired) {
    const field = byName.get(name);
    if (field && field.type !== type) {
      await deleteField(token, appToken, tableId, field.field_id);
      byName.delete(name);
    }
  }

  const currentNames = new Set((await listFields(token, appToken, tableId)).map((f) => f.field_name));
  for (const [name, type] of desired) {
    if (!currentNames.has(name)) {
      await createField(token, appToken, tableId, name, type);
    }
  }

  await batchCreateRecords(token, appToken, tableId, buildRecords(normalized));

  let grantError = null;
  try {
    await grantAccess(token, appToken, ownerOpenId);
  } catch (err) {
    grantError = err.message;
  }

  const meta = await getBitableMeta(token, appToken);
  console.log(
    JSON.stringify(
      {
        title: meta.name,
        appToken,
        tableId,
        url: meta.url,
        skuCount: normalized.length,
        fields: ['skuId', ...desired.map(([name]) => name)],
        grantError
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
