declare module 'react-native-crypto-js' {
  const CryptoJS: {
    AES: {
      encrypt: (text: string, key: string) => {
        toString: () => string;
      };
      decrypt: (encryptedText: string, key: string) => {
        toString: (encoding: any) => string;
      };
    };
    enc: {
      Utf8: any;
    };
  };
  
  export default CryptoJS;
} 