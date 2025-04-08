import { Magnetometer } from 'expo-sensors';
import { Platform, Alert } from 'react-native';

// Store for the most recent readings
let currentMagneticHeading: number | null = null;
let currentMagneticField: number | null = null;

// Subscription object
let magnetometerSubscription: any = null;

/**
 * Start tracking magnetometer data for compass and magnetic field
 * @param onHeadingChange Optional callback when heading changes
 * @param onFieldChange Optional callback when magnetic field changes
 * @returns Boolean indicating if tracking was started successfully
 */
export const startMagnetometerTracking = async (
  onHeadingChange: (heading: number) => void,
  onFieldChange: (strength: number) => void
): Promise<any> => {
  try {
    await Magnetometer.setUpdateInterval(100);
    
    return Magnetometer.addListener(data => {
      // Calculate heading from magnetometer data
      const heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
      onHeadingChange(heading);
      
      // Calculate magnetic field strength
      const strength = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      onFieldChange(strength);
    });
  } catch (error) {
    console.error('Error starting magnetometer tracking:', error);
    return null;
  }
};

/**
 * Stop tracking magnetometer data
 */
export const stopMagnetometerTracking = (subscription: any): void => {
  if (subscription) {
    subscription.remove();
  }
};

/**
 * Get the current magnetic heading (compass direction)
 * @returns Current magnetic heading in degrees (0-360) or null if not tracking
 */
export const getCurrentMagneticHeading = (): number | null => {
  return currentMagneticHeading;
};

/**
 * Get the current magnetic field strength
 * @returns Current magnetic field strength in μT (microtesla) or null if not tracking
 */
export const getCurrentMagneticField = (): number | null => {
  return currentMagneticField;
};

/**
 * Calculate compass heading from magnetometer data
 * @param x X-axis reading
 * @param y Y-axis reading
 * @param z Z-axis reading
 * @returns Heading in degrees (0-360)
 */
const calculateHeading = (x: number, y: number, z: number): number => {
  // Basic calculation for compass heading
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  
  // Normalize to 0-360 degrees
  if (heading < 0) {
    heading += 360;
  }
  
  return heading;
};

/**
 * Calculate magnetic field strength from magnetometer data
 * @param x X-axis reading
 * @param y Y-axis reading
 * @param z Z-axis reading
 * @returns Field strength in μT (microtesla)
 */
const calculateFieldStrength = (x: number, y: number, z: number): number => {
  // Calculate the magnitude of the 3D vector (x,y,z)
  return Math.sqrt(x * x + y * y + z * z);
};

/**
 * Convert heading in degrees to a compass direction
 * @param degrees Heading in degrees (0-360)
 * @returns Compass direction (N, NE, E, etc.)
 */
export const getCompassDirection = (degrees: number): string => {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 
    'E', 'ESE', 'SE', 'SSE', 
    'S', 'SSW', 'SW', 'WSW', 
    'W', 'WNW', 'NW', 'NNW'
  ];
  
  // Each direction covers 22.5 degrees
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Format magnetic field strength with appropriate units
 * @param fieldStrength Field strength in μT (microtesla)
 * @returns Formatted string with units
 */
export const formatMagneticField = (strength: number): string => {
  return `${strength.toFixed(2)} µT`;
};

export const formatCompassHeading = (heading: number): string => {
  // Normalize heading to 0-360 range
  const normalizedHeading = (heading + 360) % 360;
  
  // Convert to cardinal directions
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(normalizedHeading / 22.5) % 16;
  
  return `${directions[index]} (${Math.round(normalizedHeading)}°)`;
};