import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.larpverse.mobile',
  appName: 'Larpverse',
  webDir: 'dist',
  // The app talks to a Larpverse server on your LAN (or this phone via Termux) over HTTP,
  // so the WebView origin is http://localhost and cleartext traffic is allowed.
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0e0a1f',
  },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#0e0a1f', overlaysWebView: false },
  },
};

export default config;
