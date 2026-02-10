import { createClient } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { BOQPDFManager } from '@/components/BOQPDFManager'

interface BOQPDFPageProps {
  params: {
    id: string
  }
}

export default async function BOQPDFPage({ params }: BOQPDFPageProps) {
  const projectId = params.id
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    redirect(`/projects`)
  }

  const { data: boqPdfs } = await supabase
    .from('boq_pdfs')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })

  const { data: editRequests } = await supabase
    .from('boq_edit_requests')
    .select('*')
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">BOQ - {project.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              PDF-based BOQ management - upload Excel/PDF files
            </p>
          </div>
          
          <BOQPDFManager 
            projectId={projectId} 
            boqPdfs={boqPdfs || []} 
            editRequests={editRequests || []}
            currentUser={user}
          />
        </div>
      </div>
    </div>
  )
}