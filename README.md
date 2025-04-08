# GPS Map Camera

A feature-rich mobile application that enhances your photos with location data, environmental information, and customizable templates.

## Features

### Location Services
- Capture precise GPS coordinates with photos
- Display location on interactive maps
- Reverse geocoding for complete address information
- Support for both decimal and DMS (degrees, minutes, seconds) coordinates
- Manual coordinate entry option
- Altitude recording

### Weather Integration
- Real-time weather data at photo location
- Temperature, conditions, and detailed weather descriptions
- Wind speed and direction information
- Humidity and atmospheric pressure readings
- Support for metric and imperial units

### Sensor Data
- Compass heading with cardinal directions
- Magnetic field strength measurements
- Device orientation tracking

### Photo Templates
- **Classic Mode**: Automatic template with fixed layout of environmental data
- **Advanced Mode**: Customizable template with full control over displayed data
- Map image overlays with location marker
- Date and time stamps
- Customizable themes (light/dark)
- Custom text annotations

### Photo Management
- Organized photo gallery with location grouping
- Detailed metadata viewing for each photo
- Easy sharing with all metadata preserved
- Export options for social media

### Settings & Customization
- Unit preferences (metric/imperial, decimal/DMS)
- Template style customization
- Camera settings (flash, grid, timer)
- Privacy controls for sensitive data

## Technical Implementation

### Core Services

#### LocationService
- Access device GPS/location services
- Reverse geocoding using Google Maps API
- Distance calculations and coordinate formatting
- Location permission management

#### WeatherService
- OpenWeather API integration for real-time weather data
- Unit conversions for temperature, pressure, etc.
- Weather condition formatting and icons

#### MagneticService
- Access device magnetometer for compass direction
- Magnetic field strength measurement
- Cardinal direction calculations

#### MapService
- Static map generation using Google Maps API
- Interactive map displays with markers
- Direction linking features
- Support for multiple map types (road, satellite, hybrid)

#### TemplateService
- Template application to photos
- Metadata saving and loading
- HTML-based template rendering for consistent appearance
- Theme management for different visual styles

## Getting Started

### Prerequisites
- Expo Go app installed on your device
- Node.js and npm installed on your development machine
- API keys for:
  - Google Maps API (for geocoding and maps)
  - OpenWeather API (for weather data)

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your API keys:
GOOGLE_MAPS_API_KEY=your_google_maps_api_key OPENWEATHER_API_KEY=your_openweather_api_key
4. Start the development server: `expo start`
5. Scan the QR code with Expo Go app on your device

### Usage
1. Open the app and navigate to the Camera screen
2. Take a photo - location and environmental data will be automatically gathered
3. Apply a template to your photo
4. View your photos in the Collection screen
5. Tap on a photo to view detailed information or share it

### Privacy Considerations
- All data is stored locally on your device
- Location information is only collected when taking photos
- No data is shared with third parties without your explicit consent
- You can disable specific data collection in Settings

### Future Enhancements
- AI-generated captions based on location
- Location-based story creation
- Advanced photo editing features
- Cloud backup options
- Route tracking for journey documentation
