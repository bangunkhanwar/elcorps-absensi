import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import LeaveScreen from './src/screens/LeaveScreen'; 
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Attendance: undefined;
  Leave: undefined; 
  Setting: undefined;
  ServerConfig: undefined;
  MainTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Attendance" 
          component={AttendanceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Leave" 
          component={LeaveScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Setting" 
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ServerConfig" 
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MainTabs" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}