import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text, DirectionalTextInput as TextInput } from './DirectionProvider';
import type { MemberProfile } from '../types/domain';
import { t } from '../services/i18n';
import { MEMBER_LANGUAGES, profileSettingsService, type MemberLanguage } from '../services/profile-settings.service';

type Props = {
  profile: MemberProfile;
  email: string;
  onSaved: (profile: MemberProfile) => void;
  onSignOut: () => void;
};

export function ProfileSettingsPanel({ profile, email, onSaved, onSignOut }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [selectedLanguage, setLanguage] = useState<MemberLanguage>(
    MEMBER_LANGUAGES.some((item) => item.code === profile.preferred_language)
      ? profile.preferred_language as MemberLanguage : 'en',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setDisplayName(profile.display_name || '');
    setLanguage(MEMBER_LANGUAGES.some((item) => item.code === profile.preferred_language)
      ? profile.preferred_language as MemberLanguage : 'en');
  }, [profile.id, profile.display_name, profile.preferred_language]);

  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await profileSettingsService.update({ displayName, language: selectedLanguage });
      onSaved(updated);
      setNotice(t(selectedLanguage, 'saved'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save your profile settings.');
    } finally { setBusy(false); }
  }

  return <View style={st.wrap}>
    <Text style={st.title}>{t(selectedLanguage, 'profileSettings')}</Text>
    <Text style={st.sub}>{t(selectedLanguage, 'profileHelp')}</Text>

    <View style={st.card}>
      <Text style={st.label}>{t(selectedLanguage, 'fullName')}</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} maxLength={80}
        autoCapitalize="words" autoCorrect={false} placeholder={t(selectedLanguage, 'fullName')} style={st.input}/>
      <Text style={st.hint}>{t(selectedLanguage, 'nameHint')}</Text>

      <Text style={st.label}>{t(selectedLanguage, 'preferredLanguage')}</Text>
      <View style={st.languages}>
        {MEMBER_LANGUAGES.map((item) => <TouchableOpacity key={item.code}
          accessibilityRole="button" accessibilityState={{ selected: selectedLanguage === item.code }}
          onPress={() => setLanguage(item.code)} style={[st.language, selectedLanguage === item.code && st.languageActive]}>
          <Text style={[st.languageselectedLanguage === item.code && st.languageTextActive]}>{item.label}</Text>
        </TouchableOpacity>)}
      </View>
      <TouchableOpacity disabled={busy} onPress={() => void save()} style={[st.primary, busy && st.disabled]}>
        {busy ? <ActivityIndicator color="#FFF"/> : <Text style={st.primaryText}>{t(selectedLanguage, 'saveChanges')}</Text>}
      </TouchableOpacity>
      {!!error && <Text accessibilityRole="alert" style={st.error}>{error}</Text>}
      {!!notice && <Text style={st.success}>{notice}</Text>}
    </View>

    <View style={st.card}>
      <Text style={st.section}>{t(selectedLanguage, 'accountInfo')}</Text>
      <Info label={t(selectedLanguage, 'email')} value={email || '—'}/>
      <Info label={'Country'} value={profile.country_code === 'NG' ? t(selectedLanguage, 'nigeria') : profile.country_code === 'US' ? t(selectedLanguage, 'usa') : '—'}/>
      <Info label={'Account status'} value={profile.status || '—'}/>
      <Text style={st.hint}>{t(selectedLanguage, 'emailCountryReadOnly')}</Text>
    </View>

    <TouchableOpacity onPress={onSignOut} style={st.signOut}><Text style={st.signOutText}>{t(selectedLanguage, 'signOut')}</Text></TouchableOpacity>
  </View>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={st.infoRow}><Text style={st.infoLabel}>{label}</Text><Text style={st.infoValue}>{value}</Text></View>;
}

const st = StyleSheet.create({
  wrap:{gap:13}, title:{color:'#191C38',fontSize:20,fontWeight:'900'}, sub:{color:'#858BA0',fontSize:11,lineHeight:16},
  card:{backgroundColor:'#FFF',borderRadius:16,padding:15,borderWidth:1,borderColor:'#E8EAF3',gap:10},
  label:{color:'#313750',fontSize:12,fontWeight:'800'}, input:{backgroundColor:'#FAFAFE',borderWidth:1,borderColor:'#DDE1EF',borderRadius:11,paddingHorizontal:12,paddingVertical:12,color:'#222641'},
  hint:{color:'#9298AC',fontSize:10,lineHeight:15}, languages:{flexDirection:'row',flexWrap:'wrap',gap:7},
  language:{borderWidth:1,borderColor:'#E0E3EF',borderRadius:10,paddingHorizontal:10,paddingVertical:9,backgroundColor:'#FAFAFE'},
  languageActive:{borderColor:'#5558E8',backgroundColor:'#EEF0FF'},languageText:{color:'#646A80',fontSize:11,fontWeight:'700'},languageTextActive:{color:'#4144C1'},
  primary:{backgroundColor:'#5558E8',borderRadius:12,padding:14,alignItems:'center',marginTop:3},disabled:{opacity:.6},primaryText:{color:'#FFF',fontWeight:'900',fontSize:12},
  error:{color:'#B42318',fontSize:11},success:{color:'#16794A',fontSize:11,fontWeight:'700'},section:{color:'#222641',fontSize:14,fontWeight:'900'},
  infoRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#EFF0F5',flexDirection:'row',justifyContent:'space-between',gap:10},infoLabel:{color:'#858BA0',fontSize:11},infoValue:{color:'#272A45',fontWeight:'800',fontSize:11,flexShrink:1,textAlign:'right'},
  signOut:{borderWidth:1,borderColor:'#E7BABA',borderRadius:12,padding:13,alignItems:'center'},signOutText:{color:'#A32929',fontSize:12,fontWeight:'900'},
});
