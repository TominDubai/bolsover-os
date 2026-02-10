export default function SimpleBOQPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">BOQ Management</h1>
        
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-lg font-semibold mb-4">Upload Pao's BOQ</h2>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls"
                className="hidden"
                id="boq-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    alert(`Uploaded ${file.name} for project ${params.id}`)
                  }
                }}
              />
              <label htmlFor="boq-upload" className="cursor-pointer">
                <div className="text-sm text-gray-600">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p>Drop PDF or Excel file here, or click to select</p>
                </div>
              </label>
            </div>
            
            <div className="text-center">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Upload BOQ
              </button>
            </div>
            
            <div className="text-sm text-gray-600 text-center">
              <p>After upload, Pao will be notified to make any changes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}