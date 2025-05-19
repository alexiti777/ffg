import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Password, loadPasswords, savePasswords } from '../utils/passwordUtils';

interface PasswordListScreenProps {
  onAddPassword: () => void;
  onPasswordSelect: (password: Password) => void;
  onSettingsPress: () => void;
  onAuthCodesPress: () => void;
}

export default function PasswordListScreen({ 
  onAddPassword, 
  onPasswordSelect,
  onSettingsPress,
  onAuthCodesPress
}: PasswordListScreenProps) {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [filteredPasswords, setFilteredPasswords] = useState<Password[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadPasswordData();
  }, []);

  useEffect(() => {
    filterPasswords();
  }, [passwords, searchQuery, selectedCategory, sortBy, sortOrder]);

  const loadPasswordData = async () => {
    try {
      const masterPassword = await SecureStore.getItemAsync('master_password');
      
      if (!masterPassword) {
        throw new Error('Мастер-пароль не найден');
      }
      
      const data = await loadPasswords(masterPassword);
      setPasswords(data);
      
      // Извлечение категорий из паролей
      const uniqueCategories = Array.from(
        new Set(data.map(item => item.category).filter(Boolean) as string[])
      );
      
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Ошибка загрузки паролей:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить пароли');
    } finally {
      setLoading(false);
    }
  };

  const filterPasswords = () => {
    let result = [...passwords];
    
    // Фильтрация по поисковому запросу
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        password => 
          password.name.toLowerCase().includes(query) || 
          password.username.toLowerCase().includes(query) || 
          (password.website && password.website.toLowerCase().includes(query))
      );
    }
    
    // Фильтрация по категории
    if (selectedCategory) {
      result = result.filter(password => password.category === selectedCategory);
    }
    
    // Сортировка
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === 'asc'
          ? a.updatedAt - b.updatedAt
          : b.updatedAt - a.updatedAt;
      }
    });
    
    setFilteredPasswords(result);
  };

  const toggleFavorite = async (id: string) => {
    try {
      const updatedPasswords = passwords.map(password => {
        if (password.id === id) {
          return {
            ...password,
            favorite: !password.favorite,
            updatedAt: Date.now()
          };
        }
        return password;
      });
      
      setPasswords(updatedPasswords);
      
      const masterPassword = await SecureStore.getItemAsync('master_password');
      if (masterPassword) {
        await savePasswords(updatedPasswords, masterPassword);
      }
    } catch (error) {
      console.error('Ошибка при обновлении пароля:', error);
      Alert.alert('Ошибка', 'Не удалось обновить пароль');
    }
  };

  const deletePassword = async (id: string) => {
    Alert.alert(
      'Подтверждение',
      'Вы уверены, что хотите удалить этот пароль?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPasswords = passwords.filter(password => password.id !== id);
              setPasswords(updatedPasswords);
              
              const masterPassword = await SecureStore.getItemAsync('master_password');
              if (masterPassword) {
                await savePasswords(updatedPasswords, masterPassword);
              }
            } catch (error) {
              console.error('Ошибка при удалении пароля:', error);
              Alert.alert('Ошибка', 'Не удалось удалить пароль');
            }
          }
        }
      ]
    );
  };

  const toggleSort = () => {
    if (sortBy === 'name') {
      setSortBy('updatedAt');
    } else {
      setSortBy('name');
    }
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const renderItem = ({ item }: { item: Password }) => (
    <TouchableOpacity
      style={styles.passwordItem}
      onPress={() => onPasswordSelect(item)}
    >
      <View style={styles.passwordContent}>
        <View style={styles.passwordIcon}>
          <Ionicons 
            name={item.category === 'bank' ? 'card' : (item.category === 'email' ? 'mail' : 'globe')} 
            size={24} 
            color="#F06292" 
          />
        </View>
        <View style={styles.passwordDetails}>
          <Text style={styles.passwordName}>{item.name}</Text>
          <Text style={styles.passwordUsername}>{item.username}</Text>
          {item.website && (
            <Text style={styles.passwordWebsite} numberOfLines={1}>
              {item.website}
            </Text>
          )}
        </View>
        <View style={styles.passwordActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Ionicons 
              name={item.favorite ? "star" : "star-outline"} 
              size={24} 
              color={item.favorite ? "#FFC107" : "#aaa"} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deletePassword(item.id)}
          >
            <Ionicons name="trash-outline" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="lock-closed" size={60} color="#ccc" />
      <Text style={styles.emptyText}>
        {searchQuery || selectedCategory 
          ? 'Нет паролей, соответствующих вашему запросу' 
          : 'У вас пока нет сохраненных паролей'}
      </Text>
      {!searchQuery && !selectedCategory && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={onAddPassword}
        >
          <Text style={styles.addButtonText}>Добавить пароль</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#F06292" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Пароли</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={toggleSort}
          >
            <Ionicons 
              name={sortBy === 'name' ? 'text' : 'time'} 
              size={22} 
              color="#666" 
            />
            <Ionicons 
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
              size={16} 
              color="#666" 
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onAuthCodesPress}
          >
            <Ionicons name="qr-code" size={22} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onSettingsPress}
          >
            <Ionicons name="settings-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию, логину или сайту"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Ionicons name="filter" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {selectedCategory && (
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{selectedCategory}</Text>
          <TouchableOpacity 
            style={styles.categoryRemove}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredPasswords}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={onAddPassword}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фильтр по категории</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.categoryItem,
                !selectedCategory && styles.categoryItemSelected
              ]}
              onPress={() => {
                setSelectedCategory(null);
                setShowCategoryModal(false);
              }}
            >
              <Text style={[
                styles.categoryItemText,
                !selectedCategory && styles.categoryItemTextSelected
              ]}>
                Все категории
              </Text>
              {!selectedCategory && (
                <Ionicons name="checkmark" size={20} color="#F06292" />
              )}
            </TouchableOpacity>

            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  selectedCategory === category && styles.categoryItemSelected
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.categoryItemText,
                  selectedCategory === category && styles.categoryItemTextSelected
                ]}>
                  {category}
                </Text>
                {selectedCategory === category && (
                  <Ionicons name="checkmark" size={20} color="#F06292" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F06292',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  categoryBadgeText: {
    color: '#fff',
    fontWeight: '500',
    marginRight: 4,
  },
  categoryBadgeClose: {
    padding: 2,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  passwordItem: {
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordContent: {
    flexDirection: 'row',
    padding: 16,
  },
  passwordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  passwordDetails: {
    flex: 1,
  },
  passwordName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  passwordUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  passwordWebsite: {
    fontSize: 12,
    color: '#999',
  },
  passwordActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#F06292',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F06292',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    paddingVertical: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  categoryItemSelected: {
    backgroundColor: '#FEE9F0',
  },
  categoryItemText: {
    fontSize: 16,
  },
  categoryItemTextSelected: {
    color: '#F06292',
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryButton: {
    padding: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F06292',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  categoryText: {
    color: '#fff',
    fontWeight: '500',
    marginRight: 4,
  },
  categoryRemove: {
    padding: 2,
  },
});
