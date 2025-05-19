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
import { loadPasswords, savePasswords } from '../utils/passwordUtils';

interface ChangePinScreenProps {
  onBackPress: () => void;
  onSuccess: () => void;
}

export default function ChangePinScreen({ onBackPress, onSuccess }: ChangePinScreenProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChangePin = async () => {
    if (!newPin.trim() || !confirmPin.trim()) {
      setErrorMessage('Пожалуйста, введите PIN-код');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('PIN-коды не совпадают');
      return;
    }

    if (newPin.length !== 4) {
      setErrorMessage('PIN-код должен состоять из 4 цифр');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setErrorMessage('PIN-код должен содержать только цифры');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const currentPin = await SecureStore.getItemAsync('pin_code');
      if (!currentPin) {
        throw new Error('Текущий PIN-код не найден');
      }

      // Загружаем пароли со старым PIN-кодом
      const passwords = await loadPasswords(currentPin);
      console.log('Загружено паролей:', passwords.length);
      
      // Сохраняем новый PIN-код
      await SecureStore.setItemAsync('pin_code', newPin);
      await SecureStore.setItemAsync('master_password', newPin);
      
      // Сохраняем пароли с новым PIN-кодом
      if (passwords.length > 0) {
        const success = await savePasswords(passwords, newPin);
        if (!success) {
          throw new Error('Не удалось сохранить пароли');
        }
        console.log('Пароли успешно сохранены с новым PIN-кодом');
      }
      
      Alert.alert('Успех', 'PIN-код успешно изменен');
      onSuccess();
    } catch (error) {
      console.error('Ошибка изменения PIN-кода:', error);
      setErrorMessage('Не удалось изменить PIN-код');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Изменение PIN-кода</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Введите новый PIN-код и подтвердите его
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Новый PIN-код"
          value={newPin}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, '');
            setNewPin(numericText.slice(0, 4));
          }}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Подтвердите PIN-код"
          value={confirmPin}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, '');
            setConfirmPin(numericText.slice(0, 4));
          }}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleChangePin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Изменить PIN-код</Text>
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