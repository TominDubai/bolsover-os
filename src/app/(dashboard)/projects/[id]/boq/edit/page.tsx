import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EditBOQForm } from '@/components/EditBOQForm'

interface EditBOQPageProps {
  params: {
    id: string
  }
}

export default async function EditBOQPage({ params }: EditBOQPageProps) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) {
    redirect(`/projects/${params.id}/boq`)
  }

  const { data: boq } = await supabase
    .from('boq')
    .select('*')
    .eq('project_id', params.id)
    .single()

  if (!boq) {
    redirect(`/projects/${params.id}/boq`)
  }

  const { data: categories } = await supabase
    .from('boq_categories')
    .select('*, items:boq_items(*)')
    .eq('boq_id', boq.id)
    .order('sort_order')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Edit BOQ - {project.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Version {boq.version} - {boq.status}
            </p>
          </div>
          
          <EditBOQForm 
            projectId={params.id} 
            boq={boq} 
            categories={categories || []} 
          />
        </div>
      </div>
    </div>
  )
}