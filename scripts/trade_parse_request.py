#!/usr/bin/env python3
import argparse
import json
import re


QUOTE_SKU_RE = re.compile(r"(SKU-[A-Z0-9]+-\d+)\s*([0-9]+(?:\.[0-9]+)?)", re.I)
SKU_ID_RE = re.compile(r"(SKU-[A-Z0-9]+-\d+)", re.I)
PRODUCT_CODE_RE = re.compile(r"\b([A-Z]{2,}[A-Z0-9]*)\b")

FIELD_MAP = {
    "单价": "unitPriceUsd",
    "价格": "unitPriceUsd",
    "备注": "notes",
    "MOQ": "moq",
    "moq": "moq",
    "pcs per package": "pcsPerPackage",
    "每箱数量": "pcsPerPackage",
    "装箱数": "pcsPerPackage",
    "外箱长": "cartonLengthCm",
    "外箱宽": "cartonWidthCm",
    "外箱高": "cartonHeightCm",
    "length": "cartonLengthCm",
    "width": "cartonWidthCm",
    "height": "cartonHeightCm",
    "状态": "status",
    "供应商": "supplierId",
    "图片": "mainImageRef",
}
DERIVED_FIELDS = {"cbm", "packages", "totalGw", "lineTotalUsd", "lineTotalRmb", "lineCbm", "总体积", "总价", "total cbm"}


def parse_quote(message):
    items = [{"skuId": sku.upper(), "quantity": float(qty)} for sku, qty in QUOTE_SKU_RE.findall(message)]
    customer = None
    for pattern in [
        r"客户[:：\s]+([^，,；;\n]+)",
        r"给([^，,；;\n]+)生成报价单",
        r"为([^，,；;\n]+)生成报价单",
    ]:
        m = re.search(pattern, message)
        if m:
            customer = m.group(1).strip()
            break
    missing = []
    if not customer:
        missing.append("customerName")
    if not items:
        missing.append("items")
    return {
        "action": "quote.generate",
        "customerName": customer,
        "items": items,
        "missingFields": missing,
        "ready": not missing,
    }


def parse_changes(message):
    rejected = []
    changes = {}
    patterns = [
        (r"(?:单价|价格)\s*(?:改成|为|=)?\s*([0-9]+(?:\.[0-9]+)?)", "unitPriceUsd", float),
        (r"备注\s*(?:改成|为|=)?\s*([^\n，,；;]+)", "notes", str),
        (r"(?:MOQ|moq)\s*(?:改成|为|=)?\s*([0-9]+(?:\.[0-9]+)?)", "moq", float),
        (r"(?:每箱数量|装箱数)\s*(?:改成|为|=)?\s*([0-9]+(?:\.[0-9]+)?)", "pcsPerPackage", float),
        (r"外箱长\s*(?:改成|为|=)?\s*([0-9]+(?:\.[0-9]+)?)", "cartonLengthCm", float),
        (r"外箱宽\s*(?:改成|为|=)?\s*([0-9]+(?:\.[0-9]+)?)", "cartonWidthCm", float),
        (r"外箱高\s*(?:改成|为|=)?\s*([0-9]+(?:\.[0-9]+)?)", "cartonHeightCm", float),
        (r"状态\s*(?:改成|为|=)?\s*([^\n，,；;]+)", "status", str),
        (r"供应商\s*(?:改成|为|=)?\s*([^\n，,；;]+)", "supplierId", str),
        (r"图片\s*(?:改成|为|=)?\s*([^\n，,；;]+)", "mainImageRef", str),
    ]
    for pattern, field, caster in patterns:
        m = re.search(pattern, message, re.I)
        if m:
            value = caster(m.group(1).strip())
            changes[field] = value
    lowered = message.lower()
    for field in DERIVED_FIELDS:
        if field.lower() in lowered:
            rejected.append(field)
    return changes, rejected


def parse_sku_upsert(message):
    sku = None
    m = SKU_ID_RE.search(message)
    if m:
        sku = m.group(1).upper()
    product_code = None
    if not sku:
        for candidate in PRODUCT_CODE_RE.findall(message):
            if candidate.upper().startswith("SKU"):
                continue
            product_code = candidate
            break
    changes, rejected = parse_changes(message)
    missing = []
    if not sku and not product_code:
        missing.append("skuIdOrProductCode")
    if not changes and not rejected:
        missing.append("changes")
    return {
        "action": "sku.upsert",
        "mode": "proposed",
        "target": sku or product_code,
        "targetField": "skuId" if sku else ("productCode" if product_code else None),
        "changes": changes,
        "rejectedFields": rejected,
        "missingFields": missing,
        "ready": not missing,
    }


def parse_message(message):
    text = message.strip()
    if text in {"确认写入", "取消"}:
        return {"action": "sku.confirm", "decision": text}
    if "报价单" in text:
        return parse_quote(text)
    if any(word in text for word in ["改成", "改为", "修改", "更新", "新增SKU", "新增 sku", "新增"]):
        return parse_sku_upsert(text)
    return {"action": "unknown", "ready": False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--message", required=True)
    args = parser.parse_args()
    print(json.dumps(parse_message(args.message), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
