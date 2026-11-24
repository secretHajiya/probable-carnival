import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(root, 'apps/mobile/App.tsx'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'apps/mobile/src/components/ProfileSettingsPanel.tsx'), 'utf8');
const service = fs.readFileSync(path.join(root, 'apps/mobile/src/services/profile-settings.service.ts'), 'utf8');

assert.match(app, /import \{ ProfileSettingsPanel \}/);
assert.match(app, /tab === 'Profile' && <ProfileSettingsPanel/);
assert.match(panel, /t\(selectedLanguage, 'fullName'\)/);
assert.match(panel, /t\(selectedLanguage, 'preferredLanguage'\)/);
assert.match(panel, /t\(selectedLanguage, 'accountInfo'\)/);
assert.match(panel, /t\(selectedLanguage, 'email'\)/);
assert.match(panel, /Country/);
assert.match(panel, /Account status/);
assert.match(panel, /t\(selectedLanguage, 'saveChanges'\)/);
assert.match(panel, /t\(selectedLanguage, 'signOut'\)/);
assert.match(service, /display_name: displayName, preferred_language: input\.language/);
assert.match(service, /\.eq\('id', user\.id\)/);
assert.match(service, /Name must contain between 2 and 80 characters/);
assert.match(service, /Choose a supported language/);
assert.doesNotMatch(service, /country_code\s*:/, 'Profile editor must not directly update country');
assert.match(service, /set_member_country|Country is\s+deliberately excluded/);
console.log('Step49 mobile profile settings contract: 14/14 passed');
