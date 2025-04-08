import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Navigation prop types
export type ScreenNavigationProp<T extends keyof RootStackParamList> = StackNavigationProp<
  RootStackParamList,
  T
>;

export type ScreenRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export interface ScreenProps<T extends keyof RootStackParamList> {
  navigation: ScreenNavigationProp<T>;
  route: ScreenRouteProp<T>;
}

// Location data structure
export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy?: number | null;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  region?: string;
  street?: string;
}

// Weather data structure
export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  weatherCondition: string;
  description: string;
}

// Photo metadata structure
export interface PhotoData {
  id: string;
  uri: string;
  fileName: string;
  width: number;
  height: number;
  createdAt: number;
  templateType: TemplateType;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    address?: string;
  };
  weather?: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed?: number;
    windDirection?: string;
    weatherCondition: string;
  };
  magneticHeading?: number;
}

// Template types (classic or advanced)
export type TemplateType = 'classic' | 'advanced';

// Template setting item
export interface TemplateSetting {
  enabled: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  color?: string;
  fontSize?: number;
  value?: string;
}

// Template settings structure
export interface TemplateSettings {
  coordinates: TemplateSetting;
  altitude: TemplateSetting;
  address: TemplateSetting;
  dateTime: TemplateSetting;
  temperature: TemplateSetting;
  weather: TemplateSetting;
  compass: TemplateSetting;
  magneticField: TemplateSetting;
  wind: TemplateSetting;
  humidity: TemplateSetting;
  pressure: TemplateSetting;
  mapImage: TemplateSetting;
  customText: TemplateSetting;
  logo: TemplateSetting;
}

// Application settings
export interface AppSettings {
  camera: CameraSettings;
  templates: {
    classic: TemplateSettings;
    advanced: TemplateSettings;
  };
  units: UnitSettings;
  mapSettings: {
    type: 'standard' | 'satellite' | 'hybrid';
    zoomLevel: number;
  };
  privacySettings: {
    removeLocationData: boolean;
    shareWeatherData: boolean;
  };
  display?: {
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
  };
}

// Camera settings
export interface CameraSettings {
  flashMode: 'auto' | 'on' | 'off';
  cameraType: 'front' | 'back';
  zoom: number;
  autoSave: boolean;
  showGridLines: boolean;
  showLevel: boolean;
  hdr: boolean;
  defaultTemplate: TemplateType;
}

// Unit settings
export interface UnitSettings {
  temperature: 'celsius' | 'fahrenheit';
  distance: 'kilometers' | 'miles';
  coordinates: 'decimal' | 'dms';
  speed: 'kph' | 'mph';
  pressure: 'hpa' | 'mmhg' | 'incheshg';
  altitude: 'meters' | 'feet';
}

// Story generation
export interface Story {
  title: string;
  content: string;
  photos: PhotoData[];
  locations: LocationData[];
  createdAt: string;
}

export interface PhotoMetadata extends PhotoData {
  modificationTime: number;
}

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Collection: undefined;
  Settings: undefined;
  PhotoDetail: { photoId: string };
  MapView: { photoId: string };
  EditPhoto: { photoId: string };
  SharePhoto: { photoId: string };
  TemplateSettings: { templateType: TemplateType };
  LocationSettings: undefined;
  WeatherSettings: undefined;
  CompassSettings: undefined;
  MagneticSettings: undefined;
  DateTimeSettings: undefined;
  MapSettings: undefined;
  CustomTextSettings: undefined;
  LocationView: {
    latitude: number;
    longitude: number;
    locationName?: string;
  };
  ManualCoordinates: {
    onCoordsSubmit: (lat: number, lon: number) => void;
  };
};