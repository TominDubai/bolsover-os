import { redirect } from 'next/navigation'

export default function BOQRedirectPage() {
  // Redirect to PDF BOQ system
  redirect('/projects/[id]/boq/pdf')
}