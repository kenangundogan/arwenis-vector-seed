import { decodeHTML } from 'entities'
import { convert } from 'html-to-text'

export const cleanText = (text) => {
    if (!text) return ''
    const s = String(text).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    return decodeHTML(s).replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim()
}

export const htmlToText = (html) => {
    if (!html) return ''
    return convert(String(html), {
        wordwrap: false,
        selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
        ],
    }).trim()
}
