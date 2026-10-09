/**
 * Native Permission Service Adapter
 * Enforces Just-In-Time (JIT) Permission Requests.
 * 
 * Rules:
 *   - NEVER request permissions in bulk at application startup.
 *   - Request permissions strictly when a user initiates the respective action.
 */

import { getPlatformInfo } from './platform';

export type PermissionType = 'camera' | 'notifications' | 'photos' | 'files' | 'microphone';
export type PermissionState = 'granted' | 'denied' | 'prompt';

export class PermissionService {
  /**
   * Check permission state for a capability.
   */
  static async check(permission: PermissionType): Promise<PermissionState> {
    const p = getPlatformInfo();

    if (p.isSSR) return 'prompt';

    // 1. Future Native Adapter Seam (Capacitor Permissions)
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: any } }).Capacitor?.Plugins) {
      const plugins = (window as unknown as { Capacitor: { Plugins: any } }).Capacitor.Plugins;
      if (permission === 'camera' && plugins.Camera) {
        const res = await plugins.Camera.checkPermissions();
        return res.camera === 'granted' ? 'granted' : 'prompt';
      }
      if (permission === 'notifications' && plugins.PushNotifications) {
        const res = await plugins.PushNotifications.checkPermissions();
        return res.receive === 'granted' ? 'granted' : 'prompt';
      }
    }

    // 2. Web Permissions API
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        if (permission === 'camera' || permission === 'microphone') {
          const status = await navigator.permissions.query({ name: permission as PermissionName });
          return status.state;
        }
        if (permission === 'notifications' && typeof window !== 'undefined' && 'Notification' in window) {
          return Notification.permission as PermissionState;
        }
      } catch {
        // Fall through to prompt
      }
    }

    return 'prompt';
  }

  /**
   * Request permission just-in-time when user executes the feature.
   */
  static async request(permission: PermissionType): Promise<PermissionState> {
    const p = getPlatformInfo();

    if (p.isSSR) return 'denied';

    // 1. Future Native Adapter Seam
    if (p.isNative && (window as unknown as { Capacitor?: { Plugins?: any } }).Capacitor?.Plugins) {
      const plugins = (window as unknown as { Capacitor: { Plugins: any } }).Capacitor.Plugins;
      if (permission === 'camera' && plugins.Camera) {
        const res = await plugins.Camera.requestPermissions();
        return res.camera === 'granted' ? 'granted' : 'denied';
      }
      if (permission === 'notifications' && plugins.PushNotifications) {
        const res = await plugins.PushNotifications.requestPermissions();
        return res.receive === 'granted' ? 'granted' : 'denied';
      }
    }

    // 2. Web API Requests
    if (permission === 'notifications' && typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      return res as PermissionState;
    }

    if (permission === 'camera' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    }

    return 'granted';
  }
}
