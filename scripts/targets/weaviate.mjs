import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { embed, embedBatch, EMBED_LABEL } from '../lib/embed.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const WEAVIATE_URL = (process.env.WEAVIATE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '')
const WEAVIATE_KEY = process.env.WEAVIATE_KEY || ''
const COLLECTION = process.env.COLLECTION || 'arwenis'
const CLASS = COLLECTION.charAt(0).toUpperCase() + COLLECTION.slice(1)

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

const wv = async (p, method, body) => {
    const headers = { 'Content-Type': 'application/json' }
    if (WEAVIATE_KEY) headers.Authorization = `Bearer ${WEAVIATE_KEY}`
    const res = await fetch(`${WEAVIATE_URL}${p}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok && res.status !== 404) {
        throw new Error(`weaviate ${method} ${p} ${res.status}: ${(await res.text()).slice(0, 300)}`)
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

const classExists = async () => (await wv(`/v1/schema/${CLASS}`, 'GET')).ok

const createClass = async () => {
    await wv('/v1/schema', 'POST', {
        class: CLASS,
        vectorizer: 'none',
        properties: [
            { name: 'url', dataType: ['text'] },
            { name: 'title', dataType: ['text'] },
            { name: 'description', dataType: ['text'] },
            { name: 'content', dataType: ['text'] },
            { name: 'category', dataType: ['text'] },
            { name: 'source', dataType: ['text'] },
            { name: 'publishedAt', dataType: ['text'] },
            { name: 'publishedAtTs', dataType: ['int'] },
            { name: 'images', dataType: ['text'] },
        ],
    })
    console.log(`✓ '${CLASS}' sınıfı oluşturuldu`)
}

const dropClass = async () => {
    await wv(`/v1/schema/${CLASS}`, 'DELETE')
}

const upsertBatch = async (docs) => {
    const BATCH = 50
    for (let i = 0; i < docs.length; i += BATCH) {
        const chunk = docs.slice(i, i + BATCH)
        const vectors = await embedBatch(chunk.map((d) => `${d.title}. ${d.description}`))
        const objects = chunk.map((d, idx) => ({
            class: CLASS,
            id: generateUUID(d.url),
            vector: vectors[idx],
            properties: {
                url: d.url,
                title: d.title,
                description: d.description,
                content: d.content,
                category: d.category,
                source: d.source || 'unknown',
                publishedAt: d.publishedAt || '',
                publishedAtTs: d.publishedAtTs || 0,
                images: JSON.stringify(d.images ?? null),
            },
        }))
        const res = await wv('/v1/batch/objects', 'POST', { objects })
        const results = await res.json()
        const failed = (Array.isArray(results) ? results : []).filter((r) => r?.result?.errors)
        if (failed.length) {
            const msg = JSON.stringify(failed[0].result.errors).slice(0, 200)
            throw new Error(`weaviate batch: ${failed.length}/${objects.length} nesne başarısız — ${msg}`)
        }
        console.log(`[+] ${Math.min(i + BATCH, docs.length)}/${docs.length}`)
    }
}

const rebuild = async () => {
    const docs = readDocs()
    console.log(`Embedding: ${EMBED_LABEL} | Weaviate: ${WEAVIATE_URL}/${CLASS}`)
    console.log(`[+] ${docs.length} doküman (sıfırdan kur)`)
    await dropClass()
    await createClass()
    await upsertBatch(docs)
    console.log('\n✓ Yeniden kurma tamamlandı (sınıf sıfırdan kuruldu)')
}

const upsert = async () => {
    const docs = readDocs()
    console.log(`Embedding: ${EMBED_LABEL} | Weaviate: ${WEAVIATE_URL}/${CLASS}`)
    console.log(`[+] ${docs.length} doküman (ekle/güncelle)`)
    if (await classExists()) {
        console.log(`✓ Mevcut '${CLASS}' sınıfına ekleniyor`)
    } else {
        await createClass()
    }
    await upsertBatch(docs)
    console.log('\n✓ Ekleme tamamlandı (mevcut sınıfa upsert)')
}

const clearObjects = async () => {
    console.log(`[+] '${CLASS}' içindeki veriler temizleniyor`)
    await dropClass()
    await createClass()
    console.log('✓ Tüm nesneler temizlendi (sınıf korundu)')
}

const dropCollectionAction = async () => {
    console.log(`[+] '${CLASS}' sınıfı tamamen siliniyor`)
    await dropClass()
    console.log('✓ Sınıf başarıyla silindi.')
}

export const run = async (action) => {
    const ACTIONS = { rebuild, upsert, clear: clearObjects, drop: dropCollectionAction }
    const fn = ACTIONS[action]
    if (!fn) throw new Error(`Geçersiz işlem: '${action}' (rebuild|upsert|clear|drop)`)
    await fn()
}
