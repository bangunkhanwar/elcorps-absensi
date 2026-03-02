import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateServerIP } from '../services/api';

export default function SettingsScreen({ navigation }: any) {
  const [ipAddress, setIpAddress] = useState('');

  const handleSaveIP = async () => {
    if (!ipAddress) {
      Alert.alert('Error', 'Please enter server IP address');
      return;
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      Alert.alert('Error', 'Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }

    const success = await updateServerIP(ipAddress);
    if (success) {
      Alert.alert(
        'Success', 
        'Server IP updated successfully!\n\nYou can now login on both iOS and Android.'
      );
      setIpAddress('');
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to update server IP');
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#25a298" barStyle="light-content" />
      
      {/* Header dengan background */}
      <View className="bg-primary pt-12 pb-4 px-6 rounded-b-3xl shadow-lg">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Server Configuration</Text>
            <Text className="text-white/80 text-sm mt-1">
              Set your computer's IP address
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {Platform.OS === 'android' && (
          <View className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200">
            <View className="flex-row items-start">
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <View className="ml-3 flex-1">
                <Text className="text-amber-800 font-bold text-base mb-1">Important for Android</Text>
                <Text className="text-amber-700 text-sm">
                  Android requires manual IP configuration. Please enter your computer's IP address below.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* IP Input Card */}
        <View className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mr-3">
              <Ionicons name="server" size={20} color="#25a298" />
            </View>
            <View>
              <Text className="text-lg font-semibold text-gray-800">Server IP Address</Text>
              <Text className="text-gray-500 text-sm">Enter your computer's local IP</Text>
            </View>
          </View>

          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-4 text-lg bg-gray-50 mb-2"
            placeholder="192.168.1.100"
            placeholderTextColor="#9CA3AF"
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="text-gray-400 text-sm">
            Enter without http:// or port number
          </Text>

          <TouchableOpacity
            className="bg-primary rounded-xl py-4 mt-4 shadow-lg"
            onPress={handleSaveIP}
          >
            <Text className="text-white text-center font-bold text-lg">
              Save IP Address
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View className="bg-blue-50 rounded-2xl p-5 mb-4 border border-blue-200">
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle" size={24} color="#1e40af" />
            <Text className="text-blue-800 font-bold text-lg ml-2">How to find your IP</Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row">
              <Text className="text-blue-700 text-sm flex-1">
                <Text className="font-bold">Windows:</Text> Open CMD → type "ipconfig" → find "IPv4 Address"
              </Text>
            </View>
            <View className="flex-row">
              <Text className="text-blue-700 text-sm flex-1">
                <Text className="font-bold">Mac:</Text> Open Terminal → type "ifconfig" → find "inet"
              </Text>
            </View>
            <View className="flex-row">
              <Text className="text-blue-700 text-sm flex-1">
                <Text className="font-bold">Important:</Text> Both devices must be on same WiFi network
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
          <View className="flex-row items-center mb-3">
            <Ionicons name="build" size={24} color="#d97706" />
            <Text className="text-amber-800 font-bold text-lg ml-2">Troubleshooting</Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row items-start">
              <Text className="text-amber-700 text-sm">•</Text>
              <Text className="text-amber-700 text-sm ml-2 flex-1">If login fails, check if IP address is correct</Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-amber-700 text-sm">•</Text>
              <Text className="text-amber-700 text-sm ml-2 flex-1">Make sure server is running on port 5000</Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-amber-700 text-sm">•</Text>
              <Text className="text-amber-700 text-sm ml-2 flex-1">Restart app after changing IP address</Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-amber-700 text-sm">•</Text>
              <Text className="text-amber-700 text-sm ml-2 flex-1">Check firewall settings on your computer</Text>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}