import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getCurrentUser } from '../services/supabaseAuth';
import { getUnreadMessageCount } from '../services/messageQueries';

const UnreadMessagesContext = createContext({
  unreadCount: 0,
  refreshUnreadMessages: async () => 0,
});

export const UnreadMessagesProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadMessages = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        setUnreadCount(0);
        return 0;
      }

      const count = await getUnreadMessageCount(user.id).catch((err) => {
        console.error('Failed to fetch unread count:', err);
        return 0;
      });

      const normalizedUnreadCount = Number.isFinite(count) ? count : 0;
      setUnreadCount(normalizedUnreadCount);
      return normalizedUnreadCount;
    } catch (error) {
      console.error('Failed to fetch unread message count:', error);
      setUnreadCount(0);
      return 0;
    }
  }, []);

  useEffect(() => {
    void refreshUnreadMessages();
  }, [refreshUnreadMessages]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshUnreadMessages();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [refreshUnreadMessages]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void refreshUnreadMessages();
      }
    });

    return () => subscription.remove();
  }, [refreshUnreadMessages]);

  const value = useMemo(() => ({
    unreadCount,
    refreshUnreadMessages,
  }), [unreadCount, refreshUnreadMessages]);

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = () => useContext(UnreadMessagesContext);