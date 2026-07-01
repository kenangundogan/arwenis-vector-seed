export const UA = 'Mozilla/5.0 (compatible; ArwenisSeed/1.0)'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const fetchText = async (url, { retry = 1, timeout = 12000 } = {}) => {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeout) })
        if (res.status === 429 || res.status >= 500) {
            if (retry > 0) {
                await sleep(500)
                return fetchText(url, { retry: retry - 1, timeout })
            }
            return null
        }
        if (!res.ok) return null
        return await res.text()
    } catch {
        if (retry > 0) {
            await sleep(500)
            return fetchText(url, { retry: retry - 1, timeout })
        }
        return null
    }
}

export const mapLimit = async (items, limit, fn) => {
    let idx = 0
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (idx < items.length) {
            const i = idx++
            await fn(items[i], i)
        }
    })
    await Promise.all(workers)
}
