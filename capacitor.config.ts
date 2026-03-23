import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liftlygym.app',
  appName: 'Liftly',
  webDir: 'www',
  server: {
    url: 'https://liftlygym.com',
    cleartext: false,
  },
};

export default config;
