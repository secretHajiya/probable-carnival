from pathlib import Path

root = Path(__file__).resolve().parents[1]
worker = (root / "cloudflare/cpx-callback/src/index.js").read_text()
config = (root / "cloudflare/cpx-callback/wrangler.toml").read_text()
readme = (root / "cloudflare/cpx-callback/README.md").read_text()

checks = {
    "CPX IP allowlist present": all(ip in worker for ip in ["157.90.97.92", "188.40.3.73", "2a01:4f8:d0a:30ff::2"]),
    "MD5 signature validation present": "md5(" in worker and "safeEqual(expectedHash, suppliedHash)" in worker,
    "UUID validation present": "isUuid(userId)" in worker,
    "outgoing transactions ignored": 'type === "out"' in worker,
    "complete and bonus transaction types accepted": 'type !== "complete" && type !== "bonus"' in worker,
    "credit and reversal statuses handled": "status !== 1 && status !== 2" in worker,
    "Nigeria app mapping explicitly scoped": 'external_app_id: "eq.37222"' in worker and 'country_code: "eq.NG"' in worker,
    "existing nine-argument RPC called": all(k in worker for k in ["p_provider_id", "p_transaction_id", "p_external_user_id", "p_user_id", "p_status", "p_reward_coins", "p_gross_revenue_minor", "p_currency", "p_payload"]),
    "required secrets documented": all(k in readme for k in ["CPX_APP_SECURITY_HASH", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]),
    "Wrangler entrypoint configured": 'main = "src/index.js"' in config,
    "withdrawal safety preserved": "must remain disabled" in readme,
}
for name, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'}: {name}")
print(f"\n{sum(checks.values())}/{len(checks)} checks passed")
if not all(checks.values()):
    raise SystemExit(1)
