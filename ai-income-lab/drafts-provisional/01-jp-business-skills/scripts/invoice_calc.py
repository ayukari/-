#!/usr/bin/env python3
"""Qualified-invoice (適格請求書) calculator for Japan's invoice system.

Reads line items as JSON and prints per-rate totals and tax. Consumption tax
is rounded once per tax rate per invoice, as the invoice system requires.

Input JSON:
{
  "issuer": {"name": "...", "registration_number": "T1234567890123"},
  "recipient": "...",
  "date": "2026-10-04",
  "price_mode": "exclusive" | "inclusive",
  "rounding": "floor" | "round" | "ceil",
  "items": [{"name": "...", "qty": 1, "unit_price": 1000, "rate": 10}]
}
"""
import json
import re
import sys
from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal

RATES = (8, 10)
ROUNDING = {"floor": ROUND_FLOOR, "round": ROUND_HALF_UP, "ceil": ROUND_CEILING}
REG_NO = re.compile(r"^T\d{13}$")


def validate(inv):
    errors = []
    issuer = inv.get("issuer", {})
    if not issuer.get("name"):
        errors.append("issuer.name is required (発行者の氏名又は名称)")
    if not REG_NO.match(issuer.get("registration_number", "")):
        errors.append("issuer.registration_number must be 'T' + 13 digits (登録番号)")
    if not inv.get("recipient"):
        errors.append("recipient is required (交付を受ける事業者の氏名又は名称)")
    if not inv.get("date"):
        errors.append("date is required (取引年月日)")
    if not inv.get("items"):
        errors.append("at least one item is required (取引内容)")
    for i, item in enumerate(inv.get("items", [])):
        if item.get("rate") not in RATES:
            errors.append(f"items[{i}].rate must be 8 or 10")
    return errors


def calculate(inv):
    mode = inv.get("price_mode", "exclusive")
    rounding = ROUNDING[inv.get("rounding", "floor")]
    totals = {}
    for item in inv["items"]:
        amount = Decimal(str(item["unit_price"])) * Decimal(str(item.get("qty", 1)))
        totals[item["rate"]] = totals.get(item["rate"], Decimal(0)) + amount

    summary = []
    for rate in sorted(totals):
        r = Decimal(rate) / 100
        base = totals[rate]
        if mode == "exclusive":
            tax = (base * r).quantize(Decimal(1), rounding=rounding)
            excl, incl = base, base + tax
        else:
            tax = (base * r / (1 + r)).quantize(Decimal(1), rounding=rounding)
            excl, incl = base - tax, base
        summary.append({
            "rate": rate,
            "reduced": rate == 8,
            "subtotal_excl_tax": int(excl),
            "tax": int(tax),
            "subtotal_incl_tax": int(incl),
        })
    return {
        "by_rate": summary,
        "total_incl_tax": sum(s["subtotal_incl_tax"] for s in summary),
        "total_tax": sum(s["tax"] for s in summary),
    }


def main():
    inv = json.load(open(sys.argv[1]) if len(sys.argv) > 1 else sys.stdin)
    errors = validate(inv)
    if errors:
        print(json.dumps({"ok": False, "errors": errors}, ensure_ascii=False, indent=2))
        sys.exit(1)
    print(json.dumps({"ok": True, **calculate(inv)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
