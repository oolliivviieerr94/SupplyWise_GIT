import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchSupplementBySlug, fetchFicheMarkdown, type Supplement } from '../lib/data'

export default function SuppDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [supp, setSupp] = useState<Supplement | null>(null)
  const [md, setMd] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true); setError(null)
      const s = await fetchSupplementBySlug(slug)
      setSupp(s)
      const m = await fetchFicheMarkdown(slug)
      setMd(m || 'Fiche indisponible.')
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [slug])

  if (loading) return <div className="p-4">Chargement…</div>
  if (error) return (
    <div className="p-4 space-y-2">
      <button className="text-sm underline" onClick={onBack}>← Retour</button>
      <div className="text-red-600">Erreur : {error}</div>
    </div>
  )
  if (!supp) return (
    <div className="p-4 space-y-2">
      <button className="text-sm underline" onClick={onBack}>← Retour</button>
      <div>Introuvable.</div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <button className="text-sm underline" onClick={onBack}>← Retour</button>

      <h1 className="text-2xl font-semibold">{supp.name}</h1>
      <div className="text-gray-600">{supp.category || '—'}</div>

      <div className="flex gap-4 text-sm flex-wrap">
        <div><b>Score global :</b> {supp.score_global ?? '—'}/20</div>
        <div><b>Études :</b> {supp.research_count ?? 0}</div>
        {supp.price_eur_month != null && <div><b>Coût/mois :</b> {supp.price_eur_month} €</div>}
        {supp.quality_level && <div><b>Qualité :</b> {supp.quality_level}</div>}
      </div>

      {supp.scores && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(supp.scores).map(([k,v]) => (
            <span key={k} className="text-xs border rounded px-2 py-1">{k}: {v as any}</span>
          ))}
        </div>
      )}

      <hr />

      <article className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {md}
        </ReactMarkdown>
      </article>

      <div>
        <button className="border rounded px-3 py-2" onClick={load}>Recharger</button>
      </div>
    </div>
  )
}