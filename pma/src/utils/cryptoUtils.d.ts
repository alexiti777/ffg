declare module 'cryptoUtils' {
  export function encrypt(data: string, key: string): Promise<string>;
  export function decrypt(encryptedData: string, key: string): Promise<string>;
} 