# GPS Map Camera - Expo Preview Guide

This guide will help you run the GPS Map Camera app locally on your device using Expo Go.

## Prerequisites

1. Node.js (v14 or newer)
2. npm or yarn
3. Expo CLI (`npm install -g expo-cli`)
4. Expo Go app installed on your mobile device:
   - [iOS App Store](https://apps.apple.com/app/apple-store/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Setting Up Locally

1. First, download or clone this project to your local machine:

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the mobile app directory
cd gps-map-camera/mobile-app
```

2. Install the required dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the project root with your API keys:

```
OPENWEATHER_API_KEY=your_openweather_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

   You can get these API keys from:
   - [OpenWeather API](https://openweathermap.org/api) - For weather data
   - [Google Maps API](https://developers.google.com/maps/documentation/javascript/get-api-key) - For maps and geocoding
   
   *Note: Without these API keys, the app will still work but will use fallback/simplified location data.*

4. Start the Expo development server:

```bash
npx expo start
```

## Running on Your Device

### Option 1: Using Expo Go App

1. Ensure your computer and mobile device are on the same Wi-Fi network.
2. Open the Expo Go app on your device.
3. Scan the QR code displayed in your terminal or browser.
4. The app should load on your device through Expo Go.

### Option 2: Using an Emulator/Simulator

1. For iOS (Mac only):
   ```bash
   npx expo start --ios
   ```

2. For Android:
   ```bash
   npx expo start --android
   ```

## Troubleshooting

1. **Location Services**: The app requires location permissions. Make sure to grant these when prompted.
2. **Camera Access**: The app needs camera permissions. Please allow this access when requested.
3. **Connection Issues**: If you can't connect to the Expo server:
   - Check that both devices are on the same Wi-Fi network
   - Try using the "Tunnel" connection option in Expo
   - Restart the Expo server and the Expo Go app

4. **Module Errors**: If you encounter any missing module errors, try:
   ```bash
   npm install --force
   # or
   yarn install --force
   ```

## Features Available in This Preview

- Camera functionality with photo capture
- GPS location tracking and display
- Weather data integration using OpenWeather API
- Photo collection management
- Location stamps on photos
- Customizable templates for photo information

## Limitations in Replit Environment

Due to the limitations of running a mobile app in the Replit environment, the following features may not work directly in Replit:

- Camera access (requires physical device)
- Location services (requires physical device)
- Device sensors (compass, etc.)
- Native device storage

This is why we recommend downloading the code and running it locally using the Expo Go app for the full experience.

## Getting Help

If you encounter any issues or have questions, please:

1. Check the project documentation
2. Look at the console logs for error messages
3. Reach out to the project maintainers through the repository issue tracker

Happy exploring with GPS Map Camera!