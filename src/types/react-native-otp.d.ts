declare module 'react-native-otp' {
  const OTP: {
    generate: (secret: string, counter: string) => string;
  };
  
  export default OTP;
} 