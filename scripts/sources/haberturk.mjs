import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanText, htmlToText } from '../lib/html.mjs'
import { fetchText, mapLimit } from '../lib/http.mjs'
import { buildImageSet } from '../lib/images.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FEEDS = [
    { url: 'https://www.haberturk.com/rss/manset.xml', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss/ekonomi.xml', category: 'ekonomi' },
    { url: 'https://www.haberturk.com/rss/spor.xml', category: 'spor' },
    { url: 'https://www.haberturk.com/rss/magazin.xml', category: 'magazin' },
    { url: 'https://www.haberturk.com/rss/kategori/medya.xml', category: 'magazin' },
    { url: 'https://www.haberturk.com/rss/kategori/kadin.xml', category: 'yasam' },
    { url: 'https://www.haberturk.com/rss/kategori/siyaset.xml', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss/kategori/tatil.xml', category: 'turizm' },
    { url: 'https://www.haberturk.com/rss/kategori/is-yasam.xml', category: 'ekonomi' },
    { url: 'https://www.haberturk.com/rss/kategori/astroloji.xml', category: 'astroloji' },
    { url: 'https://www.haberturk.com/rss/kategori/saglik.xml', category: 'saglik' },
    { url: 'https://www.haberturk.com/rss/kategori/dunya.xml', category: 'dunya' },
    { url: 'https://www.haberturk.com/rss/kategori/yasam.xml', category: 'yasam' },
    { url: 'https://www.haberturk.com/rss/kategori/gida.xml', category: 'yemek' },
    { url: 'https://www.haberturk.com/rss/kategori/gundem.xml', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss/kategori/kultur-sanat.xml', category: 'kultur-sanat' },
    { url: 'https://www.haberturk.com/rss/kategori/sinema.xml', category: 'sinema-dizi' },
    { url: 'https://www.haberturk.com/rss/kategori/teknoloji.xml', category: 'teknoloji' },
    { url: 'https://www.haberturk.com/rss/kategori/otomobil.xml', category: 'otomobil' },
    { url: 'https://www.haberturk.com/rss/kategori/kitap.xml', category: 'kultur-sanat' },
    { url: 'https://www.haberturk.com/rss/kategori/video.xml', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss/kategori/yazarlar.xml', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss/yerel-haberler.xml', category: 'gundem' }
]

const DETAY_API = 'https://htapi.haberturk.com/api/v1/haber/detay'
const HT_MAIN = /^https?:\/\/www\.haberturk\.com\//i
const TARGET_COUNT = Number(process.env.TARGET_COUNT) || 1000
const CONTENT_CONCURRENCY = Number(process.env.CONTENT_CONCURRENCY) || 8

const idFromUrl = (url) => {
    if (!HT_MAIN.test(url)) return null
    const runs = url.split(/[?#]/)[0].match(/\d{6,}/g)
    return runs ? runs[runs.length - 1] : null
}

const fetchDetail = async (id) => {
    const txt = await fetchText(`${DETAY_API}/${id}`)
    if (!txt) return null
    try {
        return JSON.parse(txt)
    } catch {
        return null
    }
}

const bodyText = (j) => {
    const meta = j?.extras?.meta || {}
    const fbc = typeof meta.fullBodyContent === 'string' ? meta.fullBodyContent : ''
    if (fbc.replace(/<[^>]+>/g, '').trim().length >= 50) return fbc
    const items = j?.body?.items
    if (Array.isArray(items)) {
        const parts = items.filter((it) => it && it.type === 'photo').map((it) => it.description).filter(Boolean)
        if (parts.length) return parts.join('\n')
    }
    return ''
}

const buildDoc = (j, url, category) => {
    const t = j?.extras?.meta?.title
    const title = cleanText((typeof t === 'object' ? t?.base : t) || j?.body?.title || '')
    if (!title) return null
    const desc = j?.extras?.meta?.description
    const description = cleanText(typeof desc === 'string' ? desc : desc?.base || '') || title
    const content = htmlToText(bodyText(j)) || description
    const imageBase = j?.body?.image?.imageUrlBase || ''
    const images = imageBase ? buildImageSet((w, h) => `${imageBase}${w}x${h}`) : null
    const iso = j?.extras?.date?.items?.isoPublished?.value || null
    const d = iso ? new Date(iso) : null
    const valid = d && !Number.isNaN(d.getTime())
    return {
        title,
        url,
        images,
        description,
        content,
        category,
        source: 'haberturk',
        publishedAt: valid ? d.toISOString() : null,
        publishedAtTs: valid ? d.getTime() : null,
    }
}

const fetchFeed = async (url) => {
    const xml = await fetchText(url, { retry: 0 })
    if (!xml) console.error(`[-] ${url} yüklenemedi`)
    return xml || ''
}

const collectIds = async () => {
    const byId = new Map()
    for (const feed of FEEDS) {
        const xml = await fetchFeed(feed.url)
        if (!xml) continue
        let count = 0
        const linkRegex = /<link>([\s\S]*?)<\/link>/g
        let m
        while ((m = linkRegex.exec(xml)) !== null) {
            const url = cleanText(m[1])
            const id = idFromUrl(url)
            if (!id || byId.has(id)) continue
            byId.set(id, { id, url, category: feed.category })
            count++
        }
        console.log(`   ${feed.category}: ${count} yeni`)
    }
    return [...byId.values()]
}

const main = async () => {
    console.log('[+] Habertürk RSS beslemelerinden ID toplanıyor...')
    let items = await collectIds()
    console.log(`[+] Benzersiz haber ID: ${items.length}`)
    if (items.length > TARGET_COUNT) {
        console.log(`[!] Hedef limiti (${TARGET_COUNT}) aşıldığı için ilk ${TARGET_COUNT} ID alınıyor`)
        items = items.slice(0, TARGET_COUNT)
    }

    console.log(`[+] Detay API'den içerik çekiliyor (${CONTENT_CONCURRENCY} paralel)...`)
    const docs = []
    let done = 0
    await mapLimit(items, CONTENT_CONCURRENCY, async (it) => {
        const j = await fetchDetail(it.id)
        const doc = j ? buildDoc(j, it.url, it.category) : null
        if (doc) docs.push(doc)
        done++
        if (done % 50 === 0 || done === items.length) console.log(`   ${done}/${items.length}`)
    })

    const dataDir = path.join(__dirname, '..', '..', 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    const target = path.join(dataDir, 'news.json')
    fs.writeFileSync(target, JSON.stringify(docs, null, 2), 'utf-8')

    const cats = {}
    for (const d of docs) cats[d.category] = (cats[d.category] || 0) + 1
    console.log(`\n[+] API'den alınan: ${docs.length}/${items.length} kayıt kaydedildi: ${target}`)
    console.log('[+] Kategori dağılımı:', JSON.stringify(cats))
}

main().catch((e) => {
    console.error('[-] Hata:', e)
    process.exit(1)
})
