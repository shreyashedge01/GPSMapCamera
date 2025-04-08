import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { TemplateType, TemplateSettings as TemplateSettingsType, AppSettings } from '../types/types';
import { RootStackParamList } from '../types/types';

type TemplateSettingsRouteProp = RouteProp<RootStackParamList, 'TemplateSettings'>;
type TemplateSettingsNavigationProp = StackNavigationProp<RootStackParamList>;

// Define valid icon names for MaterialIcons
type IconName = 
  | 'my-location' 
  | 'place' 
  | 'access-time' 
  | 'wb-sunny' 
  | 'height' 
  | 'location-city'
  | 'thermostat'
  | 'cloud'
  | 'air'
  | 'water-drop'
  | 'speed'
  | 'compass-calibration'
  | 'explore'
  | 'settings-input-antenna'
  | 'today'
  | 'image'
  | 'map'
  | 'text-format'
  | 'branding-watermark'
  | 'tune';

const DEFAULT_SETTINGS: AppSettings = {
  display: {
    theme: 'dark',
    fontSize: 'medium'
  },
  camera: {
    cameraType: 'back',
    zoom: 0,
    autoSave: true,
    showGridLines: true,
    showLevel: true,
    hdr: false,
    defaultTemplate: 'classic',
    flashMode: 'auto'
  },
  units: {
    temperature: 'celsius',
    distance: 'kilometers',
    speed: 'kph',
    pressure: 'hpa',
    coordinates: 'decimal',
    altitude: 'meters'
  },
  mapSettings: {
    type: 'standard',
    zoomLevel: 15
  },
  templates: {
    classic: {
      coordinates: { enabled: true },
      altitude: { enabled: true },
      address: { enabled: true },
      temperature: { enabled: true },
      weather: { enabled: true },
      wind: { enabled: true },
      humidity: { enabled: true },
      pressure: { enabled: true },
      compass: { enabled: true },
      magneticField: { enabled: true },
      mapImage: { enabled: true },
      customText: { enabled: false },
      logo: { enabled: false },
      dateTime: { enabled: true }
    },
    advanced: {
      coordinates: { enabled: true },
      altitude: { enabled: true },
      address: { enabled: true },
      temperature: { enabled: true },
      weather: { enabled: true },
      wind: { enabled: true },
      humidity: { enabled: true },
      pressure: { enabled: true },
      compass: { enabled: true },
      magneticField: { enabled: true },
      mapImage: { enabled: true },
      customText: { enabled: true },
      logo: { enabled: true },
      dateTime: { enabled: true }
    }
  },
  privacySettings: {
    removeLocationData: false,
    shareWeatherData: true
  }
};

export default function TemplateSettingsScreen() {
  const navigation = useNavigation<TemplateSettingsNavigationProp>();
  const route = useRoute<TemplateSettingsRouteProp>();
  const templateType = route.params.templateType;
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Function to load settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Check if settings file exists
      const settingsPath = `${FileSystem.documentDirectory}settings.json`;
      const fileInfo = await FileSystem.getInfoAsync(settingsPath);
      
      if (fileInfo.exists) {
        // Load settings from file
        const settingsJson = await FileSystem.readAsStringAsync(settingsPath);
        const loadedSettings = JSON.parse(settingsJson) as AppSettings;
        
        // Validate and merge with defaults
        const mergedSettings: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
          templates: {
            ...DEFAULT_SETTINGS.templates,
            ...loadedSettings.templates
          }
        };
        
        setSettings(mergedSettings);
      } else {
        // Create default settings file
        await saveSettings(DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  // Function to save settings
  const saveSettings = async (settingsToSave: AppSettings) => {
    try {
      const settingsPath = `${FileSystem.documentDirectory}settings.json`;
      await FileSystem.writeAsStringAsync(
        settingsPath,
        JSON.stringify(settingsToSave, null, 2)
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };
  
  // Function to toggle a template setting
  const toggleSetting = (settingKey: keyof TemplateSettingsType) => {
    const currentTemplate = settings.templates[templateType];
    if (!currentTemplate?.[settingKey]) return;
    
    const newSettings: AppSettings = {
      ...settings,
      templates: {
        ...settings.templates,
        [templateType]: {
          ...currentTemplate,
          [settingKey]: {
            ...currentTemplate[settingKey],
            enabled: !currentTemplate[settingKey]?.enabled
          }
        }
      }
    };
    
    setSettings(newSettings);
    saveSettings(newSettings);
  };
  
  // Get color for section based on data type
  const getSectionColor = (settingKey: keyof TemplateSettingsType): string => {
    const locationSettings = ['coordinates', 'altitude', 'address'] as const;
    const weatherSettings = ['temperature', 'weather', 'wind', 'humidity', 'pressure'] as const;
    const sensorSettings = ['compass', 'magneticField'] as const;
    const mediaSettings = ['mapImage', 'customText', 'logo'] as const;
    const timeSettings = ['dateTime'] as const;
    
    if (locationSettings.includes(settingKey as any)) return '#FF6B6B';
    if (weatherSettings.includes(settingKey as any)) return '#7CFF6B';
    if (sensorSettings.includes(settingKey as any)) return '#66C4FF';
    if (mediaSettings.includes(settingKey as any)) return '#FFD166';
    if (timeSettings.includes(settingKey as any)) return '#CB89FC';
    
    return '#FFFFFF';
  };
  
  // Render a template setting item
  const renderSettingItem = (
    settingKey: keyof TemplateSettingsType,
    icon: IconName,
    label: string
  ) => {
    const templateSettings = settings.templates[templateType];
    const setting = templateSettings?.[settingKey];
    const color = getSectionColor(settingKey);
    
    if (!setting) return null;
    
    return (
      <View style={styles.settingRow} key={settingKey}>
        <MaterialIcons name={icon} size={24} color={color} />
        <Text style={styles.settingLabel}>{label}</Text>
        <Switch
          value={setting.enabled}
          onValueChange={() => toggleSetting(settingKey)}
          trackColor={{ false: '#444444', true: color }}
          thumbColor={setting.enabled ? '#FFFFFF' : '#BBBBBB'}
        />
      </View>
    );
  };
  
  // Get title based on template type
  const getTitle = (): string => {
    return templateType === 'classic'
      ? 'Classic Template Settings'
      : 'Advanced Template Settings';
  };
  
  // Determine if advanced settings are available
  const isAdvancedTemplate = templateType === 'advanced';
  
  // Render loading state
  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading template settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.headerDescription}>
            {templateType === 'classic'
              ? 'Enable or disable information that appears automatically on your photos'
              : 'Customize what information appears on your photos and how it looks'}
          </Text>
        </View>
        
        {/* Template Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewImage}>
            <Text style={styles.previewImageText}>Photo Preview</Text>
            
            {/* Location Data Preview */}
            {settings.templates[templateType]?.coordinates?.enabled && (
              <View style={[styles.previewItem, styles.previewCoordinates]}>
                <MaterialIcons name="my-location" size={12} color="#FFFFFF" />
                <Text style={styles.previewText}>35.6895° N, 139.6917° E</Text>
              </View>
            )}
            
            {/* Address Preview */}
            {settings.templates[templateType]?.address?.enabled && (
              <View style={[styles.previewItem, styles.previewAddress]}>
                <MaterialIcons name="place" size={12} color="#FFFFFF" />
                <Text style={styles.previewText}>Tokyo, Japan</Text>
              </View>
            )}
            
            {/* Date/Time Preview */}
            {settings.templates[templateType]?.dateTime?.enabled && (
              <View style={[styles.previewItem, styles.previewDateTime]}>
                <MaterialIcons name="access-time" size={12} color="#FFFFFF" />
                <Text style={styles.previewText}>March 31, 2025 14:30</Text>
              </View>
            )}
            
            {/* Weather Preview */}
            {settings.templates[templateType]?.temperature?.enabled && (
              <View style={[styles.previewItem, styles.previewWeather]}>
                <MaterialIcons name="wb-sunny" size={12} color="#FFFFFF" />
                <Text style={styles.previewText}>22°C Sunny</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="place" size={18} color="#FF6B6B" />
            Location Information
          </Text>
          
          {renderSettingItem('coordinates', 'my-location', 'GPS Coordinates')}
          {renderSettingItem('altitude', 'height', 'Altitude')}
          {renderSettingItem('address', 'location-city', 'Address')}
        </View>
        
        {/* Weather Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="wb-sunny" size={18} color="#7CFF6B" />
            Weather Information
          </Text>
          
          {renderSettingItem('temperature', 'thermostat', 'Temperature')}
          {renderSettingItem('weather', 'cloud', 'Weather Conditions')}
          {renderSettingItem('wind', 'air', 'Wind')}
          {renderSettingItem('humidity', 'water-drop', 'Humidity')}
          {renderSettingItem('pressure', 'speed', 'Pressure')}
        </View>
        
        {/* Sensor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="compass-calibration" size={18} color="#66C4FF" />
            Sensor Information
          </Text>
          
          {renderSettingItem('compass', 'explore', 'Compass Direction')}
          {renderSettingItem('magneticField', 'settings-input-antenna', 'Magnetic Field')}
        </View>
        
        {/* Date and Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="access-time" size={18} color="#CB89FC" />
            Date and Time
          </Text>
          
          {renderSettingItem('dateTime', 'today', 'Date and Time')}
        </View>
        
        {/* Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="image" size={18} color="#FFD166" />
            Media
          </Text>
          
          {renderSettingItem('mapImage', 'map', 'Map Thumbnail')}
          {renderSettingItem('customText', 'text-format', 'Custom Text')}
          {renderSettingItem('logo', 'branding-watermark', 'Logo')}
        </View>
        
        {/* Advanced Configuration (only for advanced template) */}
        {isAdvancedTemplate && (
          <TouchableOpacity
            style={styles.advancedButton}
            onPress={() => {
              Alert.alert(
                'Advanced Configuration',
                'In a full implementation, this would open position and style settings for each element'
              );
            }}
          >
            <MaterialIcons name="tune" size={24} color="#FFFFFF" />
            <Text style={styles.advancedButtonText}>Advanced Configuration</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerDescription: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  previewContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewImage: {
    height: 200,
    backgroundColor: '#333333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewImageText: {
    color: '#AAAAAA',
    fontSize: 16,
  },
  previewItem: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewCoordinates: {
    bottom: 10,
    left: 10,
  },
  previewAddress: {
    bottom: 40,
    left: 10,
  },
  previewDateTime: {
    top: 10,
    right: 10,
  },
  previewWeather: {
    top: 40,
    right: 10,
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  advancedButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  advancedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});