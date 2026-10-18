import React from 'react';
import { View, Text } from 'react-native';

export default function CpxOfferwall({ user }) {
  return (
    <View style={{ height: 100, backgroundColor: '#f0f0ff', justifyContent: 'center', alignItems: 'center', margin: 10, borderRadius: 8 }}>
      <Text style={{ color: '#6a00f4', fontWeight: 'bold' }}>CPX Safe Mode - Test</Text>
      <Text style={{ fontSize: 10 }}>Phone: {user?.phone || 'ok'}</Text>
    </View>
  );
                 }
