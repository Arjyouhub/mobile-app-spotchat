import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';


export const ProfileScreen = ({ navigation }: any) => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout, updateProfile } = useAuth();

  const [showE2EEModal, setShowE2EEModal] = useState<boolean>(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState<boolean>(false);

  // Profile Edit states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(user?.name || '');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [status, setStatus] = useState<string>(user?.status || '');

  // Privacy states
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<boolean>(true);
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<boolean>(true);
  const [readReceipts, setReadReceipts] = useState<boolean>(true);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        name,
        username,
        status,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    }
  };

  const handleChangeAvatar = async (useCamera = false) => {
    setShowAvatarOptions(false);
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') return;
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') return;
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
      }

      if (!result.canceled && result.assets?.[0]?.uri) {
        const fileUri = result.assets[0].uri;
        const formData = new FormData();
        const filename = fileUri.split('/').pop() || 'avatar.jpg';
        formData.append('file', {
          uri: fileUri,
          name: filename,
          type: 'image/jpeg',
        } as any);

        const { data } = await API.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        await updateProfile({ avatar: data.mediaUrl });
        Alert.alert('Success', 'Profile picture updated successfully.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Error', 'Failed to update profile picture.');
    }
  };

  const handleDeleteAvatar = async () => {
    setShowAvatarOptions(false);
    try {
      const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'User')}`;
      await updateProfile({ avatar: defaultAvatar });
      Alert.alert('Removed', 'Profile picture removed.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete('/auth/account');
              await logout();
              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF', marginLeft: 8 }]}>Profile & Settings</Text>
      </View>

      {/* Avatar Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: user?.avatar }} style={styles.avatar} />
          <TouchableOpacity style={[styles.avatarEditBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAvatarOptions(true)}>
            <Ionicons name="camera" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
              value={status}
              onChangeText={setStatus}
              placeholder="Status"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>Save Profile Settings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.username || user?.email?.split('@')[0]}</Text>
            <Text style={[styles.status, { color: colors.textMuted }]}>{user?.status || 'Hey there! I am using spotchat'}</Text>
            <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]} onPress={() => setIsEditing(true)}>
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Profile Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Privacy Settings Section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PRIVACY SETTINGS</Text>
      <View style={[styles.optionsSection, { marginBottom: 12 }]}>
        <View style={[styles.optionRowSimple, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Share Last Seen Status</Text>
            <Text style={[styles.optionDescription, { color: colors.textMuted }]}>Let others see when you were online</Text>
          </View>
          <Switch value={lastSeenPrivacy} onValueChange={setLastSeenPrivacy} thumbColor={colors.primary} />
        </View>

        <View style={[styles.optionRowSimple, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Share Profile Picture</Text>
            <Text style={[styles.optionDescription, { color: colors.textMuted }]}>Allow contacts to view profile photo</Text>
          </View>
          <Switch value={profilePhotoPrivacy} onValueChange={setProfilePhotoPrivacy} thumbColor={colors.primary} />
        </View>

        <View style={[styles.optionRowSimple, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Read Receipts</Text>
            <Text style={[styles.optionDescription, { color: colors.textMuted }]}>Let others see blue double-ticks</Text>
          </View>
          <Switch value={readReceipts} onValueChange={setReadReceipts} thumbColor={colors.primary} />
        </View>
      </View>

      {/* Settings Options */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>THEME & ACCOUNT ACTIONS</Text>
      <View style={styles.optionsSection}>
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate('PrivacySettings')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} style={{ marginRight: 10 }} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>Advanced Privacy Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={toggleTheme}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="moon-outline" size={20} color={colors.text} style={{ marginRight: 10 }} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Text style={[styles.optionValue, { color: colors.primary }]}>{theme === 'dark' ? 'Enabled' : 'Disabled'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={() => logout()}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 10 }} />
            <Text style={[styles.optionLabel, { color: colors.danger }]}>Log Out</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onPress={handleDeleteAccount}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} style={{ marginRight: 10 }} />
            <Text style={[styles.optionLabel, { color: colors.danger }]}>Delete My Account</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Avatar Options Modal */}
      <Modal visible={showAvatarOptions} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAvatarOptions(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Picture</Text>
            
            <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => handleChangeAvatar(false)}>
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={() => handleChangeAvatar(true)}>
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Capture from Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalOption, { width: '100%', alignItems: 'center', paddingVertical: 12 }]} onPress={handleDeleteAvatar}>
              <Text style={[styles.modalOptionText, { color: colors.danger, fontWeight: 'bold' }]}>Delete Profile Picture</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* E2EE Info Modal */}
      <Modal visible={showE2EEModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowE2EEModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Ionicons name="lock-closed" size={40} color={colors.primary} style={{ marginBottom: 10 }} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>End-to-End Encrypted</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Your personal messages and calls are secured with end-to-end encryption. No one outside of this chat, not even spotchat, can read your messages or listen to your calls.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowE2EEModal(false)}
            >
              <Text style={styles.modalButtonText}>OK, Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  e2eeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  e2eeIcon: {
    fontSize: 20,
  },
  e2eeInfo: {
    flex: 1,
  },
  e2eeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  e2eeSubtitle: {
    fontSize: 11,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  optionsSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editForm: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  editInput: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  editBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
  },
  optionRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  optionDescription: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOption: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

