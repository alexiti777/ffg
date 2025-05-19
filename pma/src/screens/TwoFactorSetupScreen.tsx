import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { OtpInput } from 'react-native-otp-entry';
import {
  generateSecret,
  generateTotpUri,
  saveSecret,
  verifyOtp,
  disableTwoFactor,
  isTwoFactorEnabled,
  generateToken
} from '../utils/otpUtils';

interface TwoFactorSetupScreenProps {
  onBackPress: () => void;
}

export default function TwoFactorSetupScreen({ onBackPress }: TwoFactorSetupScreenProps) {
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [username, setUsername] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);

  useEffect(() => {
    checkTwoFactorStatus();
    getUserInfo();
  }, []);

  const checkTwoFactorStatus = async () => {
    const status = await isTwoFactorEnabled();
    setEnabled(status);
    setLoading(false);
    
    if (!status) {
      generateNewSecret();
    }
  };
  
  const getUserInfo = async () => {
    try {
      // В реальном приложении получаем данные пользователя из хранилища
      const email = await SecureStore.getItemAsync('user_email') || '';
      setUsername(email || 'user@example.com');
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
    }
  };

  const generateNewSecret = async () => {
    try {
      const newSecret = generateSecret();
      setSecret(newSecret);
      
      const uri = generateTotpUri(newSecret, username, 'PasswordManager');
      setQrValue(uri);
    } catch (error) {
      console.error('Ошибка генерации секрета:', error);
      Alert.alert('Ошибка', 'Не удалось сгенерировать секретный ключ');
    }
  };

  const handleVerify = async () => {
    if (otpCode.trim() === '' || otpCode.length !== 6) {
      Alert.alert('Ошибка', 'Пожалуйста, введите корректный 6-значный код');
      return;
    }

    try {
      const isValid = verifyOtp(otpCode, secret);
      
      if (isValid) {
        await saveSecret(secret);
        setEnabled(true);
        Alert.alert('Успех', 'Двухфакторная аутентификация успешно активирована');
      } else {
        Alert.alert('Ошибка', 'Неверный код подтверждения');
      }
    } catch (error) {
      console.error('Ошибка проверки OTP:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при проверке кода');
    } finally {
      setOtpCode('');
    }
  };

  const handleDisable = async () => {
    try {
      const result = await disableTwoFactor();
      
      if (result) {
        setEnabled(false);
        generateNewSecret();
        setShowDisableModal(false);
        Alert.alert('Успех', 'Двухфакторная аутентификация отключена');
      } else {
        Alert.alert('Ошибка', 'Не удалось отключить двухфакторную аутентификацию');
      }
    } catch (error) {
      console.error('Ошибка отключения 2FA:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при отключении двухфакторной аутентификации');
    }
  };

  // Для тестирования - показывает текущий код
  const showCurrentToken = () => {
    if (!secret) return;
    
    const token = generateToken(secret);
    Alert.alert('Текущий код', token);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#F06292" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Двухфакторная аутентификация</Text>
      </View>

      {enabled ? (
        <View style={styles.enabledContainer}>
          <View style={styles.statusCard}>
            <Ionicons name="shield-checkmark" size={60} color="#4CAF50" />
            <Text style={styles.statusTitle}>Двухфакторная аутентификация включена</Text>
            <Text style={styles.statusDescription}>
              Ваш аккаунт защищен дополнительным слоем безопасности. При входе в приложение вам потребуется ввести код из приложения аутентификатора.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.disableButton]} 
            onPress={() => setShowDisableModal(true)}
          >
            <Text style={styles.disableButtonText}>Отключить</Text>
          </TouchableOpacity>

          {/* Для тестирования */}
          <TouchableOpacity 
            style={[styles.button, styles.testButton]} 
            onPress={showCurrentToken}
          >
            <Text style={styles.testButtonText}>Показать текущий код (для тестирования)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.setupContainer}>
          <Text style={styles.instructionTitle}>Настройка двухфакторной аутентификации</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Установите приложение аутентификатора
              </Text>
              <Text style={styles.stepDescription}>
                Если у вас ещё нет приложения аутентификатора, установите Google Authenticator, Microsoft Authenticator или Authy
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Отсканируйте QR-код
              </Text>
              <Text style={styles.stepDescription}>
                Откройте приложение аутентификатора и отсканируйте этот QR-код
              </Text>
              
              <View style={styles.qrContainer}>
                {qrValue ? (
                  <QRCode
                    value={qrValue}
                    size={200}
                    color="#000"
                    backgroundColor="#fff"
                  />
                ) : (
                  <ActivityIndicator size="large" color="#F06292" />
                )}
              </View>
              
              <Text style={styles.secretText}>
                Или введите этот ключ вручную: {secret}
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Введите 6-значный код из приложения
              </Text>
              <View style={styles.otpInputWrapper}>
                <OtpInput
                  numberOfDigits={6}
                  onTextChange={setOtpCode}
                  focusColor="#F06292"
                  focusStickBlinkingDuration={500}
                  autoFocus
                  theme={{
                    containerStyle: styles.otpInputContainer,
                    inputsContainerStyle: styles.otpInputsContainer,
                    pinCodeContainerStyle: styles.otpDigitContainer,
                    pinCodeTextStyle: styles.otpDigitText,
                    focusStickStyle: styles.otpFocusStick,
                  }}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleVerify}
              >
                <Text style={styles.buttonText}>Подтвердить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={showDisableModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDisableModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={50} color="#FFC107" />
            <Text style={styles.modalTitle}>Отключить двухфакторную аутентификацию?</Text>
            <Text style={styles.modalDescription}>
              Отключение двухфакторной аутентификации сделает ваш аккаунт менее защищенным.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowDisableModal(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleDisable}
              >
                <Text style={styles.confirmButtonText}>Отключить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  enabledContainer: {
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#E8F5E9',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 20,
  },
  setupContainer: {
    
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F06292',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    alignSelf: 'center',
  },
  secretText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  otpInputWrapper: {
    marginBottom: 16,
  },
  otpInputContainer: {
    width: '100%',
  },
  otpInputsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpDigitContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    width: 45,
    height: 55,
  },
  otpDigitText: {
    fontSize: 24,
    color: '#333',
  },
  otpFocusStick: {
    backgroundColor: '#F06292',
    height: 2,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#F06292',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disableButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    marginTop: 16,
  },
  disableButtonText: {
    color: '#F44336',
  },
  testButton: {
    backgroundColor: '#f5f5f5',
    marginTop: 16,
  },
  testButtonText: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButton: {
    marginLeft: 8,
    backgroundColor: '#F44336',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 