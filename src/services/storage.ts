import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'spotchat_user_mobile';
const CHAT_CACHE_KEY = 'spotchat_messages_cache';

export const storageService = {
  async getUser(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to get user from AsyncStorage:', e);
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user to AsyncStorage:', e);
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to remove user from AsyncStorage:', e);
    }
  },

  async getCachedMessages(chatId: string): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(`${CHAT_CACHE_KEY}_${chatId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async setCachedMessages(chatId: string, messages: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CHAT_CACHE_KEY}_${chatId}`, JSON.stringify(messages));
    } catch (e) {}
  },

  async getWallpaper(chatId: string): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(`spotchat_wallpaper_${chatId}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  async setWallpaper(chatId: string, wallpaperData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`spotchat_wallpaper_${chatId}`, JSON.stringify(wallpaperData));
    } catch (e) {}
  },
};
