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

export const buildImageSet = (build) => {
    if (typeof build !== 'function') return null
    const images = {}
    for (const [ratio, sizes] of Object.entries(RENDITIONS)) {
        images[ratio] = sizes.map(([name, w, h]) => ({ name, w, h, url: build(w, h) }))
    }
    return images
}

export const toSrcsetAttr = (srcset = []) =>
    srcset.filter((s) => s.w).map((s) => `${s.url} ${s.w}w`).join(', ')
