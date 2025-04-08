import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
  Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';

import { formatCoordinates } from '../services/locationService';
import { RootStackParamList } from '../types/types';

type LocationViewRouteProp = RouteProp<RootStackParamList, 'LocationView'>;
type LocationViewNavigationProp = StackNavigationProp<RootStackParamList>;

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey;

const DEFAULT_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

/**
 * LocationView screen displays a map and location details
 * Can be accessed by passing coordinates or from a photo's metadata
 */
const LocationView = () => {
  const navigation = useNavigation<LocationViewNavigationProp>();
  const route = useRoute<LocationViewRouteProp>();
  const { latitude, longitude, locationName } = route.params || {};
  
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 3;
  
  // Validate coordinates
  const isValidCoordinates = useCallback(() => {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }, [latitude, longitude]);

  // Fetch address and additional details when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const fetchLocationDetails = async () => {
      if (!isValidCoordinates()) {
        setError('Invalid coordinates provided');
        setIsLoading(false);
        return;
      }

      if (!GOOGLE_MAPS_API_KEY) {
        setError('Google Maps API key is not configured');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Using Google Maps API to get address from coordinates
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch location details');
        }
        
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.status === 'OK' && data.results.length > 0) {
          setAddress(data.results[0].formatted_address);
        } else if (data.status === 'ZERO_RESULTS') {
          setAddress('No address found for these coordinates');
        } else {
          throw new Error(data.status || 'Failed to get address');
        }
      } catch (error) {
        console.error('Error fetching location details:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load location details');
          setAddress('Address not available');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchLocationDetails();
    
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, isValidCoordinates]);
  
  // Share the location with others
  const shareLocation = useCallback(async () => {
    if (!isValidCoordinates()) {
      Alert.alert('Error', 'Cannot share invalid coordinates');
      return;
    }

    try {
      const coords = formatCoordinates(latitude, longitude);
      const locationDetails = `
Location: ${locationName || 'Custom Location'}
Coordinates: ${coords}
Address: ${address}
Google Maps Link: https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}
      `.trim();
      
      if (Platform.OS === 'ios') {
        await Share.share({
          message: locationDetails,
          url: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        });
      } else {
        await Share.share({
          message: locationDetails,
          title: 'Shared Location'
        });
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location. Please try again.');
    }
  }, [latitude, longitude, locationName, address, isValidCoordinates]);
  
  // Open location in Google Maps app
  const openInMaps = useCallback(() => {
    if (!isValidCoordinates()) {
      Alert.alert('Error', 'Cannot open invalid coordinates in maps');
      return;
    }

    const url = Platform.select({
      ios: `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}`,
      android: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });
    
    if (!url) return;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // If Google Maps app is not installed, open in browser
          return Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          );
        }
      })
      .catch(error => {
        console.error('Error opening maps:', error);
        Alert.alert('Error', 'Could not open Google Maps');
      });
  }, [latitude, longitude, isValidCoordinates]);
  
  // Toggle between map types
  const toggleMapType = useCallback(() => {
    setMapType(current => {
      if (current === 'standard') return 'satellite';
      if (current === 'satellite') return 'hybrid';
      return 'standard';
    });
  }, []);
  
  // Retry map loading
  const retryMapLoad = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setMapError(false);
      setIsMapReady(false);
    } else {
      Alert.alert(
        'Map Error',
        'Failed to load the map after multiple attempts. Please check your internet connection and try again later.',
        [{ text: 'OK' }]
      );
    }
  }, [retryCount]);

  // Handle map error
  const handleMapError = useCallback(() => {
    setMapError(true);
    if (retryCount < MAX_RETRIES) {
      Alert.alert(
        'Map Error',
        'Failed to load the map. Would you like to retry?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: retryMapLoad }
        ]
      );
    }
  }, [retryCount, retryMapLoad]);

  // Handle map layout to detect if map fails to load
  const handleMapLayout = useCallback(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      handleMapError();
    }
  }, [handleMapError]);

  // Handle map ready
  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    if (!GOOGLE_MAPS_API_KEY) {
      handleMapError();
    }
  }, [handleMapError]);
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {locationName || 'Location Details'}
        </Text>
        <TouchableOpacity onPress={shareLocation} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Map with marker */}
      <View style={styles.mapContainer}>
        {!mapError && isValidCoordinates() && (
          <>
            {!isMapReady && (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.mapLoadingText}>Loading map...</Text>
              </View>
            )}
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              mapType={mapType}
              initialRegion={{
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onMapReady={handleMapReady}
              onLayout={handleMapLayout}
            >
              <Marker 
                coordinate={{ latitude, longitude }}
                title={locationName || 'Selected Location'}
                description={address}
              />
            </MapView>
          </>
        )}
        {mapError && (
          <View style={styles.mapErrorContainer}>
            <Text style={styles.mapErrorText}>Failed to load map</Text>
            {retryCount < MAX_RETRIES && (
              <TouchableOpacity style={styles.retryButton} onPress={retryMapLoad}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {!mapError && isValidCoordinates() && isMapReady && (
          <TouchableOpacity style={styles.mapTypeButton} onPress={toggleMapType}>
            <Text style={styles.mapTypeText}>
              {mapType === 'standard' ? 'Map' : mapType === 'satellite' ? 'Satellite' : 'Hybrid'}
            </Text>
            <MaterialIcons name="layers" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {!mapError && isValidCoordinates() && (
          <TouchableOpacity style={styles.openMapsButton} onPress={openInMaps}>
            <Text style={styles.openMapsText}>Open in Google Maps</Text>
            <MaterialIcons name="open-in-new" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Location details */}
      <ScrollView style={styles.detailsContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0066cc" style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : isValidCoordinates() ? (
          <>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Coordinates</Text>
              <Text style={styles.detailValue} selectable>
                {formatCoordinates(latitude, longitude)}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue} selectable>
                {address}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Plus Code</Text>
              <Text style={styles.detailValue} selectable>
                {`${latitude.toFixed(4)}+${longitude.toFixed(4)}`}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.errorText}>Invalid coordinates provided</Text>
        )}
        
        {/* Buttons for additional actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('ManualCoordinates', {
              onCoordsSubmit: (lat: number, lon: number) => {
                navigation.replace('LocationView', {
                  latitude: lat,
                  longitude: lon,
                  locationName: 'Custom Location'
                });
              }
            })}
          >
            <Text style={styles.actionButtonText}>Enter Coordinates</Text>
            <MaterialIcons name="edit-location" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0066cc',
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  shareButton: {
    padding: 5,
  },
  mapContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  mapErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  mapErrorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapTypeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapTypeText: {
    color: '#fff',
    marginRight: 5,
    fontSize: 12,
  },
  openMapsButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openMapsText: {
    color: '#fff',
    marginRight: 5,
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
    padding: 15,
  },
  detailItem: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 20,
  },
  actionsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
});

export default LocationView;