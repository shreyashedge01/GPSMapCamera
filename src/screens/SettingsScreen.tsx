import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { AppSettings, CameraSettings, TemplateType, RootStackParamList, UnitSettings } from '../types/types';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Default settings
  const defaultCameraSettings: CameraSettings = {
    flashMode: 'auto',
    cameraType: 'back',
    zoom: 0,
    autoSave: true,
    showGridLines: true,
    showLevel: true,
    hdr: false,
    defaultTemplate: 'classic',
  };
  
  const defaultUnits: UnitSettings = {
    temperature: 'celsius',
    distance: 'kilometers',
    coordinates: 'decimal',
    speed: 'kph',
    pressure: 'hpa',
    altitude: 'meters',
  };
  
  const defaultSettings: AppSettings = {
    camera: defaultCameraSettings,
    templates: {
      classic: {
        coordinates: { enabled: true },
        altitude: { enabled: true },
        address: { enabled: true },
        dateTime: { enabled: true },
        temperature: { enabled: true },
        weather: { enabled: true },
        compass: { enabled: true },
        magneticField: { enabled: true },
        wind: { enabled: true },
        humidity: { enabled: true },
        pressure: { enabled: true },
        mapImage: { enabled: false },
        customText: { enabled: false },
        logo: { enabled: false },
      },
      advanced: {
        coordinates: { enabled: true, position: 'bottom-left', color: '#FFFFFF', fontSize: 12 },
        altitude: { enabled: false, position: 'bottom-left', color: '#FFFFFF', fontSize: 12 },
        address: { enabled: true, position: 'bottom-left', color: '#FFFFFF', fontSize: 12 },
        dateTime: { enabled: true, position: 'top-right', color: '#FFFFFF', fontSize: 12 },
        temperature: { enabled: true, position: 'top-right', color: '#FFFFFF', fontSize: 12 },
        weather: { enabled: true, position: 'top-right', color: '#FFFFFF', fontSize: 12 },
        compass: { enabled: false, position: 'bottom-right', color: '#FFFFFF', fontSize: 12 },
        magneticField: { enabled: false, position: 'bottom-right', color: '#FFFFFF', fontSize: 12 },
        wind: { enabled: false, position: 'bottom-right', color: '#FFFFFF', fontSize: 12 },
        humidity: { enabled: false, position: 'bottom-right', color: '#FFFFFF', fontSize: 12 },
        pressure: { enabled: false, position: 'bottom-right', color: '#FFFFFF', fontSize: 12 },
        mapImage: { enabled: true, position: 'bottom-right' },
        customText: { enabled: false, value: '', position: 'center', color: '#FFFFFF', fontSize: 16 },
        logo: { enabled: false, value: '', position: 'top-left' },
      },
    },
    units: defaultUnits,
    mapSettings: {
      type: 'hybrid',
      zoomLevel: 15,
    },
    privacySettings: {
      removeLocationData: false,
      shareWeatherData: true,
    },
    display: {
      theme: 'dark',
      fontSize: 'medium',
    },
  };
  
  // Function to save settings
  const saveSettings = useCallback(async (settingsToSave: AppSettings) => {
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
  }, []);
  
  // Function to load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if settings file exists
      const settingsPath = `${FileSystem.documentDirectory}settings.json`;
      const fileInfo = await FileSystem.getInfoAsync(settingsPath);
      
      if (fileInfo.exists) {
        // Load settings from file
        const settingsJson = await FileSystem.readAsStringAsync(settingsPath);
        const loadedSettings = JSON.parse(settingsJson) as AppSettings;
        setSettings(loadedSettings);
      } else {
        // Use default settings
        setSettings(defaultSettings);
        // Save default settings
        await saveSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use default settings on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [saveSettings]);
  
  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Update a specific setting
  const updateSetting = useCallback((
    category: keyof AppSettings,
    setting: string,
    value: any
  ) => {
    if (!settings) return;
    
    // Create a deep copy of settings
    const newSettings = JSON.parse(JSON.stringify(settings)) as AppSettings;
    
    // Access the nested setting
    switch (category) {
      case 'camera':
        (newSettings.camera as any)[setting] = value;
        break;
      case 'units':
        (newSettings.units as any)[setting] = value;
        break;
      case 'mapSettings':
        (newSettings.mapSettings as any)[setting] = value;
        break;
      case 'privacySettings':
        (newSettings.privacySettings as any)[setting] = value;
        break;
      case 'display':
        (newSettings.display as any)[setting] = value;
        break;
      default:
        return;
    }
    
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings, saveSettings]);
  
  // Navigate to template settings
  const openTemplateSettings = useCallback((templateType: TemplateType) => {
    navigation.navigate('TemplateSettings', { templateType });
  }, [navigation]);
  
  // Reset settings to default
  const resetSettings = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettings(defaultSettings);
            await saveSettings(defaultSettings);
            Alert.alert('Settings Reset', 'All settings have been reset to default values');
          },
        },
      ]
    );
  }, [saveSettings]);
  
  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Camera Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Camera Settings</Text>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="grid-on" size={24} color="#66C4FF" />
            <Text style={styles.settingLabel}>Show Grid Lines</Text>
            <Switch
              value={settings.camera.showGridLines}
              onValueChange={(value) => updateSetting('camera', 'showGridLines', value)}
              trackColor={{ false: '#444444', true: '#66C4FF' }}
              thumbColor={settings.camera.showGridLines ? '#FFFFFF' : '#BBBBBB'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="straighten" size={24} color="#66C4FF" />
            <Text style={styles.settingLabel}>Show Level</Text>
            <Switch
              value={settings.camera.showLevel}
              onValueChange={(value) => updateSetting('camera', 'showLevel', value)}
              trackColor={{ false: '#444444', true: '#66C4FF' }}
              thumbColor={settings.camera.showLevel ? '#FFFFFF' : '#BBBBBB'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="flash-auto" size={24} color="#66C4FF" />
            <Text style={styles.settingLabel}>Default Flash Mode</Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.camera.flashMode === 'auto' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('camera', 'flashMode', 'auto')}
              >
                <Text style={styles.optionText}>Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.camera.flashMode === 'on' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('camera', 'flashMode', 'on')}
              >
                <Text style={styles.optionText}>On</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.camera.flashMode === 'off' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('camera', 'flashMode', 'off')}
              >
                <Text style={styles.optionText}>Off</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="save" size={24} color="#66C4FF" />
            <Text style={styles.settingLabel}>Auto Save Photos</Text>
            <Switch
              value={settings.camera.autoSave}
              onValueChange={(value) => updateSetting('camera', 'autoSave', value)}
              trackColor={{ false: '#444444', true: '#66C4FF' }}
              thumbColor={settings.camera.autoSave ? '#FFFFFF' : '#BBBBBB'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="hdr-on" size={24} color="#66C4FF" />
            <Text style={styles.settingLabel}>HDR Mode</Text>
            <Switch
              value={settings.camera.hdr}
              onValueChange={(value) => updateSetting('camera', 'hdr', value)}
              trackColor={{ false: '#444444', true: '#66C4FF' }}
              thumbColor={settings.camera.hdr ? '#FFFFFF' : '#BBBBBB'}
            />
          </View>
        </View>
        
        {/* Templates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Templates</Text>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="layers" size={24} color="#FF6B6B" />
            <Text style={styles.settingLabel}>Default Template</Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.camera.defaultTemplate === 'classic' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('camera', 'defaultTemplate', 'classic')}
              >
                <Text style={styles.optionText}>Classic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.camera.defaultTemplate === 'advanced' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('camera', 'defaultTemplate', 'advanced')}
              >
                <Text style={styles.optionText}>Advanced</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.buttonRow}
            onPress={() => openTemplateSettings('classic')}
          >
            <MaterialIcons name="crop-free" size={24} color="#FF6B6B" />
            <Text style={styles.buttonLabel}>Configure Classic Template</Text>
            <MaterialIcons name="chevron-right" size={24} color="#AAAAAA" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.buttonRow}
            onPress={() => openTemplateSettings('advanced')}
          >
            <MaterialIcons name="tune" size={24} color="#FF6B6B" />
            <Text style={styles.buttonLabel}>Configure Advanced Template</Text>
            <MaterialIcons name="chevron-right" size={24} color="#AAAAAA" />
          </TouchableOpacity>
        </View>
        
        {/* Units Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="thermostat" size={24} color="#7CFF6B" />
            <Text style={styles.settingLabel}>Temperature</Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.units.temperature === 'celsius' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('units', 'temperature', 'celsius')}
              >
                <Text style={styles.optionText}>Celsius</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.units.temperature === 'fahrenheit' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('units', 'temperature', 'fahrenheit')}
              >
                <Text style={styles.optionText}>Fahrenheit</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="straighten" size={24} color="#7CFF6B" />
            <Text style={styles.settingLabel}>Distance</Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.units.distance === 'kilometers' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('units', 'distance', 'kilometers')}
              >
                <Text style={styles.optionText}>Metric</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.units.distance === 'miles' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('units', 'distance', 'miles')}
              >
                <Text style={styles.optionText}>Imperial</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="my-location" size={24} color="#7CFF6B" />
            <Text style={styles.settingLabel}>Coordinates</Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.units.coordinates === 'decimal' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('units', 'coordinates', 'decimal')}
              >
                <Text style={styles.optionText}>Decimal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.units.coordinates === 'dms' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('units', 'coordinates', 'dms')}
              >
                <Text style={styles.optionText}>DMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Map Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Map Settings</Text>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="map" size={24} color="#FFD166" />
            <Text style={styles.settingLabel}>Map Type</Text>
            <View style={styles.optionButtons}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.mapSettings.type === 'standard' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('mapSettings', 'type', 'standard')}
              >
                <Text style={styles.optionText}>Standard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.mapSettings.type === 'satellite' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('mapSettings', 'type', 'satellite')}
              >
                <Text style={styles.optionText}>Satellite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  settings.mapSettings.type === 'hybrid' && styles.selectedOption,
                ]}
                onPress={() => updateSetting('mapSettings', 'type', 'hybrid')}
              >
                <Text style={styles.optionText}>Hybrid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="location-off" size={24} color="#EF476F" />
            <Text style={styles.settingLabel}>Remove Location on Share</Text>
            <Switch
              value={settings.privacySettings.removeLocationData}
              onValueChange={(value) => updateSetting('privacySettings', 'removeLocationData', value)}
              trackColor={{ false: '#444444', true: '#EF476F' }}
              thumbColor={settings.privacySettings.removeLocationData ? '#FFFFFF' : '#BBBBBB'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <MaterialIcons name="cloud" size={24} color="#EF476F" />
            <Text style={styles.settingLabel}>Include Weather Data</Text>
            <Switch
              value={settings.privacySettings.shareWeatherData}
              onValueChange={(value) => updateSetting('privacySettings', 'shareWeatherData', value)}
              trackColor={{ false: '#444444', true: '#EF476F' }}
              thumbColor={settings.privacySettings.shareWeatherData ? '#FFFFFF' : '#BBBBBB'}
            />
          </View>
        </View>
        
        {/* Reset Settings */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetSettings}
        >
          <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoVersion}>GPS Map Camera v1.0.0</Text>
          <Text style={styles.appInfoCopyright}>© 2025 All Rights Reserved</Text>
        </View>
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  optionButtons: {
    flexDirection: 'row',
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333333',
    borderRadius: 5,
    marginLeft: 5,
  },
  selectedOption: {
    backgroundColor: '#0066CC',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  resetButton: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appInfoVersion: {
    color: '#AAAAAA',
    fontSize: 14,
    marginBottom: 5,
  },
  appInfoCopyright: {
    color: '#666666',
    fontSize: 12,
  },
});