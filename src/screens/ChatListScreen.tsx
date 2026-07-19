import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';


export const ChatListScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups'>('all');

  const fetchChats = async () => {
    try {
      const { data } = await API.get('/chats');
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessage: any) => {
      fetchChats();
    };

    const handleChatDeleted = ({ chatId }: any) => {
      setChats((prev) => prev.filter((c) => c._id !== chatId));
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('chat_deleted', handleChatDeleted);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('chat_deleted', handleChatDeleted);
    };
  }, [socket]);

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

  const filteredChats = chats.filter((chat) => {
    const isGroup = chat.isGroup;
    if (activeTab === 'direct' && isGroup) return false;
    if (activeTab === 'groups' && !isGroup) return false;

    const otherUser = getOtherUser(chat);
    const title = isGroup ? chat.chatName : otherUser?.name || '';
    const term = searchQuery.toLowerCase().replace('@', '');

    return title.toLowerCase().includes(term);
  });

  const renderChatItem = ({ item }: { item: any }) => {
    const isGroup = item.isGroup;
    const otherUser = getOtherUser(item);
    const title = isGroup ? item.chatName : otherUser?.name || 'User';
    const avatar = isGroup
      ? item.groupAdmin?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}`
      : otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(title)}`;

    const isOnline = otherUser ? onlineUsers.get(otherUser._id?.toString())?.isOnline ?? otherUser.isOnline : false;
    const latestMsg = item.latestMessage;

    return (
      <TouchableOpacity
        style={[styles.chatRow, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('Chat', { chat: item, title })}
      >
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          {isOnline && <View style={[styles.onlineDot, { backgroundColor: colors.accent }]} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.rowHeader}>
            <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {latestMsg?.createdAt && (
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <Text style={[styles.latestText, { color: colors.textSecondary }]} numberOfLines={1}>
            {latestMsg?.content || (latestMsg?.mediaUrl ? 'Attachment' : 'No messages yet')}
          </Text>
        </View>
      </TouchableOpacity>

    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>spotchat</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: user?.avatar }} style={styles.myAvatar} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchPadding}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
          placeholder="Search chats or @username..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'direct', 'groups'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterTab,
              { backgroundColor: activeTab === tab ? colors.primary : colors.surfaceSecondary },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={{ color: activeTab === tab ? '#FFF' : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No conversations found. Tap search to start a new chat!
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  searchPadding: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#0B141A',
  },
  chatInfo: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  timeText: {
    fontSize: 11,
  },
  latestText: {
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
});
