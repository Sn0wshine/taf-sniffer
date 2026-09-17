declare const __TAF_SNIFFER_ANDROID_PROXY_BASE__: string;

declare global {
  interface Window {
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
  }
}

export const androidProxyBase = (__TAF_SNIFFER_ANDROID_PROXY_BASE__ || "").replace(/\/+$/, "");

export const isAndroidRuntime = () => {
  const platform = window.Capacitor?.getPlatform?.();
  const native = window.Capacitor?.isNativePlatform?.();
  if (platform === "android" || (native && /android/i.test(platform || ""))) return true;
  return /Android/i.test(navigator.userAgent) && (/; wv\)/i.test(navigator.userAgent) || Boolean(window.Capacitor));
};
