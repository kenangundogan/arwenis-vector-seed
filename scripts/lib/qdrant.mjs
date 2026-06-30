export const QDRANT_URL = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/+$/, '')
export const QDRANT_KEY = process.env.QDRANT_KEY || 'localkey'
export const COLLECTION = process.env.COLLECTION || 'arwenis'

// Qdrant REST çağrısı. 404 hata sayılmaz (silme/var-yok kontrolleri için).
export const qdrant = async (path, method, body) => {
    const res = await fetch(`${QDRANT_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_KEY },
        body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok && res.status !== 404) {
        throw new Error(`qdrant ${method} ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    return res
}
