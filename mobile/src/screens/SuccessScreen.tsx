import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Success'>
}

export function SuccessScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>Report Submitted!</Text>
      <Text style={styles.message}>
        Your daily report has been saved successfully.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('Projects')}
      >
        <Text style={styles.buttonText}>Submit Another Report</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  message: {
    fontSize: 18,
    color: '#bbf7d0',
    textAlign: 'center',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16a34a',
  },
})
