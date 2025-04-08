import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { PhotoMetadata, RootStackParamList } from '../types/types';
import { formatCoordinates } from '../services/locationService';
import { formatTemperature } from '../services/weatherService';

type CollectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Collection'>;

interface PhotoDimensions {
  width: number;
  height: number;
}

interface PhotoItemProps {
  item: PhotoMetadata;
  photoSize: number;
  onPress: (photo: PhotoMetadata) => void;
  onLongPress: (photo: PhotoMetadata) => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ item, photoSize, onPress, onLongPress }) => (
  <TouchableOpacity
    style={styles.photoItem}
    onPress={() => onPress(item)}
    onLongPress={() => onLongPress(item)}
  >
    <Image
      source={{ uri: item.uri }}
      style={[styles.thumbnail, { width: photoSize, height: photoSize }]}
    />
    
    {/* Location Data Overlay */}
    <View style={styles.photoInfo}>
      {item.location && (
        <View style={styles.locationBadge}>
          <MaterialIcons name="location-on" size={12} color="#FFFFFF" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location.address || 'Unknown Location'}
          </Text>
        </View>
      )}
      
      {/* Date Info */}
      <Text style={styles.dateText}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
      
      {/* Template Badge */}
      <View style={[
        styles.templateBadge,
        item.templateType === 'advanced' ? styles.advancedBadge : styles.classicBadge
      ]}>
        <Text style={styles.templateText}>
          {item.templateType === 'advanced' ? 'ADV' : 'CLS'}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

interface ActionMenuProps {
  selectedPhoto: PhotoMetadata;
  onViewDetails: () => void;
  onShare: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ selectedPhoto, onViewDetails, onShare, onDelete, onCancel }) => (
  <View style={styles.actionMenu}>
    <View style={styles.actionMenuContent}>
      <Text style={styles.actionMenuTitle}>Photo Options</Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onViewDetails}
        >
          <MaterialIcons name="info" size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onShare}
        >
          <MaterialIcons name="share" size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onDelete}
        >
          <MaterialIcons name="delete" size={24} color="#FF4444" />
          <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
);

interface EmptyStateProps {
  onNavigateToCamera: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onNavigateToCamera }) => (
  <SafeAreaView style={styles.container}>
    <MaterialIcons name="photo-library" size={64} color="#444444" />
    <Text style={styles.emptyText}>No photos yet</Text>
    <Text style={styles.emptySubtext}>Capture photos with location data in Camera mode</Text>
    <TouchableOpacity
      style={styles.button}
      onPress={onNavigateToCamera}
    >
      <Text style={styles.buttonText}>Go to Camera</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const LoadingState: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <ActivityIndicator size="large" color="#FFFFFF" />
    <Text style={styles.emptyText}>Loading photos...</Text>
  </SafeAreaView>
);

export default function CollectionScreen() {
  const navigation = useNavigation<CollectionScreenNavigationProp>();
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  
  // Load photos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [])
  );
  
  // Function to get image dimensions
  const getImageDimensions = useCallback((uri: string): Promise<PhotoDimensions> => {
    return new Promise((resolve) => {
      Image.getSize(uri, (width, height) => {
        resolve({ width, height });
      }, () => {
        // Fallback dimensions if image loading fails
        resolve({ width: 1080, height: 1920 });
      });
    });
  }, []);
  
  // Function to load photos from storage
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      // Get the photos directory
      const photosDir = `${FileSystem.documentDirectory}photos/`;
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(photosDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
        setLoading(false);
        return;
      }
      
      // Read directory contents
      const files = await FileSystem.readDirectoryAsync(photosDir);
      
      // Filter for JPG files and their metadata
      const photoFiles = files.filter(file => file.toLowerCase().endsWith('.jpg'));
      const metadataFiles = files.filter(file => file.toLowerCase().endsWith('.json'));
      
      if (photoFiles.length === 0) {
        setPhotos([]);
        setLoading(false);
        return;
      }
      
      // Create a map of metadata files for quick lookup
      const metadataMap = new Map<string, PhotoMetadata>();
      for (const metadataFile of metadataFiles) {
        try {
          const metadataPath = `${photosDir}${metadataFile}`;
          const metadataJson = await FileSystem.readAsStringAsync(metadataPath);
          const metadata = JSON.parse(metadataJson) as PhotoMetadata;
          metadataMap.set(metadata.fileName, metadata);
        } catch (error) {
          console.error(`Error loading metadata for ${metadataFile}:`, error);
        }
      }
      
      // Load photos with their metadata
      const loadedPhotos: PhotoMetadata[] = [];
      
      for (const file of photoFiles) {
        try {
          const fileUri = `${photosDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          const creationTime = Date.now();
          
          // Try to get existing metadata
          const existingMetadata = metadataMap.get(file);
          if (existingMetadata) {
            loadedPhotos.push(existingMetadata);
            continue;
          }
          
          // Create new metadata if none exists
          const dimensions = await getImageDimensions(fileUri);
          const randomId = Math.floor(Math.random() * 10000000).toString();
          
          const newMetadata: PhotoMetadata = {
            id: randomId,
            uri: fileUri,
            fileName: file,
            width: dimensions.width,
            height: dimensions.height,
            createdAt: creationTime,
            modificationTime: creationTime,
            templateType: 'classic'
          };
          
          loadedPhotos.push(newMetadata);
          
          // Save the new metadata
          const metadataPath = `${photosDir}${file.replace('.jpg', '.json')}`;
          await FileSystem.writeAsStringAsync(
            metadataPath,
            JSON.stringify(newMetadata, null, 2)
          );
        } catch (error) {
          console.error(`Error processing photo ${file}:`, error);
        }
      }
      
      // Sort by date, newest first
      loadedPhotos.sort((a, b) => b.createdAt - a.createdAt);
      
      setPhotos(loadedPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getImageDimensions]);
  
  // Function to refresh photos list
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPhotos();
  }, [loadPhotos]);
  
  // Function to view photo details
  const viewPhotoDetails = useCallback((photo: PhotoMetadata) => {
    navigation.navigate('PhotoDetail', { photoId: photo.id });
  }, [navigation]);
  
  // Function to share photo
  const sharePhoto = useCallback(async (photo: PhotoMetadata) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      
      if (!canShare) {
        Alert.alert('Sharing not available', 'Sharing is not available on your device');
        return;
      }
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(photo.uri, {
          UTI: 'public.jpeg',
          mimeType: 'image/jpeg'
        });
      } else {
        await Sharing.shareAsync(photo.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Photo'
        });
      }
    } catch (error) {
      console.error('Error sharing photo:', error);
      Alert.alert('Error', 'Failed to share photo');
    }
  }, []);
  
  // Function to delete photo
  const deletePhoto = useCallback(async (photo: PhotoMetadata) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the photo file
              await FileSystem.deleteAsync(photo.uri);
              
              // Delete the metadata file if it exists
              const metadataFile = photo.uri.replace('.jpg', '.json');
              const metadataExists = await FileSystem.getInfoAsync(metadataFile);
              
              if (metadataExists.exists) {
                await FileSystem.deleteAsync(metadataFile);
              }
              
              // Update state
              setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== photo.id));
              setSelectedPhoto(null);
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        }
      ]
    );
  }, []);
  
  // Render empty state
  if (loading) {
    return <LoadingState />;
  }
  
  if (photos.length === 0) {
    return <EmptyState onNavigateToCamera={() => navigation.navigate('Camera')} />;
  }

  // Calculate grid dimensions
  const { width } = Dimensions.get('window');
  const numColumns = 2;
  const photoSize = width / numColumns - 4;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={photos}
        numColumns={numColumns}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.photoGrid}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <PhotoItem
            item={item}
            photoSize={photoSize}
            onPress={viewPhotoDetails}
            onLongPress={setSelectedPhoto}
          />
        )}
      />
      
      {/* Selected Photo Action Menu */}
      {selectedPhoto && (
        <ActionMenu
          selectedPhoto={selectedPhoto}
          onViewDetails={() => {
            viewPhotoDetails(selectedPhoto);
            setSelectedPhoto(null);
          }}
          onShare={() => {
            sharePhoto(selectedPhoto);
            setSelectedPhoto(null);
          }}
          onDelete={() => {
            deletePhoto(selectedPhoto);
            setSelectedPhoto(null);
          }}
          onCancel={() => setSelectedPhoto(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGrid: {
    padding: 2,
  },
  photoItem: {
    margin: 2,
    position: 'relative',
  },
  thumbnail: {
    borderRadius: 8,
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 2,
  },
  dateText: {
    color: '#CCCCCC',
    fontSize: 9,
  },
  templateBadge: {
    position: 'absolute',
    top: -26,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classicBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.7)',
  },
  advancedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
  },
  templateText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtext: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 40,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Action Menu Styles
  actionMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  actionMenuContent: {
    backgroundColor: '#222222',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  actionMenuTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    marginTop: 5,
  },
  cancelButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});