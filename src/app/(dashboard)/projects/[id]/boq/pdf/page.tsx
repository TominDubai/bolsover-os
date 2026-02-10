import { BOQPDFManager } from '@/components/BOQPDFManager'

interface BOQPDFPageProps {
  params: {
    id: string
  }
}

export default async function BOQPDFPage({ params }: BOQPDFPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">BOQ Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Simple PDF upload and messaging system for Pao
            </p>
          </div>
          
          <BOQPDFManager projectId={params.id} />
        </div>
      </div>
    </div>
  )
}