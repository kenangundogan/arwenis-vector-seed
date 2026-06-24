import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FEEDS = [
    { url: 'https://www.haberturk.com/rss/gundem.xml', category: 'gundem' },
    { url: 'https://www.haberturk.com/rss/ekonomi.xml', category: 'ekonomi' },
    { url: 'https://www.haberturk.com/rss/spor.xml', category: 'spor' },
    { url: 'https://www.haberturk.com/rss/teknoloji.xml', category: 'teknoloji' },
    { url: 'https://www.haberturk.com/rss/dunya.xml', category: 'dunya' },
    { url: 'https://www.haberturk.com/rss/saglik.xml', category: 'saglik' },
    { url: 'https://www.haberturk.com/rss/yasam.xml', category: 'yasam' },
    { url: 'https://www.haberturk.com/rss/magazin.xml', category: 'magazin' },
    { url: 'https://www.haberturk.com/rss/kultur-sanat.xml', category: 'kultur-sanat' },
    { url: 'https://www.haberturk.com/rss/otomobil.xml', category: 'otomobil' },
]

const TARGET_COUNT = Number(process.env.TARGET_COUNT) || 400

const cleanText = (text) => {
    if (!text) return ''
    let c = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    c = c
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
        .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    c = c.replace(/<\/?[^>]+(>|$)/g, '')
    return c.trim()
}

const fetchFeed = async (url) => {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArwenisSeed/1.0)' },
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
                image: image,
                text,
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

    const dataDir = path.join(__dirname, 'data')
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
