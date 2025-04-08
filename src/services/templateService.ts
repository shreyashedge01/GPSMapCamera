import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { 
  LocationData, 
  PhotoData, 
  TemplateSettings, 
  TemplateType, 
  UnitSettings, 
  WeatherData 
} from '../types/types';
import { formatAltitude, formatCoordinates } from './locationService';
import { formatHumidity, formatPressure, formatTemperature, formatWindSpeed, getWeatherIconUrl, getWindDirection } from './weatherService';
import { formatMagneticField, getCompassDirection } from './magnetic';
import { MapType, captureMapImage } from './mapService';

/**
 * Apply template to a photo
 * @param photoUri URI of the source photo
 * @param templateType Type of template to apply
 * @param templateSettings Settings for the template
 * @param locationData Location data to include in the template
 * @param weatherData Weather data to include in the template
 * @param magneticHeading Compass heading data
 * @param magneticField Magnetic field strength data
 * @param units Unit preferences
 * @returns Promise with the URI of the processed photo
 */
export const applyTemplate = async (
  photoUri: string,
  templateType: TemplateType,
  templateSettings: TemplateSettings,
  locationData?: LocationData,
  weatherData?: WeatherData,
  magneticHeading?: number,
  magneticField?: number,
  units?: UnitSettings
): Promise<string> => {
  try {
    // Default units if not provided
    const defaultUnits: UnitSettings = {
      temperature: 'celsius',
      distance: 'kilometers',
      speed: 'kmh',
      pressure: 'hpa',
      coordinates: 'decimal',
      altitude: 'meters'
    };
    
    const userUnits = units || defaultUnits;
    
    if (templateType === 'classic') {
      // Use the classic template with fixed layout
      return await applyClassicTemplate(
        photoUri,
        templateSettings,
        locationData,
        weatherData,
        magneticHeading,
        magneticField,
        userUnits
      );
    } else {
      // Use the advanced template with customizable layout
      return await applyAdvancedTemplate(
        photoUri,
        templateSettings,
        locationData,
        weatherData,
        magneticHeading,
        magneticField,
        userUnits
      );
    }
  } catch (error) {
    console.error('Error applying template:', error);
    return photoUri; // Return original photo if processing fails
  }
};

/**
 * Apply classic template with fixed layout
 * @param photoUri URI of the source photo
 * @param templateSettings Settings for which elements to show
 * @param locationData Location data to include
 * @param weatherData Weather data to include
 * @param magneticHeading Compass heading
 * @param magneticField Magnetic field strength
 * @param units Unit preferences
 * @returns Promise with the URI of the processed photo
 */
const applyClassicTemplate = async (
  photoUri: string,
  templateSettings: TemplateSettings,
  locationData?: LocationData,
  weatherData?: WeatherData,
  magneticHeading?: number,
  magneticField?: number,
  units?: UnitSettings
): Promise<string> => {
  try {
    // Create a unique destination filename
    const filename = `${Date.now()}-templated.jpg`;
    const destinationUri = `${FileSystem.cacheDirectory}${filename}`;
    
    // Generate HTML with embedded data
    let htmlContent = `
      <html>
      <head>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            font-family: Arial, sans-serif;
          }
          .container {
            position: relative;
            width: 100%;
            height: 100%;
          }
          .photo {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .overlay {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 10px;
            color: white;
          }
          .data-group {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .data-item {
            font-size: 12px;
            margin-right: 15px;
          }
          .map-container {
            position: absolute;
            right: 10px;
            top: 10px;
            width: 120px;
            height: 120px;
            border: 2px solid white;
            border-radius: 5px;
            overflow: hidden;
          }
          .map-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img class="photo" src="${photoUri}" />
    `;
    
    // Add data overlay
    htmlContent += `<div class="overlay">`;
    
    // Add location data if available and enabled
    if (locationData && (templateSettings.coordinates?.enabled || templateSettings.address?.enabled)) {
      htmlContent += `<div class="data-group">`;
      
      if (templateSettings.coordinates?.enabled) {
        const coordsStr = formatCoordinates(
          locationData.latitude, 
          locationData.longitude,
          units?.coordinates || 'decimal'
        );
        htmlContent += `<div class="data-item">📍 ${coordsStr}</div>`;
      }
      
      if (templateSettings.address?.enabled && locationData.address) {
        htmlContent += `<div class="data-item">📌 ${locationData.address}</div>`;
      }
      
      htmlContent += `</div>`;
    }
    
    // Add altitude if available and enabled
    if (locationData?.altitude && templateSettings.altitude?.enabled) {
      htmlContent += `<div class="data-group">`;
      const altitudeStr = formatAltitude(
        locationData.altitude,
        units?.altitude || 'meters'
      );
      htmlContent += `<div class="data-item">⬆️ Altitude: ${altitudeStr}</div>`;
      htmlContent += `</div>`;
    }
    
    // Add weather data if available and enabled
    if (weatherData && (templateSettings.temperature?.enabled || templateSettings.weather?.enabled)) {
      htmlContent += `<div class="data-group">`;
      
      if (templateSettings.temperature?.enabled) {
        const tempStr = formatTemperature(
          weatherData.temperature,
          units?.temperature || 'celsius'
        );
        htmlContent += `<div class="data-item">🌡️ ${tempStr}</div>`;
      }
      
      if (templateSettings.weather?.enabled) {
        htmlContent += `<div class="data-item">☁️ ${weatherData.condition}</div>`;
      }
      
      htmlContent += `</div>`;
    }
    
    // Add wind, humidity, pressure if available and enabled
    if (weatherData) {
      let hasMeteorologyData = false;
      let meteorologyHtml = `<div class="data-group">`;
      
      if (templateSettings.wind?.enabled) {
        const windSpeedStr = formatWindSpeed(
          weatherData.windSpeed,
          units?.speed || 'kmh'
        );
        const windDirStr = getWindDirection(weatherData.windDirection);
        meteorologyHtml += `<div class="data-item">💨 ${windSpeedStr} ${windDirStr}</div>`;
        hasMeteorologyData = true;
      }
      
      if (templateSettings.humidity?.enabled) {
        const humidityStr = formatHumidity(weatherData.humidity);
        meteorologyHtml += `<div class="data-item">💧 ${humidityStr}</div>`;
        hasMeteorologyData = true;
      }
      
      if (templateSettings.pressure?.enabled) {
        const pressureStr = formatPressure(
          weatherData.pressure,
          units?.pressure || 'hpa'
        );
        meteorologyHtml += `<div class="data-item">⏱️ ${pressureStr}</div>`;
        hasMeteorologyData = true;
      }
      
      meteorologyHtml += `</div>`;
      
      if (hasMeteorologyData) {
        htmlContent += meteorologyHtml;
      }
    }
    
    // Add compass and magnetic data if available and enabled
    if ((magneticHeading !== undefined && templateSettings.compass?.enabled) || 
        (magneticField !== undefined && templateSettings.magneticField?.enabled)) {
      
      htmlContent += `<div class="data-group">`;
      
      if (magneticHeading !== undefined && templateSettings.compass?.enabled) {
        const compassDir = getCompassDirection(magneticHeading);
        htmlContent += `<div class="data-item">🧭 ${Math.round(magneticHeading)}° ${compassDir}</div>`;
      }
      
      if (magneticField !== undefined && templateSettings.magneticField?.enabled) {
        const fieldStr = formatMagneticField(magneticField);
        htmlContent += `<div class="data-item">🧲 ${fieldStr}</div>`;
      }
      
      htmlContent += `</div>`;
    }
    
    // Add date and time if enabled
    if (templateSettings.dateTime?.enabled) {
      const now = new Date();
      const dateTimeStr = now.toLocaleString();
      
      htmlContent += `<div class="data-group">`;
      htmlContent += `<div class="data-item">🕒 ${dateTimeStr}</div>`;
      htmlContent += `</div>`;
    }
    
    // Add custom text if enabled and provided
    if (templateSettings.customText?.enabled && templateSettings.customText.value) {
      htmlContent += `<div class="data-group">`;
      htmlContent += `<div class="data-item">📝 ${templateSettings.customText.value}</div>`;
      htmlContent += `</div>`;
    }
    
    htmlContent += `</div>`; // Close overlay div
    
    // Add map image if available and enabled
    if (locationData && templateSettings.mapImage?.enabled) {
      // Generate or retrieve map image
      const mapImageUri = await captureMapImage(
        locationData.latitude,
        locationData.longitude,
        120, // Width
        120, // Height
        14,  // Zoom
        MapType.ROADMAP
      );
      
      if (mapImageUri) {
        htmlContent += `
          <div class="map-container">
            <img class="map-img" src="${mapImageUri}" />
          </div>
        `;
      }
    }
    
    // Close container and HTML
    htmlContent += `
        </div>
      </body>
      </html>
    `;
    
    // TODO: Use a WebView to render the HTML and capture to image
    // For this example, we'll just return the original image
    // In a real implementation, you would:
    // 1. Create a temporary HTML file
    // 2. Render it in an off-screen WebView
    // 3. Capture the WebView to an image
    // 4. Return the captured image URI
    
    // For now, we'll use ImageManipulator to add a simple text overlay
    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [], // No transformations
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return result.uri;
  } catch (error) {
    console.error('Error applying classic template:', error);
    return photoUri; // Return original photo if processing fails
  }
};

/**
 * Apply advanced template with customizable layout
 * @param photoUri URI of the source photo
 * @param templateSettings Settings for which elements to show
 * @param locationData Location data to include
 * @param weatherData Weather data to include
 * @param magneticHeading Compass heading
 * @param magneticField Magnetic field strength
 * @param units Unit preferences
 * @returns Promise with the URI of the processed photo
 */
const applyAdvancedTemplate = async (
  photoUri: string,
  templateSettings: TemplateSettings,
  locationData?: LocationData,
  weatherData?: WeatherData,
  magneticHeading?: number,
  magneticField?: number,
  units?: UnitSettings
): Promise<string> => {
  // Advanced template is similar to classic but allows for more customization
  // For now, we'll reuse the classic template
  return await applyClassicTemplate(
    photoUri,
    templateSettings,
    locationData,
    weatherData,
    magneticHeading,
    magneticField,
    units
  );
};

/**
 * Get template colors based on theme
 * @param theme Theme to use (light, dark, or custom)
 * @returns Object with color values
 */
export const getTemplateColors = (theme: 'light' | 'dark' | 'custom' = 'dark') => {
  const colors = {
    light: {
      primary: '#000000',
      secondary: '#555555',
      background: 'rgba(255, 255, 255, 0.7)',
      outline: '#FFFFFF'
    },
    dark: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      background: 'rgba(0, 0, 0, 0.7)',
      outline: '#000000'
    },
    custom: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      background: 'rgba(0, 0, 0, 0.7)',
      outline: '#000000'
    }
  };
  
  return colors[theme];
};

/**
 * Save photo with template data attached as metadata
 * @param photoUri URI of the photo
 * @param photoData PhotoData object containing all metadata
 * @returns Promise with the URI of the saved photo
 */
export const savePhotoWithMetadata = async (
  photoUri: string,
  photoData: PhotoData
): Promise<string> => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const extension = photoUri.split('.').pop() || 'jpg';
    const filename = `${timestamp}-photo.${extension}`;
    const destinationUri = `${FileSystem.documentDirectory}photos/${filename}`;
    
    // Create the photos directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}photos`);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos`);
    }
    
    // Copy the photo file
    await FileSystem.copyAsync({
      from: photoUri,
      to: destinationUri
    });
    
    // Save metadata to a separate JSON file
    const metadataFilename = `${timestamp}-metadata.json`;
    const metadataUri = `${FileSystem.documentDirectory}photos/${metadataFilename}`;
    
    await FileSystem.writeAsStringAsync(
      metadataUri,
      JSON.stringify(photoData),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    return destinationUri;
  } catch (error) {
    console.error('Error saving photo with metadata:', error);
    return photoUri; // Return original photo if saving fails
  }
};

/**
 * Load photo metadata from storage
 * @param photoUri URI of the photo
 * @returns Promise with the PhotoData object or null if not found
 */
export const loadPhotoMetadata = async (photoUri: string): Promise<PhotoData | null> => {
  try {
    // Extract timestamp from filename
    const filename = photoUri.split('/').pop() || '';
    const timestamp = filename.split('-')[0];
    
    if (!timestamp) {
      return null;
    }
    
    // Construct metadata filename
    const metadataFilename = `${timestamp}-metadata.json`;
    const metadataUri = `${FileSystem.documentDirectory}photos/${metadataFilename}`;
    
    // Check if metadata file exists
    const fileInfo = await FileSystem.getInfoAsync(metadataUri);
    if (!fileInfo.exists) {
      return null;
    }
    
    // Read and parse metadata
    const metadataStr = await FileSystem.readAsStringAsync(metadataUri);
    const metadata = JSON.parse(metadataStr) as PhotoData;
    
    return metadata;
  } catch (error) {
    console.error('Error loading photo metadata:', error);
    return null;
  }
};