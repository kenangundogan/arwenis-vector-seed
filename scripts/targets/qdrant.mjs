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

const recreateCollection = async (dim) => {
    await qdrant(`/collections/${COLLECTION}`, 'DELETE')
    await qdrant(`/collections/${COLLECTION}`, 'PUT', { vectors: { size: dim, distance: 'Cosine' } })
    console.log('✓ Koleksiyon (yeniden) oluşturuldu')
}

const ensureIndexes = async () => {
    const fields = [['category', 'keyword'], ['source', 'keyword'], ['publishedAtTs', 'integer']]
    for (const [field_name, field_schema] of fields) {
        await qdrant(`/collections/${COLLECTION}/index?wait=true`, 'PUT', { field_name, field_schema })
    }
    console.log('✓ Payload index’leri oluşturuldu (category, source, publishedAtTs)')
}

const seed = async () => {
    const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'news.json'), 'utf-8'))
    if (!docs.length) {
        console.error('✗ data/news.json boş — önce scrape veya synthetic çalıştırın.')
        process.exit(1)
    }
    console.log(`Embedding: ${EMBED_LABEL} | Qdrant: ${QDRANT_URL}/${COLLECTION}`)
    console.log(`[+] ${docs.length} doküman`)

    const dim = (await embed([`${docs[0].title}. ${docs[0].description}`]))[0].length
    console.log(`✓ Embedding boyutu: ${dim}`)

    await recreateCollection(dim)
    await ensureIndexes()

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

    console.log('\n✓ Tohumlama tamamlandı (payload: id, title, url, images, description, content, category, source, publishedAt, publishedAtTs)')
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

const ACTIONS = { seed, clear: clearPoints, drop: dropCollection }

const main = async () => {
    const action = process.argv[2]
    const fn = ACTIONS[action]
    if (!fn) {
        console.error('[-] Geçersiz işlem. Kullanım: node targets/qdrant.mjs <seed|clear|drop>')
        process.exit(1)
    }
    await fn()
}

main().catch((e) => {
    console.error('\n✗ Hata:', e.message)
    process.exit(1)
})
