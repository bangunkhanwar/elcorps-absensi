import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('bangun@gmail.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      setLoading(false);
      navigation.replace('MainTabs');
    } catch (error: any) {
      let errorMessage = error.response?.data?.error || 'Terjadi kesalahan saat login';
      
      if (error.message?.includes('Network Error') || error.code === 'NETWORK_ERROR' || error.message?.includes('network') || error.message?.includes('timeout')) {
        errorMessage += '\n\nPeriksa konfigurasi server di Settings.';
        Alert.alert(
          'Login Gagal', 
          errorMessage,
          [{ text: 'OK', onPress: () => navigation.navigate('ServerConfig') }]
        );
        setLoading(false);
        return;
      }
      
      Alert.alert('Login Gagal', errorMessage);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="absolute top-0 left-0 right-0 h-3/5 bg-primary rounded-b-3xl" />
      
      <Animated.View 
        style={{ opacity: fadeAnim }}
        className="flex-1 justify-center px-6"
      >
        <View className="items-center mb-12">
          <Image 
            source={require('../../assets/logo.png')}
            className="w-25 h-20"
            resizeMode="contain"
          />
          <Text className="text-2xl font-bold text-white mt-0">Absensi Karyawan</Text>
        </View>

        <View className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 -mt-110">
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="mail-outline" size={20} color="#25a298" />
              <Text className="text-gray-600 ml-2 font-medium">Email</Text>
            </View>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-4 text-gray-800 border border-primary"
              placeholder="Masukan email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View className="mb-8">
            <View className="flex-row items-center mb-2">
              <Ionicons name="lock-closed-outline" size={20} color="#25a298" />
              <Text className="text-gray-600 ml-2 font-medium">Password</Text>
            </View>
            <View className="relative">
              <TextInput
                className="bg-gray-50 rounded-xl px-4 py-4 text-gray-800 border border-primary pr-12"
                placeholder="Masukkan password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={toggleShowPassword}
                className="absolute right-4 top-4"
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={24} 
                  color="#25a298" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            className={`bg-primary rounded-xl py-4 shadow-lg ${loading ? 'opacity-70' : 'opacity-100'}`}
            onPress={handleLogin}
            disabled={loading}
            style={{
              shadowColor: '#25a298',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center justify-center">
              {loading && (
                <Ionicons name="refresh-outline" size={20} color="white" className="mr-2" />
              )}
              <Text className="text-white text-center font-bold text-lg">
                {loading ? 'Memproses...' : 'Masuk'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="mt-6">
            <Text className="text-primary text-center font-medium">
              Lupa Password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('ServerConfig')}
            className="mt-4"
          >
            <Text className="text-primary text-center font-medium">
              Server Settings
            </Text>
          </TouchableOpacity>
        </View>

        <View className="items-center mt-8">
          <Text className="text-primary text-sm">
            © 2025 Elcorps • Version 1.0
          </Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}