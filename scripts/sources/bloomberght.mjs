import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanText, htmlToText } from '../lib/html.mjs'
import { fetchText, mapLimit } from '../lib/http.mjs'
import { buildImageSet } from '../lib/images.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SITEMAP = 'https://www.bloomberght.com/sitemap_google_news.xml'
const DETAY_API = 'https://bbapiv2.ciner.com.tr/api/v1/haber/detay'
const CATEGORY = 'ekonomi'
const TARGET_COUNT = Number(process.env.TARGET_COUNT) || 1000
const CONTENT_CONCURRENCY = Number(process.env.CONTENT_CONCURRENCY) || 8

const idFromUrl = (url) => {
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

const buildDoc = (j, url) => {
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
        category: CATEGORY,
        source: 'bloomberght',
        publishedAt: valid ? d.toISOString() : null,
        publishedAtTs: valid ? d.getTime() : null,
    }
}

const collectIds = (xml) => {
    const items = []
    const seen = new Set()
    const locRegex = /<loc>([\s\S]*?)<\/loc>/g
    let m
    while ((m = locRegex.exec(xml)) !== null) {
        const url = cleanText(m[1])
        const id = idFromUrl(url)
        if (!id || seen.has(id)) continue
        seen.add(id)
        items.push({ id, url })
    }
    return items
}

const main = async () => {
    console.log('[+] BloombergHT sitemap\'inden ID toplanıyor...')
    const xml = await fetchText(SITEMAP, { retry: 0 })
    if (!xml) {
        console.error('[-] Sitemap yüklenemedi')
        process.exit(1)
    }

    let items = collectIds(xml)
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
        const doc = j ? buildDoc(j, it.url) : null
        if (doc) docs.push(doc)
        done++
        if (done % 25 === 0 || done === items.length) console.log(`   ${done}/${items.length}`)
    })

    const dataDir = path.join(__dirname, '..', '..', 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    const target = path.join(dataDir, 'news.json')
    fs.writeFileSync(target, JSON.stringify(docs, null, 2), 'utf-8')

    console.log(`\n[+] API'den alınan: ${docs.length}/${items.length} kayıt kaydedildi: ${target}`)
    console.log(`[+] Kategori: ${CATEGORY} | kaynak: bloomberght`)
}

main().catch((e) => {
    console.error('[-] Hata:', e)
    process.exit(1)
})
