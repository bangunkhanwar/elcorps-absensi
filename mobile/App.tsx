import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
<<<<<<< HEAD
import SplashScreen from './src/screens/SplashScreen';
=======
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import LeaveScreen from './src/screens/LeaveScreen'; 
<<<<<<< HEAD
import HistoryLeaveScreen from './src/screens/HistoryLeaveScreen'; 
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Splash: undefined;
=======
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
  Login: undefined;
  Home: undefined;
  Attendance: undefined;
  Leave: undefined; 
<<<<<<< HEAD
  HistoryLeave: undefined;
=======
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
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
<<<<<<< HEAD
          name="Splash" 
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
=======
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
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
<<<<<<< HEAD
          name="HistoryLeave" 
          component={HistoryLeaveScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
=======
>>>>>>> 4902f588f8444b0dcd79c17ff2b22b2db382eefb
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