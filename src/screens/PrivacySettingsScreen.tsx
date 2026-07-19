import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const PrivacySettingsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  // Privacy Selectors
  const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [onlineStatus, setOnlineStatus] = useState<'everyone' | 'same'>('everyone');
  const [readReceipts, setReadReceipts] = useState<boolean>(true);
  const [profilePhoto, setProfilePhoto] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [about, setAbout] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [groups, setGroups] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [calls, setCalls] = useState<'everyone' | 'contacts'>('everyone');
  
  const [blockedUsers, setBlockedUsers] = useState<string[]>([
    'spam_bot_99',
    'unknown_telemarketer'
  ]);

  const handleUnblock = (user: string) => {
    Alert.alert('Unblock User', `Do you want to unblock ${user}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => {
          setBlockedUsers((prev) => prev.filter((u) => u !== user));
          Alert.alert('Unblocked', `${user} has been unblocked.`);
        },
      },
    ]);
  };

  const handleAddBlock = () => {
    Alert.prompt('Block User', 'Enter username to block:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        onPress: (username) => {
          if (username && username.trim()) {
            setBlockedUsers((prev) => [...prev, username.trim()]);
            Alert.alert('Blocked', `${username} has been blocked.`);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
      </View>

      {/* Last Seen Selector */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LAST SEEN & ONLINE</Text>
      <View style={[styles.optionsSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.subheaderText, { color: colors.textSecondary }]}>Who can see my Last Seen</Text>
        <TouchableOpacity style={styles.optionRowSimple} onPress={() => setLastSeen('everyone')}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Everyone</Text>
          {lastSeen === 'everyone' && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRowSimple} onPress={() => setLastSeen('contacts')}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>My Contacts</Text>
          {lastSeen === 'contacts' && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRowSimple} onPress={() => setLastSeen('nobody')}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Nobody</Text>
          {lastSeen === 'nobody' && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.subheaderText, { color: colors.textSecondary, marginTop: 8 }]}>Who can see when I'm online</Text>
        <TouchableOpacity style={styles.optionRowSimple} onPress={() => setOnlineStatus('everyone')}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Everyone</Text>
          {onlineStatus === 'everyone' && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRowSimple} onPress={() => setOnlineStatus('same')}>
          <Text style={[styles.optionLabel, { color: colors.text }]}>Same as Last Seen</Text>
          {onlineStatus === 'same' && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Read Receipts */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MESSAGING</Text>
      <View style={[styles.optionsSection, { backgroundColor: colors.surface }]}>
        <View style={styles.optionRowToggle}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Read Receipts</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
              If turned off, you won't send or receive Read Receipts. Read receipts are always sent for group chats.
            </Text>
          </View>
          <Switch value={readReceipts} onValueChange={setReadReceipts} thumbColor={colors.primary} />
        </View>
      </View>

      {/* Profile Photo & About */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERSONAL INFO PRIVACY</Text>
      <View style={[styles.optionsSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.subheaderText, { color: colors.textSecondary }]}>Profile Photo</Text>
        <View style={styles.rowSelector}>
          <TouchableOpacity style={[styles.selectorBtn, profilePhoto === 'everyone' && { backgroundColor: colors.primary }]} onPress={() => setProfilePhoto('everyone')}>
            <Text style={[styles.selectorBtnText, profilePhoto === 'everyone' && { color: '#FFF' }]}>Everyone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, profilePhoto === 'contacts' && { backgroundColor: colors.primary }]} onPress={() => setProfilePhoto('contacts')}>
            <Text style={[styles.selectorBtnText, profilePhoto === 'contacts' && { color: '#FFF' }]}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, profilePhoto === 'nobody' && { backgroundColor: colors.primary }]} onPress={() => setProfilePhoto('nobody')}>
            <Text style={[styles.selectorBtnText, profilePhoto === 'nobody' && { color: '#FFF' }]}>Nobody</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.subheaderText, { color: colors.textSecondary, marginTop: 8 }]}>About</Text>
        <View style={styles.rowSelector}>
          <TouchableOpacity style={[styles.selectorBtn, about === 'everyone' && { backgroundColor: colors.primary }]} onPress={() => setAbout('everyone')}>
            <Text style={[styles.selectorBtnText, about === 'everyone' && { color: '#FFF' }]}>Everyone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, about === 'contacts' && { backgroundColor: colors.primary }]} onPress={() => setAbout('contacts')}>
            <Text style={[styles.selectorBtnText, about === 'contacts' && { color: '#FFF' }]}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, about === 'nobody' && { backgroundColor: colors.primary }]} onPress={() => setAbout('nobody')}>
            <Text style={[styles.selectorBtnText, about === 'nobody' && { color: '#FFF' }]}>Nobody</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Groups & Calls */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GROUPS & CALLS</Text>
      <View style={[styles.optionsSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.subheaderText, { color: colors.textSecondary }]}>Who can add me to groups</Text>
        <View style={styles.rowSelector}>
          <TouchableOpacity style={[styles.selectorBtn, groups === 'everyone' && { backgroundColor: colors.primary }]} onPress={() => setGroups('everyone')}>
            <Text style={[styles.selectorBtnText, groups === 'everyone' && { color: '#FFF' }]}>Everyone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, groups === 'contacts' && { backgroundColor: colors.primary }]} onPress={() => setGroups('contacts')}>
            <Text style={[styles.selectorBtnText, groups === 'contacts' && { color: '#FFF' }]}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, groups === 'nobody' && { backgroundColor: colors.primary }]} onPress={() => setGroups('nobody')}>
            <Text style={[styles.selectorBtnText, groups === 'nobody' && { color: '#FFF' }]}>Nobody</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.subheaderText, { color: colors.textSecondary, marginTop: 8 }]}>Who can call me</Text>
        <View style={styles.rowSelector}>
          <TouchableOpacity style={[styles.selectorBtn, calls === 'everyone' && { backgroundColor: colors.primary }]} onPress={() => setCalls('everyone')}>
            <Text style={[styles.selectorBtnText, calls === 'everyone' && { color: '#FFF' }]}>Everyone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectorBtn, calls === 'contacts' && { backgroundColor: colors.primary }]} onPress={() => setCalls('contacts')}>
            <Text style={[styles.selectorBtnText, calls === 'contacts' && { color: '#FFF' }]}>Contacts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Blocked Users Section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BLOCKED USERS ({blockedUsers.length})</Text>
      <View style={[styles.optionsSection, { backgroundColor: colors.surface, marginBottom: 40 }]}>
        {blockedUsers.map((username) => (
          <View key={username} style={styles.blockedRow}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>@{username}</Text>
            <TouchableOpacity onPress={() => handleUnblock(username)} style={styles.unblockBtn}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addBlockBtn} onPress={handleAddBlock}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>Add to Blocked List</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
  },
  optionsSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  subheaderText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  optionRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionRowToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 0.5,
    marginVertical: 10,
  },
  rowSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  selectorBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  selectorBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  addBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 6,
  },
});
