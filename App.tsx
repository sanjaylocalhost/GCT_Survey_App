import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  Dimensions,
  TextInput,
  StatusBar,
  Animated,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import MapView, { 
  Marker, 
  Polyline, 
  Polygon, 
  Circle, 
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as turf from '@turf/turf';
import { Ionicons, Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Types
type LatLng = { latitude: number; longitude: number };
type LocationCoords = LatLng & { accuracy: number | null; altitude: number | null; heading: number | null };
type SurveyPoint = LatLng & { id: string; name: string; note: string; timestamp: string };
type MapLayerType = 'standard' | 'satellite' | 'hybrid';

// Onboarding Data - 3 screens with proper content
const onboardingData = [
  {
    id: '1',
    title: 'Welcome to GCT Survey',
    description: 'Professional land surveying tool for accurate measurements and mapping',
    icon: 'map',
    image: require('./src/assests/images/onboarding4.png'),
    features: ['Measure Distances', 'Coordinate Position (N, E, Lat, Long)', 'Import/Export KML, CSV'],
  },
  {
    id: '2',
    title: 'Advanced Survey Tools',
    description: 'Measure distances, areas, and mark points with high precision GPS',
    icon: 'compass',
    image: require('./src/assests/images/onboard2.png'),
    features: ['GPS Tracking', 'Area Measurement', 'Point Marking'],
  },
  {
    id: '3',
    title: 'Export & Share',
    description: 'Export your survey data in GeoJSON, KML formats and share instantly',
    icon: 'share',
    image: require('./src/assests/images/onboard1.png'),
    features: ['GeoJSON Export', 'KML Export', 'Share Data'],
  },
];

// Onboarding Screen Component
const OnboardingScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderItem = ({ item }) => (
    <View style={styles.onboardingPage}>
      <Image
        source={item.image}
        style={styles.onboardingImage}
        resizeMode="cover"
      />
      <View style={styles.onboardingOverlay}>
        <View style={styles.onboardingContent}>
          <View style={styles.onboardingIconContainer}>
            <Ionicons name={item.icon} size={30} color="#3f5c45" />
          </View>
          <Text style={styles.onboardingTitle}>{item.title}</Text>
          <Text style={styles.onboardingDescription}>{item.description}</Text>
          <View style={styles.onboardingFeatures}>
            {item.features.map((feature, index) => (
              <View key={index} style={styles.onboardingFeatureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#3f5c45" />
                <Text style={styles.onboardingFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.onboardingContainer}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
      />

      {renderDots()}

      <View style={styles.onboardingFooter}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Side Menu / Drawer Component
const SideMenu = ({ visible, onClose, onMenuSelect }) => {
  const menuItems = [
    { id: 'map', label: 'Map', icon: 'map' },
    { id: 'list', label: 'List', icon: 'list' },
    { id: 'groups', label: 'Groups', icon: 'people' },
    { id: 'sync', label: 'Synchronize', icon: 'sync' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'contact', label: 'Contact us', icon: 'mail' },
  ];

  const translateX = useRef(new Animated.Value(-width * 0.8)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: visible ? 0 : -width * 0.8,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.drawerOverlay}>
      <TouchableOpacity style={styles.drawerBackdrop} onPress={onClose} />
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX }] }]}>
        {/* Drawer Header */}
        <View style={styles.drawerHeader}>
          <Image
            source={require('./src/assests/images/logo.png')}
            style={styles.drawerLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.drawerTitle}>Survey</Text>
          <Text style={styles.drawerSubtitle}>Global Coordinate Technologies</Text>
          <TouchableOpacity style={styles.drawerClose} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1b1f1a" />
          </TouchableOpacity>
        </View>

        <View style={styles.drawerDivider} />

        {/* Menu Items */}
        <ScrollView style={styles.drawerMenu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.drawerMenuItem}
              onPress={() => {
                onMenuSelect(item.id);
                onClose();
              }}
            >
              <Ionicons name={item.icon} size={22} color="#4a4638" />
              <Text style={styles.drawerMenuItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.drawerDivider} />

          {/* Premium Button */}
          <TouchableOpacity style={styles.drawerPremium}>
            <Ionicons name="star" size={22} color="#f39c12" />
            <Text style={styles.drawerPremiumText}>Buy Premium</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.drawerFooter}>
          <Text style={styles.drawerFooterText}>GCT Survey v1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Splash Screen Component
const SplashScreenComponent = ({ onComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      onComplete();
    }, 2000);
  }, []);

  return (
    <View style={styles.splashContainer}>
      <Animated.View style={[styles.splashContent, { opacity: fadeAnim }]}>
        <Image
          source={require('./src/assests/images/splash_logo.png')}
          style={styles.splashLogoImage}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>Global Coordinate Technologies</Text>
        <Text style={styles.splashSubtitle}>Solutions for Surveying & Mapping</Text>
        <View style={styles.splashServices}>
          <Text style={styles.splashService}>• ETS Survey</Text>
          <Text style={styles.splashService}>• Drone Survey</Text>
          <Text style={styles.splashService}>• DGPS Survey</Text>
          <Text style={styles.splashService}>• GIS Mapping</Text>
          <Text style={styles.splashService}>• Revenue Survey</Text>
        </View>
        <View style={styles.splashFooter}>
          <ActivityIndicator size="small" color="#3f5c45" />
          <Text style={styles.splashLoading}>Loading Survey Tool...</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Layer Selector Bottom Sheet
const LayerSelector = ({ visible, onClose, currentLayer, onLayerChange }) => {
  const layers = [
    { id: 'standard', label: 'Street Map', icon: 'map-outline', color: '#4a90d9' },
    { id: 'satellite', label: 'Satellite', icon: 'globe-outline', color: '#2ecc71' },
    { id: 'hybrid', label: 'Hybrid', icon: 'layers-outline', color: '#e67e22' },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.layerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.layerBottomSheet}>
          <View style={styles.layerSheetHeader}>
            <Text style={styles.layerSheetTitle}>Select Map Layer</Text>
            <TouchableOpacity onPress={onClose} style={styles.layerSheetClose}>
              <Ionicons name="close" size={24} color="#1b1f1a" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {layers.map((layer) => (
              <TouchableOpacity
                key={layer.id}
                style={[
                  styles.layerSheetItem,
                  currentLayer === layer.id && styles.layerSheetItemActive,
                ]}
                onPress={() => {
                  onLayerChange(layer.id);
                  onClose();
                }}
              >
                <View style={[styles.layerSheetIcon, { backgroundColor: layer.color + '20' }]}>
                  <Ionicons name={layer.icon} size={22} color={layer.color} />
                </View>
                <View style={styles.layerSheetInfo}>
                  <Text style={styles.layerSheetLabel}>{layer.label}</Text>
                  <Text style={styles.layerSheetDesc}>
                    {layer.id === 'standard' && 'OpenStreetMap'}
                    {layer.id === 'satellite' && 'Google Satellite'}
                    {layer.id === 'hybrid' && 'Google Hybrid'}
                  </Text>
                </View>
                {currentLayer === layer.id && (
                  <View style={styles.layerSheetCheck}>
                    <Ionicons name="checkmark-circle" size={24} color="#3f5c45" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Search Bar Component - Fixed
const SearchBar = ({ onSearch, onLocationPress }) => {
  const [searchText, setSearchText] = useState('');

  const handleSearch = async () => {
    if (!searchText.trim()) {
      Alert.alert('Please enter a location');
      return;
    }

    try {
      const coordMatch = searchText.match(/([-+]?\d+\.\d+)\s*[,，]\s*([-+]?\d+\.\d+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        onSearch({ latitude: lat, longitude: lng });
        setSearchText('');
        return;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        onSearch({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
        setSearchText('');
      } else {
        Alert.alert('Not Found', 'Location not found.');
      }
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search location.');
    }
  };

  return (
    <View style={styles.searchContainer} pointerEvents="box-none">
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#8a8578" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places or coordinates..."
          placeholderTextColor="#8a8578"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color="#8a8578" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.locationButton} onPress={onLocationPress}>
        <Ionicons name="locate" size={22} color="#3f5c45" />
      </TouchableOpacity>
    </View>
  );
};

// Main App Component
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [points, setPoints] = useState<SurveyPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [mode, setMode] = useState<'addpoint' | 'line' | 'poly' | null>(null);
  const [tempLatLngs, setTempLatLngs] = useState<LatLng[]>([]);
  const [measurements, setMeasurements] = useState<any | null>(null);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [showLayerSheet, setShowLayerSheet] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SurveyPoint | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9352,
    longitude: 77.6245,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Don't check onboarding status - always show onboarding
    loadSavedPoints();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_shown', 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        startGpsTracking();
      }
      return status === 'granted';
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  };

  const loadSavedPoints = async () => {
    try {
      const saved = await AsyncStorage.getItem('survey_points');
      if (saved) {
        setPoints(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading points:', error);
    }
  };

  const savePoints = async (newPoints: SurveyPoint[]) => {
    try {
      await AsyncStorage.setItem('survey_points', JSON.stringify(newPoints));
    } catch (error) {
      console.error('Error saving points:', error);
    }
  };

  const startGpsTracking = async () => {
    if (gpsTracking && locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setGpsTracking(false);
      return;
    }

    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude, accuracy } = location.coords;
      setCurrentLocation({ latitude, longitude, accuracy, altitude: null, heading: null });
      
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const { latitude, longitude, accuracy } = location.coords;
          setCurrentLocation({ latitude, longitude, accuracy, altitude: null, heading: null });
        }
      );

      setLocationSubscription(subscription);
      setGpsTracking(true);
    } catch (error: any) {
      Alert.alert('GPS Error', error?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addPointAtLocation = (lat: number, lng: number) => {
    const newPoint = {
      id: Date.now().toString(),
      name: `Point ${points.length + 1}`,
      note: '',
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString(),
    };
    const updatedPoints = [...points, newPoint];
    setPoints(updatedPoints);
    savePoints(updatedPoints);
    setSelectedPoint(newPoint);
    setMode(null);
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    
    if (mode === 'addpoint') {
      addPointAtLocation(coordinate.latitude, coordinate.longitude);
    } else if (mode === 'line' || mode === 'poly') {
      const newCoords = [...tempLatLngs, coordinate];
      setTempLatLngs(newCoords);
      
      if (mode === 'line' && newCoords.length >= 2) {
        calculateLineMeasurement(newCoords);
      }
      if (mode === 'poly' && newCoords.length >= 3) {
        calculatePolygonMeasurement(newCoords);
      }
    } else {
      const nearby = points.find(p => {
        const dist = turf.distance(
          turf.point([p.longitude, p.latitude]),
          turf.point([coordinate.longitude, coordinate.latitude]),
          { units: 'meters' }
        );
        return dist < 20;
      });
      if (nearby) {
        setSelectedPoint(nearby);
      }
    }
  };

  const handleMapRegionChange = (region: any) => {
    setMapRegion(region);
  };

  const handleSearch = (location: LatLng) => {
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const handleZoomIn = () => {
    const newRegion = {
      ...mapRegion,
      latitudeDelta: mapRegion.latitudeDelta / 2,
      longitudeDelta: mapRegion.longitudeDelta / 2,
    };
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion);
  };

  const handleZoomOut = () => {
    const newRegion = {
      ...mapRegion,
      latitudeDelta: mapRegion.latitudeDelta * 2,
      longitudeDelta: mapRegion.longitudeDelta * 2,
    };
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion);
  };

  const handleLocationPress = () => {
    if (currentLocation) {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  const handleMenuSelect = (itemId: string) => {
    switch(itemId) {
      case 'map':
        break;
      case 'list':
        Alert.alert('Points List', `${points.length} points recorded`);
        break;
      case 'groups':
        Alert.alert('Groups', 'Group management coming soon');
        break;
      case 'sync':
        Alert.alert('Synchronize', 'Sync your survey data');
        break;
      case 'settings':
        Alert.alert('Settings', 'App settings coming soon');
        break;
      case 'contact':
        Alert.alert('Contact Us', 'Email: globalcoordinatetechnologies@gmail.com\nPhone: 8073665236');
        break;
    }
  };

  const calculateLineMeasurement = (coords: LatLng[]) => {
    if (coords.length < 2) return;
    
    let totalDistance = 0;
    for (let i = 1; i < coords.length; i++) {
      const from = turf.point([coords[i-1].longitude, coords[i-1].latitude]);
      const to = turf.point([coords[i].longitude, coords[i].latitude]);
      totalDistance += turf.distance(from, to, { units: 'meters' });
    }

    setMeasurements({
      type: 'line',
      distance: totalDistance,
      points: coords.length,
    });
  };

  const calculatePolygonMeasurement = (coords: LatLng[]) => {
    if (coords.length < 3) return;
    
    const polygonCoords = coords.map(c => [c.longitude, c.latitude]);
    polygonCoords.push(polygonCoords[0]);
    const polygon = turf.polygon([polygonCoords]);
    const area = turf.area(polygon);
    const perimeter = turf.length(turf.lineString(polygonCoords), { units: 'meters' });
    
    setMeasurements({
      type: 'polygon',
      area: area,
      acres: area / 4046.8564224,
      perimeter: perimeter,
      points: coords.length,
    });
  };

  const finishDrawing = () => {
    if (mode === 'line' && tempLatLngs.length >= 2) {
      calculateLineMeasurement(tempLatLngs);
      Alert.alert('Line Measurement', 'Line has been saved.');
      setMode(null);
      setTempLatLngs([]);
    } else if (mode === 'poly' && tempLatLngs.length >= 3) {
      calculatePolygonMeasurement(tempLatLngs);
      Alert.alert('Area Measurement', 'Area has been saved.');
      setMode(null);
      setTempLatLngs([]);
    } else {
      Alert.alert(
        'Not enough points',
        mode === 'poly' ? 'Please add at least 3 points.' : 'Please add at least 2 points.'
      );
    }
  };

  const cancelDrawing = () => {
    setMode(null);
    setTempLatLngs([]);
    setMeasurements(null);
  };

  const undoVertex = () => {
    if (tempLatLngs.length > 0) {
      const newCoords = tempLatLngs.slice(0, -1);
      setTempLatLngs(newCoords);
      if (newCoords.length >= 2 && mode === 'line') {
        calculateLineMeasurement(newCoords);
      } else if (newCoords.length >= 3 && mode === 'poly') {
        calculatePolygonMeasurement(newCoords);
      } else {
        setMeasurements(null);
      }
    }
  };

  const exportData = async (format: 'geojson' | 'kml') => {
    if (points.length === 0) {
      Alert.alert('No Data', 'No survey points to export.');
      return;
    }

    let data = '';
    let filename = '';
    let mimeType = '';
    
    if (format === 'geojson') {
      const geojson = {
        type: 'FeatureCollection',
        features: points.map(p => ({
          type: 'Feature',
          properties: { 
            name: p.name, 
            note: p.note, 
            id: p.id,
            timestamp: p.timestamp,
            surveyor: 'Global Coordinate Technologies'
          },
          geometry: {
            type: 'Point',
            coordinates: [p.longitude, p.latitude]
          }
        }))
      };
      data = JSON.stringify(geojson, null, 2);
      filename = 'survey_points.geojson';
      mimeType = 'application/geo+json';
    } else if (format === 'kml') {
      const placemarks = points.map(p => `
        <Placemark>
          <name>${p.name}</name>
          <description>${p.note || 'No notes'}</description>
          <Point>
            <coordinates>${p.longitude},${p.latitude},0</coordinates>
          </Point>
        </Placemark>
      `).join('');
      
      data = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Survey Points - Global Coordinate Technologies</name>
    <description>Survey conducted by Global Coordinate Technologies</description>
    ${placemarks}
  </Document>
</kml>`;
      filename = 'survey_points.kml';
      mimeType = 'application/vnd.google-earth.kml+xml';
    }

    try {
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, data);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Export ${format.toUpperCase()}`,
        });
      } else {
        Alert.alert('Export Successful', `File saved to ${fileUri}`);
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error?.message ?? 'Unknown error');
    }
  };

  const importData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/geo+json'],
      });

      if (result.type === 'cancel') return;

      const file = result;
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = JSON.parse(content);
      let importedCount = 0;
      
      if (data.type === 'FeatureCollection') {
        data.features.forEach((f: any) => {
          if (f.geometry.type === 'Point') {
            const [lng, lat] = f.geometry.coordinates;
            const newPoint = {
              id: Date.now().toString() + importedCount,
              name: f.properties?.name || `Imported ${points.length + importedCount + 1}`,
              note: f.properties?.note || '',
              latitude: lat,
              longitude: lng,
              timestamp: new Date().toISOString(),
            };
            const updatedPoints = [...points, newPoint];
            setPoints(updatedPoints);
            savePoints(updatedPoints);
            importedCount++;
          }
        });
        Alert.alert('Import Successful', `Imported ${importedCount} points.`);
      }
    } catch (error: any) {
      Alert.alert('Import Failed', error?.message ?? 'Unknown error');
    }
  };

  const renderMeasurementDisplay = () => {
    if (!measurements) return null;

    return (
      <View style={styles.measurementPanel}>
        <Text style={styles.measurementTitle}>
          {measurements.type === 'line' ? '📏 Distance' : '📐 Area'}
        </Text>
        <View style={styles.measurementContent}>
          <Text style={styles.measurementValue}>
            {measurements.type === 'line' 
              ? `${measurements.distance.toFixed(2)} m`
              : `${measurements.area.toFixed(2)} m²`
            }
          </Text>
          {measurements.type === 'polygon' && (
            <Text style={styles.measurementSubValue}>
              {measurements.acres.toFixed(4)} acres
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Show Splash Screen
  if (showSplash) {
    return <SplashScreenComponent onComplete={() => setShowSplash(false)} />;
  }

  // Show Onboarding - Always show first
  if (showOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffdf8" />
      
      {/* Side Menu / Drawer */}
      <SideMenu
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        onMenuSelect={handleMenuSelect}
      />

      {/* Top Header with GCT Branding and Menu Button - Fixed with Logo */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowDrawer(true)}
        >
          <Ionicons name="menu" size={24} color="#1b1f1a" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('./src/assests/images/logo.png')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>Survey</Text>
            <Text style={styles.headerSubtitle}>Global Coordinate Technologies</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowCompanyInfo(true)}>
            <Ionicons name="business" size={20} color="#1b1f1a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Company Info Modal */}
      <Modal
        visible={showCompanyInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompanyInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCompanyInfo(false)}
            >
              <Ionicons name="close" size={24} color="#1b1f1a" />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.companyCard}>
                <Image
                  source={require('./src/assests/images/logo.png')}
                  style={styles.modalLogo}
                  resizeMode="contain"
                />
                <Text style={styles.companyName}>GLOBAL COORDINATE TECHNOLOGIES</Text>
                <Text style={styles.companyTagline}>Solutions for Surveying & Mapping</Text>
                <View style={styles.divider} />
                <Text style={styles.contactText}>📞 Sanjay.N: 8073665236</Text>
                <Text style={styles.contactText}>✉️ globalcoordinatetechnologies@gmail.com</Text>
                <Text style={styles.contactText}>🌐 www.GlobalCoordinateTechnologies.co.in</Text>
                <Text style={styles.contactText}>📍 Bangalore</Text>
                <View style={styles.divider} />
                <Text style={styles.servicesTitle}>Our Services:</Text>
                {['ETS Survey', 'Drone Survey', 'DGPS Survey', 'GIS Mapping', 'Revenue Survey'].map((service, index) => (
                  <Text key={index} style={styles.serviceItem}>• {service}</Text>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={mapRegion}
          onPress={handleMapPress}
          onRegionChangeComplete={handleMapRegionChange}
          mapType={mapLayer}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={true}
          showsBuildings={true}
          showsIndoors={true}
        >
          {points.map((point) => (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              onPress={() => setSelectedPoint(point)}
            >
              <View style={styles.customMarker}>
                <View style={styles.markerDot} />
              </View>
            </Marker>
          ))}

          {currentLocation && gpsTracking && (
            <>
              <Circle
                center={currentLocation}
                radius={currentLocation.accuracy || 10}
                strokeColor="rgba(63, 92, 69, 0.3)"
                fillColor="rgba(63, 92, 69, 0.08)"
              />
              <Marker coordinate={currentLocation} pinColor="#3f5c45">
                <View style={styles.userLocationDot} />
              </Marker>
            </>
          )}

          {tempLatLngs.length > 0 && (
            <>
              {mode === 'line' && (
                <Polyline
                  coordinates={tempLatLngs}
                  strokeColor="#b5622f"
                  strokeWidth={3}
                  lineDashPattern={[6, 6]}
                />
              )}
              {mode === 'poly' && tempLatLngs.length >= 3 && (
                <Polygon
                  coordinates={tempLatLngs}
                  strokeColor="#3f5c45"
                  strokeWidth={2}
                  fillColor="rgba(63, 92, 69, 0.15)"
                />
              )}
              {tempLatLngs.map((coord, index) => (
                <Marker key={index} coordinate={coord} pinColor="#1b1f1a" />
              ))}
            </>
          )}
        </MapView>

        {/* Search Bar - Fixed position */}
        <SearchBar onSearch={handleSearch} onLocationPress={handleLocationPress} />

        {/* GPS Accuracy - Bottom Left */}
        <View style={styles.bottomLeftControls}>
          <View style={styles.gpsAccuracyContainer}>
            <View style={[styles.gpsAccuracyDot, { 
              backgroundColor: currentLocation?.accuracy && currentLocation.accuracy <= 5 ? '#4CAF50' : 
                             currentLocation?.accuracy && currentLocation.accuracy <= 15 ? '#FFC107' : '#999' 
            }]} />
            <Text style={styles.gpsAccuracyText}>
              {currentLocation?.accuracy ? `±${Math.round(currentLocation.accuracy)} m` : 'No signal'}
            </Text>
          </View>
        </View>

        {/* Zoom Controls - Bottom Right */}
        <View style={styles.bottomRightControls}>
          <View style={styles.zoomContainer}>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
              <Ionicons name="add" size={22} color="#1b1f1a" />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
              <Ionicons name="remove" size={22} color="#1b1f1a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Layer Button - Bottom Right above Zoom */}
        <TouchableOpacity 
          style={styles.layerButton}
          onPress={() => setShowLayerSheet(true)}
        >
          <Ionicons name="layers" size={22} color="#1b1f1a" />
        </TouchableOpacity>

        {/* Layer Selector Bottom Sheet */}
        <LayerSelector
          visible={showLayerSheet}
          onClose={() => setShowLayerSheet(false)}
          currentLayer={mapLayer}
          onLayerChange={setMapLayer}
        />

        {/* Mode Banner */}
        {mode && (
          <View style={styles.modeBanner}>
            <View style={styles.modeBannerDot} />
            <Text style={styles.modeBannerText}>
              {mode === 'addpoint' && 'Tap map to add point'}
              {mode === 'line' && 'Tap points to measure line'}
              {mode === 'poly' && 'Tap points to measure area'}
            </Text>
          </View>
        )}

        {/* Point Details Card */}
        {selectedPoint && (
          <View style={styles.pointDetailsCard}>
            <View style={styles.pointDetailsHeader}>
              <View>
                <Text style={styles.pointDetailsTitle}>{selectedPoint.name}</Text>
                <Text style={styles.pointDetailsCoords}>
                  {selectedPoint.latitude.toFixed(6)}° N, {selectedPoint.longitude.toFixed(6)}° E
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPoint(null)}>
                <Ionicons name="close" size={22} color="#1b1f1a" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Measurement Display */}
        {renderMeasurementDisplay()}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.bottomControlsRow}>
          <TouchableOpacity
            style={[styles.bottomControlButton, gpsTracking && styles.activeButton]}
            onPress={startGpsTracking}
            disabled={loading}
          >
            <Ionicons name="location" size={18} color={gpsTracking ? '#fff' : '#1b1f1a'} />
            <Text style={[styles.bottomControlText, gpsTracking && styles.activeButtonText]}>
              GPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomControlButton, mode === 'addpoint' && styles.activeButton]}
            onPress={() => setMode(mode === 'addpoint' ? null : 'addpoint')}
          >
            <Ionicons name="add-circle" size={18} color={mode === 'addpoint' ? '#fff' : '#1b1f1a'} />
            <Text style={[styles.bottomControlText, mode === 'addpoint' && styles.activeButtonText]}>
              Add
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomControlButton, mode === 'line' && styles.activeButton]}
            onPress={() => setMode(mode === 'line' ? null : 'line')}
          >
            <Ionicons name="move" size={18} color={mode === 'line' ? '#fff' : '#1b1f1a'} />
            <Text style={[styles.bottomControlText, mode === 'line' && styles.activeButtonText]}>
              Line
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomControlButton, mode === 'poly' && styles.activeButton]}
            onPress={() => setMode(mode === 'poly' ? null : 'poly')}
          >
            <Ionicons name="square" size={18} color={mode === 'poly' ? '#fff' : '#1b1f1a'} />
            <Text style={[styles.bottomControlText, mode === 'poly' && styles.activeButtonText]}>
              Area
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControlsRow}>
          <TouchableOpacity style={styles.bottomActionButton} onPress={() => exportData('geojson')}>
            <FontAwesome5 name="file-code" size={14} color="#1b1f1a" />
            <Text style={styles.bottomActionText}>GeoJSON</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomActionButton} onPress={() => exportData('kml')}>
            <Ionicons name="document" size={14} color="#1b1f1a" />
            <Text style={styles.bottomActionText}>KML</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomActionButton} onPress={importData}>
            <Ionicons name="download" size={14} color="#1b1f1a" />
            <Text style={styles.bottomActionText}>Import</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bottomActionButton, styles.pointCountButton]} 
            onPress={() => Alert.alert('Survey Points', `${points.length} points recorded`)}
          >
            <Ionicons name="pin" size={14} color="#fff" />
            <Text style={[styles.bottomActionText, styles.pointCountText]}>{points.length}</Text>
          </TouchableOpacity>
        </View>

        {/* Drawing Controls */}
        {mode && (
          <View style={styles.drawingControls}>
            <TouchableOpacity style={styles.drawingButton} onPress={cancelDrawing}>
              <Text style={styles.drawingButtonText}>Cancel</Text>
            </TouchableOpacity>
            {tempLatLngs.length > 0 && (
              <TouchableOpacity style={styles.drawingButton} onPress={undoVertex}>
                <Text style={styles.drawingButtonText}>↩ Undo</Text>
              </TouchableOpacity>
            )}
            {((mode === 'line' && tempLatLngs.length >= 2) ||
              (mode === 'poly' && tempLatLngs.length >= 3)) && (
              <TouchableOpacity style={[styles.drawingButton, styles.drawingButtonFinish]} onPress={finishDrawing}>
                <Text style={[styles.drawingButtonText, { color: '#fff' }]}>✓ Finish</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f4ee',
  },
  // Onboarding Styles
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#fffdf8',
  },
  onboardingPage: {
    width: width,
    height: height,
    position: 'relative',
  },
  onboardingImage: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  onboardingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingBottom: 100,
  },
  onboardingContent: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  onboardingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  onboardingDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  onboardingFeatures: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  onboardingFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  onboardingFeatureText: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 8,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  onboardingFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f5c45',
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Splash Screen
  splashContainer: {
    flex: 1,
    backgroundColor: '#f6f4ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  splashLogoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1f1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#3f5c45',
    marginBottom: 20,
    textAlign: 'center',
  },
  splashServices: {
    alignItems: 'center',
    marginBottom: 30,
  },
  splashService: {
    fontSize: 14,
    color: '#4a4638',
    paddingVertical: 2,
  },
  splashFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splashLoading: {
    fontSize: 13,
    color: '#8a8578',
    marginLeft: 8,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fffdf8',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e5da',
    zIndex: 100,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 4,
  },
  headerLogoImage: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1f1a',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#8a8578',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 6,
    marginLeft: 4,
    backgroundColor: '#f6f4ee',
    borderRadius: 20,
  },
  // Drawer Styles
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: '#fffdf8',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    position: 'relative',
  },
  drawerLogoImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b1f1a',
  },
  drawerSubtitle: {
    fontSize: 11,
    color: '#8a8578',
    marginTop: 2,
  },
  drawerClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#e8e5da',
    marginHorizontal: 16,
  },
  drawerMenu: {
    flex: 1,
    paddingVertical: 8,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  drawerMenuItemText: {
    fontSize: 15,
    color: '#1b1f1a',
    marginLeft: 14,
  },
  drawerPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff8e1',
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  drawerPremiumText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f39c12',
    marginLeft: 14,
  },
  drawerFooter: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e8e5da',
  },
  drawerFooterText: {
    fontSize: 12,
    color: '#8a8578',
  },
  // Search - Fixed
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d3c4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1b1f1a',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  locationButton: {
    backgroundColor: '#fffdf8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d3c4',
    padding: 10,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  // GPS Accuracy
  bottomLeftControls: {
    position: 'absolute',
    bottom: 110,
    left: 10,
    zIndex: 100,
  },
  gpsAccuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8d3c4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsAccuracyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  gpsAccuracyText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1b1f1a',
  },
  // Zoom Controls
  bottomRightControls: {
    position: 'absolute',
    bottom: 150,
    right: 10,
    zIndex: 100,
  },
  zoomContainer: {
    backgroundColor: 'rgba(255, 253, 248, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d3c4',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#d8d3c4',
  },
  // Layer Button
  layerButton: {
    position: 'absolute',
    bottom: 110,
    right: 10,
    zIndex: 100,
    backgroundColor: 'rgba(255, 253, 248, 0.95)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d3c4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Layer Bottom Sheet
  layerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  layerBottomSheet: {
    backgroundColor: '#fffdf8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '60%',
  },
  layerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  layerSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b1f1a',
  },
  layerSheetClose: {
    padding: 4,
  },
  layerSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  layerSheetItemActive: {
    backgroundColor: '#f6f4ee',
  },
  layerSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  layerSheetInfo: {
    flex: 1,
  },
  layerSheetLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1b1f1a',
  },
  layerSheetDesc: {
    fontSize: 11,
    color: '#8a8578',
  },
  layerSheetCheck: {
    marginLeft: 8,
  },
  // Mode Banner
  modeBanner: {
    position: 'absolute',
    top: 70,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: '#1b1f1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
    minWidth: 200,
    zIndex: 999,
  },
  modeBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b5622f',
    marginRight: 8,
  },
  modeBannerText: {
    color: '#f6f4ee',
    fontSize: 12,
    fontWeight: '600',
  },
  // Custom Marker
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3f5c45',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3f5c45',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  // Point Details
  pointDetailsCard: {
    position: 'absolute',
    bottom: 180,
    left: 10,
    right: 10,
    backgroundColor: '#fffdf8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8d3c4',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  pointDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1f1a',
  },
  pointDetailsCoords: {
    fontSize: 12,
    color: '#8a8578',
    marginTop: 2,
  },
  // Measurement
  measurementPanel: {
    position: 'absolute',
    top: 70,
    right: 10,
    backgroundColor: 'rgba(255, 253, 248, 0.95)',
    borderWidth: 1,
    borderColor: '#d8d3c4',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
    zIndex: 999,
  },
  measurementTitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#8a8578',
  },
  measurementContent: {
    alignItems: 'center',
    marginTop: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1f1a',
  },
  measurementSubValue: {
    fontSize: 12,
    color: '#8a8578',
  },
  // Bottom Controls
  bottomControls: {
    backgroundColor: '#fffdf8',
    borderTopWidth: 1,
    borderTopColor: '#e8e5da',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  bottomControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f6f4ee',
    borderWidth: 1,
    borderColor: '#d8d3c4',
  },
  bottomControlText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1b1f1a',
    marginLeft: 4,
  },
  activeButton: {
    backgroundColor: '#3f5c45',
    borderColor: '#3f5c45',
  },
  activeButtonText: {
    color: '#fff',
  },
  bottomActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f6f4ee',
    borderWidth: 1,
    borderColor: '#d8d3c4',
  },
  bottomActionText: {
    fontSize: 11,
    color: '#1b1f1a',
    marginLeft: 4,
  },
  pointCountButton: {
    backgroundColor: '#3f5c45',
    borderColor: '#3f5c45',
  },
  pointCountText: {
    color: '#fff',
  },
  drawingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e8e5da',
  },
  drawingButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f6f4ee',
    borderWidth: 1,
    borderColor: '#d8d3c4',
    marginHorizontal: 4,
  },
  drawingButtonFinish: {
    backgroundColor: '#3f5c45',
    borderColor: '#3f5c45',
  },
  drawingButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1b1f1a',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fffdf8',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalLogo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  companyCard: {
    padding: 8,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1f1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 14,
    color: '#3f5c45',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#d8d3c4',
    marginVertical: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#4a4638',
    paddingVertical: 3,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1f1a',
    marginBottom: 4,
  },
  serviceItem: {
    fontSize: 13,
    color: '#4a4638',
    paddingVertical: 2,
  },
});