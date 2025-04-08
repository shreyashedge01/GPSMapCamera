import * as React from 'react';
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function CustomSplashScreen({ onComplete, duration = 5000 }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Initial fade-in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Title animation delay
    setTimeout(() => {
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 500);
    
    // Subtitle animation delay
    setTimeout(() => {
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1000);
    
    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration - 500,
      useNativeDriver: false,
    }).start();
    
    // Complete after duration
    const timer = setTimeout(() => {
      onComplete();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, titleAnim, subtitleAnim, progressAnim, duration, onComplete]);
  
  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Image 
          source={require('../../assets/splash.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
      
      <Animated.Text 
        style={[
          styles.title,
          { opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          })}] 
        }]}
      >
        GPS Map Camera
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.subtitle,
          { opacity: subtitleAnim, transform: [{ translateY: subtitleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          })}] 
        }]}
      >
        Capture your world with data
      </Animated.Text>
      
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progress,
            { width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }) }
          ]}
        />
      </View>
      
      <ActivityIndicator size="small" color="#ffffff" style={styles.activityIndicator} />
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    width: width * 0.8,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 50,
  },
  progressContainer: {
    width: width * 0.7,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#3498db',
  },
  activityIndicator: {
    marginTop: 20,
  }
});