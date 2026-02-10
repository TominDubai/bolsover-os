import { SimpleBOQManager } from '@/components/SimpleBOQManager'

export default async function BOQPage({ params }: { params: { id: string } }) {
  return <SimpleBOQManager projectId={params.id} />
}