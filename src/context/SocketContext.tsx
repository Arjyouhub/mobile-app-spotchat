import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../constants/config';
import { useAuth } from './AuthContext';

interface UserStatus {
  isOnline: boolean;
  lastSeen?: string;
}

interface SocketContextData {
  socket: Socket | null;
  onlineUsers: Map<string, UserStatus>;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());

  useEffect(() => {
    if (!user || !user.token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_BASE_URL, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('[Socket Mobile] Connected with ID:', newSocket.id);
    });

    newSocket.on('user_status_changed', ({ userId, isOnline, lastSeen }: any) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(userId.toString(), { isOnline, lastSeen });
        return updated;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
