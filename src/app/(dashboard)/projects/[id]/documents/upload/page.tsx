import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadDocumentForm } from '@/components/UploadDocumentForm'

interface UploadDocumentPageProps {
  params: {
    id: string
  }
}

export default async function UploadDocumentPage({ params }: UploadDocumentPageProps) {
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
    redirect(`/projects/${params.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
            <p className="text-sm text-gray-600 mt-1">
              Upload documents for {project.name}
            </p>
          </div>
          
          <UploadDocumentForm projectId={params.id} />
        </div>
      </div>
    </div>
  )
}