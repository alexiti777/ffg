import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import MainApp from './src/MainApp';

export default function App() {
  return (
    <SafeAreaProvider style={styles.safeAreaView}>
      <StatusBar style="dark" />
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeAreaView:{
    flex: 1,
    marginTop: 30
  }
});
