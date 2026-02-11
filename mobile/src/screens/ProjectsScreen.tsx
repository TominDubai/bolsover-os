import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Projects'>
}

interface Project {
  id: string
  name: string
  client_name: string | null
  status: string
}

export function ProjectsScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        clients(name)
      `)
      .in('status', ['active', 'in_progress'])
      .order('name')

    if (!error && data) {
      setProjects(data.map(p => ({
        id: p.id,
        name: p.name,
        client_name: (p.clients as any)?.name || null,
        status: p.status,
      })))
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchProjects()
  }

  const handleSelectProject = (project: Project) => {
    navigation.navigate('DailyReport', {
      projectId: project.id,
      projectName: project.name,
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigation.replace('Login')
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select a project to submit your daily report</Text>
      
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.projectCard}
            onPress={() => handleSelectProject(item)}
          >
            <View style={styles.projectInfo}>
              <Text style={styles.projectName}>{item.name}</Text>
              {item.client_name && (
                <Text style={styles.clientName}>{item.client_name}</Text>
              )}
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No active projects</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748b',
  },
  header: {
    fontSize: 18,
    color: '#475569',
    padding: 20,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  clientName: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  arrow: {
    fontSize: 28,
    color: '#1e40af',
    fontWeight: 'bold',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
})
