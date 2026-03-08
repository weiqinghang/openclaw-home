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

async function createBitable(token, name) {
  const data = await request(
    'https://open.feishu.cn/open-apis/bitable/v1/apps',
    token,
    'POST',
    { name }
  );
  if (data.code !== 0) throw new Error(`create bitable failed: ${data.msg}`);
  return data.data.app;
}

async function listFields(token, appToken, tableId) {
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    token
  );
  if (data.code !== 0) throw new Error(`list fields failed: ${data.msg}`);
  return data.data.items || [];
}

async function createField(token, appToken, tableId, fieldName, type, property) {
  const payload = { field_name: fieldName, type };
  if (property) payload.property = property;
  const data = await request(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    token,
    'POST',
    payload
  );
  if (data.code !== 0) throw new Error(`create field ${fieldName} failed: ${data.msg}`);
  return data.data.field;
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

function buildRecords(items, primaryFieldName) {
  return items.map((item) => ({
    fields: {
      [primaryFieldName]: item.skuId,
      productCode: item.productCode,
      productNameCn: item.productNameCn || '',
      productNameEn: item.productNameEn || '',
      spec: item.spec || '',
      listPriceUsd: Number(item.listPriceUsd || 0),
      mainImageRef: item.mainImageRef || '',
      supplierId: item.supplierId || '',
      status: item.status || '',
      moq: Number(item.quoteTemplateFields?.moq || 0),
      others: item.quoteTemplateFields?.others || '',
      pcsPerPackage: String(item.quoteTemplateFields?.pcsPerPackage || ''),
      packages: String(item.quoteTemplateFields?.packages || ''),
      ctnMeasCm: (item.quoteTemplateFields?.ctnMeasCm || []).join('*'),
      cbm: String(item.quoteTemplateFields?.cbm || ''),
      gw: String(item.quoteTemplateFields?.gw || ''),
      totalGw: String(item.quoteTemplateFields?.totalGw || '')
    }
  }));
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node scripts/feishu_trade_bitable.js <sku-master.json>');
    process.exit(1);
  }
  const { appId, appSecret, ownerOpenId } = getConfig();
  const payload = loadJson(input);
  const token = await tenantToken(appId, appSecret);
  const app = await createBitable(token, `太白 SKU主数据 ${new Date().toISOString().slice(0, 10)}`);
  const appToken = app.app_token;
  const tableId = app.default_table_id;

  const existingFields = await listFields(token, appToken, tableId);
  const primaryFieldName = existingFields[0]?.field_name || 'SKU';
  const existingFieldNames = new Set(existingFields.map((f) => f.field_name));
  const fieldSpecs = [
    ['productCode', 1],
    ['productNameCn', 1],
    ['productNameEn', 1],
    ['spec', 1],
    ['listPriceUsd', 2],
    ['mainImageRef', 1],
    ['supplierId', 1],
    ['status', 1],
    ['moq', 2],
    ['others', 1],
    ['pcsPerPackage', 1],
    ['packages', 1],
    ['ctnMeasCm', 1],
    ['cbm', 1],
    ['gw', 1],
    ['totalGw', 1]
  ];
  for (const [fieldName, type] of fieldSpecs) {
    if (!existingFieldNames.has(fieldName)) {
      await createField(token, appToken, tableId, fieldName, type);
    }
  }

  const records = buildRecords(payload.items || [], primaryFieldName);
  await batchCreateRecords(token, appToken, tableId, records);

  let grantError = null;
  try {
    await grantAccess(token, appToken, ownerOpenId);
  } catch (err) {
    grantError = err.message;
  }

  console.log(
    JSON.stringify(
      {
        title: app.name,
        appToken,
        tableId,
        url: app.url,
        ownerOpenId,
        skuCount: payload.items?.length || 0,
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
