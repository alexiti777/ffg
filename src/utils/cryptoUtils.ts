import CryptoJS from 'react-native-crypto-js';

/**
 * Шифрует данные с использованием указанного ключа
 * @param data Строка для шифрования
 * @param key Ключ шифрования
 * @returns Зашифрованная строка
 */
export async function encrypt(data: string, key: string): Promise<string> {
  try {
    return CryptoJS.AES.encrypt(data, key).toString();
  } catch (error) {
    console.error('Ошибка шифрования данных:', error);
    throw error;
  }
}

/**
 * Расшифровывает данные с использованием указанного ключа
 * @param encryptedData Зашифрованная строка
 * @param key Ключ шифрования
 * @returns Расшифрованная строка
 */
export async function decrypt(encryptedData: string, key: string): Promise<string> {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedData) {
      throw new Error('Ошибка расшифровки: неверный ключ или поврежденные данные');
    }
    
    return decryptedData;
  } catch (error) {
    console.error('Ошибка расшифровки данных:', error);
    throw error;
  }
} 