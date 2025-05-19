import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Vibration, Linking, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import WifiManager from 'react-native-wifi-reborn';
import { useIsFocused } from '@react-navigation/native';

export default function ScanQRScreen() {
  const [scanned, setScanned] = useState(false);
  const [isHandling, setIsHandling] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; isError: boolean }>({
    show: false,
    message: '',
    isError: false
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      setScanned(false);
      setIsHandling(false);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    }
  }, [isFocused]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.message}>Запрос разрешения камеры...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Ionicons name="camera" size={64} color="#F06292" style={{marginBottom: 20}} />
          <Text style={styles.title}>Требуется доступ к камере</Text>
          <Text style={styles.message}>
            Для сканирования QR-кодов двухфакторной аутентификации приложению необходим доступ к камере.
            {"\n\n"}
            Эта функция используется только для считывания QR-кодов при настройке 2FA.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Разрешить доступ</Text>
          </TouchableOpacity>
          
          {!permission.canAskAgain && (
            <TouchableOpacity 
              style={[styles.permissionButton, {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#F06292', marginTop: 12}]}
              onPress={() => Linking.openSettings()}
            >
              <Text style={[styles.permissionButtonText, {color: '#F06292'}]}>Открыть настройки</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (isHandling || scanned || debounceTimeout.current) return;
    setIsHandling(true);
    setScanned(true);
    setLastScanned(data);
    Vibration.vibrate();

    try {
      if (data.startsWith('WIFI:')) {
        const wifiData = parseWifiQRCode(data);
        if (wifiData) {
          Alert.alert(
            'WiFi Network Detected',
            `Would you like to connect to "${wifiData.ssid}"?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setIsHandling(false);
                  setScanned(false);
                }
              },
              {
                text: 'Connect',
                onPress: () => {
                  connectToWifi(wifiData);
                  setIsHandling(false);
                  setScanned(false);
                }
              }
            ],
            { cancelable: false }
          );
        } else {
          Alert.alert('Invalid WiFi QR Code', 'The scanned QR code contains invalid WiFi credentials.', [
            { text: 'OK', onPress: () => {
              setIsHandling(false);
              setScanned(false);
            }}
          ]);
        }
      } else if (data.startsWith('SMSTO:')) {
        const matches = data.match(/SMSTO:([^:]*):?(.*)?/);
        if (matches) {
          const [_, phoneNumber, message] = matches;
          Alert.alert(
            'Send SMS',
            `Send message to ${phoneNumber}${message ? `\n\nMessage: ${message}` : ''}`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setIsHandling(false);
                  setScanned(false);
                }
              },
              {
                text: 'Send',
                onPress: async () => {
                  try {
                    const url = `sms:${phoneNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
                    await Linking.openURL(url);
                  } catch (err) {
                    setToast({
                      show: true,
                      message: 'Could not open SMS app',
                      isError: true
                    });
                  }
                  setIsHandling(false);
                  setScanned(false);
                }
              }
            ],
            { cancelable: false }
          );
        }
      } else if (data.startsWith('tel:') || /^\+?\d+$/.test(data)) {
        const phoneNumber = data.startsWith('tel:') ? data.substring(4) : data;
        Alert.alert(
          'Call Number',
          phoneNumber,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setIsHandling(false);
                setScanned(false);
              }
            },
            {
              text: 'Call',
              onPress: async () => {
                try {
                  await Linking.openURL(`tel:${phoneNumber}`);
                } catch (err) {
                  setToast({
                    show: true,
                    message: 'Could not open phone app',
                    isError: true
                  });
                }
                setIsHandling(false);
                setScanned(false);
              }
            }
          ],
          { cancelable: false }
        );
      }
      else if (data.startsWith('MATMSG:')) {
        const emailMatch = data.match(/MATMSG:TO:([^;]+);SUB:([^;]*);BODY:([^;]*);;/);
        if (emailMatch) {
          const [_, email, subject, body] = emailMatch;
          Alert.alert(
            'Send Email',
            `Send email to ${email}`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setIsHandling(false);
                  setScanned(false);
                }
              },
              {
                text: 'Open Mail',
                onPress: async () => {
                  try {
                    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    await Linking.openURL(mailtoUrl);
                  } catch (err) {
                    setToast({
                      show: true,
                      message: 'Could not open mail app',
                      isError: true
                    });
                  }
                  setIsHandling(false);
                  setScanned(false);
                }
              }
            ],
            { cancelable: false }
          );
        }
      }  else if (data.startsWith('mailto:') || data.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
        const email = data.startsWith('mailto:') ? data.replace('mailto:', '') : data;
        
        Alert.alert(
          'Send Email',
          `Send email to ${email}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setIsHandling(false);
                setScanned(false);
              }
            },
            {
              text: 'Open Mail',
              onPress: async () => {
                try {
                  const mailtoUrl = `mailto:${email}`;
                  const supported = await Linking.canOpenURL(mailtoUrl);
                  
                  if (!supported) {
                    throw new Error('Mail app not supported');
                  }
                  
                  await Promise.all([
                    Linking.openURL(mailtoUrl),
                    new Promise(resolve => setTimeout(resolve, 1000))
                  ]);
                  
                } catch (err) {
                  console.error('Error opening mail:', err);
                  setToast({
                    show: true,
                    message: 'Could not open mail app',
                    isError: true
                  });
                } finally {
                  setIsHandling(false);
                  setScanned(false);
                }
              }
            }
          ],
          { cancelable: false }
        );
      } else if (data.match(/^(https?:\/\/|www\.)/i)) {
        const url = data.startsWith('www.') ? `https://${data}` : data;
        
        Alert.alert(
          'Open URL',
          `Open this URL?\n\n${url}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setIsHandling(false);
                setScanned(false);
              }
            },
            {
              text: 'Open',
              onPress: async () => {
                try {
                  const supported = await Linking.canOpenURL(url);
                  if (!supported) throw new Error('URL not supported');
                  await Linking.openURL(url);
                } catch (err) {
                  setToast({
                    show: true,
                    message: 'Could not open URL',
                    isError: true
                  });
                  setTimeout(() => setToast({ show: false, message: '', isError: false }), 2000);
                } finally {
                  setIsHandling(false);
                  setScanned(false);
                }
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert('QR Code Content', data, [
          { text: 'OK', onPress: () => {
            setIsHandling(false);
            setScanned(false);
          }}
        ]);
      }
    } catch (err) {
      console.error('Error handling QR code:', err);
      setIsHandling(false);
      setScanned(false);
    }

    debounceTimeout.current = setTimeout(() => {
      debounceTimeout.current = null;
    }, 2000);
  };

  const parseWifiQRCode = (data: string) => {
    const wifiPattern = /^WIFI:T:(WPA|WEP|nopass);S:(.*?);P:(.*?);(?:H:(.*?);)?;$/;
    const match = data.match(wifiPattern);

    if (match) {
      return {
        encryptionType: match[1],
        ssid: match[2],
        password: match[3],
        hidden: match[4] === 'true'
      };
    }
    return null;
  };

  const connectToWifi = async (wifiData: { 
    ssid: string; 
    password: string; 
    encryptionType: string;
    hidden?: boolean;
  }) => {
    try {
      if (wifiData.encryptionType === 'nopass') {
        await WifiManager.connectToSSID(wifiData.ssid);
      } else {
        await WifiManager.connectToProtectedSSID(
          wifiData.ssid,
          wifiData.password,
          wifiData.encryptionType === 'WPA',
          wifiData.hidden || false
        );
      }

      setToast({
        show: true,
        message: `Connected to ${wifiData.ssid}`,
        isError: false
      });
    } catch (err) {
      console.error('Full error object:', err); 
      const getConnectionError = (error: any) => {
        console.log('Error code:', error.code);
        if (error.code === 'E_CONN_FAILED') return 'Connection failed';
        if (error.code === 'E_NETWORK_NOT_FOUND') return 'Network not found';
        return `Unknown error: ${error.message}`
      };

      const errorMessage = getConnectionError(err);
      setToast({
        show: true,
        message: `Error: ${errorMessage}`,
        isError: true
      });
    } finally {
      setTimeout(() => setToast({ show: false, message: '', isError: false }), 2000);
      setIsHandling(false);
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused ? (
      <CameraView
        style={styles.scanner}
        facing="back"
        onBarcodeScanned={scanned || isHandling ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        // torch={torch}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.focusedContainer}>
              <View style={[styles.cornerTopLeft, styles.corner]} />
              <View style={[styles.cornerTopRight, styles.corner]} />
              <View style={[styles.cornerBottomLeft, styles.corner]} />
              <View style={[styles.cornerBottomRight, styles.corner]} />
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          <View style={styles.unfocusedContainer}></View>
        </View>
        {/* <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.torchButton}
            onPress={() => setTorch(current => current === 'on' ? 'off' : 'on')}
          >
            <Ionicons 
              name={torch === 'on' ? 'flash' : 'flash-off'} 
              size={24} 
              color="white"
            />
          </TouchableOpacity>
        </View> */}
      </CameraView>
      ) : null}

      {scanned && (
        <View style={styles.scanAgainContainer}>
          <TouchableOpacity 
            style={styles.scanAgainButton}
            onPress={() => {
              setScanned(false);
              setIsHandling(false);
              setLastScanned(null);
            }}
          >
            <Text style={styles.scanAgainButtonText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {toast.show && (
        <View style={[styles.toast, toast.isError && styles.toastError]}>
          <Ionicons 
            name={toast.isError ? "close-circle" : "checkmark-circle"} 
            size={24} 
            color="white" 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleContainer: {
    flexDirection: 'row',
    flex: 1.2,
  },
  focusedContainer: {
    flex: 6,
  },
  corner: {
    width: 20,
    height: 20,
    borderColor: '#F06292',
    position: 'absolute',
    borderRadius: 3,
  },
  cornerTopLeft: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    borderTopWidth: 2,
    borderRightWidth: 2,
    top: 0,
    right: 0,
  },
  cornerBottomLeft: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    bottom: 0,
    right: 0,
  },
  controls: {
    position: 'absolute',
    bottom: 140,
    width: '100%',
    alignItems: 'center',
  },
  torchButton: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 30,
    marginBottom: 20,
    color: '#555',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  scanAgainContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  permissionButton: {
    backgroundColor: '#F06292',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanAgainButton: {
    padding: 15,
    backgroundColor: '#F06292',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  scanAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  toast: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#A5D6A7',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastError: {
    backgroundColor: '#EF9A9A',
  },
  toastText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});