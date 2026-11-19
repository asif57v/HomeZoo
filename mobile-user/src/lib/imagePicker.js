import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import toast from '../store/toastStore';

// Replacement for web <input type="file"> + Flutter camera bridge (utils/imageSource.js, flutterBridge.js).
// Permissions are requested on first use only.

// Ask camera vs gallery (web: pickImageSource sheet). Resolves 'camera' | 'gallery' | null
export const askImageSource = () => new Promise((resolve) => {
  Alert.alert('Add Photo', 'Choose a source', [
    { text: 'Take Photo (Camera)', onPress: () => resolve('camera') },
    { text: 'Choose from Gallery', onPress: () => resolve('gallery') },
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
  ], { cancelable: true, onDismiss: () => resolve(null) });
});

const toFile = (a, i = 0) => {
  const uri = a.uri;
  const ext = (a.mimeType && a.mimeType.split('/')[1]) || (uri.split('.').pop() || 'jpg').toLowerCase();
  return { uri, name: a.fileName || `photo_${Date.now()}_${i}.${ext === 'jpeg' ? 'jpg' : ext}`, type: a.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg'), size: a.fileSize, width: a.width, height: a.height };
};

// Downscale + recompress large photos before upload (web: imageCompressor)
const compress = async (file, maxDim = 1600, quality = 0.8) => {
  try {
    const w = file.width || 0; const h = file.height || 0;
    const actions = Math.max(w, h) > maxDim ? [{ resize: w >= h ? { width: maxDim } : { height: maxDim } }] : [];
    const out = await ImageManipulator.manipulateAsync(file.uri, actions, { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
    return { ...file, uri: out.uri, type: 'image/jpeg', name: file.name.replace(/\.\w+$/, '') + '.jpg' };
  } catch { return file; }
};

export const pickImages = async ({ multiple = false, source, compressImages = true } = {}) => {
  const src = source || (await askImageSource());
  if (!src) return [];
  try {
    let result;
    if (src === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.error('Camera permission is required to take a photo'); return []; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.accessPrivileges !== 'limited') { toast.error('Photo library permission is required'); return []; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: multiple, quality: 0.9, selectionLimit: multiple ? 20 : 1 });
    }
    if (result.canceled || !result.assets?.length) return [];
    const files = result.assets.map(toFile);
    return compressImages ? Promise.all(files.map((f) => compress(f))) : files;
  } catch {
    toast.error('Could not open the picker');
    return [];
  }
};

export const pickVideo = async () => {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') { toast.error('Media permission is required'); return null; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1, videoMaxDuration: 180 });
    if (result.canceled || !result.assets?.length) return null;
    const a = result.assets[0];
    return { uri: a.uri, name: a.fileName || `reel_${Date.now()}.mp4`, type: a.mimeType || 'video/mp4', size: a.fileSize, duration: a.duration };
  } catch { toast.error('Could not open the picker'); return null; }
};
