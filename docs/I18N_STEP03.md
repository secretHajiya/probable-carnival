# Step 03 — Member language foundation

Nine member locales: English, Arabic, French, Spanish, Portuguese, German, Turkish,
Hindi and Chinese. Hausa remains excluded from member locales; admin English/Hausa
is separate.

`messages.json` contains keyed dictionaries. `index.ts` provides typed keys, locale
normalization, interpolation and RTL helpers. `useI18n.ts` updates document language
and direction. Missing keys fall back to English.

All components must use `t('namespace.key')`; never rewrite arbitrary DOM text.
Persist language to the authenticated profile and use auth metadata as fallback.

STATUS: foundation created. Legacy App.tsx integration and browser verification are
still pending; this step is not yet fully complete.
