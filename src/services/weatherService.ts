import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { WeatherData } from '../types/types';

// Access API key from Constants (Expo config)
const OPENWEATHER_API_KEY = Constants.expoConfig?.extra?.openWeatherApiKey;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface WeatherCache {
  data: any;
  timestamp: number;
}

const weatherCache: { [key: string]: WeatherCache } = {};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getCacheKey = (lat: number, lon: number): string => {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
};

const isCacheValid = (cache: WeatherCache): boolean => {
  return Date.now() - cache.timestamp < CACHE_DURATION;
};

/**
 * Fetch current weather data for a location
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param units Units for temperature and wind speed (metric or imperial)
 * @returns Promise resolving to weather data or null if failed
 */
export const fetchWeatherData = async (lat: number, lon: number, retryCount = 0): Promise<any> => {
  const cacheKey = getCacheKey(lat, lon);
  const cachedData = weatherCache[cacheKey];

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key is not configured');
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );

    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        // Rate limit hit, retry after delay
        await delay(RETRY_DELAY * (retryCount + 1));
        return fetchWeatherData(lat, lon, retryCount + 1);
      }
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the successful response
    weatherCache[cacheKey] = {
      data,
      timestamp: Date.now()
    };

    return data;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * (retryCount + 1));
      return fetchWeatherData(lat, lon, retryCount + 1);
    }
    throw error;
  }
};

/**
 * Format temperature according to user preference
 * @param temperature Temperature value
 * @param unit Unit of the temperature (celsius or fahrenheit)
 * @returns Formatted temperature string with unit
 */
export const formatTemperature = (temp: number): string => {
  return `${Math.round(temp)}°C`;
};

/**
 * Convert temperature between Celsius and Fahrenheit
 * @param temperature Temperature value to convert
 * @param fromUnit Source unit of the temperature
 * @param toUnit Target unit of the temperature
 * @returns Converted temperature value
 */
export const convertTemperature = (
  temperature: number,
  fromUnit: 'celsius' | 'fahrenheit',
  toUnit: 'celsius' | 'fahrenheit'
): number => {
  if (fromUnit === toUnit) {
    return temperature;
  }
  
  if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return (temperature * 9/5) + 32;
  } else {
    return (temperature - 32) * 5/9;
  }
};

/**
 * Format wind speed according to user preference
 * @param speed Wind speed value
 * @param unit Unit of the speed (kmh or mph)
 * @returns Formatted wind speed string with unit
 */
export const formatWindSpeed = (speed: number): string => {
  return `${Math.round(speed)} m/s`;
};

/**
 * Convert wind speed between km/h and mph
 * @param speed Wind speed value to convert
 * @param fromUnit Source unit of the speed
 * @param toUnit Target unit of the speed
 * @returns Converted wind speed value
 */
export const convertWindSpeed = (
  speed: number,
  fromUnit: 'kmh' | 'mph',
  toUnit: 'kmh' | 'mph'
): number => {
  if (fromUnit === toUnit) {
    return speed;
  }
  
  if (fromUnit === 'kmh' && toUnit === 'mph') {
    return speed * 0.621371;
  } else {
    return speed * 1.60934;
  }
};

/**
 * Get wind direction as a cardinal direction from degrees
 * @param degrees Wind direction in degrees (0-360)
 * @returns Cardinal direction (N, NE, E, etc.)
 */
export const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Format pressure according to user preference
 * @param pressure Pressure value in hPa
 * @param unit Unit for pressure display (hpa, mmhg, or incheshg)
 * @returns Formatted pressure string with unit
 */
export const formatPressure = (pressure: number): string => {
  return `${pressure} hPa`;
};

/**
 * Format humidity as a percentage
 * @param humidity Humidity value (0-100)
 * @returns Formatted humidity string with percentage
 */
export const formatHumidity = (humidity: number): string => {
  return `${humidity}%`;
};

/**
 * Get URL for weather icon from OpenWeatherMap
 * @param iconCode Icon code from weather data
 * @param size Size of the icon (small, medium, or large)
 * @returns URL to the weather icon
 */
export const getWeatherIconUrl = (
  iconCode: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): string => {
  const sizeCode = size === 'small' ? '1' : size === 'large' ? '4' : '2';
  return `https://openweathermap.org/img/wn/${iconCode}@${sizeCode}x.png`;
};

/**
 * Get a simplified weather object with just temperature and condition
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with basic weather data
 */
export const getSimplifiedWeather = async (lat: number, lon: number): Promise<{
  temperature: number;
  condition: string;
} | null> => {
  try {
    const data = await fetchWeatherData(lat, lon);
    return {
      temperature: data.main.temp,
      condition: data.weather[0].main
    };
  } catch (error) {
    console.error('Error fetching simplified weather:', error);
    return null;
  }
};