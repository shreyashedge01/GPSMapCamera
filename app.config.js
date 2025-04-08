export default {
  name: 'GeoStamp Camera',
  slug: 'geostampcamera',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.geostampcamera',
    infoPlist: {
      NSCameraUsageDescription: 'This app needs access to camera to scan QR codes and take photos.',
      NSLocationWhenInUseUsageDescription: 'This app needs access to location to add geolocation data to photos.',
      NSPhotoLibraryUsageDescription: 'This app needs access to photo library to save photos.'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.geostampcamera',
    permissions: [
      'CAMERA',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE'
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  },
  plugins: [
    [
      'expo-camera',
      {
        'cameraPermission': 'Allow $(PRODUCT_NAME) to access your camera.'
      }
    ],
    [
      'expo-location',
      {
        'locationAlwaysAndWhenInUsePermission': 'Allow $(PRODUCT_NAME) to use your location.'
      }
    ],
    [
      'expo-media-library',
      {
        'photosPermission': 'Allow $(PRODUCT_NAME) to access your photos.',
        'savePhotosPermission': 'Allow $(PRODUCT_NAME) to save photos.',
        'isAccessMediaLocationEnabled': true
      }
    ]
  ]
}; 