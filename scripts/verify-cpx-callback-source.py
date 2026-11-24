from pathlib import Path

root = Path(__file__).resolve().parents[1]
callback = (root / "supabase/functions/cpx-postback/index.ts").read_text()
wall = (root / "supabase/functions/cpx-wall-config/index.ts").read_text()
checks = {
    "CPX signature validation": 'md5(`${transactionId}-${appSecret}`)' in callback and 'npm:md5@2.3.0' in callback and 'invalid_signature' in callback,
    "server-side reward conversion": 'CPX_REWARD_COINS_PER_USD' in callback and 'p_reward_coins: rewardCoins' in callback,
    "owner-reported RPC parameter contract": all(k in callback for k in ["p_provider_id", "p_transaction_id", "p_external_user_id", "p_user_id", "p_status", "p_reward_coins", "p_gross_revenue_minor", "p_currency", "p_payload"]),
    "country-specific provider mapping": '.eq("country_code", profile.country_code)' in callback,
    "disabled provider guard": 'provider_disabled' in callback and '!provider.is_enabled' in callback,
    "out events ignored only after signature verification": (
        'eventType === "out"' in callback and 'non_reward_event' in callback
        and callback.index('invalid_signature') < callback.index('eventType === "out"')
    ),
    "staging preflight covers RPC, grants and idempotency constraints": all(
        marker in (root / "supabase/verification/CPX_STAGING_PREFLIGHT.sql").read_text()
        for marker in ["CPX-01", "CPX-12", "process_cpx_reward", "provider_callbacks", "offer_completions", "idempotency_key"]
    ),
    "staging gate includes credit, duplicate, reversal and payout cases": all(
        marker in (root / "docs/CPX_AND_PAYOUT_STAGING_GATE.md").read_text()
        for marker in ["C09", "C10", "C11", "C12", "P01", "P23"]
    ),
    "member wall config still country scoped": '.eq("country_code", profile.country_code)' in wall,
    "service role not in client wall config": 'SUPABASE_SERVICE_ROLE_KEY' not in wall,
}
for name, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'}: {name}")
if not all(checks.values()):
    raise SystemExit(1)
print(f"{sum(checks.values())}/{len(checks)} CPX source checks passed")
