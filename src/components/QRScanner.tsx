import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons } from '@expo/vector-icons';
import { logger } from '../utils/logger';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type QRScannerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'QRScanner'>;

interface LocationQRData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
}

export function QRScanner() {
  const navigation = useNavigation<QRScannerNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      try {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          await logger.warning('Camera permission denied by user');
        } else {
          await logger.info('Camera permission granted');
        }
      } catch (error) {
        await logger.error('Error requesting camera permission', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        Alert.alert(
          'Permission Error',
          'Failed to request camera permission. Please check your device settings.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    getBarCodeScannerPermissions();
  }, [navigation]);

  const validateLocationData = (data: any): data is LocationQRData => {
    if (!data || typeof data !== 'object') {
      logger.warning('Invalid QR data format: not an object', { receivedData: data });
      return false;
    }
    
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      logger.warning('Invalid QR data: missing or invalid coordinates', {
        latitude: data.latitude,
        longitude: data.longitude
      });
      return false;
    }
    
    if (data.latitude < -90 || data.latitude > 90) {
      logger.warning('Invalid latitude value', { latitude: data.latitude });
      return false;
    }
    
    if (data.longitude < -180 || data.longitude > 180) {
      logger.warning('Invalid longitude value', { longitude: data.longitude });
      return false;
    }
    
    if (data.altitude !== undefined && typeof data.altitude !== 'number') {
      logger.warning('Invalid altitude value', { altitude: data.altitude });
      return false;
    }
    
    if (data.accuracy !== undefined && typeof data.accuracy !== 'number') {
      logger.warning('Invalid accuracy value', { accuracy: data.accuracy });
      return false;
    }
    
    if (data.address !== undefined && typeof data.address !== 'string') {
      logger.warning('Invalid address value', { address: data.address });
      return false;
    }
    
    return true;
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    await logger.info('QR code scanned', { type, data: data.substring(0, 100) });
    
    try {
      const parsedData = JSON.parse(data);
      
      if (validateLocationData(parsedData)) {
        const enrichedData = {
          ...parsedData,
          timestamp: Date.now(),
          scanType: type
        };
        await logger.info('Valid location data processed', { 
          latitude: parsedData.latitude,
          longitude: parsedData.longitude
        });
        Alert.alert(
          'Success',
          'QR code scanned successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error('Invalid location data format');
      }
    } catch (error) {
      await logger.error('QR Scan Error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: data.substring(0, 100)
      });
      
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not contain valid location data. Please scan a valid GeoStamp QR code.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="camera-alt" size={48} color="#FF3B30" />
        <Text style={styles.message}>No access to camera</Text>
        <Text style={styles.submessage}>Please enable camera access in your device settings</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />
      
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>Position the QR code within the frame</Text>
        </View>
        
        {scanned && (
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setScanned(false)}
          >
            <Text style={styles.buttonText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    padding: 8,
    zIndex: 1,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  submessage: {
    color: '#999',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 50 : 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 