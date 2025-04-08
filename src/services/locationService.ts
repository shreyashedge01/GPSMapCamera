import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import { LocationData } from '../types/types';

// Access API key directly rather than relying on @env
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '${GOOGLE_MAPS_API_KEY}';

/**
 * Request location permissions from the user
 * @returns Promise resolving to boolean indicating if permission was granted
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Check if location services are enabled on the device
 * @returns Promise resolving to boolean indicating if location services are enabled
 */
export const checkLocationServicesEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services in your device settings to use this feature.',
        [{ text: 'OK' }]
      );
    }
    return enabled;
  } catch (error) {
    console.error('Error checking location services:', error);
    return false;
  }
};

/**
 * Get the current device position
 * @param highAccuracy Use high accuracy mode (may be slower but more precise)
 * @returns Promise resolving to location data or null if failed
 */
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const address = await reverseGeocode(location.coords.latitude, location.coords.longitude);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude || null,
      ...address,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

/**
 * Get address details from coordinates using reverse geocoding
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise resolving to address data or empty object if failed
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<Partial<LocationData>> => {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (!address) return {};

    return {
      address: address.street ? `${address.street}, ${address.city || ''}` : address.city || '',
      city: address.city || undefined,
      country: address.country || undefined,
      postalCode: address.postalCode || undefined,
      region: address.region || undefined,
      street: address.street || undefined,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return {};
  }
};

/**
 * Format coordinates according to user preference
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param format Format to use (decimal or dms)
 * @returns Formatted coordinates string
 */
export const formatCoordinates = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`;
};

/**
 * Format altitude based on user's preferred unit
 * @param altitude Altitude in meters
 * @param unit Preferred altitude unit (meters or feet)
 * @returns Formatted altitude string with unit
 */
export const formatAltitude = (altitude: number | null): string => {
  if (altitude === null) return 'N/A';
  return `${altitude.toFixed(1)}m`;
};

/**
 * Calculate distance between two coordinates
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @param unit Unit to return (km or mi)
 * @returns Distance in specified unit
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'kilometers' | 'miles' = 'kilometers'
): number => {
  // Haversine formula to calculate great-circle distance between two points
  const R = unit === 'miles' ? 3958.8 : 6371; // Earth radius in miles or km
  
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
const degreesToRadians = (degrees: number): number => {
  return degrees * Math.PI / 180;
};

/**
 * Get a simplified location object with essential data for display
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with basic location data
 */
export const getSimplifiedLocation = async (
  latitude: number,
  longitude: number
): Promise<LocationData> => {
  try {
    const addressData = await reverseGeocode(latitude, longitude);
    
    return {
      latitude,
      longitude,
      altitude: 0, // Default to 0 altitude
      ...addressData
    };
  } catch (error) {
    console.error('Error getting simplified location:', error);
    
    // Return basic data without address components
    return {
      latitude,
      longitude,
      altitude: 0
    };
  }
};