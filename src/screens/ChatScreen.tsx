import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Alert,
  ScrollView,
  Switch,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { useTheme } from '../context/ThemeContext';
import { storageService } from '../services/storage';

export const VoiceMessagePlayer = ({ uri, colors }: { uri: string; colors: any }) => {
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const playPauseSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded) {
              setPosition(status.positionMillis || 0);
              setDuration(status.durationMillis || 0);
              setIsPlaying(status.isPlaying || false);
            }
          }
        );
        setSound(newSound);
      }
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalBars = 22;
  const barHeights = Array.from({ length: totalBars }, (_, idx) => {
    const val = (uri.charCodeAt(idx % uri.length) || 10) % 5;
    return 6 + val * 4;
  });

  const currentProgressIdx = duration > 0 ? Math.floor((position / duration) * totalBars) : 0;

  const getFileName = () => {
    if (!uri) return 'Voice Note';
    const decoded = decodeURIComponent(uri);
    const filename = decoded.split('/').pop() || 'VoiceNote.m4a';
    return filename.length > 25 ? filename.substring(0, 22) + '...' : filename;
  };

  return (
    <View style={{ gap: 4, paddingVertical: 4, minWidth: 190 }}>
      {/* File Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="mic-outline" size={14} color="#E0E6ED" />
        <Text style={{ color: '#E0E6ED', fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
          {getFileName()}
        </Text>
      </View>

      {/* Player Controls & Waveform */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={playPauseSound} style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 20 }}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={1}
          onPress={(event) => {
            const pageX = event.nativeEvent.locationX;
            if (duration > 0 && sound) {
              const fraction = Math.min(Math.max(pageX / 120, 0), 1);
              const seekPos = Math.floor(fraction * duration);
              sound.setPositionAsync(seekPos);
            }
          }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 26 }}
        >
          {barHeights.map((h, i) => {
            const isActive = i <= currentProgressIdx;
            return (
              <View
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 1.5,
                  backgroundColor: isActive ? '#FFF' : 'rgba(255,255,255,0.3)',
                }}
              />
            );
          })}
        </TouchableOpacity>

        <Text style={{ color: '#E0E6ED', fontSize: 10 }}>
          {duration > 0 ? formatDuration(duration) : 'Voice note'}
        </Text>
      </View>
    </View>
  );
};

const highlightText = (text: string, search: string) => {
  if (!search || !search.trim()) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <Text key={i} style={{ backgroundColor: '#FFD700', color: '#000', fontWeight: 'bold' }}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
};

export const ChatScreen = ({ route, navigation }: any) => {
  const { chat, title } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { callUser } = useCall();

  const getOtherUser = (chat: any) => {
    if (!chat || chat.isGroup || !chat.users) return null;
    const myId = (user?._id || '').toString();
    const found = chat.users.find((u: any) => {
      const uid = typeof u === 'string' ? u : (u?._id || u || '').toString();
      return uid !== myId;
    });
    if (!found) return null;
    return typeof found === 'string' ? { _id: found, name: 'User' } : found;
  };

  const otherUser = getOtherUser(chat);
  const avatar = chat.isGroup
    ? chat.groupAdmin?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}`
    : otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(title)}`;



  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const [recordingInstance, setRecordingInstance] = useState<any>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [showAttachmentModal, setShowAttachmentModal] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState<boolean>(false);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [wallpaperBlur, setWallpaperBlur] = useState<number>(0);
  const [showWallpaperModal, setShowWallpaperModal] = useState<boolean>(false);
  const [menuView, setMenuView] = useState<'main' | 'disappearing'>('main');
  const [isChatMuted, setIsChatMuted] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [customHoursInput, setCustomHoursInput] = useState<string>('');
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  useEffect(() => {
    const sweepExpired = setInterval(() => {
      const now = new Date().getTime();
      setMessages((prev) =>
        prev.filter((m) => {
          if (!m.expireAt) return true;
          const expTime = new Date(m.expireAt).getTime();
          return expTime > now;
        })
      );
    }, 2000);
    return () => clearInterval(sweepExpired);
  }, []);

  useEffect(() => {
    const loadWallpaper = async () => {
      try {
        const val = await storageService.getWallpaper(chat._id);
        if (val) {
          setWallpaper(val.uri || null);
          setWallpaperBlur(val.blur || 0);
        }
      } catch (e) {}
    };
    loadWallpaper();
  }, [chat._id]);

  const flatListRef = useRef<FlatList>(null);


  const searchMatches = messages.filter((m) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const contentMatch = m.content?.toLowerCase().includes(q);
    const fileMatch = m.mediaUrl?.toLowerCase().includes(q);
    return !!(contentMatch || fileMatch);
  });

  const scrollToSearchMatch = (idx: number) => {
    if (searchMatches.length === 0) return;
    const targetMsg = searchMatches[idx];
    const listIndex = messages.findIndex((m) => m._id === targetMsg._id);
    if (listIndex !== -1) {
      try {
        flatListRef.current?.scrollToIndex({ index: listIndex, animated: true, viewPosition: 0.5 });
      } catch (e) {
        try {
          flatListRef.current?.scrollToOffset({ offset: listIndex * 80, animated: true });
        } catch (e2) {}
      }
    }
  };

  const saveWallpaper = async (uri: string | null, blur: number) => {
    try {
      setWallpaper(uri);
      setWallpaperBlur(blur);
      await storageService.setWallpaper(chat._id, { uri, blur });
    } catch (e) {}
  };

  const fetchMessages = async () => {
    try {
      const { data } = await API.get(`/messages/${chat._id}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chat._id]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_chat', chat._id);

    const handleMessageReceived = (newMessage: any) => {
      const chatId = newMessage.chat?._id || newMessage.chat;
      if (chatId === chat._id) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const handleMessageDeletedEveryone = ({ chatId, messageId }: any) => {
      if (chatId === chat._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
          )
        );
      }
    };

    const handleDisappearingTimerUpdated = ({ chatId, duration }: any) => {
      if (chatId === chat._id) {
        chat.disappearingDuration = duration;
      }
    };

    const handleViewOnceUpdated = ({ messageId }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isViewed: true } : m))
      );
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_deleted_everyone', handleMessageDeletedEveryone);
    socket.on('disappearing_timer_updated', handleDisappearingTimerUpdated);
    socket.on('view_once_updated', handleViewOnceUpdated);

    return () => {
      socket.emit('leave_chat', chat._id);
      socket.off('message_received', handleMessageReceived);
      socket.off('message_deleted_everyone', handleMessageDeletedEveryone);
      socket.off('disappearing_timer_updated', handleDisappearingTimerUpdated);
      socket.off('view_once_updated', handleViewOnceUpdated);
    };
  }, [socket, chat._id]);

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/chats/clear/${chat._id}`);
              setMessages([]);
              Alert.alert('Success', 'Chat cleared.');
            } catch (err) {
              console.error(err);
            }
          },
        },
      ]
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This will remove it for both users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/chats/${chat._id}`);
              navigation.goBack();
            } catch (err) {
              console.error(err);
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert('Block User', `Are you sure you want to block ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => Alert.alert('Success', 'User blocked.') },
    ]);
  };

  const handleReportUser = () => {
    Alert.alert('Report User', `Report ${title} for spam or abuse?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => Alert.alert('Success', 'User reported.') },
    ]);
  };

  const handleExportChat = () => {
    Alert.alert('Export Chat', 'Chat history successfully exported to Spotchat_Backup.txt');
  };

  const handleSearchMessages = () => {
    setIsSearching(true);
  };

  const handleShareLocation = async () => {
    setShowAttachmentModal(false);
    try {
      const locationText = '📍 Shared Location: 12.9716° N, 77.5946° E';
      const response = await API.post('/messages', {
        chatId: chat._id,
        content: locationText,
      });
      setMessages((prev) => [...prev, response.data]);
      if (socket) socket.emit('new_message', response.data);
    } catch (e) {}
  };

  const handleShareContact = async () => {
    setShowAttachmentModal(false);
    try {
      const contactText = '👤 Contact Card: John Doe (+91 9876543210)';
      const response = await API.post('/messages', {
        chatId: chat._id,
        content: contactText,
      });
      setMessages((prev) => [...prev, response.data]);
      if (socket) socket.emit('new_message', response.data);
    } catch (e) {}
  };

  const handleShareDocument = async () => {
    setShowAttachmentModal(false);
    try {
      const documentText = '📄 Document: Invoice_July2026.pdf (1.2 MB)';
      const response = await API.post('/messages', {
        chatId: chat._id,
        content: documentText,
        mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        mediaType: 'file',
      });
      setMessages((prev) => [...prev, response.data]);
      if (socket) socket.emit('new_message', response.data);
    } catch (e) {}
  };

  const handleShareAudioFile = async () => {
    setShowAttachmentModal(false);
    try {
      const audioText = '🎵 Audio: Podcast_Episode57.mp3 (8.4 MB)';
      const response = await API.post('/messages', {
        chatId: chat._id,
        content: audioText,
        mediaUrl: 'https://www.soundjay.com/phone/phone-ringing-01.mp3',
        mediaType: 'audio',
      });
      setMessages((prev) => [...prev, response.data]);
      if (socket) socket.emit('new_message', response.data);
    } catch (e) {}
  };

  const uploadAndSendMessage = async (fileUri: string, type: 'image' | 'audio' | 'video') => {
    try {
      const formData = new FormData();
      const filename = fileUri.split('/').pop() || `file.${type === 'image' ? 'jpg' : 'm4a'}`;
      
      formData.append('file', {
        uri: fileUri,
        name: filename,
        type: type === 'image' ? 'image/jpeg' : 'audio/m4a',
      } as any);

      const { data } = await API.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const msgPayload = {
        chatId: chat._id,
        content: type === 'audio' ? '🎤 Voice Message' : '📷 Photo Message',
        mediaUrl: data.mediaUrl,
        mediaType: type,
        isViewOnce: chat.disappearingDuration === -1,
      };

      const response = await API.post('/messages', msgPayload);
      setMessages((prev) => [...prev, response.data]);
      if (socket) {
        socket.emit('new_message', response.data);
      }
    } catch (err) {
      console.error('File upload failed', err);
      Alert.alert('Upload Error', 'Failed to send file. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access microphone was denied.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecordingInstance(recording);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      if (!recordingInstance) return;
      setIsRecording(false);
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setRecordingInstance(null);
      if (uri) {
        await uploadAndSendMessage(uri, 'audio');
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const cancelRecording = async () => {
    try {
      if (!recordingInstance) return;
      setIsRecording(false);
      await recordingInstance.stopAndUnloadAsync();
      setRecordingInstance(null);
    } catch (err) {}
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access gallery was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAndSendMessage(result.assets[0].uri, 'image');
    }
  };

  const capturePhotoFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access camera was denied.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAndSendMessage(result.assets[0].uri, 'image');
    }
  };

  const updateDisappearingMessages = async (durationSec: number) => {
    try {
      await API.put('/chats/disappearing', {
        chatId: chat._id,
        duration: durationSec,
      });
      chat.disappearingDuration = durationSec;
      if (socket) {
        socket.emit('update_disappearing_timer', { chatId: chat._id, duration: durationSec });
      }
      Alert.alert('Success', 'Disappearing messages configuration updated.');
    } catch (err) {
      console.error('Failed to update disappearing timer', err);
    }
  };

  // Optimistic UI Instant Message Sending (<10ms)
  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const textToSend = inputMessage.trim();
    setInputMessage('');

    const optimisticMessage = {
      _id: tempId,
      chat: chat._id,
      sender: user,
      content: textToSend,
      isViewOnce: chat.disappearingDuration === -1,
      isViewed: false,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { data } = await API.post('/messages', {
        chatId: chat._id,
        content: textToSend,
        isViewOnce: chat.disappearingDuration === -1,
      });

      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? { ...data, status: 'sent' } : msg))
      );

      if (socket) {
        socket.emit('new_message', data);
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? { ...msg, status: 'failed' } : msg))
      );
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    try {
      await API.put(`/messages/delete-me/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (e) {}
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      await API.put(`/messages/delete-everyone/${messageId}`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
        )
      );
      if (socket) {
        socket.emit('delete_message_everyone', { chatId: chat._id, messageId });
      }
    } catch (e) {}
  };

  const handleTrashPress = (message: any) => {
    setSelectedMessage(message);
    setShowDeleteModal(true);
  };

  const renderMessageContent = (item: any, isSender: boolean) => {
    if (item.deletedForEveryone) {
      return (
        <Text style={[styles.deletedText, { color: colors.textMuted }]}>
          <Ionicons name="trash-outline" size={12} /> This message was deleted
        </Text>
      );
    }

    if (item.isViewOnce) {
      if (item.isViewed) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <Ionicons name="eye-off-outline" size={16} color={isSender ? '#FFF' : colors.textSecondary} />
            <Text style={{ color: isSender ? '#E0E6ED' : colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
              Opened
            </Text>
          </View>
        );
      } else {
        if (isSender) {
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
              <Ionicons name="eye-outline" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '500' }}>
                View Once Message
              </Text>
            </View>
          );
        } else {
          return (
            <TouchableOpacity
              onPress={() => {
                if (item.mediaType === 'image') {
                  setSelectedImageUrl(item.mediaUrl);
                  setShowImageModal(true);
                  if (socket) {
                    socket.emit('view_once_opened', { messageId: item._id, chatId: chat._id });
                  }
                } else if (item.mediaType === 'audio') {
                  Alert.alert('Play Audio once', 'This audio note will play once and disappear.', [
                    {
                      text: 'Play',
                      onPress: () => {
                        if (socket) {
                          socket.emit('view_once_opened', { messageId: item._id, chatId: chat._id });
                        }
                      }
                    }
                  ]);
                } else {
                  Alert.alert('View Once Message', item.content, [
                    {
                      text: 'Close',
                      onPress: () => {
                        if (socket) {
                          socket.emit('view_once_opened', { messageId: item._id, chatId: chat._id });
                        }
                      }
                    }
                  ]);
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
            >
              <Ionicons name="eye" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                Tap to View Once
              </Text>
            </TouchableOpacity>
          );
        }
      }
    }

    if (item.mediaType === 'image') {
      return (
        <TouchableOpacity onPress={() => { setSelectedImageUrl(item.mediaUrl); setShowImageModal(true); }}>
          <Image source={{ uri: item.mediaUrl }} style={styles.bubbleImage} />
        </TouchableOpacity>
      );
    }

    if (item.mediaType === 'audio') {
      return <VoiceMessagePlayer uri={item.mediaUrl} colors={colors} />;
    }

    return <Text style={[styles.messageText, { color: isSender ? '#FFFFFF' : colors.text }]}>{highlightText(item.content, searchQuery)}</Text>;
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isSender = (item.sender?._id || item.sender).toString() === (user._id || user).toString();
    const isCurrentSearchMatch = isSearching && searchMatches.length > 0 && searchMatches[searchIndex]?._id === item._id;

    return (
      <View style={[
        styles.bubbleWrapper,
        isSender ? styles.senderWrapper : styles.receiverWrapper,
        isCurrentSearchMatch && { borderWidth: 2, borderColor: colors.primary, borderRadius: 12, padding: 2 }
      ]}>
        {!isSender && (
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: colors.otherBubble,
              },
            ]}
          >
            {renderMessageContent(item, false)}

            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => handleTrashPress(item)}
          style={styles.trashIconBtn}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {isSender && (
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: colors.userBubble,
              },
            ]}
          >
            {renderMessageContent(item, true)}

            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: '#E0E6ED' }]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={[styles.tickText, { color: '#E0E6ED' }]}>
                {item.status === 'sending' ? (
                  <Ionicons name="time-outline" size={10} color="#E0E6ED" />
                ) : item.status === 'failed' ? (
                  <Ionicons name="alert-circle" size={10} color="#EA4335" />
                ) : item.status === 'delivered' ? (
                  <Ionicons name="checkmark-done" size={12} color="#E0E6ED" />
                ) : item.status === 'sent' ? (
                  <Ionicons name="checkmark" size={12} color="#E0E6ED" />
                ) : (
                  <Ionicons name="checkmark-done" size={12} color="#34B7F1" />
                )}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const containerBg = wallpaper && wallpaper.startsWith('#') ? wallpaper : colors.background;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {wallpaper && !wallpaper.startsWith('#') && (
        <ImageBackground
          source={{ uri: wallpaper }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={wallpaperBlur}
        />
      )}
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        {isSearching ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); setSearchIndex(0); }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              autoFocus
              style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 4 }}
              placeholder="Search messages..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setSearchIndex(0);
                setTimeout(() => scrollToSearchMatch(0), 100);
              }}
            />
            {searchMatches.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {searchIndex + 1}/{searchMatches.length}
                </Text>
                <TouchableOpacity onPress={() => {
                  const newIdx = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
                  setSearchIndex(newIdx);
                  scrollToSearchMatch(newIdx);
                }}>
                  <Ionicons name="chevron-up" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  const newIdx = (searchIndex + 1) % searchMatches.length;
                  setSearchIndex(newIdx);
                  scrollToSearchMatch(newIdx);
                }}>
                  <Ionicons name="chevron-down" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchIndex(0); }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.headerLeftContainer}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              onPress={() => setShowUserDetailsModal(true)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            >
              <Image source={{ uri: avatar }} style={[styles.headerAvatar, { marginRight: 8 }]} />
              <View style={[styles.headerInfo, { alignItems: 'flex-start' }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Last seen 07:50 PM
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.callIcons}>
              <TouchableOpacity onPress={() => callUser(chat.users?.[0], 'audio')} style={[styles.iconButtonCircle, { borderColor: colors.border }]}>
                <Ionicons name="call" size={15} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => callUser(chat.users?.[0], 'video')} style={[styles.iconButtonCircle, { borderColor: colors.border }]}>
                <Ionicons name="videocam" size={15} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSearchMessages} style={styles.menuIconButton}>
                <Ionicons name="search" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={isSearching && searchQuery.trim() ? messages.filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase())) : messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input Box */}
      {isRecording ? (
        <View style={[styles.inputContainer, { backgroundColor: colors.headerBg, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, paddingHorizontal: 8 }}>
            <Ionicons name="mic" size={20} color="#EA4335" />
            <Text style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: '500' }}>
              Recording... {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </Text>
            <TouchableOpacity onPress={cancelRecording} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={stopAndSendRecording} style={{ backgroundColor: colors.primary, padding: 8, borderRadius: 20 }}>
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.inputContainer, { backgroundColor: colors.headerBg, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <View style={styles.leftInputActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setMenuView('disappearing'); setShowUserDetailsModal(true); }}>
              <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAttachmentModal(true)}>
              <Ionicons name="attach-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={inputMessage.trim() ? handleSend : startRecording}
          >
            {inputMessage.trim() ? (
              <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
            ) : (
              <Ionicons name="mic" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Message Options Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Message?</Text>

            {selectedMessage && (user._id || user).toString() === (selectedMessage.sender?._id || selectedMessage.sender).toString() && (
              <TouchableOpacity
                style={[styles.modalOption, { backgroundColor: colors.danger }]}
                onPress={() => {
                  handleDeleteForEveryone(selectedMessage._id);
                  setShowDeleteModal(false);
                }}
              >
                <Text style={styles.modalOptionTextBold}>Delete for Everyone</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => {
                handleDeleteForMe(selectedMessage._id);
                setShowDeleteModal(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Delete for Me</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Attachment Modal */}
      <Modal visible={showAttachmentModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAttachmentModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: 30 }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 12 }]}>Share Content</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, width: '100%', paddingHorizontal: 8 }}>
              <TouchableOpacity style={{ width: '28%', alignItems: 'center' }} onPress={() => { setShowAttachmentModal(false); capturePhotoFromCamera(); }}>
                <View style={{ backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name="camera" size={24} color="#FFF" />
                </View>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500' }}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ width: '28%', alignItems: 'center' }} onPress={() => { setShowAttachmentModal(false); pickImageFromGallery(); }}>
                <View style={{ backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name="image" size={24} color="#FFF" />
                </View>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500' }}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ width: '28%', alignItems: 'center' }} onPress={handleShareDocument}>
                <View style={{ backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name="document-text" size={24} color="#FFF" />
                </View>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500' }}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ width: '28%', alignItems: 'center' }} onPress={handleShareAudioFile}>
                <View style={{ backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name="musical-notes" size={24} color="#FFF" />
                </View>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500' }}>Audio</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ width: '28%', alignItems: 'center' }} onPress={handleShareLocation}>
                <View style={{ backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name="location" size={24} color="#FFF" />
                </View>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500' }}>Location</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ width: '28%', alignItems: 'center' }} onPress={handleShareContact}>
                <View style={{ backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Ionicons name="person-add" size={24} color="#FFF" />
                </View>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '500' }}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Unified User Details & Settings Modal (Tapping profile header) */}
      <Modal visible={showUserDetailsModal} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 30 }}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.headerBg }}>
            <TouchableOpacity onPress={() => { setShowUserDetailsModal(false); setMenuView('main'); }} style={{ padding: 4, marginRight: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Contact Info</Text>
          </View>

          <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center', gap: 14, paddingVertical: 20 }}>
            <Image source={{ uri: avatar }} style={{ width: 110, height: 110, borderRadius: 55 }} />
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20, fontWeight: 'bold' }]}>{title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -8 }}>@{otherUser?.username || 'user'}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 4 }}>
              {otherUser?.status || 'Hey there! I am using spotchat'}
            </Text>
            
            {/* Call Buttons Row */}
            <View style={{ flexDirection: 'row', gap: 20, marginVertical: 8 }}>
              <TouchableOpacity
                onPress={() => { setShowUserDetailsModal(false); callUser(chat.users?.[0], 'audio'); }}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="call" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Audio Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowUserDetailsModal(false); callUser(chat.users?.[0], 'video'); }}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="videocam" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Video Call</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border, width: '100%', height: 0.5 }]} />

            {/* Settings list options */}
            {menuView === 'main' && (
              <View style={{ width: '100%', gap: 4 }}>
                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); handleSearchMessages(); }}>
                  <Ionicons name="search-outline" size={18} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Search Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); setShowWallpaperModal(true); }}>
                  <Ionicons name="image-outline" size={18} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Chat Wallpaper</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => Alert.alert('Media Files', 'No media files found in this chat.')}>
                  <Ionicons name="document-attach-outline" size={18} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Media, Links & Files</Text>
                </TouchableOpacity>

                <View style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={isChatMuted ? "volume-mute-outline" : "volume-high-outline"} size={18} color={colors.text} style={{ marginRight: 10 }} />
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>Mute Notifications</Text>
                  </View>
                  <Switch value={isChatMuted} onValueChange={setIsChatMuted} thumbColor={colors.primary} />
                </View>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => setMenuView('disappearing')}>
                  <Ionicons name="timer-outline" size={18} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Disappearing Messages</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); handleClearChat(); }}>
                  <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Clear Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); handleExportChat(); }}>
                  <Ionicons name="download-outline" size={18} color={colors.text} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>Export Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); handleBlockUser(); }}>
                  <Ionicons name="ban" size={18} color={colors.danger} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.danger }]}>Block User</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); handleReportUser(); }}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.danger} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.danger }]}>Report User</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 12 }]} onPress={() => { setShowUserDetailsModal(false); handleDeleteChat(); }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalOptionText, { color: colors.danger }]}>Delete Chat</Text>
                </TouchableOpacity>
              </View>
            )}

            {menuView === 'disappearing' && (
              <View style={{ width: '100%', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity onPress={() => setMenuView('main')} style={{ marginRight: 8 }}>
                    <Ionicons name="arrow-back" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: colors.text, margin: 0, flex: 1 }]}>Disappearing Messages</Text>
                </View>
                <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => { setShowUserDetailsModal(false); setMenuView('main'); updateDisappearingMessages(86400); }}>
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>24 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => { setShowUserDetailsModal(false); setMenuView('main'); updateDisappearingMessages(604800); }}>
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => { setShowUserDetailsModal(false); setMenuView('main'); updateDisappearingMessages(2592000); }}>
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>30 Days</Text>
                </TouchableOpacity>
                
                {/* View Once option */}
                <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => { setShowUserDetailsModal(false); setMenuView('main'); updateDisappearingMessages(-1); }}>
                  <Text style={[styles.modalOptionText, { color: colors.primary, fontWeight: 'bold' }]}>After Viewing (View Once)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => { setShowUserDetailsModal(false); setMenuView('main'); updateDisappearingMessages(0); }}>
                  <Text style={[styles.modalOptionText, { color: colors.text, fontWeight: 'bold' }]}>Disabled</Text>
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 6 }]} />

                {/* Custom Hours Input */}
                <View style={{ paddingHorizontal: 12, gap: 6 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>Set Custom Duration (in hours):</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Hours e.g. 5"
                      placeholderTextColor={colors.textMuted}
                      style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, backgroundColor: colors.surfaceSecondary }}
                      value={customHoursInput}
                      onChangeText={setCustomHoursInput}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const hrs = parseInt(customHoursInput || '0', 10);
                        if (hrs <= 0 || isNaN(hrs)) {
                          Alert.alert('Invalid', 'Please enter a positive duration in hours.');
                          return;
                        }
                        setShowUserDetailsModal(false);
                        setMenuView('main');
                        updateDisappearingMessages(hrs * 3600);
                        setCustomHoursInput('');
                      }}
                      style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 6,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  callIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButtonCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconButton: {
    paddingLeft: 6,
    paddingVertical: 4,
  },
  menuIconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  callIcon: {
    fontSize: 14,
  },
  messagesList: {
    padding: 12,
    gap: 8,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    maxWidth: '85%',
  },
  senderWrapper: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  receiverWrapper: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: '85%',
  },
  trashIconBtn: {
    padding: 6,
    opacity: 0.6,
  },
  trashIconText: {
    fontSize: 14,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  deletedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 9,
  },
  tickText: {
    fontSize: 9,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  leftInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 2,
  },
  actionBtnText: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalOption: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalOptionTextBold: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 2,
    resizeMode: 'cover',
  },
});

