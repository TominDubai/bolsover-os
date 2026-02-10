import { redirect } from 'next/navigation'

export default function BOQPage({ params }: { params: { id: string } }) {
  // Simple redirect to the working BOQ system
  redirect(`/projects/${params.id}/boq/simple`)
}