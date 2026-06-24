import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const generateUUID = (str) => {
    const hash = crypto.createHash('md5').update(str).digest('hex')
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        '3' + hash.slice(13, 16),
        ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
        hash.slice(20, 32)
    ].join('-')
}


const QDRANT_URL = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/+$/, '')
const QDRANT_KEY = process.env.QDRANT_KEY || 'localkey'
const COLLECTION = process.env.COLLECTION || 'arwenis'
const EMBED_BASE_URL = (process.env.EMBED_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '')
const EMBED_KEY = process.env.EMBED_KEY || 'ollama'
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text'

const embed = async (input) => {
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

const embedBatch = async (texts) => {
    try {
        return await embed(texts)
    } catch {
        const out = []
        for (const t of texts) out.push((await embed([t]))[0])
        return out
    }
}

const qdrant = async (p, method, body) => {
    const res = await fetch(`${QDRANT_URL}${p}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_KEY },
        body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok && res.status !== 404) {
        throw new Error(`qdrant ${method} ${p} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    return res
}

const main = async () => {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'news.json'), 'utf-8'))
    console.log(`Embedding: ${EMBED_BASE_URL} (${EMBED_MODEL}) | Qdrant: ${QDRANT_URL}/${COLLECTION}`)
    console.log(`[+] ${docs.length} doküman`)

    const dim = (await embed([`${docs[0].title}. ${docs[0].text}`]))[0].length
    console.log(`✓ Embedding boyutu: ${dim}`)

    await qdrant(`/collections/${COLLECTION}`, 'DELETE')
    await qdrant(`/collections/${COLLECTION}`, 'PUT', { vectors: { size: dim, distance: 'Cosine' } })
    console.log('✓ Koleksiyon (yeniden) oluşturuldu')

    await qdrant(`/collections/${COLLECTION}/index?wait=true`, 'PUT', {
        field_name: 'category',
        field_schema: 'keyword',
    })
    await qdrant(`/collections/${COLLECTION}/index?wait=true`, 'PUT', {
        field_name: 'source',
        field_schema: 'keyword',
    })
    await qdrant(`/collections/${COLLECTION}/index?wait=true`, 'PUT', {
        field_name: 'publishedAtTs',
        field_schema: 'integer',
    })
    console.log('✓ Payload index’leri oluşturuldu (category=keyword, source=keyword, publishedAtTs=integer)')

    const BATCH = 50
    for (let i = 0; i < docs.length; i += BATCH) {
        const chunk = docs.slice(i, i + BATCH)
        const vectors = await embedBatch(chunk.map((d) => `${d.title}. ${d.text}`))
        const points = chunk.map((d, idx) => {
            const docId = generateUUID(d.url)
            return {
                id: docId,
                vector: vectors[idx],
                payload: {
                    id: docId,
                    title: d.title,
                    url: d.url,
                    image: d.image || '',
                    text: d.text,
                    content: d.content,
                    category: d.category,
                    source: d.source || 'unknown',
                    publishedAt: d.publishedAt,
                    publishedAtTs: d.publishedAtTs,
                },
            }
        })
        await qdrant(`/collections/${COLLECTION}/points?wait=true`, 'PUT', { points })
        console.log(`[Progress] ${Math.min(i + BATCH, docs.length)}/${docs.length}`)
    }

    console.log('\n✓ Tohumlama tamamlandı (payload: id, title, url, image, text, content, category, source, publishedAt, publishedAtTs)')
}

main().catch((e) => {
    console.error('\n✗ Hata:', e.message)
    process.exit(1)
})
