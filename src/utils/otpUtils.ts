import OTP from 'react-native-otp';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'react-native-crypto-js';

// Генерация секретного ключа для TOTP
export const generateSecret = (): string => {
  // Создаем случайную строку из 16 символов
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

// Создание строки URI для отображения в QR-коде
export const generateTotpUri = (secret: string, account: string, issuer: string = 'PasswordManager'): string => {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
};

// Сохранение секретного ключа в SecureStore
export const saveSecret = async (secret: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync('otp_secret', secret);
    return true;
  } catch (error) {
    console.error('Ошибка сохранения секретного ключа:', error);
    return false;
  }
};

// Загрузка секретного ключа из SecureStore
export const loadSecret = async (): Promise<string | null> => {
  try {
    const secret = await SecureStore.getItemAsync('otp_secret');
    return secret;
  } catch (error) {
    console.error('Ошибка загрузки секретного ключа:', error);
    return null;
  }
};

// Проверка OTP
export const verifyOtp = (token: string, secret: string): boolean => {
  try {
    const currentToken = generateToken(secret);
    return token === currentToken;
  } catch (error) {
    console.error('Ошибка проверки OTP:', error);
    return false;
  }
};

// Генерация OTP (для тестирования)
export const generateToken = (secret: string): string => {
  try {
    // Получаем текущее время в секундах и делим на 30 (стандартный период для TOTP)
    const counter = Math.floor(Date.now() / 1000 / 30);
    return OTP.generate(secret, counter.toString());
  } catch (error) {
    console.error('Ошибка генерации OTP:', error);
    return '';
  }
};

// Проверка, настроена ли двухфакторная аутентификация
export const isTwoFactorEnabled = async (): Promise<boolean> => {
  const secret = await loadSecret();
  return !!secret;
};

// Удаление двухфакторной аутентификации
export const disableTwoFactor = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync('otp_secret');
    return true;
  } catch (error) {
    console.error('Ошибка удаления двухфакторной аутентификации:', error);
    return false;
  }
}; 