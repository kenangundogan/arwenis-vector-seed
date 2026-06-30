export const RENDITIONS = {
    '1x1': [
        ['xxs', 200, 200],
        ['xs', 320, 320],
        ['small', 400, 400],
        ['medium', 640, 640],
        ['large', 960, 960],
        ['xlarge', 1280, 1280],
    ],
    '16x9': [
        ['xxs', 200, 113],
        ['xs', 320, 180],
        ['small', 400, 225],
        ['medium', 640, 360],
        ['large', 960, 540],
        ['xlarge', 1280, 720],
        ['xxlarge', 1920, 1080],
    ],
}

const HABERTURK_RE = /^(https?:\/\/im\.haberturk\.com\/.+\/jpg)\/\d+x\d+/i

const hostOf = (u) => {
    try {
        return new URL(u).hostname.toLowerCase()
    } catch {
        return ''
    }
}
const isUnsplash = (u) => hostOf(u) === 'images.unsplash.com'

const buildUnsplashUrl = (rawUrl, w, h) => {
    const u = new URL(rawUrl)
    u.searchParams.set('auto', 'format')
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('w', String(w))
    u.searchParams.set('h', String(h))
    u.searchParams.set('q', '80')
    return u.toString()
}

const resolveBuilder = (rawUrl) => {
    if (!rawUrl) return null
    const ht = rawUrl.match(HABERTURK_RE)
    if (ht) {
        const base = ht[1]
        return (w, h) => `${base}/${w}x${h}`
    }
    if (isUnsplash(rawUrl)) {
        return (w, h) => buildUnsplashUrl(rawUrl, w, h)
    }
    return null
}

const rawRatios = (rawUrl) => {
    const one = [{ name: 'original', w: null, h: null, url: rawUrl }]
    return { '16x9': one, '1x1': one }
}

export const buildImageSet = (rawUrl) => {
    if (!rawUrl) return null

    const build = resolveBuilder(rawUrl)
    if (!build) return rawRatios(rawUrl)

    const images = {}
    for (const [ratio, sizes] of Object.entries(RENDITIONS)) {
        images[ratio] = sizes.map(([name, w, h]) => ({ name, w, h, url: build(w, h) }))
    }

    return images
}

export const toSrcsetAttr = (srcset = []) =>
    srcset.filter((s) => s.w).map((s) => `${s.url} ${s.w}w`).join(', ')
