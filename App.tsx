import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogViewer } from './src/components/LogViewer';
import { QRScanner } from './src/components/QRScanner';
import { HomeScreen } from './src/screens/HomeScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  console.log('App component rendering...');
  
  try {
    return (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'GeoStamp Camera' }}
          />
          <Stack.Screen 
            name="QRScanner" 
            component={QRScanner} 
            options={{ title: 'Scan QR Code' }}
          />
          <Stack.Screen 
            name="Logs" 
            component={LogViewer} 
            options={{ title: 'Error Logs' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  } catch (error: any) {
    console.error('Error in App component:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    throw error;
  }
}