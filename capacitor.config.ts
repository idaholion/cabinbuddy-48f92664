import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.75d574d84e524d7b84a1d14ab9742948',
  appName: 'cabinbuddy',
  webDir: 'dist',
  server: {
    url: 'https://75d574d8-4e52-4d7b-84a1-d14ab9742948.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;