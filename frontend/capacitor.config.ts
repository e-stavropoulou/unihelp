import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unihelp.app',
  appName: 'UniHelp',
  webDir: 'www',
  server: {
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'body'
    }
  }
};

export default config;

