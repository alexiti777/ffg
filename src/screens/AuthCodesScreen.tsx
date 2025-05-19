import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  ActivityIndicator,
  Animated,
  Easing,
  SafeAreaView,
  Platform,
  Clipboard,
  ToastAndroid,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { 
  AuthCode, 
  generateAuthCode, 
  getTimeRemaining, 
  loadAuthCodes, 
  parseOtpAuthUri, 
  addAuthCode, 
  deleteAuthCode 
} from '../utils/authCodesUtils';

interface AuthCodesScreenProps {
  onBackPress: () => void;
}

export default function AuthCodesScreen({ onBackPress }: AuthCodesScreenProps) {
  const [authCodes, setAuthCodes] = useState<AuthCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeValues, setCodeValues] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showScanner, setShowScanner] = useState(false);
  const [permissions, setPermissions] = useState<{ granted: boolean; canAskAgain: boolean }>({ granted: false, canAskAgain: true });
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    loadData();
    
    // Устанавливаем интервал обновления для всего экрана
    const interval = setInterval(() => {
      updateCodeValues(authCodes);
      updateTimeRemaining();
    }, 1000);
    
    return () => {
      clearInterval(interval);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [authCodes]);

  const loadData = async () => {
    try {
      const masterPassword = await SecureStore.getItemAsync('master_password');
      
      if (!masterPassword) {
        Alert.alert('Ошибка', 'Не удалось получить мастер-пароль');
        setLoading(false);
        return;
      }
      
      const codes = await loadAuthCodes(masterPassword);
      setAuthCodes(codes);
      
      // Генерируем текущие значения кодов
      updateCodeValues(codes);
      updateTimeRemaining();
    } catch (error) {
      console.error('Ошибка загрузки кодов аутентификации:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить коды аутентификации');
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    const remaining = getTimeRemaining();
    setTimeRemaining(remaining);
    
    // Обновляем анимацию прогресса
    progressAnim.setValue(remaining / 30);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remaining * 1000,
      easing: Easing.linear,
      useNativeDriver: false
    }).start();
  };

  const updateCodeValues = (codes: AuthCode[]) => {
    if (!codes || codes.length === 0) return;
    
    const values: Record<string, string> = {};
    
    codes.forEach(code => {
      values[code.id] = generateAuthCode(code.secret);
    });
    
    setCodeValues(values);
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanning) return;
    setScanning(true);
    
    try {
      console.log("Сканирован QR-код:", data);
      
      // Парсим URI OTP
      const parsedData = parseOtpAuthUri(data);
      
      if (!parsedData) {
        Alert.alert(
          'Ошибка',
          'Отсканированный QR-код не является кодом аутентификации. Убедитесь, что это QR-код двухфакторной аутентификации.',
          [{ text: 'OK', onPress: () => setScanning(false) }]
        );
        return;
      }
      
      // Декодируем URL-кодированные значения для отображения
      const formattedIssuer = parsedData.issuer ? decodeURIComponent(parsedData.issuer) : 'Неизвестно';
      const formattedAccount = parsedData.account ? decodeURIComponent(parsedData.account) : 'Неизвестно';
      
      // Подтверждаем добавление
      Alert.alert(
        'Добавить код аутентификации',
        `Сервис: ${formattedIssuer}\nАккаунт: ${formattedAccount}`,
        [
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => setScanning(false)
          },
          {
            text: 'Добавить',
            onPress: async () => {
              const masterPassword = await SecureStore.getItemAsync('master_password');
              
              if (!masterPassword) {
                Alert.alert('Ошибка', 'Не удалось получить мастер-пароль');
                setShowScanner(false);
                setScanning(false);
                return;
              }
              
              // Сохраняем декодированные значения
              const dataToSave = {
                ...parsedData,
                issuer: formattedIssuer,
                account: formattedAccount
              };
              
              const success = await addAuthCode(dataToSave, masterPassword);
              
              if (success) {
                setShowScanner(false);
                loadData();
              } else {
                Alert.alert('Ошибка', 'Не удалось добавить код аутентификации');
              }
              
              setScanning(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Ошибка при обработке QR-кода:', error);
      Alert.alert(
        'Ошибка',
        'Произошла ошибка при обработке QR-кода. Попробуйте ещё раз.',
        [{ text: 'OK', onPress: () => setScanning(false) }]
      );
    }
  };

  const handleDeleteCode = async (id: string) => {
    Alert.alert(
      'Удаление',
      'Вы уверены, что хотите удалить этот код аутентификации?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const masterPassword = await SecureStore.getItemAsync('master_password');
            
            if (!masterPassword) {
              Alert.alert('Ошибка', 'Не удалось получить мастер-пароль');
              return;
            }
            
            const success = await deleteAuthCode(id, masterPassword);
            
            if (success) {
              setAuthCodes(prevCodes => prevCodes.filter(code => code.id !== id));
            } else {
              Alert.alert('Ошибка', 'Не удалось удалить код аутентификации');
            }
          }
        }
      ]
    );
  };

  const formatCode = (code: string): string => {
    // Форматируем код в виде XXX XXX для лучшей читаемости
    if (code.length === 6) {
      return `${code.substring(0, 3)} ${code.substring(3)}`;
    }
    return code;
  };

  const copyToClipboard = (code: string) => {
    if (code === '------') return;
    
    // Удаляем пробел при копировании
    const cleanCode = code.replace(/\s/g, '');
    Clipboard.setString(cleanCode);
    
    // Показываем уведомление
    if (Platform.OS === 'android') {
      ToastAndroid.show('Код скопирован', ToastAndroid.SHORT);
    } else {
      Alert.alert('Скопировано', 'Код скопирован в буфер обмена');
    }
  };

  const renderCodeItem = ({ item }: { item: AuthCode }) => {
    const code = formatCode(codeValues[item.id] || '------');
    
    return (
      <View style={styles.codeItem}>
        <View style={styles.codeItemHeader}>
          <View>
            <Text style={styles.issuer}>{item.issuer}</Text>
            <Text style={styles.accountName}>{item.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCode(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.codeContainer}>
          <TouchableOpacity 
            style={styles.codeValueContainer}
            onPress={() => copyToClipboard(code)}
            activeOpacity={0.7}
          >
            <Text style={styles.codeValue}>{code}</Text>
            <Ionicons name="copy-outline" size={16} color="#999" style={styles.copyIcon} />
          </TouchableOpacity>
          
          <View style={styles.timerContainer}>
            <View style={styles.timerBar}>
              <Animated.View 
                style={[
                  styles.timerProgress, 
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }) 
                  }
                ]} 
              />
            </View>
            <Text style={styles.timerText}>{timeRemaining}с</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="lock-closed" size={60} color="#ccc" />
      <Text style={styles.emptyText}>
        У вас пока нет кодов аутентификации
      </Text>
      
    </View>
  );

  const handleAddFromQR = async () => {
    // Запрашиваем разрешения на использование камеры
    if (!permission?.granted) {
      const newPermission = await requestPermission();
      
      if (newPermission.granted) {
        setShowScanner(true);
      } else {
        Alert.alert(
          "Требуется разрешение",
          "Для сканирования QR-кодов двухфакторной аутентификации приложению необходим доступ к камере. Разрешение будет использоваться только для считывания QR-кодов при настройке 2FA.",
          [
            { 
              text: "Отмена", 
              style: "cancel" 
            },
            { 
              text: "Настройки", 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
    } else {
      setShowScanner(true);
    }
  };

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
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Коды аутентификации</Text>
      </View>

      <FlatList
        data={authCodes}
        renderItem={renderCodeItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddFromQR}
      >
        <Ionicons name="qr-code" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Модальное окно со сканером */}
      <Modal
        visible={showScanner}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowScanner(false);
                setScanning(false);
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Сканируйте QR-код</Text>
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={scanning ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onCameraReady={() => setCameraReady(true)}
            >
              <View style={styles.overlay}>
                <View style={styles.targetArea}>
                  <View style={[styles.targetCorner, styles.topLeft]} />
                  <View style={[styles.targetCorner, styles.topRight]} />
                  <View style={[styles.targetCorner, styles.bottomLeft]} />
                  <View style={[styles.targetCorner, styles.bottomRight]} />
                </View>
                <Text style={styles.scanInstructions}>
                  Наведите камеру на QR-код аутентификатора
                </Text>
              </View>
            </CameraView>
          </View>
        </SafeAreaView>
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  codeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  codeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  issuer: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountName: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  timerBar: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    flex: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    backgroundColor: '#F06292',
  },
  timerText: {
    fontSize: 12,
    color: '#666',
    width: 30,
    textAlign: 'right',
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
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#F06292',
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanInstructions: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyIcon: {
    marginLeft: 8,
  },
}); 