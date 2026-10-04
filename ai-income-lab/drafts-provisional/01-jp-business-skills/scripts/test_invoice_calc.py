import unittest

from invoice_calc import calculate, validate

BASE = {
    "issuer": {"name": "山田デザイン", "registration_number": "T1234567890123"},
    "recipient": "株式会社サンプル",
    "date": "2026-10-04",
}


class InvoiceCalcTest(unittest.TestCase):
    def test_tax_rounded_once_per_rate(self):
        # 3 x 333 at 10%: per-line rounding gives 33*3=99; per-rate gives floor(99.9)=99.
        # 7 x 143 at 8%: per-rate 1001*0.08=80.08 -> 80.
        inv = {**BASE, "items": [
            {"name": "作業A", "qty": 3, "unit_price": 333, "rate": 10},
            {"name": "食品", "qty": 7, "unit_price": 143, "rate": 8},
        ]}
        out = calculate(inv)
        self.assertEqual(out["by_rate"][0], {"rate": 8, "reduced": True, "subtotal_excl_tax": 1001, "tax": 80, "subtotal_incl_tax": 1081})
        self.assertEqual(out["by_rate"][1]["tax"], 99)
        self.assertEqual(out["total_incl_tax"], 1081 + 1098)

    def test_inclusive_prices(self):
        inv = {**BASE, "price_mode": "inclusive", "items": [{"name": "x", "unit_price": 11000, "rate": 10}]}
        self.assertEqual(calculate(inv)["by_rate"][0]["tax"], 1000)

    def test_validation_errors(self):
        errors = validate({"issuer": {"name": "A", "registration_number": "1234"}, "items": [{"rate": 5}]})
        self.assertEqual(len(errors), 4)


if __name__ == "__main__":
    unittest.main()
