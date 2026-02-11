import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DailyReport'>
  route: RouteProp<RootStackParamList, 'DailyReport'>
}

interface Photo {
  uri: string
  base64?: string
}

export function DailyReportScreen({ navigation, route }: Props) {
  const { projectId, projectName } = route.params
  
  const [workCompleted, setWorkCompleted] = useState('')
  const [workersOnSite, setWorkersOnSite] = useState('')
  const [issues, setIssues] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [submitting, setSubmitting] = useState(false)

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take photos')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, { 
        uri: result.assets[0].uri, 
        base64: result.assets[0].base64 
      }])
    }
  }

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: true,
    })

    if (!result.canceled) {
      const newPhotos = result.assets.map(a => ({ 
        uri: a.uri, 
        base64: a.base64 
      }))
      setPhotos([...photos, ...newPhotos])
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!workCompleted.trim()) {
      Alert.alert('Required', 'Please describe the work completed today')
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Create daily report
      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .insert({
          project_id: projectId,
          date: new Date().toISOString().split('T')[0],
          summary: workCompleted.trim(),
          issues: issues.trim() || null,
          workers_count: workersOnSite ? parseInt(workersOnSite) : null,
          submitted_by: user?.id,
        })
        .select()
        .single()

      if (reportError) throw reportError

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        if (photo.base64) {
          const fileName = `${report.id}/${Date.now()}-${i}.jpg`
          
          const { error: uploadError } = await supabase.storage
            .from('site-photos')
            .upload(fileName, decode(photo.base64), {
              contentType: 'image/jpeg',
            })

          if (!uploadError) {
            // Get public URL and save reference
            const { data: { publicUrl } } = supabase.storage
              .from('site-photos')
              .getPublicUrl(fileName)

            await supabase.from('daily_report_photos').insert({
              daily_report_id: report.id,
              photo_url: publicUrl,
            })
          }
        }
      }

      navigation.replace('Success')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.projectName}>{projectName}</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString('en-GB', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Work Completed Today *</Text>
        <TextInput
          style={styles.textArea}
          value={workCompleted}
          onChangeText={setWorkCompleted}
          placeholder="Describe what was done today..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Workers on Site</Text>
        <TextInput
          style={styles.input}
          value={workersOnSite}
          onChangeText={setWorkersOnSite}
          placeholder="Number of workers"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Issues / Delays</Text>
        <TextInput
          style={styles.textArea}
          value={issues}
          onChangeText={setIssues}
          placeholder="Any problems or delays? (optional)"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Photos</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.photoButtonText}>📷 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
            <Text style={styles.photoButtonText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>
        
        {photos.length > 0 && (
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

// Helper to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 20,
  },
  projectName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  date: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 120,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e40af',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e40af',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
})
