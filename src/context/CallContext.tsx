import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Audio as ExpoAudio } from 'expo-av';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface CallContextData {
  receivingCall: boolean;
  caller: any | null;
  callerSignal: any | null;
  callAccepted: boolean;
  callEnded: boolean;
  isCalling: boolean;
  callType: 'audio' | 'video';
  targetUser: any | null;
  callDuration: number;
  callState: string;
  isMuted: boolean;
  isVideoOff: boolean;
  callUser: (userToCall: any, type?: 'audio' | 'video') => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextData>({} as CallContextData);

let incomingSound: any = null;
let outgoingSound: any = null;

const playIncomingRingtone = async () => {
  try {
    await stopIncomingRingtone();
    if (Platform.OS === 'web') {
      incomingSound = new window.Audio('https://www.soundjay.com/phone/phone-ringing-01.mp3');
      incomingSound.loop = true;
      await incomingSound.play();
    } else {
      const { sound } = await ExpoAudio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/phone/phone-ringing-01.mp3' },
        { shouldPlay: true, isLooping: true }
      );
      incomingSound = sound;
    }
  } catch (e) {
    console.error('Failed to play incoming ringtone:', e);
  }
};

const stopIncomingRingtone = async () => {
  try {
    if (incomingSound) {
      if (Platform.OS === 'web') {
        incomingSound.pause();
        incomingSound = null;
      } else {
        await incomingSound.stopAsync();
        await incomingSound.unloadAsync();
        incomingSound = null;
      }
    }
  } catch (e) {}
};

const playRingbackTone = async () => {
  try {
    await stopRingbackTone();
    if (Platform.OS === 'web') {
      outgoingSound = new window.Audio('https://www.soundjay.com/phone/phone-calling-1.mp3');
      outgoingSound.loop = true;
      await outgoingSound.play();
    } else {
      const { sound } = await ExpoAudio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/phone/phone-calling-1.mp3' },
        { shouldPlay: true, isLooping: true }
      );
      outgoingSound = sound;
    }
  } catch (e) {
    console.error('Failed to play ringback tone:', e);
  }
};

const stopRingbackTone = async () => {
  try {
    if (outgoingSound) {
      if (Platform.OS === 'web') {
        outgoingSound.pause();
        outgoingSound = null;
      } else {
        await outgoingSound.stopAsync();
        await outgoingSound.unloadAsync();
        outgoingSound = null;
      }
    }
  } catch (e) {}
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [receivingCall, setReceivingCall] = useState<boolean>(false);
  const [caller, setCaller] = useState<any | null>(null);
  const [callerSignal, setCallerSignal] = useState<any | null>(null);
  const [callAccepted, setCallAccepted] = useState<boolean>(false);
  const [callEnded, setCallEnded] = useState<boolean>(false);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callState, setCallState] = useState<string>('Idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);

  const callTimerRef = useRef<any>(null);

  useEffect(() => {
    if (callAccepted && !callEnded) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callAccepted, callEnded]);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_call', ({ from, name, avatar, signal, callType: cType }: any) => {
      setReceivingCall(true);
      setCaller({ _id: from, name, avatar });
      setCallerSignal(signal);
      setCallType(cType || 'video');
      setCallState('Ringing...');
      playIncomingRingtone();
    });

    socket.on('call_accepted', ({ signal }: any) => {
      setCallAccepted(true);
      setIsCalling(false);
      setCallState('Connected');
      stopRingbackTone();
    });

    socket.on('call_rejected', () => {
      setCallState('Call Rejected');
      cleanupCall();
    });

    socket.on('call_ended', () => {
      setCallState('Call Ended');
      cleanupCall();
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
    };
  }, [socket]);

  const cleanupCall = () => {
    stopIncomingRingtone();
    stopRingbackTone();
    setReceivingCall(false);
    setCaller(null);
    setCallerSignal(null);
    setCallAccepted(false);
    setCallEnded(true);
    setIsCalling(false);
    setTargetUser(null);
    setTimeout(() => {
      setCallState('Idle');
      setCallEnded(false);
    }, 2000);
  };

  const callUser = (userToCall: any, type: 'audio' | 'video' = 'video') => {
    setIsCalling(true);
    setTargetUser(userToCall);
    setCallType(type);
    setCallState('Calling...');
    playRingbackTone();

    if (socket) {
      socket.emit('call_user', {
        userToCall: userToCall._id,
        signalData: { dummy: 'webrtc_offer' },
        from: user._id,
        name: user.name,
        avatar: user.avatar,
        callType: type,
      });
    }
  };

  const answerCall = () => {
    setCallAccepted(true);
    setReceivingCall(false);
    setCallState('Connected');
    stopIncomingRingtone();

    if (socket && caller) {
      socket.emit('answer_call', {
        to: caller._id,
        signal: { dummy: 'webrtc_answer' },
      });
    }
  };

  const rejectCall = () => {
    stopIncomingRingtone();
    if (socket && caller) {
      socket.emit('reject_call', { to: caller._id });
    }
    cleanupCall();
  };

  const endCall = () => {
    stopIncomingRingtone();
    stopRingbackTone();
    const target = targetUser?._id || caller?._id;
    if (socket && target) {
      socket.emit('end_call', { to: target });
    }
    cleanupCall();
  };


  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleCamera = () => setIsVideoOff((prev) => !prev);

  return (
    <CallContext.Provider
      value={{
        receivingCall,
        caller,
        callerSignal,
        callAccepted,
        callEnded,
        isCalling,
        callType,
        targetUser,
        callDuration,
        callState,
        isMuted,
        isVideoOff,
        callUser,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
