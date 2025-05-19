import * as SecureStore from 'expo-secure-store';
// @ts-ignore - импорт работает правильно в рантайме, ошибка только в линтере
import { encrypt, decrypt } from './cryptoUtils';
// @ts-ignore - импорт библиотеки jssha
import jsSHA from 'jssha';

// Константа для хранения кодов аутентификации в SecureStore
export const AUTH_CODES_KEY = 'auth_codes';

// Интерфейс для кодов аутентификации
export interface AuthCode {
  id: string;
  name: string; // имя аккаунта
  issuer: string; // название сервиса
  secret: string; // секретный ключ для OTP
  createdAt: number;
  favorite: boolean;
}

// Интерфейс для данных из QR-кода
interface ParsedOtpData {
  secret: string;
  issuer?: string;
  account?: string;
}

/**
 * Парсит URI OTP (например, otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example)
 * @param uri URI OTP, полученный из QR-кода
 * @returns Распарсенные данные или null, если URI не соответствует формату
 */
export function parseOtpAuthUri(uri: string): ParsedOtpData | null {
  try {
    console.log("Сканированный URI:", uri);
    
    // Проверяем, соответствует ли URL формату OTP
    if (!uri.startsWith('otpauth://totp/')) {
      console.log("URI не начинается с otpauth://totp/");
      return null;
    }
    
    // Извлекаем части URI
    const secretMatch = uri.match(/[?&]secret=([^&]*)/);
    const issuerMatch = uri.match(/[?&]issuer=([^&]*)/);
    
    // Проверяем наличие секрета
    if (!secretMatch || !secretMatch[1]) {
      console.log("Секрет не найден в URI");
      return null;
    }
    
    const secret = secretMatch[1];
    
    // Получаем issuer и account из пути
    const pathPart = uri.split('?')[0].substring('otpauth://totp/'.length);
    console.log("Путь:", pathPart);
    
    let issuer: string | undefined;
    let account: string | undefined;
    
    if (issuerMatch && issuerMatch[1]) {
      issuer = issuerMatch[1];
    }
    
    if (pathPart.includes(':')) {
      const parts = pathPart.split(':');
      if (!issuer) {
        issuer = parts[0];
      }
      account = parts[1];
    } else {
      account = pathPart;
    }
    
    console.log("Извлеченные данные:", { secret, issuer, account });
    
    return {
      secret,
      issuer,
      account
    };
  } catch (error) {
    console.error('Ошибка при парсинге OTP URI:', error);
    return null;
  }
}

/**
 * Загружает коды аутентификации из SecureStore
 * @param masterPassword Мастер-пароль для расшифровки
 * @returns Массив кодов аутентификации
 */
export async function loadAuthCodes(masterPassword: string): Promise<AuthCode[]> {
  try {
    const encryptedData = await SecureStore.getItemAsync(AUTH_CODES_KEY);
    
    if (!encryptedData) {
      return [];
    }
    
    const decryptedData = await decrypt(encryptedData, masterPassword);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Ошибка при загрузке кодов аутентификации:', error);
    return [];
  }
}

/**
 * Сохраняет коды аутентификации в SecureStore
 * @param authCodes Массив кодов аутентификации
 * @param masterPassword Мастер-пароль для шифрования
 * @returns Успешно ли сохранены коды
 */
export async function saveAuthCodes(authCodes: AuthCode[], masterPassword: string): Promise<boolean> {
  try {
    const data = JSON.stringify(authCodes);
    const encryptedData = await encrypt(data, masterPassword);
    
    await SecureStore.setItemAsync(AUTH_CODES_KEY, encryptedData);
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении кодов аутентификации:', error);
    return false;
  }
}

/**
 * Добавляет новый код аутентификации
 * @param parsedData Данные, полученные из QR-кода
 * @param masterPassword Мастер-пароль для шифрования
 * @returns Успешно ли добавлен код
 */
export async function addAuthCode(parsedData: ParsedOtpData, masterPassword: string): Promise<boolean> {
  try {
    const authCodes = await loadAuthCodes(masterPassword);
    
    // Проверка на дубликат (по секретному ключу)
    const isDuplicate = authCodes.some(code => code.secret === parsedData.secret);
    
    if (isDuplicate) {
      console.warn('Код аутентификации с таким секретным ключом уже существует');
      return false;
    }
    
    // Создаем новый код аутентификации
    const newAuthCode: AuthCode = {
      id: `auth_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: parsedData.account || 'Неизвестно',
      issuer: parsedData.issuer || 'Неизвестно',
      secret: parsedData.secret,
      createdAt: Date.now(),
      favorite: false
    };
    
    // Добавляем новый код и сохраняем
    const updatedAuthCodes = [...authCodes, newAuthCode];
    return await saveAuthCodes(updatedAuthCodes, masterPassword);
  } catch (error) {
    console.error('Ошибка при добавлении кода аутентификации:', error);
    return false;
  }
}

/**
 * Удаляет код аутентификации
 * @param id Идентификатор кода для удаления
 * @param masterPassword Мастер-пароль для расшифровки/шифрования
 * @returns Успешно ли удален код
 */
export async function deleteAuthCode(id: string, masterPassword: string): Promise<boolean> {
  try {
    const authCodes = await loadAuthCodes(masterPassword);
    
    const updatedAuthCodes = authCodes.filter(code => code.id !== id);
    
    // Если количество кодов не изменилось, значит, код с таким ID не был найден
    if (authCodes.length === updatedAuthCodes.length) {
      console.warn('Код аутентификации с таким ID не найден');
      return false;
    }
    
    return await saveAuthCodes(updatedAuthCodes, masterPassword);
  } catch (error) {
    console.error('Ошибка при удалении кода аутентификации:', error);
    return false;
  }
}

/**
 * Генерирует текущий TOTP-код на основе секретного ключа
 * @param secret Секретный ключ в формате Base32
 * @returns Сгенерированный TOTP-код
 */
export function generateAuthCode(secret: string): string {
  try {
    if (!secret) return '------';
    
    // Стандартная реализация TOTP по RFC 6238 (Google Authenticator)
    
    // 1. Декодируем Base32-секрет в бинарный формат
    const key = base32ToHex(secret);
    
    // 2. Получаем текущее время и рассчитываем временной счетчик (30-секундные интервалы)
    const now = Math.floor(Date.now() / 1000);
    const timeStep = 30; // стандартный период в секундах
    const timeCounter = Math.floor(now / timeStep);
    
    // 3. Преобразуем счетчик в 8-байтовую строку в hex-формате
    const timeHex = decToHex(timeCounter);
    
    // 4. Вычисляем HMAC-SHA1 с использованием библиотеки jssha
    const shaObj = new jsSHA("SHA-1", "HEX");
    shaObj.setHMACKey(key, "HEX");
    shaObj.update(timeHex);
    const hmac = shaObj.getHMAC("HEX");
    
    // 5. Извлекаем 6-значный код по алгоритму TOTP
    const offset = parseInt(hmac.substring(hmac.length - 1), 16);
    const truncatedHash = hmac.substring(offset * 2, offset * 2 + 8);
    const codeInt = parseInt(truncatedHash, 16) & 0x7FFFFFFF;
    const code = (codeInt % 1000000).toString().padStart(6, '0');
    
    return code;
  } catch (error) {
    console.error('Ошибка при генерации кода аутентификации:', error);
    return '------';
  }
}

/**
 * Преобразует число в шестнадцатеричную строку
 */
function decToHex(dec: number): string {
  return ('0000000000000000' + dec.toString(16)).slice(-16);
}

/**
 * Преобразует строку Base32 в шестнадцатеричную строку
 */
function base32ToHex(base32: string): string {
  // Удаляем пробелы и приводим к верхнему регистру
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';
  
  // Удаляем возможные пробелы и другие символы
  const sanitizedInput = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  
  // Преобразуем каждый символ Base32 в 5 бит
  for (let i = 0; i < sanitizedInput.length; i++) {
    const val = base32chars.indexOf(sanitizedInput.charAt(i));
    if (val < 0) continue; // Пропускаем невалидные символы
    bits += val.toString(2).padStart(5, '0');
  }
  
  // Преобразуем группы по 8 бит (байты) в hex
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byteVal = parseInt(bits.substring(i, i + 8), 2);
    hex += byteVal.toString(16).padStart(2, '0');
  }
  
  return hex;
}

/**
 * Вычисляет оставшееся время для текущего TOTP-кода
 * @returns Оставшееся время в секундах
 */
export function getTimeRemaining(): number {
  // TOTP-коды обычно обновляются каждые 30 секунд
  const now = Math.floor(Date.now() / 1000); // Текущее время в секундах
  const periodInSeconds = 30; // Стандартный период TOTP
  
  // Оставшееся время в текущем 30-секундном интервале
  const remaining = periodInSeconds - (now % periodInSeconds);
  
  return remaining;
} 