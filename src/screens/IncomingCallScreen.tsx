import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCall } from '../context/CallContext';

export const IncomingCallScreen = () => {
  const { receivingCall, caller, callType, answerCall, rejectCall, callAccepted } = useCall();

  if (!receivingCall || callAccepted || !caller) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Image source={{ uri: caller.avatar }} style={styles.avatar} />
        <Text style={styles.callerName}>{caller.name}</Text>
        <Text style={styles.callTypeLabel}>Incoming {callType === 'video' ? 'Video' : 'Audio'} Call...</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={rejectCall}>
            <Ionicons name="call" size={20} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={styles.btnText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={answerCall}>
            <Ionicons name="call" size={20} color="#FFF" />
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  card: {
    backgroundColor: '#111B21',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#202C33',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
  },
  callerName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  callTypeLabel: {
    color: '#00A884',
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 32,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: '#EA0038',
  },
  acceptBtn: {
    backgroundColor: '#00A884',
  },
  btnIcon: {
    fontSize: 18,
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
