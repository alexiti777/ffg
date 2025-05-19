import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { 
  encrypt, 
  decrypt 
} from './cryptoUtils';
import { 
  loadPasswords, 
  Password 
} from './passwordUtils';
import { 
  loadAuthCodes, 
  AuthCode 
} from './authCodesUtils';

// Интерфейс для экспортируемых данных
interface ExportData {
  passwords: Password[];
  authCodes: AuthCode[];
  exportDate: number;
  version: string;
}

/**
 * Экспортирует данные приложения (пароли и коды аутентификации) в зашифрованный файл
 * @param masterPassword Мастер-пароль для шифрования данных
 * @returns Promise с результатом операции
 */
export async function exportData(masterPassword: string): Promise<boolean> {
  try {
    // Получаем данные для экспорта
    const passwords = await loadPasswords(masterPassword);
    const authCodes = await loadAuthCodes(masterPassword);
    
    // Создаем объект с данными для экспорта
    const exportData: ExportData = {
      passwords,
      authCodes,
      exportDate: Date.now(),
      version: '1.0.0',
    };
    
    // Преобразуем данные в JSON и шифруем
    const jsonData = JSON.stringify(exportData);
    const encryptedData = await encrypt(jsonData, masterPassword);
    
    // Добавляем заголовок для идентификации файла
    const fileContent = `PWMEXP:${encryptedData}`;
    
    // Определяем путь для сохранения файла
    const fileName = `password_manager_export_${new Date().toISOString().split('T')[0]}.pwmexp`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Записываем данные в файл
    await FileSystem.writeAsStringAsync(filePath, fileContent);
    
    // Проверяем, можно ли поделиться файлом
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Функция обмена файлами не доступна на этом устройстве');
    }
    
    // Открываем диалог обмена файлом
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Экспорт данных менеджера паролей',
      UTI: 'com.passwordmanager.data'
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при экспорте данных:', error);
    return false;
  }
}

/**
 * Экспортирует данные в CSV-формат
 * @param masterPassword Мастер-пароль для расшифровки данных
 * @returns Promise с результатом операции
 */
export async function exportToCSV(masterPassword: string): Promise<boolean> {
  try {
    // Получаем данные для экспорта
    const passwords = await loadPasswords(masterPassword);
    const authCodes = await loadAuthCodes(masterPassword);
    
    // Создаем CSV для паролей
    let passwordsCSV = 'ID,Название,Имя пользователя,Пароль,Веб-сайт,Примечания,Категория,Дата создания,Дата изменения,Избранное\n';
    
    passwords.forEach(password => {
      const createdDate = new Date(password.createdAt).toLocaleString();
      const updatedDate = new Date(password.updatedAt).toLocaleString();
      
      // Экранируем поля, содержащие запятые или переносы строк
      const escapeCsvField = (field: string = '') => {
        if (field.includes(',') || field.includes('\n') || field.includes('"')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };
      
      passwordsCSV += [
        password.id,
        escapeCsvField(password.name),
        escapeCsvField(password.username),
        escapeCsvField(password.password),
        escapeCsvField(password.website),
        escapeCsvField(password.notes),
        escapeCsvField(password.category),
        createdDate,
        updatedDate,
        password.favorite ? 'Да' : 'Нет'
      ].join(',') + '\n';
    });
    
    // Создаем CSV для кодов аутентификации
    let authCodesCSV = 'ID,Название,Сервис,Секретный ключ,Дата создания,Избранное\n';
    
    authCodes.forEach(code => {
      const createdDate = new Date(code.createdAt).toLocaleString();
      
      // Экранируем поля, содержащие запятые или переносы строк
      const escapeCsvField = (field: string = '') => {
        if (field.includes(',') || field.includes('\n') || field.includes('"')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };
      
      authCodesCSV += [
        code.id,
        escapeCsvField(code.name),
        escapeCsvField(code.issuer),
        escapeCsvField(code.secret),
        createdDate,
        code.favorite ? 'Да' : 'Нет'
      ].join(',') + '\n';
    });
    
    // Определяем пути для сохранения файлов
    const dateStr = new Date().toISOString().split('T')[0];
    const passwordsFileName = `passwords_${dateStr}.csv`;
    const authCodesFileName = `auth_codes_${dateStr}.csv`;
    
    const passwordsFilePath = `${FileSystem.cacheDirectory}${passwordsFileName}`;
    const authCodesFilePath = `${FileSystem.cacheDirectory}${authCodesFileName}`;
    
    // Записываем данные в файлы
    await FileSystem.writeAsStringAsync(passwordsFilePath, passwordsCSV);
    await FileSystem.writeAsStringAsync(authCodesFilePath, authCodesCSV);
    
    // Проверяем, можно ли поделиться файлами
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Функция обмена файлами не доступна на этом устройстве');
    }
    
    // Создаем ZIP-архив (если доступны файлы паролей и кодов аутентификации)
    if (passwords.length > 0 && authCodes.length > 0) {
      // Открываем диалог обмена для CSV с паролями
      await Sharing.shareAsync(passwordsFilePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Экспорт паролей в CSV',
        UTI: 'public.comma-separated-values-text'
      });
      
      // После закрытия диалога, открываем диалог для CSV с кодами аутентификации
      await Sharing.shareAsync(authCodesFilePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Экспорт кодов аутентификации в CSV',
        UTI: 'public.comma-separated-values-text'
      });
    } else if (passwords.length > 0) {
      // Открываем диалог обмена только для CSV с паролями
      await Sharing.shareAsync(passwordsFilePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Экспорт паролей в CSV',
        UTI: 'public.comma-separated-values-text'
      });
    } else if (authCodes.length > 0) {
      // Открываем диалог обмена только для CSV с кодами аутентификации
      await Sharing.shareAsync(authCodesFilePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Экспорт кодов аутентификации в CSV',
        UTI: 'public.comma-separated-values-text'
      });
    } else {
      throw new Error('Нет данных для экспорта');
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при экспорте данных в CSV:', error);
    return false;
  }
}

/**
 * Импортирует данные из зашифрованного файла
 * @param fileUri URI файла для импорта
 * @param importPassword Пароль для расшифровки данных
 * @param currentMasterPassword Текущий мастер-пароль для повторного шифрования данных
 * @returns Promise с результатом операции
 */
export async function importData(
  fileUri: string, 
  importPassword: string,
  currentMasterPassword: string
): Promise<{success: boolean; message: string}> {
  try {
    // Читаем содержимое файла
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    
    // Проверяем формат файла
    if (!fileContent.startsWith('PWMEXP:')) {
      return {
        success: false,
        message: 'Неверный формат файла. Файл должен быть экспортирован из этого приложения.'
      };
    }
    
    // Извлекаем зашифрованные данные
    const encryptedData = fileContent.substring('PWMEXP:'.length);
    
    // Расшифровываем данные
    let decryptedData;
    try {
      decryptedData = await decrypt(encryptedData, importPassword);
    } catch (error) {
      return {
        success: false,
        message: 'Неверный пароль или поврежденный файл.'
      };
    }
    
    // Парсим JSON
    const importedData: ExportData = JSON.parse(decryptedData);
    
    // Проверяем структуру данных
    if (!importedData.passwords || !importedData.authCodes) {
      return {
        success: false,
        message: 'Файл содержит неверные данные.'
      };
    }
    
    // Получаем текущие данные
    const currentPasswords = await loadPasswords(currentMasterPassword);
    const currentAuthCodes = await loadAuthCodes(currentMasterPassword);
    
    // Получаем существующие ID для предотвращения дубликатов
    const existingPasswordIds = new Set(currentPasswords.map(p => p.id));
    const existingAuthCodeIds = new Set(currentAuthCodes.map(c => c.id));
    
    // Фильтруем новые пароли, чтобы избежать дубликатов по ID
    const newPasswords = importedData.passwords.filter(p => !existingPasswordIds.has(p.id));
    
    // Фильтруем новые коды аутентификации, чтобы избежать дубликатов по ID
    const newAuthCodes = importedData.authCodes.filter(c => !existingAuthCodeIds.has(c.id));
    
    // Объединяем текущие и новые данные
    const updatedPasswords = [...currentPasswords, ...newPasswords];
    const updatedAuthCodes = [...currentAuthCodes, ...newAuthCodes];
    
    // Сохраняем объединенные данные
    const passwordsData = JSON.stringify(updatedPasswords);
    const authCodesData = JSON.stringify(updatedAuthCodes);
    
    const encryptedPasswords = await encrypt(passwordsData, currentMasterPassword);
    const encryptedAuthCodes = await encrypt(authCodesData, currentMasterPassword);
    
    await SecureStore.setItemAsync('passwords', encryptedPasswords);
    await SecureStore.setItemAsync('auth_codes', encryptedAuthCodes);
    
    return {
      success: true,
      message: `Импорт успешно завершен. Добавлено ${newPasswords.length} паролей и ${newAuthCodes.length} кодов аутентификации.`
    };
  } catch (error) {
    console.error('Ошибка при импорте данных:', error);
    return {
      success: false,
      message: `Ошибка при импорте данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
} 