import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import type { CameraType, FlashMode, CameraCapturedPicture } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { LocationData, PhotoData, TemplateType, WeatherData, RootStackParamList, TemplateSettings } from '../types/types';
import { getCurrentLocation, formatCoordinates, reverseGeocode, formatAltitude } from '../services/locationService';
import { fetchWeatherData, formatTemperature, formatWindSpeed, formatHumidity, formatPressure } from '../services/weatherService';
import { startMagnetometerTracking, stopMagnetometerTracking, formatCompassHeading, formatMagneticField } from '../services/magnetic';
import { applyTemplate } from '../services/templateService';
import { QRScanner } from '../components/QRScanner';

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Camera'>;

const CameraComponent = Camera as unknown as React.ComponentType<{
  ref: React.RefObject<typeof Camera>;
  style: any;
  type: CameraType;
  flashMode: FlashMode;
  zoom: number;
  children?: React.ReactNode;
}>;

export default function CameraScreen() {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const cameraRef = useRef<any>(null);
  const [type, setType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoData[]>([]);
  const [magneticHeading, setMagneticHeading] = useState<number | null>(null);
  const [magneticField, setMagneticField] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  const magnetometerSubscription = useRef<any>(null);
  const locationWatcherId = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Fetch initial location and weather data
      await refreshLocationAndWeather();
      
      // Start magnetometer tracking
      magnetometerSubscription.current = await startMagnetometerTracking(
        heading => setMagneticHeading(heading),
        strength => setMagneticField(strength)
      );
    })();
    
    // Cleanup on unmount
    return () => {
      if (magnetometerSubscription.current) {
        stopMagnetometerTracking(magnetometerSubscription.current);
      }
      if (locationWatcherId.current) {
        // Stop location watching
      }
    };
  }, []);
  
  // Function to refresh location and weather data
  const refreshLocationAndWeather = async () => {
    setIsLoading(true);
    try {
      // Get current location
      const location = await getCurrentLocation();
      if (location) {
        setLocationData(location);
        
        // Get address data
        if (location.latitude && location.longitude) {
          const addressData = await reverseGeocode(location.latitude, location.longitude);
          if (addressData) {
            setLocationData(prev => prev ? { ...prev, ...addressData } : null);
          }
          
          // Get weather data
          const weather = await fetchWeatherData(location.latitude, location.longitude);
          if (weather) {
            setWeatherData(weather);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to update location and weather data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to toggle flash mode
  const toggleFlash = () => {
    setFlashMode((current) => 
      current === 'off' ? 'on' : 'off'
    );
  };
  
  // Function to toggle camera type (front/back)
  const toggleCameraType = () => {
    setType((current) => (
      current === 'back' ? 'front' : 'back'
    ));
  };
  
  // Function to toggle grid visibility
  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };
  
  // Function to zoom in
  const zoomIn = () => {
    // Limit zoom to a maximum value (0-1 range for expo-camera)
    setZoom(Math.min(zoom + 0.1, 1));
  };
  
  // Function to zoom out
  const zoomOut = () => {
    // Limit zoom to a minimum value
    setZoom(Math.max(zoom - 0.1, 0));
  };
  
  // Function to capture photo
  const capturePhoto = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        // Create the photos directory if it doesn't exist
        const photosDir = `${FileSystem.documentDirectory}photos`;
        const dirInfo = await FileSystem.getInfoAsync(photosDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(photosDir);
        }
        
        // Take the photo
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          exif: true,
        });
        
        if (photo) {
          // Generate a unique filename
          const timestamp = Date.now();
          const fileName = `GPS_${timestamp}.jpg`;
          
          // Create a unique ID for the photo
          const photoId = timestamp.toString();
          
          // Get template settings from app settings (using defaults for now)
          const templateSettings: TemplateSettings = {
            coordinates: { enabled: true },
            address: { enabled: true },
            altitude: { enabled: true },
            temperature: { enabled: true },
            weather: { enabled: true },
            wind: { enabled: true },
            humidity: { enabled: true },
            pressure: { enabled: true },
            compass: { enabled: true },
            magneticField: { enabled: true },
            dateTime: { enabled: true },
            mapImage: { enabled: true },
            customText: { enabled: false, value: '' },
            logo: { enabled: false }
          };
          
          // Apply template to image if we have location data
          let processedPhotoUri = photo.uri;
          if (locationData || weatherData || magneticHeading !== null || magneticField !== null) {
            try {
              processedPhotoUri = await applyTemplate(
                photo.uri,
                selectedTemplate,
                templateSettings,
                locationData || undefined,
                weatherData || undefined,
                magneticHeading !== null ? magneticHeading : undefined,
                magneticField !== null ? magneticField : undefined
              );
            } catch (templateError) {
              console.error('Error applying template:', templateError);
              // Continue with original photo if template fails
            }
          }
          
          // Create a new file in the photos directory
          const newPhotoUri = `${photosDir}/${fileName}`;
          await FileSystem.copyAsync({
            from: processedPhotoUri,
            to: newPhotoUri
          });
          
          // Create photo metadata
          const newPhoto: PhotoData = {
            id: photoId,
            uri: newPhotoUri,
            fileName,
            width: photo.width,
            height: photo.height,
            createdAt: timestamp,
            templateType: selectedTemplate,
            location: locationData ? {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              altitude: locationData.altitude || undefined,
              address: locationData.address
            } : undefined,
            weather: weatherData || undefined,
            magneticHeading: magneticHeading !== null ? magneticHeading : undefined
          };
          
          // Save metadata to a separate JSON file
          const metadataFileName = `${photoId}-metadata.json`;
          const metadataUri = `${photosDir}/${metadataFileName}`;
          await FileSystem.writeAsStringAsync(
            metadataUri,
            JSON.stringify(newPhoto),
            { encoding: FileSystem.EncodingType.UTF8 }
          );
          
          // Add to captured photos
          setCapturedPhotos(prev => [newPhoto, ...prev]);
          
          // Show success message
          Alert.alert('Success', 'Photo captured with location data');
        }
      } catch (error) {
        console.error('Error capturing photo:', error);
        Alert.alert('Error', 'Failed to capture photo');
      } finally {
        setIsCapturing(false);
      }
    }
  };
  
  // Function to open collection
  const openCollection = () => {
    navigation.navigate('Collection');
  };
  
  // Function to open settings
  const openSettings = () => {
    navigation.navigate('Settings');
  };

  const handleQRScan = (data: string) => {
    try {
      const locationData = JSON.parse(data);
      if (locationData.latitude && locationData.longitude) {
        setLocationData({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          altitude: locationData.altitude || null,
          accuracy: locationData.accuracy || null,
          address: locationData.address || null,
        });
        
        // Refresh weather data for the new location
        refreshLocationAndWeather();
        
        Alert.alert(
          'Location Updated',
          'Location data has been updated from QR code.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error processing QR code data:', error);
    } finally {
      setShowQRScanner(false);
    }
  };

  // Render loading state
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Render permission denied state
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={openSettings}>
          <Text>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <CameraComponent
        ref={cameraRef}
        style={styles.camera}
        type={type}
        flashMode={flashMode}
        zoom={zoom}
      >
        <View style={styles.controlsContainer}>
          <View style={styles.topControls}>
            <TouchableOpacity onPress={toggleGrid} style={styles.controlButton}>
              <MaterialIcons name={showGrid ? "grid-on" : "grid-off"} size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleCameraType} style={styles.controlButton}>
              <MaterialIcons name="flip-camera-ios" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFlash} style={styles.controlButton}>
              <MaterialIcons name={flashMode === 'on' ? "flash-on" : "flash-off"} size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomControls}>
            <TouchableOpacity onPress={openCollection} style={styles.controlButton}>
              <MaterialIcons name="photo-library" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={capturePhoto} 
              style={[styles.captureButton, isCapturing && styles.capturingButton]}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQRScanner(true)} style={styles.controlButton}>
              <MaterialIcons name="qr-code-scanner" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraComponent>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});