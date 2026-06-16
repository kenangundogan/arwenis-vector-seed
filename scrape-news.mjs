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
    { url: 'https://www.haberturk.com/rss/turizm.xml', category: 'turizm' },
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
        if (title && link && text) {
            const d = pub ? new Date(pub) : null
            const valid = d && !Number.isNaN(d.getTime())
            items.push({
                title,
                url: link,
                text,
                category,
                publishedAt: valid ? d.toISOString() : null,
                publishedAtTs: valid ? d.getTime() : null,
            })
        }
    }
    return items
}

const SUBJECTS = [
    { category: 'ekonomi', title: 'Merkez Bankası faiz kararını açıkladı', text: 'Merkez Bankası Para Politikası Kurulu, enflasyon beklentilerini değerlendirerek politika faizini sabit tuttu; sıkı duruşun süreceği mesajı verildi.' },
    { category: 'gundem', title: 'İstanbul’da trafik yoğunluğu zirvede', text: 'Hafta sonu öncesi İstanbul ana arterlerinde trafik yoğunluğu yüzde 80’i aştı; ekipler kilit noktalarda kontrolleri artırdı.' },
    { category: 'teknoloji', title: 'Yeni nesil elektrikli araçlar pazarda', text: 'Önde gelen markalar uzun menzilli elektrikli modellerini Türkiye’de satışa sundu; ilginin beklentilerin üzerinde olduğu belirtildi.' },
    { category: 'spor', title: 'Süper Lig transfer dönemi hareketli', text: 'Süper Lig devleri kadrolarını güçlendirmek için görüşmeleri sürdürüyor; takımların mali dengeyi koruma isteği öne çıkıyor.' },
    { category: 'saglik', title: 'Uzmanlar düzenli uykunun önemini vurguladı', text: 'Hekimler günde 7-8 saat kaliteli uykunun bağışıklığı güçlendirdiğini ve kronik hastalıklara karşı koruyucu olduğunu belirtti.' },
    { category: 'dunya', title: 'Avrupa’da sıcak hava dalgası alarmı', text: 'Güney Avrupa’da mevsim normalleri üzerindeki sıcaklar nedeniyle kırmızı alarm verildi; orman yangını tedbirleri artırıldı.' },
    { category: 'magazin', title: 'Ünlü sanatçının konseri kapalı gişe', text: 'Sevilen sanatçının açık hava konseri biletleri günler öncesinden tükendi; eski ve yeni şarkılar hep bir ağızdan söylendi.' },
    { category: 'kultur-sanat', title: 'İstanbul Film Festivali başlıyor', text: 'Prestijli film festivalinde yerli ve yabancı yüzlerce yapım izleyiciyle buluşacak; biletlere yoğun ilgi var.' },
    { category: 'yasam', title: 'Karadeniz yaylaları turist akınına uğradı', text: 'Yaz sıcağından kaçan turistler Rize ve Trabzon yaylalarında kamp kurarak doğanın tadını çıkarıyor.' },
    { category: 'turizm', title: 'Ege kıyılarında sezon erken açıldı', text: 'Sıcak havayla birlikte Ege otelleri doluluk oranlarını artırdı; erken rezervasyon kampanyaları ilgi gördü.' },
    { category: 'otomobil', title: 'Yerli otomobilde yeni donanım paketi', text: 'Yerli üretici, modeline gelişmiş sürüş destek sistemleri ve yeni batarya seçeneği ekledi; teslimatların hızlanması bekleniyor.' },
]

const makeSynthetic = (count, startId) => {
    const out = []
    for (let i = 0; i < count; i++) {
        const s = SUBJECTS[i % SUBJECTS.length]
        const id = startId + i
        const ageMs = Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        const d = new Date(Date.now() - ageMs)
        out.push({
            title: `${s.title} (${i + 1})`,
            url: `https://www.haberturk.com/${s.category}/${s.category}-gelismeler-${id}`,
            text: `${s.text} Konuya ilişkin gelişmeleri aktarmaya devam edeceğiz.`,
            category: s.category,
            publishedAt: d.toISOString(),
            publishedAtTs: d.getTime(),
        })
    }
    return out
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

    if (docs.length < TARGET_COUNT) {
        const need = TARGET_COUNT - docs.length
        console.log(`[!] Hedefe (${TARGET_COUNT}) ulaşmak için ${need} sentetik kayıt (kategori+tarihli) ekleniyor`)
        docs.push(...makeSynthetic(need, 900000))
    }
    docs = docs.slice(0, TARGET_COUNT)

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
