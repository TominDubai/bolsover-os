import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { LoginScreen } from './src/screens/LoginScreen'
import { ProjectsScreen } from './src/screens/ProjectsScreen'
import { DailyReportScreen } from './src/screens/DailyReportScreen'
import { SuccessScreen } from './src/screens/SuccessScreen'

export type RootStackParamList = {
  Login: undefined
  Projects: undefined
  DailyReport: { projectId: string; projectName: string }
  Success: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1e40af' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Projects" 
          component={ProjectsScreen}
          options={{ title: 'My Projects', headerBackVisible: false }}
        />
        <Stack.Screen 
          name="DailyReport" 
          component={DailyReportScreen}
          options={{ title: 'Daily Report' }}
        />
        <Stack.Screen 
          name="Success" 
          component={SuccessScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
