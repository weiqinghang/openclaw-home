#!/usr/bin/env python3
import argparse
import json
import os
import re
import shutil
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

NS_MAIN = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_REL = {"r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
NS_DRAW = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def col_to_index(col):
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n


def normalize_name(text):
    text = (text or "").strip()
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text.lower() or "item"


def sku_id(product_code):
    return f"SKU-{product_code.upper()}-01"


def text_cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    value_node = cell.find("a:v", NS_MAIN)
    inline_node = cell.find("a:is", NS_MAIN)
    if cell_type == "s" and value_node is not None:
        return shared_strings[int(value_node.text)]
    if cell_type == "inlineStr" and inline_node is not None:
        return "".join(t.text or "" for t in inline_node.findall(".//a:t", NS_MAIN))
    if value_node is not None:
        return value_node.text
    return None


def load_shared_strings(zf):
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    return [
        "".join(t.text or "" for t in si.findall(".//a:t", NS_MAIN))
        for si in root.findall("a:si", NS_MAIN)
    ]


def extract_images_map(zf):
    rels_path = "xl/worksheets/_rels/sheet1.xml.rels"
    if rels_path not in zf.namelist():
        return {}
    rels_root = ET.fromstring(zf.read(rels_path))
    drawing_target = None
    for rel in rels_root:
        if rel.attrib.get("Type", "").endswith("/drawing"):
            drawing_target = "xl/" + rel.attrib["Target"].replace("../", "")
            break
    if not drawing_target or drawing_target not in zf.namelist():
        return {}

    drawing_root = ET.fromstring(zf.read(drawing_target))
    drawing_rels_path = str(Path(drawing_target).parent / "_rels" / (Path(drawing_target).name + ".rels"))
    drawing_rels = ET.fromstring(zf.read(drawing_rels_path))
    relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in drawing_rels}

    row_image = {}
    for anchor in drawing_root:
        fr = anchor.find("xdr:from", NS_DRAW)
        pic = anchor.find("xdr:pic", NS_DRAW)
        if fr is None or pic is None:
            continue
        row = int(fr.find("xdr:row", NS_DRAW).text) + 1
        col = int(fr.find("xdr:col", NS_DRAW).text) + 1
        blip = pic.find(".//a:blip", NS_DRAW)
        if blip is None:
            continue
        rid = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
        target = relmap.get(rid)
        if not target:
            continue
        media_path = "xl/" + target.replace("../", "")
        if col == 2 and 11 <= row <= 17:
            row_image[row] = media_path
    return row_image


def parse_sheet(zf):
    shared = load_shared_strings(zf)
    root = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
    rows = {}
    for row in root.findall(".//a:sheetData/a:row", NS_MAIN):
        row_num = int(row.attrib["r"])
        cells = {}
        for cell in row.findall("a:c", NS_MAIN):
            ref = cell.attrib["r"]
            col = re.sub(r"\d+", "", ref)
            cells[col] = text_cell_value(cell, shared)
        rows[row_num] = cells
    return rows


def build_master_data(rows, row_image_map, image_dir, zf):
    items = []
    for row_num in range(11, 18):
        row = rows.get(row_num, {})
        description = (row.get("C") or "").strip()
        if not description:
            continue
        parts = [p.strip() for p in description.splitlines() if p.strip()]
        product_code = parts[0]
        product_name_en = parts[1] if len(parts) > 1 else product_code
        spec = "\n".join(parts[2:]) if len(parts) > 2 else ""
        image_ref = None
        media_path = row_image_map.get(row_num)
        if media_path and media_path in zf.namelist():
            ext = Path(media_path).suffix.lower()
            image_name = f"{sku_id(product_code)}{ext}"
            target = image_dir / image_name
            target.write_bytes(zf.read(media_path))
            image_ref = str(target)

        items.append(
            {
                "skuId": sku_id(product_code),
                "productCode": product_code,
                "productNameCn": "",
                "productNameEn": product_name_en,
                "spec": spec,
                "listPriceUsd": float(row.get("E") or 0),
                "mainImageRef": image_ref,
                "supplierId": "SUP-UNKNOWN-01",
                "status": "active",
                "quoteTemplateFields": {
                    "moq": int(float(row.get("D") or 0)),
                    "others": row.get("H") or "",
                    "pcsPerPackage": row.get("I") or "",
                    "packages": row.get("J") or "",
                    "ctnMeasCm": [row.get("K") or "", row.get("L") or "", row.get("M") or ""],
                    "cbm": row.get("N") or "",
                    "gw": row.get("O") or "",
                    "totalGw": row.get("P") or "",
                },
            }
        )
    return items


def to_markdown(items):
    lines = [
        "# SKU 主数据",
        "",
        "| skuId | productCode | productNameEn | spec | listPriceUsd | mainImageRef | supplierId | status |",
        "| --- | --- | --- | --- | ---: | --- | --- | --- |",
    ]
    for item in items:
        spec = item["spec"].replace("\n", "<br>")
        image_ref = Path(item["mainImageRef"]).name if item["mainImageRef"] else ""
        lines.append(
            f"| {item['skuId']} | {item['productCode']} | {item['productNameEn']} | {spec} | "
            f"{item['listPriceUsd']:.2f} | {image_ref} | {item['supplierId']} | {item['status']} |"
        )
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--catalog-name", default="quote-sku-master")
    args = parser.parse_args()

    out_dir = Path(args.output_dir).expanduser().resolve() / args.catalog_name
    image_dir = out_dir / "images"
    image_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(args.input) as zf:
        rows = parse_sheet(zf)
        row_image_map = extract_images_map(zf)
        items = build_master_data(rows, row_image_map, image_dir, zf)

    payload = {
        "sourceQuote": str(Path(args.input).resolve()),
        "catalogName": args.catalog_name,
        "skuCount": len(items),
        "items": items,
    }

    (out_dir / "sku-master.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "sku-master.md").write_text(to_markdown(items), encoding="utf-8")
    print(str(out_dir / "sku-master.json"))


if __name__ == "__main__":
    main()
