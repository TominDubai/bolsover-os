import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

export default async function TestBOQPage({ params }: { params: { id: string, boqId: string } }) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  console.log('User authenticated:', user.email)
  console.log('Project ID:', params.id)
  console.log('BOQ ID:', params.boqId)

  const { data: boq } = await supabase
    .from('boq')
    .select('*')
    .eq('id', params.boqId)
    .eq('project_id', params.id)
    .single()

  if (!boq) {
    console.log('BOQ not found')
    notFound()
  }

  return (
    <div className="p-8">
      <h1>BOQ Edit Working!</h1>
      <p>Project: {params.id}</p>
      <p>BOQ: {params.boqId}</p>
      <p>Status: {boq.status}</p>
    </div>
  )
}