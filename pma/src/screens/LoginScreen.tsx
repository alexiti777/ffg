import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { OtpInput } from 'react-native-otp-entry';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onRecoverPress: () => void;
}

export default function LoginScreen({ onLoginSuccess, onRecoverPress }: LoginScreenProps) {
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstLogin, setFirstLogin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'pin' | 'confirm' | 'secret'>('pin');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [secretPhrase, setSecretPhrase] = useState('');
  const [confirmSecretPhrase, setConfirmSecretPhrase] = useState('');
  
  useEffect(() => {
    checkFirstLogin();
  }, []);
  
  // Обработка изменения ПИН-кода
  useEffect(() => {
    if (step === 'pin' && pinCode.length === 4) {
      if (firstLogin) {
        setStep('confirm');
        setConfirmPin('');
        setResetKey(prev => prev + 1);
      } else {
        verifyPin();
      }
    }
  }, [pinCode, firstLogin, step]);
  
  // Обработка изменения подтверждения ПИН-кода
  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === 4) {
      verifyConfirmPin();
    }
  }, [confirmPin]);
  
  const checkFirstLogin = async () => {
    const hasPin = await SecureStore.getItemAsync('pin_code');
    setFirstLogin(!hasPin);
    // console.log('Проверка первого входа. PIN установлен:', !!hasPin);
  };
  
  const verifyPin = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const storedPin = await SecureStore.getItemAsync('pin_code');
      
      if (pinCode !== storedPin) {
        setErrorMessage('Неверный ПИН-код');
        setPinCode('');
        setResetKey(prev => prev + 1);
        return;
      }
      
      await SecureStore.setItemAsync('master_password', pinCode);
      onLoginSuccess();
    } catch (error) {
      console.error('Ошибка входа:', error);
      setErrorMessage('Произошла ошибка при входе');
      setResetKey(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };
  
  const verifyConfirmPin = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      if (pinCode !== confirmPin) {
        setErrorMessage('ПИН-коды не совпадают');
        setStep('pin');
        setPinCode('');
        setConfirmPin('');
        setResetKey(prev => prev + 1);
        return;
      }
      
      await SecureStore.setItemAsync('pin_code', pinCode);
      await SecureStore.setItemAsync('master_password', pinCode);
      
      // После установки PIN-кода переходим к установке секретной фразы
      setStep('secret');
      setSecretPhrase('');
      setConfirmSecretPhrase('');
    } catch (error) {
      console.error('Ошибка создания ПИН-кода:', error);
      setErrorMessage('Произошла ошибка при создании ПИН-кода');
      setResetKey(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSecretPhraseConfirm = async () => {
    if (!secretPhrase.trim() || !confirmSecretPhrase.trim()) {
      setErrorMessage('Введите секретную фразу');
      return;
    }

    if (secretPhrase !== confirmSecretPhrase) {
      setErrorMessage('Секретные фразы не совпадают');
      return;
    }

    try {
      await SecureStore.setItemAsync('recovery_phrase', secretPhrase);
      onLoginSuccess();
    } catch (error) {
      console.error('Ошибка сохранения секретной фразы:', error);
      setErrorMessage('Произошла ошибка при сохранении секретной фразы');
    }
  };
  
  const handlePinChange = (value: string) => {
    setPinCode(value);
    setErrorMessage(null);
  };
  
  const handleConfirmPinChange = (value: string) => {
    setConfirmPin(value);
    setErrorMessage(null);
  };
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={80} color="#F06292" />
          </View>
          
          <Text style={styles.title}>
            {firstLogin 
              ? (step === 'pin' 
                  ? 'Создайте ПИН-код' 
                  : step === 'confirm'
                    ? 'Подтвердите ПИН-код'
                    : 'Создайте секретную фразу')
              : 'Введите ПИН-код'}
          </Text>
          
          <Text style={styles.description}>
            {firstLogin 
              ? (step === 'pin' 
                  ? 'Введите 4 цифры для защиты вашего приложения'
                  : step === 'confirm'
                    ? 'Повторите введенный ПИН-код'
                    : 'Введите секретную фразу для восстановления доступа')
              : 'Введите ваш 4-значный ПИН-код'}
          </Text>
          
          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          
          {step === 'pin' && (
            <View style={styles.pinContainer}>
              <OtpInput
                key={resetKey}
                numberOfDigits={4}
                onTextChange={handlePinChange}
                focusColor="#F06292"
                focusStickBlinkingDuration={500}
                autoFocus
                secureTextEntry
                theme={{
                  containerStyle: styles.otpInputContainer,
                  inputsContainerStyle: styles.otpInputsContainer,
                  pinCodeContainerStyle: styles.otpDigitContainer,
                  pinCodeTextStyle: styles.otpDigitText,
                  focusStickStyle: styles.otpFocusStick,
                }}
              />
            </View>
          )}
          
          {step === 'confirm' && (
            <View style={styles.pinContainer}>
              <OtpInput
                key={resetKey}
                numberOfDigits={4}
                onTextChange={handleConfirmPinChange}
                focusColor="#F06292"
                focusStickBlinkingDuration={500}
                autoFocus
                secureTextEntry
                theme={{
                  containerStyle: styles.otpInputContainer,
                  inputsContainerStyle: styles.otpInputsContainer,
                  pinCodeContainerStyle: styles.otpDigitContainer,
                  pinCodeTextStyle: styles.otpDigitText,
                  focusStickStyle: styles.otpFocusStick,
                }}
              />
            </View>
          )}
          
          {step === 'secret' && (
            <View style={styles.secretContainer}>
              <TextInput
                style={styles.input}
                value={secretPhrase}
                onChangeText={setSecretPhrase}
                placeholder="Секретная фраза"
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={confirmSecretPhrase}
                onChangeText={setConfirmSecretPhrase}
                placeholder="Подтвердите секретную фразу"
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.button}
                onPress={handleSecretPhraseConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Далее</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {step === 'pin' && !firstLogin && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  // console.log('Кнопка "Забыли PIN-код?" нажата');
                  onRecoverPress();
                }}
              >
                <Text style={styles.buttonText}>Забыли PIN-код?</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {(step === 'confirm' || step === 'secret') && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 'confirm') {
                  setStep('pin');
                  setConfirmPin('');
                  setPinCode('');
                } else {
                  setStep('confirm');
                  setSecretPhrase('');
                  setConfirmSecretPhrase('');
                }
                setErrorMessage(null);
                setResetKey(prev => prev + 1);
              }}
            >
              <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
          )}
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F06292" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  pinContainer: {
    width: '100%',
    marginBottom: 20,
  },
  secretContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#F06292',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 15,
  },
  backButtonText: {
    color: '#F06292',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInputContainer: {
    width: '100%',
  },
  otpInputsContainer: {
    justifyContent: 'space-between',
    width: '100%',
  },
  otpDigitContainer: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  otpDigitText: {
    fontSize: 20,
  },
  otpFocusStick: {
    backgroundColor: '#F06292',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
}); 