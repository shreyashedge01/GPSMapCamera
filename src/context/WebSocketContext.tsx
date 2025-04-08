import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Define the URL for WebSocket connection
// Use localhost for iOS simulator, 10.0.2.2 for Android emulator, or your real device IP
// For production use, this would be the actual server URL
const getWebSocketUrl = () => {
  const BASE_URL = __DEV__ 
    ? Platform.OS === 'ios' 
      ? 'ws://localhost:3001/ws' 
      : 'ws://10.0.2.2:3001/ws'
    : 'wss://your-production-domain.com/ws';
  
  return BASE_URL;
};

// Define the context type
interface WebSocketContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendLocation: (latitude: number, longitude: number) => boolean;
  notifyPhotoCapture: (photoId: string | number, metadata?: any) => boolean;
  lastMessage: any | null;
  isConnecting: boolean;
  connectionError: Error | null;
  send: (type: string, data?: any) => boolean;
  addListener: (callback: (data: any) => void) => void;
  removeListener: (callback: (data: any) => void) => void;
}

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  sendLocation: () => false,
  notifyPhotoCapture: () => false,
  lastMessage: null,
  isConnecting: false,
  connectionError: null,
  send: () => false,
  addListener: () => {},
  removeListener: () => {},
});

// Custom hook for using the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

// The provider component
export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [listeners, setListeners] = useState<Set<(data: any) => void>>(new Set());
  const [reconnectTimer, setReconnectTimer] = useState<NodeJS.Timeout | null>(null);
  const [pingInterval, setPingInterval] = useState<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 3000;

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, check connection
        if (!isConnected && !isConnecting && isNetworkAvailable) {
          connect().catch(console.error);
        }
      }
      setAppState(nextAppState);
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
    };
  }, [appState, isConnected, isConnecting, isNetworkAvailable]);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const nowAvailable = state.isConnected === true;
      
      // If network is newly available and we're not connected or connecting
      if (nowAvailable && !isNetworkAvailable && !isConnected && !isConnecting) {
        // Try to connect when network becomes available
        connect().catch(console.error);
      }
      
      setIsNetworkAvailable(nowAvailable || false);
    });

    return () => {
      unsubscribe();
    };
  }, [isNetworkAvailable, isConnected, isConnecting]);

  // Start ping interval to keep connection alive
  const startPingInterval = useCallback(() => {
    stopPingInterval();
    
    const interval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        send('ping');
      } else {
        stopPingInterval();
      }
    }, 10000); // Send ping every 10 seconds
    
    setPingInterval(interval);
  }, [socket]);

  // Stop ping interval
  const stopPingInterval = useCallback(() => {
    if (pingInterval) {
      clearInterval(pingInterval);
      setPingInterval(null);
    }
  }, [pingInterval]);

  // Schedule reconnect with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, giving up`);
      return;
    }

    const nextAttempt = reconnectAttempts + 1;
    
    // Exponential backoff with jitter
    const delay = Math.min(30000, BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts)) 
      * (0.8 + Math.random() * 0.4); // Add 20% jitter

    console.log(`Scheduling reconnect attempt ${nextAttempt} in ${Math.round(delay)}ms`);
    
    const timer = setTimeout(() => {
      setReconnectAttempts(nextAttempt);
      console.log(`Reconnect attempt ${nextAttempt}`);
      connect().catch(error => {
        console.error(`Reconnect attempt ${nextAttempt} failed:`, error);
      });
    }, delay);
    
    setReconnectTimer(timer);
  }, [reconnectAttempts, reconnectTimer]);

  // Clean up connection resources
  const cleanupConnection = useCallback(() => {
    stopPingInterval();
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      setReconnectTimer(null);
    }
  }, [reconnectTimer, stopPingInterval]);

  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(); // Already connected
    }

    if (isConnecting) {
      return Promise.resolve(); // Already trying to connect
    }

    if (!isNetworkAvailable) {
      return Promise.reject(new Error('No network connection available'));
    }

    setIsConnecting(true);
    setConnectionError(null);

    return new Promise<void>((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl();
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        
        const newSocket = new WebSocket(wsUrl);

        newSocket.onopen = () => {
          console.log('WebSocket connection established');
          setSocket(newSocket);
          setIsConnected(true);
          setIsConnecting(false);
          setReconnectAttempts(0);
          startPingInterval();
          resolve();
        };

        newSocket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} - ${event.reason || 'No reason provided'}`);
          setIsConnected(false);
          setIsConnecting(false);
          setSocket(null);
          cleanupConnection();
          
          // Try to reconnect if not explicitly closed by the application and app is in foreground
          if (event.code !== 1000 && appState === 'active' && isNetworkAvailable) {
            scheduleReconnect();
          }
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError(new Error('WebSocket connection error'));
          setIsConnecting(false);
          reject(error);
        };

        newSocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Skip logging for ping/pong messages
            if (message.type !== 'pong' && message.type !== 'server_ping') {
              console.log(`Received WebSocket message: ${message.type}`);
            }
            
            setLastMessage(message);
            
            // Notify all listeners
            listeners.forEach(listener => {
              try {
                listener(message);
              } catch (listenerError) {
                console.error('Error in WebSocket listener:', listenerError);
              }
            });
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setIsConnecting(false);
        setConnectionError(error instanceof Error ? error : new Error('Unknown connection error'));
        reject(error);
      }
    });
  }, [
    socket, 
    isConnecting, 
    isNetworkAvailable, 
    startPingInterval, 
    cleanupConnection, 
    scheduleReconnect, 
    appState,
    listeners
  ]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    cleanupConnection();
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.close(1000, 'Client disconnected intentionally');
      } catch (error) {
        console.error('Error closing WebSocket connection:', error);
      }
    }
    
    setSocket(null);
    setIsConnected(false);
  }, [socket, cleanupConnection]);

  // Send message to WebSocket server
  const send = useCallback((type: string, data: any = {}): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        ...data,
        timestamp: new Date().toISOString()
      });
      socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, [socket]);

  // Send location to WebSocket server
  const sendLocation = useCallback((latitude: number, longitude: number): boolean => {
    return send('location', { latitude, longitude });
  }, [send]);

  // Notify that a photo was captured
  const notifyPhotoCapture = useCallback((photoId: string | number, metadata?: any): boolean => {
    return send('photo_capture', { photoId, metadata });
  }, [send]);

  // Add listener for WebSocket messages
  const addListener = useCallback((callback: (data: any) => void) => {
    setListeners(prevListeners => {
      const newListeners = new Set(prevListeners);
      newListeners.add(callback);
      return newListeners;
    });
  }, []);

  // Remove listener for WebSocket messages
  const removeListener = useCallback((callback: (data: any) => void) => {
    setListeners(prevListeners => {
      const newListeners = new Set(prevListeners);
      newListeners.delete(callback);
      return newListeners;
    });
  }, []);

  // Auto-connect on component mount if in foreground
  useEffect(() => {
    // Only connect initially if app is active
    if (appState === 'active' && isNetworkAvailable) {
      connect().catch(error => {
        console.error('Initial WebSocket connection failed:', error);
      });
    }

    // Clean up on unmount
    return () => {
      cleanupConnection();
      if (socket) {
        try {
          socket.close();
        } catch (error) {
          console.error('Error closing WebSocket on unmount:', error);
        }
      }
    };
  }, []);

  // Context value
  const contextValue: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    sendLocation,
    notifyPhotoCapture,
    lastMessage,
    isConnecting,
    connectionError,
    send,
    addListener,
    removeListener,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;