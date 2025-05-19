import CryptoJS from 'react-native-crypto-js';
import * as SecureStore from 'expo-secure-store';

// Тип данных для пароля
export interface Password {
  id: string;
  name: string;
  username: string;
  password: string;
  website?: string;
  notes?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
}

// Шифрование строки
export const encryptText = (text: string, masterPassword: string): string => {
  try {
    // Добавляем соль к мастер-паролю для большей безопасности
    const saltedPassword = masterPassword + 'pma_salt';
    return CryptoJS.AES.encrypt(text, saltedPassword).toString();
  } catch (error) {
    // console.error('Ошибка шифрования:', error);
    throw error;
  }
};

// Расшифровка строки
export const decryptText = (encryptedText: string, masterPassword: string): string => {
  try {
    // Используем ту же соль при расшифровке
    const saltedPassword = masterPassword + 'pma_salt';
    const bytes = CryptoJS.AES.decrypt(encryptedText, saltedPassword);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Не удалось расшифровать данные');
    }
    
    return decrypted;
  } catch (error) {
    // console.error('Ошибка расшифровки:', error);
    throw error;
  }
};

// Сохранение паролей в SecureStore
export const savePasswords = async (passwords: Password[], masterPassword: string): Promise<boolean> => {
  try {
    // console.log('Сохранение паролей:', passwords.length);
    const encryptedData = encryptText(JSON.stringify(passwords), masterPassword);
    await SecureStore.setItemAsync('passwords', encryptedData);
    // console.log('Пароли успешно зашифрованы и сохранены');
    return true;
  } catch (error) {
    // console.error('Ошибка сохранения паролей:', error);
    return false;
  }
};

// Загрузка паролей из SecureStore
export const loadPasswords = async (masterPassword: string): Promise<Password[]> => {
  try {
    // console.log('Загрузка паролей с PIN:', masterPassword);
    const encryptedData = await SecureStore.getItemAsync('passwords');
    if (!encryptedData) {
      // console.log('Зашифрованные данные не найдены');
      return [];
    }
    
    // console.log('Найдены зашифрованные данные, пытаемся расшифровать');
    const decryptedData = decryptText(encryptedData, masterPassword);
    if (!decryptedData) {
      // console.log('Не удалось расшифровать данные');
      return [];
    }
    
    const passwords = JSON.parse(decryptedData);
    // console.log('Успешно загружено паролей:', passwords.length);
    return passwords;
  } catch (error) {
    // console.error('Ошибка загрузки паролей:', error);
    return [];
  }
};

// Проверка надежности пароля
export const checkPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 8) return 'weak';
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  const score = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length;
  
  if (password.length >= 12 && score >= 3) return 'strong';
  if (password.length >= 8 && score >= 2) return 'medium';
  return 'weak';
};

// Генерация случайного пароля
export const generateRandomPassword = (length: number = 12, 
                                       includeUppercase: boolean = true, 
                                       includeLowercase: boolean = true, 
                                       includeNumbers: boolean = true, 
                                       includeSpecial: boolean = true): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
  
  let chars = '';
  if (includeUppercase) chars += uppercase;
  if (includeLowercase) chars += lowercase;
  if (includeNumbers) chars += numbers;
  if (includeSpecial) chars += special;
  
  if (chars === '') chars = lowercase + numbers;
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}; 