// Aksan adı -> birleştirici Unicode işareti. &ouml; = o+uml -> "ö", &acirc; = a+circ -> "â".
// Tek kuralla tüm aksanlı Latin harfleri (Türkçe kâğıt/hâlâ dahil) kapsar.
const ACCENT_MARKS = {
    grave: '̀', acute: '́', circ: '̂', tilde: '̃',
    macr: '̄', breve: '̆', ring: '̊', uml: '̈',
    caron: '̌', cedil: '̧',
}

// Aksan olmayan yapısal/sembolik adlandırılmış entity'ler.
const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
    rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„',
    hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›',
    bull: '•', middot: '·', deg: '°', sect: '§', para: '¶', dagger: '†', Dagger: '‡',
    euro: '€', pound: '£', cent: '¢', yen: '¥', copy: '©', reg: '®', trade: '™',
    times: '×', divide: '÷', plusmn: '±', frac12: '½', frac14: '¼', frac34: '¾',
    sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', szlig: 'ß',
    aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø', eth: 'ð', thorn: 'þ',
    rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔',
}

// HTML entity'lerini çözer: numerik (ondalık/onaltılık), aksanlı Latin harfler ve
// yukarıdaki sembol tablosu. Tanınmayan adlandırılmış entity'ler temizlenir.
export const decodeEntities = (s) =>
    String(s)
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
        .replace(/&([a-zA-Z])(grave|acute|circ|tilde|macr|breve|ring|uml|caron|cedil);/g,
            (_, base, acc) => (base + ACCENT_MARKS[acc]).normalize('NFC'))
        .replace(/&([a-zA-Z]+);/g, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : ''))

// Kısa metin alanları (başlık, özet, URL) için: CDATA + entity çöz, etiketleri sök, boşlukları sadeleştir.
export const cleanText = (text) => {
    if (!text) return ''
    let c = String(text).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    c = decodeEntities(c)
    c = c.replace(/<\/?[^>]+(>|$)/g, '')
    return c.replace(/\s+/g, ' ').trim()
}

// Uzun HTML gövdeler için: blok etiketlerini satır sonuna çevirir, paragraf yapısını korur.
export const htmlToText = (html) => {
    let s = String(html || '')
    s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    s = s.replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    s = s.replace(/<br\s*\/?>/gi, '\n')
    s = s.replace(/<[^>]+>/g, ' ')
    s = decodeEntities(s)
    return s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
