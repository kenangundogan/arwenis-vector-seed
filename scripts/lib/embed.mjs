const EMBED_BASE_URL = (process.env.EMBED_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '')
const EMBED_KEY = process.env.EMBED_KEY || 'ollama'
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text'

export const EMBED_LABEL = `${EMBED_BASE_URL} (${EMBED_MODEL})`

export const embed = async (input) => {
    const res = await fetch(`${EMBED_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMBED_KEY}` },
        body: JSON.stringify({ model: EMBED_MODEL, input }),
    })
    if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const json = await res.json()
    const data = json?.data
    if (!Array.isArray(data)) throw new Error('embed: data yok')
    return [...data].sort((a, b) => (a.index || 0) - (b.index || 0)).map((d) => d.embedding)
}

export const embedBatch = async (texts) => {
    try {
        return await embed(texts)
    } catch {
        const out = []
        for (const t of texts) out.push((await embed([t]))[0])
        return out
    }
}
