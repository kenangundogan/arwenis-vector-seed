const action = process.argv[2]
const TARGET = (process.argv[3] || process.env.VECTOR_DB || 'qdrant').toLowerCase()

const main = async () => {
    let mod
    try {
        mod = await import(`./targets/${TARGET}.mjs`)
    } catch {
        console.error(`✗ Bilinmeyen VECTOR_DB: '${TARGET}'. Geçerli: qdrant, weaviate`)
        process.exit(1)
    }
    await mod.run(action)
}

main().catch((e) => {
    console.error('\n✗ Hata:', e.message)
    process.exit(1)
})
