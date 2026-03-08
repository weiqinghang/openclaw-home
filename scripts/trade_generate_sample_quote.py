#!/usr/bin/env python3
import argparse
import json
import re
import zipfile
from copy import deepcopy
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import xml.etree.ElementTree as ET

NS_MAIN = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_DRAW = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}


def quant(v, n="0.01"):
    return Decimal(str(v)).quantize(Decimal(n), rounding=ROUND_HALF_UP)


def amount_words(v):
    ones = ["ZERO","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"]
    tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"]

    def under_1000(n):
        n = int(n)
        parts = []
        if n >= 100:
            parts.append(ones[n // 100])
            parts.append("HUNDRED")
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
            if chunk:
                parts.append(under_1000(chunk))
                if name:
                    parts.append(name)
    if not parts:
        parts = ["ZERO"]
    if cents:
        return f"US DOLLARS {' '.join(parts)} AND CENTS {under_1000(cents)} ONLY"
    return f"US DOLLARS {' '.join(parts)} ONLY"


def load_shared_strings(zf):
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    vals = []
    for si in root.findall("a:si", NS_MAIN):
        vals.append("".join(t.text or "" for t in si.findall(".//a:t", NS_MAIN)))
    return root, vals


def cell_ref(col, row):
    return f"{col}{row}"


def find_cell(row_elem, ref):
    for cell in row_elem.findall("a:c", NS_MAIN):
        if cell.attrib.get("r") == ref:
            return cell
    return None


def set_shared_string(cell, value, shared_root, shared_values):
    if value in shared_values:
        idx = shared_values.index(value)
    else:
        si = ET.SubElement(shared_root, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si")
        t = ET.SubElement(si, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
        t.text = value
        shared_values.append(value)
        idx = len(shared_values) - 1
        shared_root.attrib["count"] = str(int(shared_root.attrib.get("count", "0")) + 1)
        shared_root.attrib["uniqueCount"] = str(len(shared_values))
    cell.attrib["t"] = "s"
    for child in list(cell):
        if child.tag.endswith("f"):
            cell.remove(child)
    v = cell.find("a:v", NS_MAIN)
    if v is None:
        v = ET.SubElement(cell, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
    v.text = str(idx)


def set_number(cell, value):
    for child in list(cell):
        if child.tag.endswith("f"):
            cell.remove(child)
    cell.attrib.pop("t", None)
    v = cell.find("a:v", NS_MAIN)
    if v is None:
        v = ET.SubElement(cell, "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
    v.text = str(value)


def clear_cell(cell):
    for child in list(cell):
        cell.remove(child)
    cell.attrib.pop("t", None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    with zipfile.ZipFile(args.input) as zin:
        shared_root, shared_values = load_shared_strings(zin)
        sheet_root = ET.fromstring(zin.read("xl/worksheets/sheet1.xml"))
        drawing_root = ET.fromstring(zin.read("xl/drawings/drawing1.xml"))

        rows = {int(r.attrib["r"]): r for r in sheet_root.findall(".//a:sheetData/a:row", NS_MAIN)}

        picked_rows = [11, 12, 13]
        blanks = [14, 15, 16, 17]

        total_d = total_f = total_g = total_j = Decimal("0")
        total_n = total_p = total_q = total_t = Decimal("0")

        for row_num in picked_rows:
            row = rows[row_num]
            total_d += Decimal(find_cell(row, cell_ref("D", row_num)).find("a:v", NS_MAIN).text)
            total_f += Decimal(find_cell(row, cell_ref("F", row_num)).find("a:v", NS_MAIN).text)
            total_g += Decimal(find_cell(row, cell_ref("G", row_num)).find("a:v", NS_MAIN).text)
            total_j += Decimal(find_cell(row, cell_ref("J", row_num)).find("a:v", NS_MAIN).text)
            total_n += Decimal(find_cell(row, cell_ref("N", row_num)).find("a:v", NS_MAIN).text)
            p = find_cell(row, cell_ref("P", row_num))
            q = find_cell(row, cell_ref("Q", row_num))
            t = find_cell(row, cell_ref("T", row_num))
            if p is not None and p.find("a:v", NS_MAIN) is not None:
                total_p += Decimal(p.find("a:v", NS_MAIN).text)
            if q is not None and q.find("a:v", NS_MAIN) is not None:
                total_q += Decimal(q.find("a:v", NS_MAIN).text)
            if t is not None and t.find("a:v", NS_MAIN) is not None:
                total_t += Decimal(t.find("a:v", NS_MAIN).text)

        for row_num in blanks:
            row = rows[row_num]
            for cell in row.findall("a:c", NS_MAIN):
                clear_cell(cell)

        total_row = rows[18]
        totals = {
            "D": total_d,
            "F": total_f,
            "G": total_g,
            "J": total_j,
            "N": total_n,
            "P": total_p,
            "Q": total_q,
            "T": total_t,
        }
        for col, value in totals.items():
            set_number(find_cell(total_row, cell_ref(col, 18)), value)

        say_row = rows[19]
        set_shared_string(
            find_cell(say_row, "A19"),
            f"SAY: IN TOTAL {amount_words(quant(total_g))}",
            shared_root,
            shared_values,
        )

        pay_row = rows[22]
        usd_total = quant(total_f)
        rmb_total = quant(total_g)
        usd_deposit = quant(usd_total * Decimal("0.3"))
        usd_balance = quant(usd_total - usd_deposit)
        rmb_deposit = quant(rmb_total * Decimal("0.3"))
        rmb_balance = quant(rmb_total - rmb_deposit)
        payment_text = (
            "3.PAYMENT TERM:\n"
            f"1) IF PAID TO RMB COMPANY ACCOUNT: TT 30% (${rmb_total}*0.3=${rmb_deposit}) AS DEPOSIT. "
            f"THE BALANCE (${rmb_total}-${rmb_deposit}=${rmb_balance}) SHOULD BE RECEIVED BEFORE DELIVERY.\n\n"
            f"2) IF PAID TO USD COMPANY ACCOUNT, TT 30% (${usd_total}*0.3=${usd_deposit}) AS DEPOSIT, "
            f"THE BALANCE (${usd_total}-${usd_deposit}=${usd_balance}) SHOULD BE RECEIVED BEFORE DELIVERY."
        )
        set_shared_string(find_cell(pay_row, "A22"), payment_text, shared_root, shared_values)

        invoice_row = rows[4]
        set_shared_string(find_cell(invoice_row, "I4"), "INVOICE NO.: VIL-26-0308-SAMPLE", shared_root, shared_values)
        date_row = rows[5]
        set_shared_string(find_cell(date_row, "I5"), "INVOICE DATE: Mar 8th, 2026", shared_root, shared_values)

        anchors = []
        for anchor in list(drawing_root):
            fr = anchor.find("xdr:from", NS_DRAW)
            pic = anchor.find("xdr:pic", NS_DRAW)
            keep = True
            if fr is not None and pic is not None:
                row = int(fr.find("xdr:row", NS_DRAW).text) + 1
                col = int(fr.find("xdr:col", NS_DRAW).text) + 1
                if col == 2 and row in blanks:
                    keep = False
            if keep:
                anchors.append(anchor)
        for anchor in list(drawing_root):
            drawing_root.remove(anchor)
        for anchor in anchors:
            drawing_root.append(anchor)

        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                data = zin.read(info.filename)
                if info.filename == "xl/worksheets/sheet1.xml":
                    data = ET.tostring(sheet_root, encoding="utf-8", xml_declaration=True)
                elif info.filename == "xl/sharedStrings.xml":
                    data = ET.tostring(shared_root, encoding="utf-8", xml_declaration=True)
                elif info.filename == "xl/drawings/drawing1.xml":
                    data = ET.tostring(drawing_root, encoding="utf-8", xml_declaration=True)
                zout.writestr(info, data)

    print(str(out_path))


if __name__ == "__main__":
    main()
