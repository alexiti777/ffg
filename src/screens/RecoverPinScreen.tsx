import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import ChangePinScreen from './ChangePinScreen';
import { loadPasswords, savePasswords } from '../utils/passwordUtils';

interface RecoverPinScreenProps {
  onBackPress: () => void;
  onSuccess: () => void;
}

export default function RecoverPinScreen({ onBackPress, onSuccess }: RecoverPinScreenProps) {
  const [secretPhrase, setSecretPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showChangePin, setShowChangePin] = useState(false);

  const handleRecover = async () => {
    if (!secretPhrase.trim()) {
      setErrorMessage('Пожалуйста, введите секретную фразу');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const storedRecoveryPhrase = await SecureStore.getItemAsync('recovery_phrase');
      const storedPin = await SecureStore.getItemAsync('pin_code');

      if (!storedRecoveryPhrase || !storedPin) {
        setErrorMessage('Данные для восстановления не найдены');
        return;
      }

      if (secretPhrase.trim() !== storedRecoveryPhrase) {
        setErrorMessage('Неверная секретная фраза');
        return;
      }

      // Загружаем пароли со старым PIN-кодом
      const passwords = await loadPasswords(storedPin);
      console.log('Загружено паролей:', passwords.length);
      
      // Устанавливаем мастер-пароль
      await SecureStore.setItemAsync('master_password', storedPin);
      
      // Сохраняем пароли с восстановленным PIN-кодом
      if (passwords.length > 0) {
        const success = await savePasswords(passwords, storedPin);
        if (!success) {
          throw new Error('Не удалось сохранить пароли');
        }
        console.log('Пароли успешно сохранены с восстановленным PIN-кодом');
      }
      
      // Предлагаем изменить PIN-код
      Alert.alert(
        'Восстановление успешно',
        'Хотите изменить PIN-код?',
        [
          {
            text: 'Нет',
            style: 'cancel',
            onPress: () => onSuccess()
          },
          {
            text: 'Да',
            onPress: () => setShowChangePin(true)
          }
        ]
      );
    } catch (error) {
      console.error('Ошибка восстановления:', error);
      setErrorMessage('Произошла ошибка при восстановлении');
    } finally {
      setLoading(false);
    }
  };

  if (showChangePin) {
    return (
      <ChangePinScreen
        onBackPress={() => setShowChangePin(false)}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Восстановление PIN-кода</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Введите секретную фразу, которую вы указали при создании PIN-кода
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Секретная фраза"
          value={secretPhrase}
          onChangeText={setSecretPhrase}
          secureTextEntry
          autoCapitalize="none"
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRecover}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Восстановить</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#F06292',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
}); 