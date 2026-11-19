import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { userService } from '../services/apiService';

// Native push (FCM device token). The web registers an FCM token via PUT /users/fcm-token with platform 'web'|'app';
// the app registers its device token with platform 'app'. Requires google-services.json at build time (see MEMORY.md).
let registered = false;

export const configureNotifications = () => {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX }).catch(() => {});
      // Backend FCM messages use android.notification.channelId = 'homezoo_channel' (fcmController / notification service)
      Notifications.setNotificationChannelAsync('homezoo_channel', { name: 'Hoomzo', importance: Notifications.AndroidImportance.MAX, sound: 'default' }).catch(() => {});
    }
  } catch {}
};

export const registerForPush = async () => {
  try {
    if (!Device.isDevice) return null;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;
    const tokenObj = await Notifications.getDevicePushTokenAsync();
    const token = tokenObj?.data;
    if (!token) return null;
    await userService.updateFcmToken(token, 'app');
    registered = true;
    return token;
  } catch {
    return null; // Push not configured (no google-services.json) or denied: app keeps working
  }
};

export const isPushRegistered = () => registered;
