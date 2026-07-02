# Arwenis Vektör DB Besleme Aracı

Arwenis RAG asistanının bilgi tabanını besleyen bağımsız veri aracı:
**kaynaktan veri üret → embedding → vektör veritabanına yükle.**

Arwenis ürünü veri kaynağından ve vektör DB sağlayıcısından bağımsızdır; yalnızca panelde tanımlı vektör DB'yi sorgular. Verinin nereden çekileceği, nasıl temizleneceği ve nasıl yükleneceği projeye özel olduğundan bu araç ayrı bir repo olarak tutulur.

## Genel Bakış

```
KAYNAKLAR (sources/)                                 HEDEFLER (targets/)
  scrape:haberturk    ┐                                 ┌ Qdrant
  scrape:bloomberght  ├─→ data/news.json ─(embedding)─→ ┤          (Docker, self-host)
  generate:synthetic  ┘   title, description,           └ Weaviate
                          content, images, ...
```

- **Üretim:** Gerçek kaynaklar beslemeden (RSS/sitemap) yalnızca haber ID'lerini keşfeder; başlık, özet, gövde, görsel ve tarih dahil tüm alanları kaynağın detay API'sinden alır. `synthetic` gerçek kaynak yerine yapay haber üretir. Çıktı her zaman `data/news.json`'dır.
- **Yükleme:** `news.json` embedding'lenip seçilen vektör DB backend'ine yazılır. İki yazma modu vardır: **rebuild** (sıfırla + kur) ve **upsert** (silmeden ekle/güncelle).

## Mimari

| Katman | Sorumluluk |
| --- | --- |
| `scripts/sources/*` | Her dosya bir kaynak; veriyi üretip `data/news.json`'a yazar |
| `scripts/targets/*` | Her dosya bir vektör DB backend'i; aynı `rebuild \| upsert \| clear \| drop` arayüzü |
| `scripts/lib/*` | Kaynak/backend bağımsız yardımcılar (embedding, HTTP, HTML temizleme, görsel seti) |
| `scripts/db.mjs` | Backend dağıtıcısı (argüman ya da `VECTOR_DB`) |

## Gereksinimler

- **Node.js ≥ 20.6** (yerleşik `--env-file` desteği için)
- **Docker** (vektör DB'leri yerelde çalıştırmak için)
- **Ollama** ya da OpenAI uyumlu bir embedding servisi

## Kurulum

**1. Bağımlılıklar**

```bash
npm install
```

Çalışma-zamanı bağımlılıkları yalnızca metin/HTML temizleme içindir: `entities` (HTML entity çözme) ve `html-to-text` (gövdeyi düz metne çevirme).

**2. Yapılandırma**

```bash
cp .env.example .env   # gerekirse düzenleyin
```

**3. Vektör DB'yi başlat (Docker)**

Yalnızca kullanacağınız backend'i başlatın:

```bash
docker compose -f docker/docker-compose.yml up -d qdrant
# ya da
docker compose -f docker/docker-compose.yml up -d weaviate
```

- Qdrant paneli: <http://localhost:6333/dashboard>
- Weaviate'in gömülü paneli yoktur; durumu REST'ten görebilirsiniz: hazır → <http://localhost:8080/v1/.well-known/ready>, sürüm → `/v1/meta`, şema → `/v1/schema/Arwenis`. (Harici arayüz: <https://console.weaviate.cloud> yerel instance'a bağlanabilir.)

**4. Embedding modeli**

```bash
ollama pull nomic-embed-text
```

## Kullanım

İki adım: önce veri üret, sonra DB'ye yaz.

```bash
# 1) Veri üret → data/news.json (dosyayı baştan yazar)
npm run scrape:haberturk
npm run scrape:bloomberght
npm run generate:synthetic

# 2) data/news.json'ı hedef DB'ye yaz (backend komut adında)
npm run db:rebuild:qdrant      # sıfırla + kur (tam yenileme)
npm run db:upsert:qdrant       # silmeden ekle/güncelle (biriktir)
npm run db:rebuild:weaviate
npm run db:upsert:weaviate

# Bakım
npm run db:clear:qdrant        # veriyi siler (koleksiyon/sınıf kalır)
npm run db:drop:qdrant         # koleksiyonu/sınıfı tümüyle siler
npm run db:clear:weaviate
npm run db:drop:weaviate
```

Her komut tek iş yapar; "üret + yaz" için zincirleyin (cron için ideal):

```bash
# Tam yenileme
npm run scrape:haberturk && npm run db:rebuild:qdrant

# Günlük/saatlik biriktirme (crontab örneği)
0 * * * * cd /proje/yolu && npm run scrape:haberturk && npm run db:upsert:qdrant
```

**Yazma modları:** `rebuild` hedefi her seferinde sıfırlar (tam yenileme); `upsert` silmeden yazar. Nokta ID'leri haber URL'sinden deterministik üretildiğinden aynı haber tekrar geldiğinde güncellenir (duplicate olmaz), yenisi eklenir — böylece farklı kaynakları ve farklı günleri biriktirebilirsiniz.

## Veri Şeması

Vektör DB'ye yazılan payload:

```jsonc
{
  "id": "c6218d6e-...-53900a0b2d6a", // haber URL'sinden üretilen deterministik UUID
  "title": "Haber Başlığı",
  "url": "Haber Linki",
  "description": "Kısa özet (embedding girdisi: title + description)",
  "content": "Tam gövde (görüntüleme için)",
  "category": "kategori",
  "source": "haberturk | bloomberght | synthetic",
  "publishedAt": "2026-06-24T10:00:00.000Z",
  "publishedAtTs": 1782298910940,
  "images": {                        // responsive görsel seti (yoksa null)
    "16x9": [ { "name": "xs", "w": 320, "h": 180, "url": ".../320x180" } /* … 1920 */ ],
    "1x1":  [ /* 200 … 1280 */ ]
  }
}
```

- `description` embedding ve arama için kısa alan; `content` görüntüleme için tam gövde.
- `images`: her oran, küçükten büyüğe sıralı `{ name, w, h, url }` varyantlarından oluşur. Frontend doğrudan `<img srcset>` / `<picture>`'a map'ler; tek görsel için `images["16x9"].at(-1)`. Alt metin için `title` kullanılır.
- `category` ve `source` için backend üzerinde keyword indeksi oluşturulur.

**Backend farkı:** Qdrant `images`'ı iç içe nesne olarak saklar. Weaviate'te oran anahtarları (`16x9`/`1x1`) rakamla başladığından yerel nesne olamaz; `images` **JSON string** olarak tutulur (tüketici `JSON.parse` eder). Diğer alanlar iki backend'de de aynıdır.

> Arwenis panelindeki arama ayarları bu şemayla uyumlu olmalıdır: `textKey` → `description`, ayrıca `categoryKey` / `dateKey` vb.

## Yapılandırma

`.env` üzerinden kontrol edilen değişkenler:

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `VECTOR_DB` | `qdrant` | Backend komuta verilmediğinde kullanılan varsayılan hedef (`qdrant` \| `weaviate`) |
| `COLLECTION` | `arwenis` | Koleksiyon/sınıf adı (Weaviate'te ilk harf büyütülür) |
| `QDRANT_URL` | `http://127.0.0.1:6333` | Qdrant erişim adresi |
| `QDRANT_KEY` | `localkey` | Qdrant API anahtarı |
| `WEAVIATE_URL` | `http://127.0.0.1:8080` | Weaviate erişim adresi |
| `WEAVIATE_KEY` | *(boş)* | Weaviate API anahtarı (anonim erişimde boş) |
| `EMBED_BASE_URL` | `http://localhost:11434/v1` | Embedding API adresi (Ollama veya OpenAI uyumlu) |
| `EMBED_KEY` | `ollama` | Embedding API anahtarı |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding modeli |
| `TARGET_COUNT` | `1000` | Üretilecek/alınacak toplam kayıt üst sınırı |
| `CONTENT_CONCURRENCY` | `8` | Detay API'sinden içerik çekilirken eşzamanlı istek sayısı |

### Embedding servisi alternatifleri

Çok dilli **BGE-M3** (Ollama):

```env
EMBED_BASE_URL=http://localhost:11434/v1
EMBED_KEY=ollama
EMBED_MODEL=bge-m3
```

**OpenAI**:

```env
EMBED_BASE_URL=https://api.openai.com/v1
EMBED_KEY=sk-...
EMBED_MODEL=text-embedding-3-small
```

> **Önemli:** Yükleme sırasında kullanılan embedding modeli ile Arwenis panelinde sorgulama sırasında tanımlı model birebir aynı olmalıdır; aksi halde vektör boyutları uyuşmaz ve arama sonuç vermez.

## Proje Yapısı

```
scripts/
  sources/            # veri üreten kaynaklar
    haberturk.mjs
    bloomberght.mjs
    synthetic.mjs
  targets/            # vektör DB backend'leri (aynı arayüz)
    qdrant.mjs
    weaviate.mjs
  lib/                # kaynak/backend bağımsız yardımcılar
    embed.mjs         # embedding istemcisi
    http.mjs          # retry'li fetch + eşzamanlılık havuzu
    html.mjs          # metin/HTML temizleme
    images.mjs        # responsive görsel seti üreteci
  db.mjs              # backend dağıtıcısı
data/
  news.json           # üretilen veri (gitignore)
docker/
  docker-compose.yml  # Qdrant + Weaviate (self-host)
.env.example
```

## Genişletme

- **Yeni kaynak:** `scripts/sources/<ad>.mjs` ekleyin; beslemeden ID keşfedip alanları API'den doldursun ve `data/news.json`'a yazsın. `package.json`'a `scrape:<ad>` komutu ekleyin.
- **Yeni backend:** `scripts/targets/<ad>.mjs` ekleyip `run(action)` dışa aktarın (`rebuild | upsert | clear | drop`). `package.json`'a `db:<action>:<ad>` komutlarını ekleyin; `db.mjs` `VECTOR_DB=<ad>` ile otomatik bulur.
