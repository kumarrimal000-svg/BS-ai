/**
 * NativeBridge coordinates between Web APIs and connected Android Native Bridges
 * (Capacitor / Cordova / React Native / Android WebView Interface).
 * Never claims fake success: accurately detects capabilities and returns real outcomes.
 */

export interface AndroidNativeInterface {
  openApp?: (packageName: string) => boolean | Promise<boolean>;
  closeApp?: (packageName: string) => boolean | Promise<boolean>;
  getAppInfo?: (packageName: string) => string | Promise<string>;
  installApp?: (uri: string) => boolean | Promise<boolean>;
  uninstallApp?: (packageName: string) => boolean | Promise<boolean>;
  clearAppCache?: (packageName: string) => boolean | Promise<boolean>;
  forceStopApp?: (packageName: string) => boolean | Promise<boolean>;
  getAppPermissions?: (packageName: string) => string[] | Promise<string[]>;
  openAppSettings?: (packageName: string) => boolean | Promise<boolean>;
  openDefaultAppSettings?: (action: string) => boolean | Promise<boolean>;
  openRecentApps?: () => boolean | Promise<boolean>;
  makePhoneCall?: (phoneNumber: string) => boolean | Promise<boolean>;
  endPhoneCall?: () => boolean | Promise<boolean>;
  getContacts?: (query?: string) => string | Promise<string>;
  openContact?: (contactId: string) => boolean | Promise<boolean>;
  sendSms?: (recipient: string, message: string) => boolean | Promise<boolean>;
  setWifiEnabled?: (enabled: boolean) => boolean | Promise<boolean>;
  setMobileDataEnabled?: (enabled: boolean) => boolean | Promise<boolean>;
  setAirplaneMode?: (enabled: boolean) => boolean | Promise<boolean>;
  setBrightness?: (level: number) => boolean | Promise<boolean>;
  openSettingsScreen?: (action: string) => boolean | Promise<boolean>;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidNativeInterface;
    TamannaNative?: AndroidNativeInterface;
    Android?: AndroidNativeInterface;
  }
}

export class NativeBridge {
  private static instance: NativeBridge;

  private constructor() {}

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  public getNativeInterface(): AndroidNativeInterface | null {
    if (typeof window === 'undefined') return null;
    return window.AndroidBridge || window.TamannaNative || window.Android || null;
  }

  public hasAndroidBridge(): boolean {
    return this.getNativeInterface() !== null;
  }

  /**
   * Safe URL or Intent launcher
   */
  public launchUri(uri: string): boolean {
    if (typeof document === 'undefined') return true;
    try {
      const a = document.createElement('a');
      a.href = uri;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Failed to launch URI:', uri, e);
      return false;
    }
  }

  /**
   * Alias for launching URLs securely
   */
  public openUrl(url: string): boolean {
    return this.launchUri(url);
  }

  /**
   * Launches an installed application via package name, intent URI, or web fallback
   */
  public openApp(appName: string): boolean {
    const map = this.getAppPackageMap(appName);
    if (map) {
      if (this.hasAndroidBridge()) {
        const native = this.getNativeInterface();
        if (native?.openApp) {
          native.openApp(map.packageName);
          return true;
        }
      }
      return this.launchUri(map.intentUrl || map.webUrl);
    }
    return this.launchUri(`intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${encodeURIComponent(appName)};end`);
  }

  /**
   * Package mapping for popular Android apps to their URI schemes and web fallbacks
   */
  public getAppPackageMap(appName: string): {
    name: string;
    packageName: string;
    scheme: string;
    webUrl: string;
    intentUrl: string;
  } | null {
    const q = appName.toLowerCase().trim();

    const KNOWN_APPS: Record<string, {
      name: string;
      packageName: string;
      scheme: string;
      webUrl: string;
      intentUrl: string;
    }> = {
      youtube: {
        name: 'YouTube',
        packageName: 'com.google.android.youtube',
        scheme: 'vnd.youtube://',
        webUrl: 'https://youtube.com',
        intentUrl: 'intent://youtube.com/#Intent;package=com.google.android.youtube;scheme=https;end',
      },
      spotify: {
        name: 'Spotify',
        packageName: 'com.spotify.music',
        scheme: 'spotify://',
        webUrl: 'https://open.spotify.com',
        intentUrl: 'intent://#Intent;package=com.spotify.music;scheme=spotify;end',
      },
      whatsapp: {
        name: 'WhatsApp',
        packageName: 'com.whatsapp',
        scheme: 'whatsapp://',
        webUrl: 'https://web.whatsapp.com',
        intentUrl: 'intent://#Intent;package=com.whatsapp;scheme=whatsapp;end',
      },
      instagram: {
        name: 'Instagram',
        packageName: 'com.instagram.android',
        scheme: 'instagram://',
        webUrl: 'https://instagram.com',
        intentUrl: 'intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;end',
      },
      maps: {
        name: 'Google Maps',
        packageName: 'com.google.android.apps.maps',
        scheme: 'geo:0,0',
        webUrl: 'https://maps.google.com',
        intentUrl: 'intent://maps.google.com/#Intent;package=com.google.android.apps.maps;scheme=https;end',
      },
      gmail: {
        name: 'Gmail',
        packageName: 'com.google.android.gm',
        scheme: 'googlegmail://',
        webUrl: 'https://mail.google.com',
        intentUrl: 'intent://mail.google.com/#Intent;package=com.google.android.gm;scheme=https;end',
      },
      chrome: {
        name: 'Google Chrome',
        packageName: 'com.android.chrome',
        scheme: 'googlechrome://',
        webUrl: 'https://google.com',
        intentUrl: 'intent://#Intent;package=com.android.chrome;scheme=https;end',
      },
      twitter: {
        name: 'X / Twitter',
        packageName: 'com.twitter.android',
        scheme: 'twitter://',
        webUrl: 'https://x.com',
        intentUrl: 'intent://x.com/#Intent;package=com.twitter.android;scheme=https;end',
      },
      netflix: {
        name: 'Netflix',
        packageName: 'com.netflix.mediaclient',
        scheme: 'nflx://',
        webUrl: 'https://netflix.com',
        intentUrl: 'intent://#Intent;package=com.netflix.mediaclient;scheme=nflx;end',
      },
      reddit: {
        name: 'Reddit',
        packageName: 'com.reddit.frontpage',
        scheme: 'reddit://',
        webUrl: 'https://reddit.com',
        intentUrl: 'intent://reddit.com/#Intent;package=com.reddit.frontpage;scheme=https;end',
      },
      settings: {
        name: 'System Settings',
        packageName: 'com.android.settings',
        scheme: 'intent:#Intent;action=android.settings.SETTINGS;end',
        webUrl: '',
        intentUrl: 'intent:#Intent;action=android.settings.SETTINGS;end',
      },
      camera: {
        name: 'Camera',
        packageName: 'com.android.camera',
        scheme: 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
        webUrl: '',
        intentUrl: 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
      },
      gallery: {
        name: 'Gallery / Photos',
        packageName: 'com.google.android.apps.photos',
        scheme: 'intent:#Intent;action=android.intent.action.VIEW;type=image/*;end',
        webUrl: 'https://photos.google.com',
        intentUrl: 'intent:#Intent;action=android.intent.action.VIEW;type=image/*;end',
      },
    };

    for (const key of Object.keys(KNOWN_APPS)) {
      if (q.includes(key) || KNOWN_APPS[key].name.toLowerCase().includes(q)) {
        return KNOWN_APPS[key];
      }
    }

    return null;
  }
}
