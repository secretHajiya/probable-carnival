import React, { createContext, useContext } from 'react';
import { Text as NativeText, TextInput as NativeTextInput, View } from 'react-native';

export function isRTL(language: string | null | undefined): boolean {
  return language === 'ar';
}

const DirectionContext = createContext(false);

export function DirectionProvider({ rtl, children }: { rtl: boolean; children: React.ReactNode }) {
  return (
    <DirectionContext.Provider value={rtl}>
      <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>{children}</View>
    </DirectionContext.Provider>
  );
}

export function DirectionalText(props: React.ComponentProps<typeof NativeText>) {
  const rtl = useContext(DirectionContext);
  return <NativeText {...props} style={[rtl ? { writingDirection: 'rtl', textAlign: 'right' } : undefined, props.style]} />;
}

export function DirectionalTextInput(props: React.ComponentProps<typeof NativeTextInput>) {
  const rtl = useContext(DirectionContext);
  return <NativeTextInput {...props} style={[rtl ? { writingDirection: 'rtl', textAlign: 'right' } : undefined, props.style]} />;
}
