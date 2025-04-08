import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Access API key from environment variables or Constants.manifest.extra
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey;

/**
 * Map types available for static maps
 */
export enum MapType {
  ROADMAP = 'roadmap',
  SATELLITE = 'satellite',
  HYBRID = 'hybrid',
  TERRAIN = 'terrain'
}

/**
 * Capture a static map image for the given coordinates
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param width Width of the map image in pixels
 * @param height Height of the map image in pixels
 * @param zoom Zoom level (1-20, where 1 is world view and 20 is building level)
 * @param mapType Type of map to display
 * @returns Promise with the URI of the captured map image
 */
export const captureMapImage = async (
  latitude: number,
  longitude: number,
  width: number = 300,
  height: number = 200,
  zoom: number = 14,
  mapType: MapType = MapType.ROADMAP
): Promise<string | null> => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key is missing, cannot capture map image');
      return null;
    }

    // Create a static map URL using Google Maps Static API
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&maptype=${mapType}&markers=color:red%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    // Create a unique filename
    const filename = `${Date.now()}-map-${latitude}-${longitude}.png`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    
    // Download the image
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status === 200) {
      return fileUri;
    } else {
      throw new Error(`Failed to download map image: ${downloadResult.status}`);
    }
  } catch (error) {
    console.error('Error capturing map image:', error);
    return null;
  }
};

/**
 * Generate a map URL that can be opened in Google Maps or other map applications
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param label Optional label for the marker
 * @returns URL that can be opened in a map application
 */
export const generateMapUrl = (
  latitude: number,
  longitude: number,
  label: string = 'Location'
): string => {
  // Create a URL that will work with most map applications
  return `https://maps.google.com/maps?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=15&t=m`;
};

/**
 * Generate a directions URL from current location to the specified coordinates
 * @param toLatitude Destination latitude
 * @param toLongitude Destination longitude
 * @param fromLatitude Optional starting latitude (if not provided, user's current location will be used)
 * @param fromLongitude Optional starting longitude
 * @returns URL that can be opened in a map application to get directions
 */
export const generateDirectionsUrl = (
  toLatitude: number,
  toLongitude: number,
  fromLatitude?: number,
  fromLongitude?: number
): string => {
  let url = 'https://maps.google.com/maps?dirflg=d&';
  
  // If from coordinates are provided, use them
  if (fromLatitude !== undefined && fromLongitude !== undefined) {
    url += `saddr=${fromLatitude},${fromLongitude}&`;
  } else {
    // Otherwise use current location
    url += 'saddr=Current+Location&';
  }
  
  url += `daddr=${toLatitude},${toLongitude}`;
  
  return url;
};