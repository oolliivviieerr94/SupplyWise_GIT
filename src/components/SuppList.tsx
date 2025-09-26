import { useEffect, useMemo, useState } from 'react'
import { fetchSupplements, type Supplement } from '../lib/data'

export default function SuppList({ onOpenDetail }: { onOpenDetail: (slug: string) => void }) {
  const [items, setItems] = useState<Supplement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  async function load() {
    try {
      setLoading(true); setError(null)
      const data = await fetchSupplements(500)
      setItems(data)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const categories = useMemo(() => ['(toutes)', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))], [items])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter(i => {
      const okQ = !term || i.name.toLowerCase().includes(term)
      const okCat = !cat || cat === '(toutes)' || i.category === cat
      return okQ && okCat
    })
  }, [items, q, cat])

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-2xl font-semibold">Compléments</h1>

      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Rechercher…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select className="border rounded px-3 py-2" value={cat} onChange={e => setCat(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="border rounded px-3 py-2" onClick={load} disabled={loading}>
          {loading ? '...' : 'Rafraîchir'}
        </button>
      </div>

      {error && <div className="text-red-600">Erreur : {error}</div>}
      {loading && <div>Chargement…</div>}

      <ul className="divide-y">
        {filtered.map(i => (
          <li
            key={i.id}
            className="py-3 cursor-pointer hover:bg-gray-50 transition"
            onClick={() => onOpenDetail(i.slug)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{i.name}</div>
                <div className="text-sm text-gray-500">{i.category || '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{i.score_global ?? '—'}/20</div>
                <div className="text-xs text-gray-500">{i.research_count ?? 0} études</div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && !error && filtered.length === 0 && <div>Aucun résultat.</div>}
    </div>
  )
}