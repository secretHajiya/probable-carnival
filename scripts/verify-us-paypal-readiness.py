from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

base = read("supabase/migrations/001_initial_schema.sql")
vault = read("supabase/migrations/013_secure_payout_details_vault.sql")
worker = read("cloudflare/payout-details/src/index.ts")
ui = read("apps/web/src/withdrawals/WithdrawalHistory.tsx")
country = read("apps/web/src/country/CountrySelection.tsx")
checks = [
    ("base withdrawal method currently bank-transfer only", "payout_method text not null check (payout_method in ('bank_transfer'))" in base),
    ("secure vault currently bank-transfer only", "check (payout_method = 'bank_transfer')" in vault),
    ("withdrawal RPC currently requires bank transfer", "v_vault.payout_method <> 'bank_transfer'" in vault),
    ("current payout Worker validates Nigeria bank details", "v.country_code === 'NG' && v.payout_method === 'bank_transfer'" in worker),
    ("current payout Worker has no PayPal provider API implementation", "api-m.sandbox.paypal.com" not in worker and "verify-webhook-signature" not in worker),
    ("member UI explicitly blocks US from NG bank transfer", "countryCode !== 'NG'" in ui),
    ("member UI states PayPal is pending", "US PayPal integration is still pending" in ui),
    ("country selection labels PayPal planned", "PayPal planned" in country),
]
failed = 0
for name, ok in checks:
    print(("PASS" if ok else "FAIL") + " — " + name)
    failed += not ok
print(f"\n{len(checks)-failed}/{len(checks)} readiness assertions passed")
raise SystemExit(1 if failed else 0)
