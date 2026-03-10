#!/usr/bin/env python3
import argparse
import copy
import json
import re
import urllib.request
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET

NS_MAIN = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_REL = {"r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
NS_DRAW = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
APP_TOKEN = "L3t3bcP0LaDQcSsz3cDcpEjknTf"
TABLE_ID = "tblI6bexYECqDOnj"
REPO_ROOT = Path(__file__).resolve().parents[4]


def q(v, n="0.01"):
    return Decimal(str(v)).quantize(Decimal(n), rounding=ROUND_HALF_UP)


def amount_words(v):
    ones = ["ZERO","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"]
    tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"]

    def under_1000(n):
        n = int(n)
        parts = []
        if n >= 100:
            parts.extend([ones[n // 100], "HUNDRED"])
            n %= 100
        if n >= 20:
            parts.append(tens[n // 10])
            if n % 10:
                parts.append(ones[n % 10])
        elif n > 0:
            parts.append(ones[n])
        return " ".join(parts) if parts else "ZERO"

    whole = int(v)
    cents = int((Decimal(str(v)) - whole) * 100)
    units = [(1_000_000_000, "BILLION"), (1_000_000, "MILLION"), (1000, "THOUSAND"), (1, "")]
    parts = []
    remain = whole
    for size, name in units:
        if remain >= size:
            chunk = remain // size
            remain %= size
            parts.append(under_1000(chunk))
            if name:
                parts.append(name)
    if not parts:
        parts = ["ZERO"]
    if cents:
        return f"US DOLLARS {' '.join(parts)} AND CENTS {under_1000(cents)} ONLY"
    return f"US DOLLARS {' '.join(parts)} ONLY"


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_repo_json(name):
    return load_json(REPO_ROOT / name)


def resolve_taibai_workspace():
    cfg = load_repo_json("openclaw.json")
    for agent in cfg.get("agents", {}).get("list", []):
        if agent.get("id") == "taibai":
            return Path(agent["workspace"])
    raise SystemExit("taibai workspace not found in openclaw.json")


def tenant_token():
    cfg = load_repo_json("openclaw.json")
    sec = load_repo_json("secrets.local.json")
    payload = json.dumps({
        "app_id": cfg["channels"]["feishu"]["accounts"]["taibai"]["appId"],
        "app_secret": sec["channels"]["feishu"]["accounts"]["taibai"]["appSecret"],
    }).encode()
    req = urllib.request.Request(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return data["tenant_access_token"]


def feishu_get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def fetch_bitable_records():
    token = tenant_token()
    data = feishu_get(
        f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records?page_size=500",
        token,
    )
    out = {}
    for item in data["data"]["items"]:
        f = item["fields"]
        out[f["skuId"][0]["text"] if isinstance(f.get("skuId"), list) else f["skuId"]] = {
            "skuId": f["skuId"][0]["text"] if isinstance(f.get("skuId"), list) else f["skuId"],
            "productCode": f.get("productCode", ""),
            "productNameEn": f.get("productNameEn", ""),
            "spec": f.get("spec", ""),
            "unitPriceUsd": Decimal(str(f.get("unitPriceUsd", 0))),
            "mainImageRef": f.get("mainImageRef", ""),
            "supplierId": f.get("supplierId", ""),
            "status": f.get("status", ""),
            "moq": Decimal(str(f.get("moq", 0))),
            "notes": f.get("notes", ""),
            "pcsPerPackage": Decimal(str(f.get("pcsPerPackage", 0))),
            "cartonLengthCm": Decimal(str(f.get("cartonLengthCm", 0))),
            "cartonWidthCm": Decimal(str(f.get("cartonWidthCm", 0))),
            "cartonHeightCm": Decimal(str(f.get("cartonHeightCm", 0))),
        }
    return out


def load_shared_strings(zf):
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    vals = []
    for si in root.findall("a:si", NS_MAIN):
        vals.append("".join(t.text or "" for t in si.findall(".//a:t", NS_MAIN)))
    return root, vals


def update_ref(ref, new_row):
    m = re.match(r"([A-Z]+)(\d+)", ref)
    return f"{m.group(1)}{new_row}"


def shift_formula(text, delta):
    def repl(m):
        col = m.group(1)
        row = int(m.group(2))
        if row >= 18:
            row -= delta
        return f"{col}{row}"
    return re.sub(r"([A-Z]+)(\d+)", repl, text)


def find_cell(row_elem, ref):
    for cell in row_elem.findall("a:c", NS_MAIN):
        if cell.attrib.get("r") == ref:
            return cell
    return None


def set_inline_string(cell, text):
    for child in list(cell):
        cell.remove(child)
    cell.attrib["t"] = "inlineStr"
    is_node = ET.SubElement(cell, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is")
    t = ET.SubElement(is_node, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
    t.text = text


def set_number(cell, value):
    for child in list(cell):
        cell.remove(child)
    cell.attrib.pop("t", None)
    v = ET.SubElement(cell, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
    v.text = str(value)


def set_formula_number(cell, formula, value):
    for child in list(cell):
        cell.remove(child)
    cell.attrib.pop("t", None)
    f = ET.SubElement(cell, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}f")
    f.text = formula
    v = ET.SubElement(cell, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
    v.text = str(value)


def load_template_maps(zf):
    shared_root, shared_values = load_shared_strings(zf)
    sheet_root = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
    rows = {int(r.attrib["r"]): r for r in sheet_root.findall(".//a:sheetData/a:row", NS_MAIN)}
    row_to_sku = {}
    for row_num in range(11, 18):
        cell = find_cell(rows[row_num], f"C{row_num}")
        text = "".join(t.text or "" for t in cell.findall(".//a:t", NS_MAIN))
        if not text:
            v = cell.find("a:v", NS_MAIN)
            if cell.attrib.get("t") == "s" and v is not None:
                text = shared_values[int(v.text)]
        row_to_sku[text.splitlines()[0].strip()] = row_num

    drawing_root = ET.fromstring(zf.read("xl/drawings/drawing1.xml"))
    drawing_rels = ET.fromstring(zf.read("xl/drawings/_rels/drawing1.xml.rels"))
    rel_map = {rel.attrib["Id"]: rel.attrib["Target"].replace("../", "xl/") for rel in drawing_rels}
    product_anchors = {}
    other_anchors = []
    product_image_sizes = {}
    for anchor in drawing_root:
        fr = anchor.find("xdr:from", NS_DRAW)
        pic = anchor.find("xdr:pic", NS_DRAW)
        if fr is None or pic is None:
            other_anchors.append(anchor)
            continue
        row = int(fr.find("xdr:row", NS_DRAW).text) + 1
        col = int(fr.find("xdr:col", NS_DRAW).text) + 1
        if col == 2 and 11 <= row <= 17:
            product_anchors[row] = anchor
            blip = pic.find(".//a:blip", NS_DRAW)
            if blip is not None:
                rid = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
                media = rel_map.get(rid)
                if media and media in zf.namelist():
                    product_image_sizes[row] = image_size(zf.read(media))
        else:
            other_anchors.append(anchor)
    return shared_root, shared_values, sheet_root, rows, row_to_sku, drawing_root, product_anchors, other_anchors, product_image_sizes


def image_size(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    if data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h = int.from_bytes(data[i + 5:i + 7], "big")
                w = int.from_bytes(data[i + 7:i + 9], "big")
                return w, h
            seg_len = int.from_bytes(data[i + 2:i + 4], "big")
            i += 2 + seg_len
    return None


def fit_anchor_to_image(anchor, size):
    if not size:
        return
    ext = anchor.find(".//a:ext", NS_DRAW)
    fr = anchor.find("xdr:from", NS_DRAW)
    to = anchor.find("xdr:to", NS_DRAW)
    if ext is None or fr is None or to is None:
        return
    box_w = int(ext.attrib["cx"])
    box_h = int(ext.attrib["cy"])
    img_w, img_h = size
    if not img_w or not img_h:
        return
    scale = min(box_w / img_w, box_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    old_col_off = int(fr.find("xdr:colOff", NS_DRAW).text)
    old_row_off = int(fr.find("xdr:rowOff", NS_DRAW).text)
    fr.find("xdr:colOff", NS_DRAW).text = str(old_col_off + max(0, (box_w - new_w) // 2))
    fr.find("xdr:rowOff", NS_DRAW).text = str(old_row_off + max(0, (box_h - new_h) // 2))
    to.find("xdr:col", NS_DRAW).text = fr.find("xdr:col", NS_DRAW).text
    to.find("xdr:row", NS_DRAW).text = fr.find("xdr:row", NS_DRAW).text
    to.find("xdr:colOff", NS_DRAW).text = str(int(fr.find("xdr:colOff", NS_DRAW).text) + new_w)
    to.find("xdr:rowOff", NS_DRAW).text = str(int(fr.find("xdr:rowOff", NS_DRAW).text) + new_h)
    ext.attrib["cx"] = str(new_w)
    ext.attrib["cy"] = str(new_h)


def col_num(ref):
    m = re.match(r"([A-Z]+)", ref)
    s = m.group(1)
    n = 0
    for ch in s:
        n = n * 26 + (ord(ch) - 64)
    return n


def trim_row_to_p(row):
    for cell in list(row.findall("a:c", NS_MAIN)):
        if col_num(cell.attrib["r"]) > 16:
            row.remove(cell)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", required=True)
    parser.add_argument("--output")
    parser.add_argument("--customer")
    parser.add_argument("--skus", required=True)
    parser.add_argument("--quantities", required=True)
    args = parser.parse_args()

    selected_skus = [s.strip() for s in args.skus.split(",")]
    quantities = [Decimal(x.strip()) for x in args.quantities.split(",")]
    selected = list(zip(selected_skus, quantities))
    delta = 7 - len(selected)

    bitable = fetch_bitable_records()
    with zipfile.ZipFile(args.template) as zin:
        shared_root, shared_values, sheet_root, rows, row_to_sku, drawing_root, product_anchors, other_anchors, product_image_sizes = load_template_maps(zin)
        sheet_data = sheet_root.find("a:sheetData", NS_MAIN)

        # Remove old item rows and trailing rows; rebuild cleanly.
        for row in list(sheet_data):
            r = int(row.attrib["r"])
            if 11 <= r <= 29:
                sheet_data.remove(row)

        total_qty = Decimal("0")
        total_usd = Decimal("0")
        total_rmb = Decimal("0")
        total_packages = Decimal("0")
        total_cbm = Decimal("0")

        new_rows = []
        for idx, (sku_id, qty) in enumerate(selected, start=1):
            record = bitable[sku_id]
            source_row_num = row_to_sku[record["productCode"]]
            row = copy.deepcopy(rows[source_row_num])
            target_row = 10 + idx
            row.attrib["r"] = str(target_row)
            for cell in row.findall("a:c", NS_MAIN):
                cell.attrib["r"] = update_ref(cell.attrib["r"], target_row)

            pcs = record["pcsPerPackage"] or Decimal("0")
            packages = (qty / pcs) if pcs else Decimal("0")
            unit = record["unitPriceUsd"]
            usd_total = q(qty * unit)
            rmb_total = q(usd_total * Decimal("1.015"))
            cbm = q(record["cartonLengthCm"] * record["cartonWidthCm"] * record["cartonHeightCm"] * packages / Decimal("1000000"), "0.000001")

            total_qty += qty
            total_usd += usd_total
            total_rmb += rmb_total
            total_packages += packages
            total_cbm += cbm

            description = record["productCode"] + "\n" + record["productNameEn"]
            if record["spec"]:
                description += "\n" + record["spec"]

            set_number(find_cell(row, f"A{target_row}"), idx)
            set_inline_string(find_cell(row, f"C{target_row}"), description)
            set_number(find_cell(row, f"D{target_row}"), qty)
            set_number(find_cell(row, f"E{target_row}"), unit)
            set_formula_number(find_cell(row, f"F{target_row}"), f"E{target_row}*D{target_row}", usd_total)
            set_formula_number(find_cell(row, f"G{target_row}"), f"F{target_row}*1.015", rmb_total)
            set_inline_string(find_cell(row, f"H{target_row}"), record["notes"] or "")
            set_number(find_cell(row, f"I{target_row}"), pcs)
            set_formula_number(find_cell(row, f"J{target_row}"), f"D{target_row}/I{target_row}", packages)
            set_number(find_cell(row, f"K{target_row}"), record["cartonLengthCm"])
            set_number(find_cell(row, f"L{target_row}"), record["cartonWidthCm"])
            set_number(find_cell(row, f"M{target_row}"), record["cartonHeightCm"])
            set_formula_number(find_cell(row, f"N{target_row}"), f"K{target_row}*L{target_row}*M{target_row}*J{target_row}/1000000", cbm)
            if find_cell(row, f"O{target_row}") is not None:
                set_inline_string(find_cell(row, f"O{target_row}"), "")
            if find_cell(row, f"P{target_row}") is not None:
                set_inline_string(find_cell(row, f"P{target_row}"), "")
            trim_row_to_p(row)
            new_rows.append(row)

        # Shift footer rows.
        footer_map = {}
        for old in range(18, 30):
            new = old - delta
            row = copy.deepcopy(rows[old])
            row.attrib["r"] = str(new)
            for cell in row.findall("a:c", NS_MAIN):
                cell.attrib["r"] = update_ref(cell.attrib["r"], new)
                f = cell.find("a:f", NS_MAIN)
                if f is not None and f.text:
                    f.text = shift_formula(f.text, delta)
            footer_map[old] = row

        total_row_num = 18 - delta
        total_row = footer_map[18]
        end_row = 10 + len(selected)
        set_formula_number(find_cell(total_row, f"D{total_row_num}"), f"SUM(D11:D{end_row})", total_qty)
        set_formula_number(find_cell(total_row, f"F{total_row_num}"), f"SUM(F11:F{end_row})", q(total_usd))
        set_formula_number(find_cell(total_row, f"G{total_row_num}"), f"SUM(G11:G{end_row})", q(total_rmb))
        set_formula_number(find_cell(total_row, f"J{total_row_num}"), f"SUM(J11:J{end_row})", q(total_packages, "0.000001"))
        set_formula_number(find_cell(total_row, f"N{total_row_num}"), f"SUM(N11:N{end_row})", q(total_cbm, "0.000001"))
        trim_row_to_p(total_row)

        say_row = footer_map[19]
        set_inline_string(find_cell(say_row, f"A{19-delta}"), f"SAY: IN TOTAL {amount_words(q(total_rmb))}")

        pay_row_num = 22 - delta
        pay_row = footer_map[22]
        usd_deposit = q(total_usd * Decimal("0.3"))
        usd_balance = q(total_usd - usd_deposit)
        rmb_deposit = q(total_rmb * Decimal("0.3"))
        rmb_balance = q(total_rmb - rmb_deposit)
        payment_text = (
            "3.PAYMENT TERM:\n"
            f"1) IF PAID TO RMB COMPANY ACCOUNT: TT 30% (${q(total_rmb)}*0.3=${rmb_deposit}) AS DEPOSIT. "
            f"THE BALANCE (${q(total_rmb)}-{rmb_deposit}={rmb_balance}) SHOULD BE RECEIVED BEFORE DELIVERY.\n\n"
            f"2) IF PAID TO USD COMPANY ACCOUNT, TT 30% (${q(total_usd)}*0.3=${usd_deposit}) AS DEPOSIT, "
            f"THE BALANCE (${q(total_usd)}-{usd_deposit}={usd_balance}) SHOULD BE RECEIVED BEFORE DELIVERY."
        )
        set_inline_string(find_cell(pay_row, f"A{pay_row_num}"), payment_text)
        for row in footer_map.values():
            trim_row_to_p(row)

        for row in new_rows + [footer_map[i] for i in range(18, 30)]:
            sheet_data.append(row)

        # Update merged cells and dimension.
        merge_cells = sheet_root.find("a:mergeCells", NS_MAIN)
        for mc in list(merge_cells):
            ref = mc.attrib["ref"]
            start, end = ref.split(":")
            if col_num(start) > 16:
                merge_cells.remove(mc)
                continue
            start_row = int(re.findall(r"\d+", start)[0])
            end_row = int(re.findall(r"\d+", end)[0])
            if 18 <= start_row:
                start_row -= delta
                end_row -= delta
                mc.attrib["ref"] = re.sub(r"\d+", str(start_row), start, 1) + ":" + re.sub(r"\d+", str(end_row), end, 1)

        dimension = sheet_root.find("a:dimension", NS_MAIN)
        dimension.attrib["ref"] = f"A1:P{29-delta}"
        cols = sheet_root.find("a:cols", NS_MAIN)
        for col in list(cols):
            if int(col.attrib["min"]) > 16:
                cols.remove(col)

        # Update print area.
        workbook = ET.fromstring(zin.read("xl/workbook.xml"))
        for dn in workbook.findall("a:definedNames/a:definedName", NS_MAIN):
            if dn.attrib.get("name") == "_xlnm.Print_Area":
                dn.text = f"Hoja1!$A$1:$P${29-delta}"

        # Update drawings.
        new_anchors = []
        for old_row in range(11, 18):
            pass
        for idx, (sku_id, _) in enumerate(selected, start=1):
            record = bitable[sku_id]
            source_row_num = row_to_sku[record["productCode"]]
            anchor = copy.deepcopy(product_anchors[source_row_num])
            row_delta = (10 + idx) - source_row_num
            from_row = anchor.find("xdr:from/xdr:row", NS_DRAW)
            to_row = anchor.find("xdr:to/xdr:row", NS_DRAW)
            from_row.text = str(int(from_row.text) + row_delta)
            to_row.text = str(int(to_row.text) + row_delta)
            fit_anchor_to_image(anchor, product_image_sizes.get(source_row_num))
            new_anchors.append(anchor)
        shifted_other = []
        for anchor in other_anchors:
            cloned = copy.deepcopy(anchor)
            fr = cloned.find("xdr:from", NS_DRAW)
            to = cloned.find("xdr:to", NS_DRAW)
            if fr is not None and to is not None:
                fr_row = int(fr.find("xdr:row", NS_DRAW).text) + 1
                fr_col = int(fr.find("xdr:col", NS_DRAW).text) + 1
                to_row = int(to.find("xdr:row", NS_DRAW).text) + 1
                if fr_col > 16:
                    continue
                if fr_row >= 18:
                    fr.find("xdr:row", NS_DRAW).text = str(fr_row - delta - 1)
                    to.find("xdr:row", NS_DRAW).text = str(to_row - delta - 1)
            shifted_other.append(cloned)
        for anchor in list(drawing_root):
            drawing_root.remove(anchor)
        for anchor in shifted_other + new_anchors:
            drawing_root.append(anchor)

        if args.output:
            out_path = Path(args.output)
        else:
            if not args.customer:
                raise SystemExit("--customer is required when --output is omitted")
            slug = re.sub(r"[^A-Za-z0-9]+", "-", args.customer).strip("-").lower() or "customer"
            ymd = datetime.now().strftime("%Y%m%d")
            out_path = resolve_taibai_workspace() / "quotations" / f"{ymd}-{slug}-quotation.xlsx"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                data = zin.read(info.filename)
                if info.filename == "xl/worksheets/sheet1.xml":
                    data = ET.tostring(sheet_root, encoding="utf-8", xml_declaration=True)
                elif info.filename == "xl/workbook.xml":
                    data = ET.tostring(workbook, encoding="utf-8", xml_declaration=True)
                elif info.filename == "xl/drawings/drawing1.xml":
                    data = ET.tostring(drawing_root, encoding="utf-8", xml_declaration=True)
                zout.writestr(info, data)

    print(str(out_path))


if __name__ == "__main__":
    main()
