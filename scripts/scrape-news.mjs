import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildImageSet } from './lib/images.mjs'
import { cleanText, htmlToText } from './lib/html.mjs'

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

const TARGET_COUNT = Number(process.env.TARGET_COUNT) || 1000
const SKIP_CONTENT = process.env.SKIP_CONTENT === '1'
const CONTENT_CONCURRENCY = Number(process.env.CONTENT_CONCURRENCY) || 8
const UA = 'Mozilla/5.0 (compatible; ArwenisSeed/1.0)'
const DETAY_API = 'https://htapi.haberturk.com/api/v1/haber/detay'

// Haber ID'si URL'in sonunda ya da kategori ekinden önce yer alır
// (".../slug-3895047", ".../slug-3895047-magazin", ".../yazar/3894887-slug-1").
// Yoldaki son 6+ haneli sayıyı ID kabul ederiz. Detay API'si yalnızca www.haberturk.com
// haberlerini sunduğundan diğer alt domain'ler (hthayat, yerel-haberler) atlanır.
const HT_MAIN = /^https?:\/\/www\.haberturk\.com\//i
const idFromUrl = (url) => {
    if (!HT_MAIN.test(url)) return null
    const runs = url.split(/[?#]/)[0].match(/\d{6,}/g)
    return runs ? runs[runs.length - 1] : null
}

// Detay JSON'ından tam gövde: önce extras.meta.fullBodyContent, boşsa foto bloklarının açıklamaları
const extractFullBody = (j) => {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fetchFullContent = async (id, retry = 1) => {
    try {
        const res = await fetch(`${DETAY_API}/${id}`, {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(12000),
        })
        // Geçici hatalarda (rate-limit / sunucu) bir kez yeniden dene
        if (res.status === 429 || res.status >= 500) {
            if (retry > 0) {
                await sleep(500)
                return fetchFullContent(id, retry - 1)
            }
            return null
        }
        if (!res.ok) return null
        const j = await res.json()
        const txt = htmlToText(extractFullBody(j))
        return txt.length >= 50 ? txt : null
    } catch {
        if (retry > 0) {
            await sleep(500)
            return fetchFullContent(id, retry - 1)
        }
        return null
    }
}

const mapLimit = async (items, limit, fn) => {
    let idx = 0
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (idx < items.length) {
            const i = idx++
            await fn(items[i], i)
        }
    })
    await Promise.all(workers)
}

const enrichContent = async (docs) => {
    console.log(`[+] Tam gövde içeriği çekiliyor (detay API, ${CONTENT_CONCURRENCY} paralel)...`)
    let done = 0
    let enriched = 0
    await mapLimit(docs, CONTENT_CONCURRENCY, async (doc) => {
        const id = idFromUrl(doc.url)
        const full = id ? await fetchFullContent(id) : null
        if (full) {
            doc.content = full
            enriched++
        }
        done++
        if (done % 50 === 0 || done === docs.length) console.log(`   içerik: ${done}/${docs.length}`)
    })
    console.log(`[+] Tam gövde alınan: ${enriched}/${docs.length} (kalanı RSS özetine düştü)`)
}

const fetchFeed = async (url) => {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': UA },
        })
        if (!res.ok) {
            console.error(`[-] ${url} yüklenemedi (${res.status})`)
            return ''
        }
        return await res.text()
    } catch (err) {
        console.error(`[-] ${url} isteği başarısız:`, err.message)
        return ''
    }
}

const parseFeed = (xml, category) => {
    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let m
    while ((m = itemRegex.exec(xml)) !== null) {
        const c = m[1]
        const title = cleanText((c.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')
        const link = cleanText((c.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '')
        const text = cleanText((c.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '')
        const pub = cleanText((c.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '')
        const image = cleanText(
            (c.match(/<image>([\s\S]*?)<\/image>/) ||
             c.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
             c.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
             [])[1] || ''
        )
        if (title && link && text) {
            const d = pub ? new Date(pub) : null
            const valid = d && !Number.isNaN(d.getTime())
            items.push({
                title,
                url: link,
                images: buildImageSet(image),
                description: text,
                content: text,
                category,
                source: 'rss',
                publishedAt: valid ? d.toISOString() : null,
                publishedAtTs: valid ? d.getTime() : null,
            })
        }
    }
    return items
}

const main = async () => {
    console.log('[+] RSS beslemeleri çekiliyor (kategori + tarih)...')
    const byUrl = new Map()
    for (const feed of FEEDS) {
        const xml = await fetchFeed(feed.url)
        if (!xml) continue
        const items = parseFeed(xml, feed.category)
        console.log(`   ${feed.category}: ${items.length} haber`)
        for (const it of items) if (!byUrl.has(it.url)) byUrl.set(it.url, it)
    }

    let docs = [...byUrl.values()]
    const withDate = docs.filter((d) => d.publishedAtTs).length
    console.log(`[+] Benzersiz canlı haber: ${docs.length} (tarihli: ${withDate})`)

    if (docs.length > TARGET_COUNT) {
        console.log(`[!] Canlı haber sayısı hedef limiti (${TARGET_COUNT}) aştığı için ilk ${TARGET_COUNT} kayıt alınıyor`)
        docs = docs.slice(0, TARGET_COUNT)
    }

    if (!SKIP_CONTENT) await enrichContent(docs)

    const dataDir = path.join(__dirname, '..', 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    const target = path.join(dataDir, 'news.json')
    fs.writeFileSync(target, JSON.stringify(docs, null, 2), 'utf-8')

    const cats = {}
    for (const d of docs) cats[d.category] = (cats[d.category] || 0) + 1
    console.log(`\n[+] ${docs.length} kayıt kaydedildi: ${target}`)
    console.log('[+] Kategori dağılımı:', JSON.stringify(cats))
}

main().catch((e) => {
    console.error('[-] Hata:', e)
    process.exit(1)
})
