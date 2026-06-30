import { qdrant, COLLECTION } from './lib/qdrant.mjs'

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
