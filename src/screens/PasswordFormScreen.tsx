import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Password, savePasswords, loadPasswords, checkPasswordStrength, generateRandomPassword } from '../utils/passwordUtils';

interface PasswordFormScreenProps {
  onBackPress: () => void;
  onSave: () => void;
  passwordToEdit?: Password;
}

const CATEGORIES = [
  { id: 'website', label: 'Веб-сайт', icon: 'globe' },
  { id: 'email', label: 'Почта', icon: 'mail' },
  { id: 'bank', label: 'Банк/Финансы', icon: 'card' },
  { id: 'social', label: 'Соцсети', icon: 'people' },
  { id: 'other', label: 'Другое', icon: 'layers' }
];

export default function PasswordFormScreen({ 
  onBackPress, 
  onSave,
  passwordToEdit 
}: PasswordFormScreenProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('website');
  const [favorite, setFavorite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [generatorLength, setGeneratorLength] = useState(12);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  
  const isEditing = !!passwordToEdit;

  useEffect(() => {
    if (passwordToEdit) {
      setName(passwordToEdit.name);
      setUsername(passwordToEdit.username);
      setPassword(passwordToEdit.password);
      setWebsite(passwordToEdit.website || '');
      setNotes(passwordToEdit.notes || '');
      setCategory(passwordToEdit.category || 'website');
      setFavorite(passwordToEdit.favorite);
    }
  }, [passwordToEdit]);
  
  useEffect(() => {
    if (password) {
      setPasswordStrength(checkPasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Укажите название');
      return;
    }
    
    if (!username.trim()) {
      Alert.alert('Ошибка', 'Укажите имя пользователя');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Ошибка', 'Укажите пароль');
      return;
    }
    
    try {
      const masterPassword = await SecureStore.getItemAsync('master_password');
      
      if (!masterPassword) {
        throw new Error('Мастер-пароль не найден');
      }
      
      const currentPasswords = await loadPasswords(masterPassword);
      
      const currentTime = Date.now();
      const id = passwordToEdit ? passwordToEdit.id : `password_${currentTime}_${Math.floor(Math.random() * 1000)}`;
      
      const newPassword: Password = {
        id,
        name,
        username,
        password,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
        category,
        createdAt: passwordToEdit ? passwordToEdit.createdAt : currentTime,
        updatedAt: currentTime,
        favorite
      };
      
      let updatedPasswords: Password[];
      
      if (isEditing) {
        updatedPasswords = currentPasswords.map(p => p.id === id ? newPassword : p);
      } else {
        updatedPasswords = [...currentPasswords, newPassword];
      }
      
      await savePasswords(updatedPasswords, masterPassword);
      onSave();
    } catch (error) {
      console.error('Ошибка сохранения пароля:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить пароль');
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword(
      generatorLength,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSpecial
    );
    
    setPassword(newPassword);
    setShowGeneratorModal(false);
  };

  const pasteFromClipboard = async (field: 'username' | 'password' | 'website') => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        switch (field) {
          case 'username':
            setUsername(text);
            break;
          case 'password':
            setPassword(text);
            break;
          case 'website':
            setWebsite(text);
            break;
        }
      }
    } catch (error) {
      console.error('Ошибка при вставке из буфера обмена:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? 'Редактировать пароль' : 'Добавить пароль'}
          </Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Сохранить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: Google"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Категория</Text>
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.categoryIcon}>
                <Ionicons 
                  name={CATEGORIES.find(c => c.id === category)?.icon as keyof typeof Ionicons.glyphMap || 'layers'} 
                  size={20} 
                  color="#F06292" 
                />
              </View>
              <Text style={styles.categoryText}>
                {CATEGORIES.find(c => c.id === category)?.label || 'Другое'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Имя пользователя</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Логин или email"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={() => pasteFromClipboard('username')}
              >
                <Ionicons name="clipboard-outline" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Пароль</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Пароль"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.passwordIcon}
                onPress={() => pasteFromClipboard('password')}
              >
                <Ionicons name="clipboard-outline" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.passwordIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.passwordIcon}
                onPress={() => setShowGeneratorModal(true)}
              >
                <Ionicons name="refresh" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            
            {passwordStrength && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  <View 
                    style={[
                      styles.strengthBar, 
                      styles.strengthBarWeak,
                      passwordStrength !== null && styles.strengthBarActive
                    ]} 
                  />
                  <View 
                    style={[
                      styles.strengthBar, 
                      styles.strengthBarMedium,
                      (passwordStrength === 'medium' || passwordStrength === 'strong') && styles.strengthBarActive
                    ]} 
                  />
                  <View 
                    style={[
                      styles.strengthBar, 
                      styles.strengthBarStrong,
                      passwordStrength === 'strong' && styles.strengthBarActive
                    ]} 
                  />
                </View>
                <Text style={styles.strengthText}>
                  {passwordStrength === 'weak' && 'Слабый пароль'}
                  {passwordStrength === 'medium' && 'Средний пароль'}
                  {passwordStrength === 'strong' && 'Надежный пароль'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Сайт (опционально)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="https://example.com"
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={() => pasteFromClipboard('website')}
              >
                <Ionicons name="clipboard-outline" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Заметки (опционально)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Дополнительная информация"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Добавить в избранное</Text>
            <Switch
              value={favorite}
              onValueChange={setFavorite}
              trackColor={{ false: '#ddd', true: '#FCE4EC' }}
              thumbColor={favorite ? '#F06292' : '#f4f3f4'}
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите категорию</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {CATEGORIES.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryItem,
                    category === item.id && styles.categoryItemSelected
                  ]}
                  onPress={() => {
                    setCategory(item.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={styles.categoryItemContent}>
                    <View style={styles.categoryItemIcon}>
                      <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color="#F06292" />
                    </View>
                    <Text style={styles.categoryItemText}>{item.label}</Text>
                  </View>
                  {category === item.id && (
                    <Ionicons name="checkmark" size={20} color="#F06292" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGeneratorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGeneratorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Генератор паролей</Text>
              <TouchableOpacity onPress={() => setShowGeneratorModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.generatorContent}>
              <View style={styles.generatorLengthContainer}>
                <Text style={styles.generatorLabel}>Длина: {generatorLength}</Text>
                <View style={styles.generatorSliderContainer}>
                  <TouchableOpacity 
                    onPress={() => setGeneratorLength(Math.max(4, generatorLength - 1))}
                    style={styles.generatorSliderButton}
                  >
                    <Ionicons name="remove" size={20} color="#666" />
                  </TouchableOpacity>
                  <View style={styles.generatorSlider}>
                    <View style={[styles.generatorSliderFill, { width: `${(generatorLength - 4) / 46 * 100}%` }]} />
                  </View>
                  <TouchableOpacity 
                    onPress={() => setGeneratorLength(Math.min(50, generatorLength + 1))}
                    style={styles.generatorSliderButton}
                  >
                    <Ionicons name="add" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Прописные буквы (A-Z)</Text>
                <Switch
                  value={includeUppercase}
                  onValueChange={setIncludeUppercase}
                  trackColor={{ false: '#ddd', true: '#FCE4EC' }}
                  thumbColor={includeUppercase ? '#F06292' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Строчные буквы (a-z)</Text>
                <Switch
                  value={includeLowercase}
                  onValueChange={setIncludeLowercase}
                  trackColor={{ false: '#ddd', true: '#FCE4EC' }}
                  thumbColor={includeLowercase ? '#F06292' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Цифры (0-9)</Text>
                <Switch
                  value={includeNumbers}
                  onValueChange={setIncludeNumbers}
                  trackColor={{ false: '#ddd', true: '#FCE4EC' }}
                  thumbColor={includeNumbers ? '#F06292' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Спецсимволы (!@#$...)</Text>
                <Switch
                  value={includeSpecial}
                  onValueChange={setIncludeSpecial}
                  trackColor={{ false: '#ddd', true: '#FCE4EC' }}
                  thumbColor={includeSpecial ? '#F06292' : '#f4f3f4'}
                />
              </View>
              
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGeneratePassword}
              >
                <Text style={styles.generateButtonText}>Сгенерировать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#F06292',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  form: {
    
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  passwordIcon: {
    padding: 12,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginRight: 4,
  },
  strengthBarWeak: {
    backgroundColor: '#ddd',
  },
  strengthBarMedium: {
    backgroundColor: '#ddd',
  },
  strengthBarStrong: {
    backgroundColor: '#ddd',
    marginRight: 0,
  },
  strengthBarActive: {
    backgroundColor: '#F44336',
  },
  strengthText: {
    fontSize: 12,
    color: '#666',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItemSelected: {
    backgroundColor: '#FEE9F0',
  },
  categoryItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryItemText: {
    fontSize: 16,
  },
  generatorContent: {
    padding: 16,
  },
  generatorLengthContainer: {
    marginBottom: 16,
  },
  generatorLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  generatorSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatorSlider: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  generatorSliderFill: {
    height: '100%',
    backgroundColor: '#F06292',
  },
  generatorSliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#F06292',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  inputWithIcon: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputIcon: {
    padding: 12,
  },
}); 