const QDRANT_URL = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/+$/, '')
const QDRANT_KEY = process.env.QDRANT_KEY || 'localkey'
const COLLECTION = process.env.COLLECTION || 'arwenis'

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
    const action = process.argv[2]
    if (action === 'collection') {
        console.log(`[+] Qdrant koleksiyonu tamamen siliniyor: ${COLLECTION}`)
        await qdrant(`/collections/${COLLECTION}`, 'DELETE')
        console.log(`✓ Koleksiyon başarıyla silindi.`)
    } else if (action === 'points') {
        console.log(`[+] Koleksiyon içindeki veriler temizleniyor: ${COLLECTION}`)
        await qdrant(`/collections/${COLLECTION}/points/delete`, 'POST', {
            filter: {}
        })
        console.log(`✓ Koleksiyon içindeki tüm veriler temizlendi.`)
    } else {
        console.error('[-] Geçersiz parametre. Kullanım: node delete-qdrant.mjs <collection|points>')
        process.exit(1)
    }
}

main().catch((e) => {
    console.error('\n✗ Hata:', e.message)
    process.exit(1)
})
