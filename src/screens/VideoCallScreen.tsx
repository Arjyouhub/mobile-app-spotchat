import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';

export const VideoCallScreen = () => {
  const {
    isCalling,
    callAccepted,
    targetUser,
    caller,
    callType,
    callDuration,
    callState,
    isMuted,
    isVideoOff,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  if (!isCalling && !callAccepted) return null;

  const displayUser = targetUser || caller || { name: 'User', avatar: '' };
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Image source={{ uri: displayUser.avatar }} style={styles.avatar} />
        <Text style={styles.userName}>{displayUser.name}</Text>
        <Text style={styles.statusText}>
          {callAccepted ? formatTime(callDuration) : callState}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.activeControl]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
          </TouchableOpacity>

          {callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlBtn, isVideoOff && styles.activeControl]}
              onPress={toggleCamera}
            >
              <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={24} color="#FFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={endCall}>
            <Ionicons name="call" size={24} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B141A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#00A884',
  },
  userName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#00A884',
    fontSize: 16,
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 48,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#202C33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeControl: {
    backgroundColor: '#F15C6D',
  },
  endBtn: {
    backgroundColor: '#EA0038',
  },
  controlIcon: {
    fontSize: 24,
  },
});
