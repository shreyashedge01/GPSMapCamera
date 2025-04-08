import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '../types/types';

type ManualCoordinatesRouteProp = RouteProp<RootStackParamList, 'ManualCoordinates'>;
type ManualCoordinatesNavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * ManualCoordinates screen allows users to input coordinates directly
 * Can be accessed from LocationView or Camera screens
 */
const ManualCoordinates = () => {
  const navigation = useNavigation<ManualCoordinatesNavigationProp>();
  const route = useRoute<ManualCoordinatesRouteProp>();
  const { onCoordsSubmit } = route.params;
  
  // State for coordinate input
  const [degreesLat, setDegreesLat] = useState<string>('');
  const [minutesLat, setMinutesLat] = useState<string>('');
  const [secondsLat, setSecondsLat] = useState<string>('');
  const [directionLat, setDirectionLat] = useState<'N' | 'S'>('N');
  
  const [degreesLon, setDegreesLon] = useState<string>('');
  const [minutesLon, setMinutesLon] = useState<string>('');
  const [secondsLon, setSecondsLon] = useState<string>('');
  const [directionLon, setDirectionLon] = useState<'E' | 'W'>('E');
  
  // State for decimal coordinate input
  const [decimalLat, setDecimalLat] = useState<string>('');
  const [decimalLon, setDecimalLon] = useState<string>('');
  
  // Toggle between DMS and decimal input
  const [inputMode, setInputMode] = useState<'dms' | 'decimal'>('decimal');
  
  // References for input fields to support auto-next focus
  const minutesLatRef = useRef<TextInput>(null);
  const secondsLatRef = useRef<TextInput>(null);
  const degreesLonRef = useRef<TextInput>(null);
  const minutesLonRef = useRef<TextInput>(null);
  const secondsLonRef = useRef<TextInput>(null);
  const decimalLonRef = useRef<TextInput>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Validation messages
  const [errors, setErrors] = useState<{
    dmsLat?: string;
    dmsLon?: string;
    decimalLat?: string;
    decimalLon?: string;
  }>({});
  
  const [isDMSMode, setIsDMSMode] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);
  
  // Validate DMS format
  const validateDMSFormat = useCallback((value: string): boolean => {
    const dmsRegex = /^\d{1,3}°\s*\d{1,2}'\s*\d{1,2}"$/;
    return dmsRegex.test(value.trim());
  }, []);
  
  // Convert DMS to decimal with validation
  const convertDMSToDecimal = useCallback((dms: string): number | null => {
    if (!validateDMSFormat(dms)) {
      return null;
    }

    const parts = dms.split(/[°'"]/).map(part => parseInt(part.trim()));
    if (parts.length !== 3 || parts.some(isNaN)) {
      return null;
    }

    const [degrees, minutes, seconds] = parts;
    if (degrees < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
      return null;
    }

    return degrees + minutes / 60 + seconds / 3600;
  }, [validateDMSFormat]);
  
  // Validate coordinates
  const validateCoordinates = useCallback(() => {
    setError(null);
    
    if (inputMode === 'dms') {
      const latValue = convertDMSToDecimal(degreesLat + '°' + minutesLat + "'" + secondsLat + '"');
      const lonValue = convertDMSToDecimal(degreesLon + '°' + minutesLon + "'" + secondsLon + '"');
      
      if (latValue === null || lonValue === null) {
        setError('Invalid DMS values');
        return false;
      }
      
      if (latValue < -90 || latValue > 90) {
        setError('Latitude must be between -90° and 90°');
        return false;
      }
      
      if (lonValue < -180 || lonValue > 180) {
        setError('Longitude must be between -180° and 180°');
        return false;
      }
    } else {
      const latValue = Number(decimalLat);
      const lonValue = Number(decimalLon);
      
      if (isNaN(latValue) || isNaN(lonValue)) {
        setError('Please enter valid numbers');
        return false;
      }
      
      if (latValue < -90 || latValue > 90) {
        setError('Latitude must be between -90° and 90°');
        return false;
      }
      
      if (lonValue < -180 || lonValue > 180) {
        setError('Longitude must be between -180° and 180°');
        return false;
      }
    }
    
    return true;
  }, [inputMode, degreesLat, minutesLat, secondsLat, degreesLon, minutesLon, secondsLon, decimalLat, decimalLon, convertDMSToDecimal]);
  
  // Handle coordinate submission
  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    
    if (!validateCoordinates()) {
      return;
    }
    
    setIsLoading(true);
    
    let latitude: number;
    let longitude: number;
    
    if (inputMode === 'dms') {
      latitude = convertDMSToDecimal(degreesLat + '°' + minutesLat + "'" + secondsLat + '"') || 0;
      longitude = convertDMSToDecimal(degreesLon + '°' + minutesLon + "'" + secondsLon + '"') || 0;
    } else {
      latitude = Number(decimalLat);
      longitude = Number(decimalLon);
    }
    
    // Simulate a brief loading to improve UX
    setTimeout(() => {
      setIsLoading(false);
      onCoordsSubmit(latitude, longitude);
    }, 500);
  }, [inputMode, degreesLat, minutesLat, secondsLat, degreesLon, minutesLon, secondsLon, decimalLat, decimalLon, validateCoordinates, onCoordsSubmit, convertDMSToDecimal]);
  
  // Toggle between input modes
  const toggleInputMode = useCallback(() => {
    setInputMode(current => current === 'dms' ? 'decimal' : 'dms');
    setErrors({});
  }, []);
  
  // Example coordinate presets
  const presets = [
    { name: 'Eiffel Tower', lat: 48.8584, lon: 2.2945 },
    { name: 'Statue of Liberty', lat: 40.6892, lon: -74.0445 },
    { name: 'Sydney Opera House', lat: -33.8568, lon: 151.2153 },
    { name: 'Taj Mahal', lat: 27.1751, lon: 78.0421 }
  ];
  
  // Apply a preset coordinate
  const applyPreset = useCallback((lat: number, lon: number) => {
    if (inputMode === 'decimal') {
      setDecimalLat(lat.toFixed(6));
      setDecimalLon(lon.toFixed(6));
    } else {
      // Convert decimal to DMS for DMS mode
      const latAbs = Math.abs(lat);
      const latDeg = Math.floor(latAbs);
      const latMin = Math.floor((latAbs - latDeg) * 60);
      const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2);
      
      const lonAbs = Math.abs(lon);
      const lonDeg = Math.floor(lonAbs);
      const lonMin = Math.floor((lonAbs - lonDeg) * 60);
      const lonSec = ((lonAbs - lonDeg - lonMin / 60) * 3600).toFixed(2);
      
      setDegreesLat(latDeg.toString());
      setMinutesLat(latMin.toString());
      setSecondsLat(latSec);
      setDirectionLat(lat >= 0 ? 'N' : 'S');
      
      setDegreesLon(lonDeg.toString());
      setMinutesLon(lonMin.toString());
      setSecondsLon(lonSec);
      setDirectionLon(lon >= 0 ? 'E' : 'W');
    }
    
    setErrors({});
  }, [inputMode]);
  
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: keyboardHeight }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Coordinates</Text>
        <View style={styles.backButton} />
      </View>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Toggle between DMS and Decimal */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modeToggleButton,
              inputMode === 'decimal' && styles.activeToggleButton
            ]}
            onPress={() => setInputMode('decimal')}
          >
            <Text style={[
              styles.modeToggleText,
              inputMode === 'decimal' && styles.activeToggleText
            ]}>Decimal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeToggleButton,
              inputMode === 'dms' && styles.activeToggleButton
            ]}
            onPress={() => setInputMode('dms')}
          >
            <Text style={[
              styles.modeToggleText,
              inputMode === 'dms' && styles.activeToggleText
            ]}>DMS</Text>
          </TouchableOpacity>
        </View>
        
        {/* Input fields based on mode */}
        {inputMode === 'decimal' ? (
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Latitude</Text>
              <TextInput
                style={{
                  ...styles.input,
                  borderColor: errors.decimalLat ? '#ff4444' : '#ddd'
                }}
                value={decimalLat}
                onChangeText={setDecimalLat}
                placeholder="Enter latitude (e.g., 48.8584)"
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => decimalLonRef.current?.focus()}
                placeholderTextColor="#999"
              />
              {errors.decimalLat && (
                <Text style={styles.formErrorText}>{errors.decimalLat}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Longitude</Text>
              <TextInput
                ref={decimalLonRef}
                style={{
                  ...styles.input,
                  borderColor: errors.decimalLon ? '#ff4444' : '#ddd'
                }}
                value={decimalLon}
                onChangeText={setDecimalLon}
                placeholder="Enter longitude (e.g., 2.2945)"
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                placeholderTextColor="#999"
              />
              {errors.decimalLon && (
                <Text style={styles.formErrorText}>{errors.decimalLon}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Latitude</Text>
              <View style={styles.dmsContainer}>
                <TextInput
                  style={{
                    ...styles.dmsInput,
                    borderColor: errors.dmsLat ? '#ff4444' : '#ddd'
                  }}
                  value={degreesLat}
                  onChangeText={(text) => {
                    setDegreesLat(text);
                    if (text.length === 2) {
                      minutesLatRef.current?.focus();
                    }
                  }}
                  placeholder="°"
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={() => minutesLatRef.current?.focus()}
                  placeholderTextColor="#999"
                />
                <Text style={styles.dmsSeparator}>°</Text>
                <TextInput
                  ref={minutesLatRef}
                  style={{
                    ...styles.dmsInput,
                    borderColor: errors.dmsLat ? '#ff4444' : '#ddd'
                  }}
                  value={minutesLat}
                  onChangeText={(text) => {
                    setMinutesLat(text);
                    if (text.length === 2) {
                      secondsLatRef.current?.focus();
                    }
                  }}
                  placeholder="'"
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={() => secondsLatRef.current?.focus()}
                  placeholderTextColor="#999"
                />
                <Text style={styles.dmsSeparator}>'</Text>
                <TextInput
                  ref={secondsLatRef}
                  style={{
                    ...styles.dmsInput,
                    borderColor: errors.dmsLat ? '#ff4444' : '#ddd'
                  }}
                  value={secondsLat}
                  onChangeText={setSecondsLat}
                  placeholder='"'
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="next"
                  onSubmitEditing={() => degreesLonRef.current?.focus()}
                  placeholderTextColor="#999"
                />
                <Text style={styles.dmsSeparator}>"</Text>
                <View style={styles.directionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      directionLat === 'N' && styles.activeDirectionButton
                    ]}
                    onPress={() => setDirectionLat('N')}
                  >
                    <Text style={[
                      styles.directionText,
                      directionLat === 'N' && styles.activeDirectionText
                    ]}>N</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      directionLat === 'S' && styles.activeDirectionButton
                    ]}
                    onPress={() => setDirectionLat('S')}
                  >
                    <Text style={[
                      styles.directionText,
                      directionLat === 'S' && styles.activeDirectionText
                    ]}>S</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.dmsLat && (
                <Text style={styles.formErrorText}>{errors.dmsLat}</Text>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Longitude</Text>
              <View style={styles.dmsContainer}>
                <TextInput
                  ref={degreesLonRef}
                  style={{
                    ...styles.dmsInput,
                    borderColor: errors.dmsLon ? '#ff4444' : '#ddd'
                  }}
                  value={degreesLon}
                  onChangeText={(text) => {
                    setDegreesLon(text);
                    if (text.length === 3) {
                      minutesLonRef.current?.focus();
                    }
                  }}
                  placeholder="°"
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="next"
                  onSubmitEditing={() => minutesLonRef.current?.focus()}
                  placeholderTextColor="#999"
                />
                <Text style={styles.dmsSeparator}>°</Text>
                <TextInput
                  ref={minutesLonRef}
                  style={{
                    ...styles.dmsInput,
                    borderColor: errors.dmsLon ? '#ff4444' : '#ddd'
                  }}
                  value={minutesLon}
                  onChangeText={(text) => {
                    setMinutesLon(text);
                    if (text.length === 2) {
                      secondsLonRef.current?.focus();
                    }
                  }}
                  placeholder="'"
                  keyboardType="number-pad"
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={() => secondsLonRef.current?.focus()}
                  placeholderTextColor="#999"
                />
                <Text style={styles.dmsSeparator}>'</Text>
                <TextInput
                  ref={secondsLonRef}
                  style={{
                    ...styles.dmsInput,
                    borderColor: errors.dmsLon ? '#ff4444' : '#ddd'
                  }}
                  value={secondsLon}
                  onChangeText={setSecondsLon}
                  placeholder='"'
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  placeholderTextColor="#999"
                />
                <Text style={styles.dmsSeparator}>"</Text>
                <View style={styles.directionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      directionLon === 'E' && styles.activeDirectionButton
                    ]}
                    onPress={() => setDirectionLon('E')}
                  >
                    <Text style={[
                      styles.directionText,
                      directionLon === 'E' && styles.activeDirectionText
                    ]}>E</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      directionLon === 'W' && styles.activeDirectionButton
                    ]}
                    onPress={() => setDirectionLon('W')}
                  >
                    <Text style={[
                      styles.directionText,
                      directionLon === 'W' && styles.activeDirectionText
                    ]}>W</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.dmsLon && (
                <Text style={styles.formErrorText}>{errors.dmsLon}</Text>
              )}
            </View>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isLoading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Coordinates</Text>
              <MaterialIcons name="check" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        
        {/* Preset coordinates */}
        <View style={styles.presetsContainer}>
          <Text style={styles.presetsTitle}>Preset Locations</Text>
          <View style={styles.presetsGrid}>
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={styles.presetButton}
                onPress={() => applyPreset(preset.lat, preset.lon)}
              >
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetCoords}>
                  {preset.lat.toFixed(4)}, {preset.lon.toFixed(4)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#0066cc',
  },
  modeToggleText: {
    fontSize: 16,
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  dmsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dmsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  dmsSeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 5,
  },
  directionContainer: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  directionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  activeDirectionButton: {
    backgroundColor: '#0066cc',
  },
  directionText: {
    fontSize: 14,
    color: '#666',
  },
  activeDirectionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  formErrorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  presetsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetButton: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  presetName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  presetCoords: {
    fontSize: 12,
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
});

export default ManualCoordinates;