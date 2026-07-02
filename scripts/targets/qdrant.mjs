import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { embed, embedBatch, EMBED_LABEL } from '../lib/embed.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const QDRANT_URL = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/+$/, '')
const QDRANT_KEY = process.env.QDRANT_KEY || 'localkey'
const COLLECTION = process.env.COLLECTION || 'arwenis'

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

const readDocs = () => {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'news.json'), 'utf-8'))
    if (!docs.length) {
        console.error('✗ data/news.json boş — önce bir kaynak çalıştırın.')
        process.exit(1)
    }
    return docs
}

const probeDim = async (docs) => {
    const dim = (await embed([`${docs[0].title}. ${docs[0].description}`]))[0].length
    console.log(`✓ Embedding boyutu: ${dim}`)
    return dim
}

const ensureIndexes = async () => {
    const fields = [['category', 'keyword'], ['source', 'keyword'], ['publishedAtTs', 'integer']]
    for (const [field_name, field_schema] of fields) {
        await qdrant(`/collections/${COLLECTION}/index?wait=true`, 'PUT', { field_name, field_schema })
    }
    console.log('✓ Payload index’leri oluşturuldu (category, source, publishedAtTs)')
}

const recreateCollection = async (dim) => {
    await qdrant(`/collections/${COLLECTION}`, 'DELETE')
    await qdrant(`/collections/${COLLECTION}`, 'PUT', { vectors: { size: dim, distance: 'Cosine' } })
    await ensureIndexes()
    console.log('✓ Koleksiyon (yeniden) oluşturuldu')
}

const collectionDim = async () => {
    const res = await qdrant(`/collections/${COLLECTION}`, 'GET')
    if (!res.ok) return null
    const j = await res.json()
    return j?.result?.config?.params?.vectors?.size ?? null
}

const ensureCollection = async (dim) => {
    const existing = await collectionDim()
    if (existing == null) {
        await qdrant(`/collections/${COLLECTION}`, 'PUT', { vectors: { size: dim, distance: 'Cosine' } })
        await ensureIndexes()
        console.log('✓ Koleksiyon oluşturuldu')
        return
    }
    if (existing !== dim) {
        throw new Error(`Vektör boyutu uyuşmuyor (koleksiyon: ${existing}, embedding: ${dim}). Farklı embedding modeli → önce 'seed' (yeniden kur) veya 'drop' gerekir.`)
    }
    console.log(`✓ Mevcut koleksiyona ekleniyor (boyut: ${existing})`)
}

const upsertPoints = async (docs) => {
    const BATCH = 50
    for (let i = 0; i < docs.length; i += BATCH) {
        const chunk = docs.slice(i, i + BATCH)
        const vectors = await embedBatch(chunk.map((d) => `${d.title}. ${d.description}`))
        const points = chunk.map((d, idx) => {
            const docId = generateUUID(d.url)
            return {
                id: docId,
                vector: vectors[idx],
                payload: {
                    id: docId,
                    title: d.title,
                    url: d.url,
                    images: d.images || null,
                    description: d.description,
                    content: d.content,
                    category: d.category,
                    source: d.source || 'unknown',
                    publishedAt: d.publishedAt,
                    publishedAtTs: d.publishedAtTs,
                },
            }
        })
        await qdrant(`/collections/${COLLECTION}/points?wait=true`, 'PUT', { points })
        console.log(`[+] ${Math.min(i + BATCH, docs.length)}/${docs.length}`)
    }
}

const rebuild = async () => {
    const docs = readDocs()
    console.log(`Embedding: ${EMBED_LABEL} | Qdrant: ${QDRANT_URL}/${COLLECTION}`)
    console.log(`[+] ${docs.length} doküman (sıfırdan kur)`)
    const dim = await probeDim(docs)
    await recreateCollection(dim)
    await upsertPoints(docs)
    console.log('\n✓ Yeniden kurma tamamlandı (koleksiyon sıfırdan kuruldu)')
}

const upsert = async () => {
    const docs = readDocs()
    console.log(`Embedding: ${EMBED_LABEL} | Qdrant: ${QDRANT_URL}/${COLLECTION}`)
    console.log(`[+] ${docs.length} doküman (ekle/güncelle)`)
    const dim = await probeDim(docs)
    await ensureCollection(dim)
    await upsertPoints(docs)
    console.log('\n✓ Ekleme tamamlandı (mevcut koleksiyona upsert)')
}

const clearPoints = async () => {
    console.log(`[+] Koleksiyon içindeki veriler temizleniyor: ${COLLECTION}`)
    await qdrant(`/collections/${COLLECTION}/points/delete`, 'POST', { filter: {} })
    console.log('✓ Koleksiyon içindeki tüm veriler temizlendi.')
}

const dropCollection = async () => {
    console.log(`[+] Qdrant koleksiyonu tamamen siliniyor: ${COLLECTION}`)
    await qdrant(`/collections/${COLLECTION}`, 'DELETE')
    console.log('✓ Koleksiyon başarıyla silindi.')
}

export const run = async (action) => {
    const ACTIONS = { rebuild, upsert, clear: clearPoints, drop: dropCollection }
    const fn = ACTIONS[action]
    if (!fn) throw new Error(`Geçersiz işlem: '${action}' (rebuild|upsert|clear|drop)`)
    await fn()
}
