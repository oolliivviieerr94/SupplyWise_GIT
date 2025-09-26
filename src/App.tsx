import { useState } from 'react'
import SuppList from './components/SuppList'
import SuppDetail from './components/SuppDetail'

export default function App() {
  const [slug, setSlug] = useState<string | null>(null)

  if (slug) {
    return <SuppDetail slug={slug} onBack={() => setSlug(null)} />
  }
  return <SuppList onOpenDetail={(s) => setSlug(s)} />
}