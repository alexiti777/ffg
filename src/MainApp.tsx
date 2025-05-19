import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Alert,
  BackHandler,
  AppState
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Импорт экранов
import LoginScreen from './screens/LoginScreen';
import PasswordListScreen from './screens/PasswordListScreen';
import PasswordFormScreen from './screens/PasswordFormScreen';
import SettingsScreen from './screens/SettingsScreen';
import AuthCodesScreen from './screens/AuthCodesScreen';
import ChangePinScreen from './screens/ChangePinScreen';
import ImportScreen from './screens/ImportScreen';
import RecoverPinScreen from './screens/RecoverPinScreen';

// Типы для навигации и параметров
import { Password } from './utils/passwordUtils';

type Screen = 
  | 'login'
  | 'recover'
  | 'passwordList'
  | 'passwordForm'
  | 'settings'
  | 'authCodes'
  | 'changePin'
  | 'importData';

export default function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<Password | undefined>(undefined);
  const appState = useRef(AppState.currentState);

  // Добавляем эффект для отслеживания изменений currentScreen
  useEffect(() => {
    // console.log('Текущий экран изменился:', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Добавляем обработчик кнопки "Назад"
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'recover') {
        setCurrentScreen('login');
        return true;
      }
      
      // Если пользователь аутентифицирован и не находится на экране паролей
      if (isAuthenticated && currentScreen !== 'passwordList') {
        setCurrentScreen('passwordList');
        return true;
      }
      
      // Если пользователь на экране паролей
      if (currentScreen === 'passwordList' && isAuthenticated) {
        Alert.alert(
          'Выход',
          'Вы хотите выйти из приложения?',
          [
            {
              text: 'Отмена',
              style: 'cancel',
            },
            {
              text: 'Выйти',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: false }
        );
        return true;
      }
      
      return false;
    });

    return () => backHandler.remove();
  }, [currentScreen, isAuthenticated]);

  // Добавляем обработчик изменения состояния приложения
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // Приложение переходит в неактивное состояние
        if (isAuthenticated) {
          setIsAuthenticated(false);
          setCurrentScreen('login');
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const hasPin = await SecureStore.getItemAsync('pin_code');
      // console.log('Проверка статуса аутентификации. PIN установлен:', !!hasPin);
      
      if (!hasPin) {
        setCurrentScreen('login');
        return;
      }
      
      setCurrentScreen('login');
    } catch (error) {
      console.error('Ошибка проверки статуса аутентификации:', error);
      setCurrentScreen('login');
    }
  };

  const handleLoginSuccess = () => {
    // console.log('Успешный вход');
    setIsAuthenticated(true);
    setCurrentScreen('passwordList');
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('master_password');
      setIsAuthenticated(false);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Ошибка выхода из приложения:', error);
    }
  };

  const handlePasswordSelect = (password: Password) => {
    setSelectedPassword(password);
    setCurrentScreen('passwordForm');
  };

  const handleAddPassword = () => {
    setSelectedPassword(undefined);
    setCurrentScreen('passwordForm');
  };

  const handleSavePassword = () => {
    setCurrentScreen('passwordList');
  };

  const handleChangePinSuccess = () => {
    setCurrentScreen('settings');
  };

  const handleImportSuccess = () => {
    Alert.alert('Импорт завершен', 'Данные успешно импортированы');
    setCurrentScreen('settings');
  };

  const handleRecoverSuccess = () => {
    // console.log('Успешное восстановление');
    setIsAuthenticated(true);
    setCurrentScreen('passwordList');
  };

  const renderScreen = () => {
    // console.log('Рендеринг экрана:', currentScreen);
    
    // Разрешаем переход на экран восстановления без аутентификации
    if (!isAuthenticated && currentScreen !== 'login' && currentScreen !== 'recover') {
      // console.log('Пользователь не аутентифицирован, перенаправление на экран входа');
      setCurrentScreen('login');
      return (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onRecoverPress={() => {
            // console.log('Переход на экран восстановления из перенаправления');
            setCurrentScreen('recover');
          }} 
        />
      );
    }
    
    switch (currentScreen) {
      case 'login':
        // console.log('Рендеринг экрана входа');
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onRecoverPress={() => {
              // console.log('Переход на экран восстановления из экрана входа');
              setCurrentScreen('recover');
            }}
          />
        );
        
      case 'recover':
        // console.log('Рендеринг экрана восстановления');
        return (
          <RecoverPinScreen
            onBackPress={() => {
              // console.log('Возврат на экран входа');
              setCurrentScreen('login');
            }}
            onSuccess={handleRecoverSuccess}
          />
        );
        
      case 'passwordList':
        return (
          <PasswordListScreen 
            onAddPassword={handleAddPassword}
            onPasswordSelect={handlePasswordSelect}
            onSettingsPress={() => setCurrentScreen('settings')}
            onAuthCodesPress={() => setCurrentScreen('authCodes')}
          />
        );
        
      case 'passwordForm':
        return (
          <PasswordFormScreen 
            onBackPress={() => setCurrentScreen('passwordList')}
            onSave={handleSavePassword}
            passwordToEdit={selectedPassword}
          />
        );
        
      case 'settings':
        return (
          <SettingsScreen 
            onBackPress={() => setCurrentScreen('passwordList')}
            onLogout={handleLogout}
            onAuthCodesPress={() => setCurrentScreen('authCodes')}
            onChangePinPress={() => setCurrentScreen('changePin')}
            onImportPress={() => setCurrentScreen('importData')}
          />
        );
        
      case 'authCodes':
        return (
          <AuthCodesScreen 
            onBackPress={() => setCurrentScreen('passwordList')}
          />
        );
        
      case 'changePin':
        return (
          <ChangePinScreen 
            onBackPress={() => setCurrentScreen('settings')}
            onSuccess={handleChangePinSuccess}
          />
        );

      case 'importData':
        return (
          <ImportScreen 
            onBackPress={() => setCurrentScreen('settings')}
            onImportSuccess={handleImportSuccess}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 