import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import { importData } from '../utils/exportUtils';

interface ImportScreenProps {
  onBackPress: () => void;
  onImportSuccess: () => void;
}

export default function ImportScreen({ onBackPress, onImportSuccess }: ImportScreenProps) {
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importPassword, setImportPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return;
      }
      
      const file = result.assets[0];
      if (!file) {
        Alert.alert('Ошибка', 'Не удалось выбрать файл');
        return;
      }
      
      // Проверяем расширение файла
      if (!file.name.endsWith('.pwmexp')) {
        Alert.alert(
          'Неверный формат файла',
          'Выбранный файл не является файлом экспорта менеджера паролей. Пожалуйста, выберите файл с расширением .pwmexp'
        );
        return;
      }
      
      setFileUri(file.uri);
      setFileName(file.name);
    } catch (error) {
      console.error('Ошибка при выборе файла:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать файл');
    }
  };
  
  const handleImport = async () => {
    if (!fileUri) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите файл для импорта');
      return;
    }
    
    if (!importPassword) {
      Alert.alert('Ошибка', 'Пожалуйста, введите пароль для расшифровки');
      return;
    }
    
    setLoading(true);
    
    try {
      // Получаем текущий мастер-пароль
      const currentMasterPassword = await SecureStore.getItemAsync('master_password');
      
      if (!currentMasterPassword) {
        Alert.alert('Ошибка', 'Не удалось получить мастер-пароль');
        return;
      }
      
      // Импортируем данные
      const result = await importData(fileUri, importPassword, currentMasterPassword);
      
      if (result.success) {
        Alert.alert('Успех', result.message, [
          { text: 'OK', onPress: onImportSuccess }
        ]);
      } else {
        Alert.alert('Ошибка', result.message);
      }
    } catch (error) {
      console.error('Ошибка при импорте данных:', error);
      Alert.alert('Ошибка', 'Произошла непредвиденная ошибка при импорте данных');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Импорт данных</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.fileSection}>
          <Text style={styles.sectionTitle}>Выберите файл для импорта</Text>
          
          <TouchableOpacity 
            style={styles.fileSelector} 
            onPress={selectFile}
            disabled={loading}
          >
            <View style={styles.fileSelectorIcon}>
              <Ionicons name="document" size={24} color="#F06292" />
            </View>
            <View style={styles.fileSelectorContent}>
              {fileUri ? (
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {fileName}
                </Text>
              ) : (
                <Text style={styles.filePlaceholder}>
                  Нажмите, чтобы выбрать файл .pwmexp
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.passwordSection}>
          <Text style={styles.sectionTitle}>Пароль для расшифровки</Text>
          <Text style={styles.description}>
            Введите пароль, который использовался при экспорте данных
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Пароль для расшифровки"
              value={importPassword}
              onChangeText={setImportPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.importButton, (!fileUri || !importPassword || loading) && styles.disabledButton]}
          onPress={handleImport}
          disabled={!fileUri || !importPassword || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Импортировать данные</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.warning}>
          Внимание: После импорта все данные из файла будут объединены с существующими 
          данными в приложении. Это действие нельзя отменить.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    padding: 16,
  },
  fileSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fileSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  fileSelectorIcon: {
    marginRight: 12,
  },
  fileSelectorContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
  },
  filePlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  passwordSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    paddingRight: 44,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  importButton: {
    backgroundColor: '#F06292',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ffb6c1',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
}); 