import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import { AuthScreen } from '../screens/AuthScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PrivacySettingsScreen } from '../screens/PrivacySettingsScreen';
import { IncomingCallScreen } from '../screens/IncomingCallScreen';
import { VideoCallScreen } from '../screens/VideoCallScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
          </>
        )}
      </Stack.Navigator>

      {/* Global Call Overlays */}
      {user && (
        <>
          <IncomingCallScreen />
          <VideoCallScreen />
        </>
      )}
    </NavigationContainer>
  );
};
