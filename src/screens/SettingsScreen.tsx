import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Switch,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { exportData, exportToCSV } from '../utils/exportUtils';

interface SettingsScreenProps {
  onBackPress: () => void;
  onLogout: () => void;
  onAuthCodesPress: () => void;
  onChangePinPress: () => void;
  onImportPress: () => void;
}

export default function SettingsScreen({ 
  onBackPress, 
  onLogout,
  onAuthCodesPress,
  onChangePinPress,
  onImportPress
}: SettingsScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: onLogout
        }
      ]
    );
  };

  const handleChangePinCode = () => {
    onChangePinPress();
  };

  const handleExportData = () => {
    setShowExportOptions(true);
  };

  const handleExportEncrypted = async () => {
    setShowExportOptions(false);
    setExporting(true);
    
    try {
      // Получаем мастер-пароль для шифрования
      const masterPassword = await SecureStore.getItemAsync('master_password');
      
      if (!masterPassword) {
        Alert.alert('Ошибка', 'Не удалось получить мастер-пароль');
        return;
      }
      
      const success = await exportData(masterPassword);
      
      if (success) {
        Alert.alert('Успех', 'Данные успешно экспортированы в зашифрованный файл');
      } else {
        Alert.alert('Ошибка', 'Не удалось экспортировать данные');
      }
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при экспорте данных');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setShowExportOptions(false);
    setExporting(true);
    
    try {
      // Получаем мастер-пароль для расшифровки данных
      const masterPassword = await SecureStore.getItemAsync('master_password');
      
      if (!masterPassword) {
        Alert.alert('Ошибка', 'Не удалось получить мастер-пароль');
        return;
      }
      
      // Предупреждение о безопасности
      Alert.alert(
        'Внимание',
        'Экспорт в CSV создаст незашифрованные файлы с вашими паролями и кодами аутентификации. Эти файлы могут быть прочитаны любым, кто получит к ним доступ. Продолжить?',
        [
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => setExporting(false)
          },
          {
            text: 'Продолжить',
            onPress: async () => {
              const success = await exportToCSV(masterPassword);
              
              if (success) {
                Alert.alert('Успех', 'Данные успешно экспортированы в CSV-файлы');
              } else {
                Alert.alert('Ошибка', 'Не удалось экспортировать данные в CSV');
              }
              setExporting(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при экспорте данных');
      setExporting(false);
    }
  };

  const handleImportData = () => {
    onImportPress();
  };

  const handleReset = () => {
    Alert.alert(
      'Сброс данных',
      'Вы уверены, что хотите удалить все пароли и сбросить настройки приложения? Это действие нельзя отменить.',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            try {
              // Удаление всех данных из SecureStore
              await SecureStore.deleteItemAsync('passwords');
              await SecureStore.deleteItemAsync('master_password');
              await SecureStore.deleteItemAsync('pin_code');
              await SecureStore.deleteItemAsync('auth_codes');
              
              // Выход из приложения
              onLogout();
            } catch (error) {
              console.error('Ошибка при сбросе данных:', error);
              Alert.alert('Ошибка', 'Не удалось сбросить данные');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Настройки</Text>
      </View>

      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Безопасность</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleChangePinCode}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="keypad" size={20} color="#F06292" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Изменить ПИН-код</Text>
              <Text style={styles.settingDescription}>
                Смена ПИН-кода для входа в приложение
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={onAuthCodesPress}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="qr-code" size={20} color="#F06292" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Коды аутентификации</Text>
              <Text style={styles.settingDescription}>
                Управление кодами двухфакторной аутентификации для других сервисов
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Данные</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleExportData}
            disabled={exporting}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="download" size={20} color="#F06292" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Экспорт данных</Text>
              <Text style={styles.settingDescription}>
                Экспорт паролей в зашифрованный файл или CSV
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator color="#F06292" size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleImportData}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="cloud-upload" size={20} color="#F06292" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Импорт данных</Text>
              <Text style={styles.settingDescription}>
                Импорт паролей из зашифрованного файла
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Учетная запись</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleLogout}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="log-out" size={20} color="#F06292" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Выйти</Text>
              <Text style={styles.settingDescription}>
                Выход из учетной записи
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]} 
            onPress={handleReset}
          >
            <View style={[styles.settingIcon, styles.dangerIcon]}>
              <Ionicons name="trash" size={20} color="#F44336" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, styles.dangerText]}>Сбросить все данные</Text>
              <Text style={styles.settingDescription}>
                Удаление всех паролей и сброс настроек приложения
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Версия 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Модальное окно для выбора формата экспорта */}
      <Modal
        visible={showExportOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите формат экспорта</Text>
            
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={handleExportEncrypted}
            >
              <Ionicons name="lock-closed" size={24} color="#F06292" style={styles.modalOptionIcon} />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Зашифрованный файл</Text>
                <Text style={styles.modalOptionDescription}>
                  Безопасный экспорт, защищенный вашим ПИН-кодом
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={handleExportCSV}
            >
              <Ionicons name="document-text" size={24} color="#F06292" style={styles.modalOptionIcon} />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>CSV-файлы</Text>
                <Text style={styles.modalOptionDescription}>
                  Незашифрованный формат для импорта в другие приложения
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton} 
              onPress={() => setShowExportOptions(false)}
            >
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  dangerItem: {
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    marginTop: 8,
  },
  dangerIcon: {
    backgroundColor: '#FFEBEE',
  },
  dangerText: {
    color: '#F44336',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  modalOptionIcon: {
    marginRight: 12,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  modalOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalCancelButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
}); 