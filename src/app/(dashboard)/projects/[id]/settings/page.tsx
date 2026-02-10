import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/SettingsForm'

interface SettingsPageProps {
  params: {
    id: string
  }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch current user settings
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Fetch project if project-specific settings
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Settings - {project?.name || 'System Settings'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure project settings and user preferences
            </p>
          </div>
          
          <SettingsForm 
            projectId={params.id} 
            userSettings={userSettings} 
            project={project}
          />
        </div>
      </div>
    </div>
  )
}