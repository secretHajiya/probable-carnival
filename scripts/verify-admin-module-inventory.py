from pathlib import Path
import re, sys

root = Path(__file__).resolve().parents[1]
main = (root / 'apps/admin/src/main.tsx').read_text()
features = root / 'apps/admin/src/features'
modules = {
    'Finance': 'finance/finance.ts',
    'Members': 'members/members.ts',
    'Security': 'security/security.ts',
    'Fraud': 'fraud/fraud.ts',
    'Country/currency': 'settings/countryCurrency.ts',
    'Reward providers': 'providers/providerManagement.ts',
    'LevelPlay': 'rewards/AdminLevelPlay.tsx',
    'Spin & Win': 'rewards/AdminSpinWheel.tsx',
    'Quiz rewards': 'rewards/AdminQuizRewards.tsx',
}
failures = []
for label, rel in modules.items():
    p = features / rel
    if not p.is_file():
        failures.append(f'MISSING module: {label} ({rel})')
        continue
    if label in ('LevelPlay', 'Spin & Win', 'Quiz rewards'):
        symbol = {'LevelPlay':'AdminLevelPlay','Spin & Win':'AdminSpinWheel','Quiz rewards':'AdminQuizRewards'}[label]
        if symbol not in main:
            failures.append(f'NOT ROUTED: {label}')
    print(f'PASS module present: {label}')

# Check the security gate is wired and fail-closed.
if "rpc('is_active_admin')" not in main or "setAdminGate(!error && data === true ? 'allowed' : 'denied')" not in main:
    failures.append('Admin access gate missing or not fail-closed')
else:
    print('PASS fail-closed admin gate wired')

# Ensure sensitive payout detail is fetched via the Worker, not a direct table read.
if 'PAYOUT_DETAILS_WORKER_URL' not in main or 'v1/admin/payout-details/' not in main:
    failures.append('Secure payout Worker integration missing')
else:
    print('PASS payout detail retrieval uses Worker endpoint')

if failures:
    for f in failures: print('FAIL', f)
    sys.exit(1)
print(f'\nAdmin module inventory passed: {len(modules)+2} checks')
