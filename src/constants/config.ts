// Production & Local Backend Configuration for spotchat Mobile App
export const API_BASE_URL = 'https://spotchat-suiv.onrender.com/api';
export const SOCKET_BASE_URL = 'https://spotchat-suiv.onrender.com';

// Fallback local development endpoints
export const LOCAL_API_BASE_URL = 'http://10.0.2.2:5000/api';
export const LOCAL_SOCKET_BASE_URL = 'http://10.0.2.2:5000';

export const APP_CONFIG = {
  appName: 'spotchat',
  version: '1.0.0',
  defaultStatus: 'Hey there! I am using spotchat',
  maxMessageLength: 2000,
  voiceMaxDurationSec: 120,
};
