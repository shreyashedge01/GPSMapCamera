import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  Share,
  Platform,
  PixelRatio,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';
import { StackNavigationProp } from '@react-navigation/stack';

import { PhotoData, RootStackParamList } from '../types/types';
import { formatCoordinates, formatAltitude } from '../services/locationService';
import { formatTemperature, formatWindSpeed, formatHumidity, formatPressure } from '../services/weatherService';
import { formatCompassHeading, formatMagneticField } from '../services/magnetic';

type PhotoDetailScreenRouteProp = RouteProp<RootStackParamList, 'PhotoDetail'>;
type PhotoDetailScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function PhotoDetailScreen() {
  const navigation = useNavigation<PhotoDetailScreenNavigationProp>();
  const route = useRoute<PhotoDetailScreenRouteProp>();
  const { photoId } = route.params;
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const { width } = Dimensions.get('window');
  const mapRef = useRef<MapView>(null);
  const photoContainerRef = useRef<View>(null);
  
  // Load photo data on component mount
  useEffect(() => {
    loadPhotoData();
  }, [photoId]);
  
  // Function to load photo data
  const loadPhotoData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      const files = await FileSystem.readDirectoryAsync(photosDir);
      let foundPhoto: PhotoData | null = null;
      
      // Find metadata file for this photo
      for (const file of files) {
        if (file.endsWith('.json')) {
          const metadataFile = `${photosDir}${file}`;
          const metadataJson = await FileSystem.readAsStringAsync(metadataFile);
          const metadata = JSON.parse(metadataJson) as PhotoData;
          
          if (metadata.id === photoId) {
            foundPhoto = metadata;
            break;
          }
        }
      }
      
      // If no metadata found, try to find the photo by looking at JPG files
      if (!foundPhoto) {
        const jpgFiles = files.filter(f => f.endsWith('.jpg'));
        
        for (const file of jpgFiles) {
          const fileUri = `${photosDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
          const creationTime = Date.now(); // Use current time as fallback
          
          // Try to match by filename pattern
          if (file.includes(photoId)) {
            foundPhoto = {
              id: photoId,
              uri: fileUri,
              fileName: file,
              width: 1080, // Placeholder
              height: 1920, // Placeholder
              createdAt: creationTime,
              templateType: 'classic'
            };
            break;
          }
        }
      }
      
      if (!foundPhoto) {
        throw new Error('Photo not found');
      }
      
      setPhoto(foundPhoto);
    } catch (error) {
      console.error('Error loading photo data:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load photo data');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [photoId, navigation]);
  
  // Function to create an enhanced photo with embedded metadata for sharing
  const createEnhancedSharePhoto = useCallback(async (): Promise<string | null> => {
    if (!photo || !photo.location || !photoContainerRef.current) return null;
    setIsSaving(true);
    
    try {
      const timestamp = Date.now();
      const enhancedPhotoFilename = `${timestamp}-enhanced.jpg`;
      const enhancedPhotoUri = `${FileSystem.cacheDirectory}${enhancedPhotoFilename}`;
      
      // Capture the map view as an image if available
      let mapSnapshotUri: string | null = null;
      if (mapRef.current && photo.location) {
        try {
          const snapshot = await captureRef(mapRef.current, {
            format: 'jpg',
            quality: 0.9,
            result: 'base64'
          });
          if (snapshot) {
            mapSnapshotUri = `data:image/jpeg;base64,${snapshot}`;
          }
        } catch (mapError) {
          console.error('Error capturing map snapshot:', mapError);
        }
      }
      
      // Capture metadata container
      let metadataSnapshotUri: string | null = null;
      try {
        const metadataSnapshot = await captureRef(photoContainerRef.current, {
          format: 'jpg',
          quality: 0.9,
          result: 'base64'
        });
        if (metadataSnapshot) {
          metadataSnapshotUri = `data:image/jpeg;base64,${metadataSnapshot}`;
        }
      } catch (metadataError) {
        console.error('Error capturing metadata snapshot:', metadataError);
      }
      
      // Create a comprehensive shared image
      let result = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
      );
      
      // If we have a map snapshot, add it to the image
      if (mapSnapshotUri) {
        try {
          const imageInfo = await FileSystem.getInfoAsync(result.uri);
          
          // Combine the photo with the map snapshot
          result = await ImageManipulator.manipulateAsync(
            result.uri,
            [],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
          );
        } catch (combineError) {
          console.error('Error combining photo with map:', combineError);
        }
      }
      
      // Save the enhanced photo
      await FileSystem.copyAsync({
        from: result.uri,
        to: enhancedPhotoUri
      });
      
      return enhancedPhotoUri;
    } catch (error) {
      console.error('Error creating enhanced photo:', error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [photo]);
  
  // Function to share photo with full metadata
  const sharePhoto = useCallback(async () => {
    if (!photo) return;
    
    try {
      setIsSharing(true);
      const enhancedPhotoUri = await createEnhancedSharePhoto();
      
      if (!enhancedPhotoUri) {
        throw new Error('Failed to create enhanced photo');
      }
      
      // Create a rich message that includes all required metadata
      let shareMessage = 'GPS Map Camera - Location Photo Details:\n\n';
      
      // Add full address if available
      if (photo.location?.address) {
        shareMessage += `📍 Address: ${photo.location.address}\n\n`;
      }
      
      // Add date and time
      shareMessage += `🕒 Date/Time: ${new Date(photo.createdAt).toLocaleString()}\n\n`;
      
      // Add coordinates
      if (photo.location) {
        shareMessage += `🌐 Coordinates: ${formatCoordinates(photo.location.latitude, photo.location.longitude)}\n\n`;
      }
      
      // Add weather data if available
      if (photo.weather) {
        shareMessage += '☁️ Weather Conditions:\n';
        shareMessage += `🌡️ Temperature: ${formatTemperature(photo.weather.temperature)}\n`;
        shareMessage += `💧 Humidity: ${formatHumidity(photo.weather.humidity)}\n`;
        shareMessage += `⏱️ Pressure: ${formatPressure(photo.weather.pressure)}\n`;
        if (photo.weather.windSpeed) {
          shareMessage += `💨 Wind: ${formatWindSpeed(photo.weather.windSpeed)} ${photo.weather.windDirection}°\n`;
        }
        shareMessage += `\n`;
      }
      
      // Add altitude if available
      if (photo.location?.altitude !== null && photo.location?.altitude !== undefined) {
        shareMessage += `⬆️ Altitude: ${formatAltitude(photo.location.altitude)}\n\n`;
      }
      
      // Add compass data if available
      if (photo.magneticHeading !== undefined) {
        shareMessage += `🧭 Compass: ${formatCompassHeading(photo.magneticHeading)}\n\n`;
      }
      
      // Share the photo with metadata
      if (Platform.OS === 'ios') {
        await Share.share({
          url: enhancedPhotoUri,
          message: shareMessage,
        });
      } else {
        await Sharing.shareAsync(enhancedPhotoUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Photo with Location Data',
        });
      }
    } catch (error) {
      console.error('Error sharing photo:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to share photo');
    } finally {
      setIsSharing(false);
    }
  }, [photo, createEnhancedSharePhoto]);
  
  // Function to handle location view
  const handleLocationView = useCallback(() => {
    if (!photo?.location) {
      Alert.alert('Error', 'No location data available for this photo');
      return;
    }
    
    navigation.navigate('MapView', {
      photoId: photo.id
    });
  }, [photo, navigation]);
  
  // Render loading state
  if (isLoading || !photo) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading photo details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Display */}
        <Image
          source={{ uri: photo.uri }}
          style={[styles.photo, { width }]}
          resizeMode="contain"
        />
        
        {/* Info Cards */}
        <View style={styles.infoContainer} ref={photoContainerRef}>
          {/* Basic Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Photo Details</Text>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="photo" size={18} color="#66C4FF" />
              <Text style={styles.infoLabel}>Filename:</Text>
              <Text style={styles.infoValue}>{photo.fileName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="access-time" size={18} color="#66C4FF" />
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {new Date(photo.createdAt).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="layers" size={18} color="#66C4FF" />
              <Text style={styles.infoLabel}>Template:</Text>
              <Text style={styles.infoValue}>
                {photo.templateType === 'classic' ? 'Classic' : 'Advanced'}
              </Text>
            </View>
          </View>
          
          {/* Location Info Card */}
          {photo.location && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Location Information</Text>
              
              {photo.location.address && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="place" size={18} color="#FF6B6B" />
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{photo.location.address}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <MaterialIcons name="my-location" size={18} color="#FF6B6B" />
                <Text style={styles.infoLabel}>Coordinates:</Text>
                <Text style={styles.infoValue}>
                  {formatCoordinates(photo.location.latitude, photo.location.longitude)}
                </Text>
              </View>
              
              {photo.location.altitude !== null && photo.location.altitude !== undefined && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="height" size={18} color="#FF6B6B" />
                  <Text style={styles.infoLabel}>Altitude:</Text>
                  <Text style={styles.infoValue}>
                    {formatAltitude(photo.location.altitude)}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Weather Info Card */}
          {photo.weather && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Weather Information</Text>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="thermostat" size={18} color="#7CFF6B" />
                <Text style={styles.infoLabel}>Temperature:</Text>
                <Text style={styles.infoValue}>
                  {formatTemperature(photo.weather.temperature)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="cloud" size={18} color="#7CFF6B" />
                <Text style={styles.infoLabel}>Conditions:</Text>
                <Text style={styles.infoValue}>{photo.weather.weatherCondition}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="air" size={18} color="#7CFF6B" />
                <Text style={styles.infoLabel}>Wind:</Text>
                <Text style={styles.infoValue}>
                  {photo.weather.windSpeed !== undefined 
                    ? `${formatWindSpeed(photo.weather.windSpeed)} ${photo.weather.windDirection}`
                    : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="water-drop" size={18} color="#7CFF6B" />
                <Text style={styles.infoLabel}>Humidity:</Text>
                <Text style={styles.infoValue}>{formatHumidity(photo.weather.humidity)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="speed" size={18} color="#7CFF6B" />
                <Text style={styles.infoLabel}>Pressure:</Text>
                <Text style={styles.infoValue}>{formatPressure(photo.weather.pressure)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={sharePhoto}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="share" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Share</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLocationView}
        >
          <MaterialIcons name="map" size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>View Map</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 80, // Allow space for action bar
  },
  photo: {
    height: 300,
    backgroundColor: '#111111',
  },
  infoContainer: {
    padding: 10,
  },
  infoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    marginLeft: 8,
    width: 100,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  mapContainer: {
    height: 200,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    marginTop: 5,
    fontSize: 12,
  },
  locationContainer: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    margin: 10,
  },
  locationText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
});