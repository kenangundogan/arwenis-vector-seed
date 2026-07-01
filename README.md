# Arwenis Vektör Veritabanı Besleme Aracı

Bu proje, Arwenis RAG (Retrieval-Augmented Generation) asistanının bilgi tabanını beslemek amacıyla geliştirilmiş bağımsız bir veri işleme ve yükleme aracıdır (veri kazıma/sentetik veri üretimi -> embedding oluşturma -> vektör veritabanına yükleme).

## Genel Bakış ve Mimarideki Yeri

Arwenis ürünü (CMS ve RAG asistanı), veri kaynağı ve vektör veritabanı sağlayıcılarından bağımsız bir mimariye sahiptir. Yalnızca CMS paneli üzerinden tanımlanan vektör veritabanı adresini ve koleksiyonunu sorgular.

Verilerin hangi kaynaklardan çekileceği, nasıl temizleneceği, hangi kategorilere ayrılacağı ve vektör veritabanına nasıl yükleneceği müşteriye ve projeye özel senaryolardır. Bu nedenle, vektör veritabanını besleyen bu araç ana Arwenis projesinden ayrı bir repo olarak konumlandırılmıştır.

## Kullanılan Teknolojiler

Projede kullanılan temel altyapılar ve görevleri aşağıda açıklanmıştır:

* **Docker:** Uygulama ve veritabanlarının işletim sisteminden bağımsız, izole bir konteyner içerisinde çalıştırılmasını sağlar. Bu projede vektör veritabanı olan Qdrant'ı yerel bilgisayarınızda kurmak ve çalıştırmak için kullanılır.
* **Qdrant:** Yüksek performanslı bir vektör veritabanıdır. Metinlerin anlamsal matematiksel karşılıklarını (embedding) saklar ve bunlar üzerinde hızlı semantik arama yapılmasına imkan tanır.
* **Ollama:** Büyük dil modellerini ve embedding modellerini yerel bilgisayarınızda çalıştırmanızı sağlayan araçtır. Projede metinleri vektör verilerine dönüştürmek için varsayılan olarak Ollama üzerindeki nomic-embed-text modeli kullanılmaktadır.

## Proje Klasör Yapısı

* scripts/sources/ - Veri üreten kaynaklar (her dosya bir kaynak). Gerçek kaynaklar beslemeden (RSS/sitemap) yalnızca haber ID'lerini keşfeder; başlık, özet, gövde, görsel ve tarih dahil tüm alanları kaynağın detay API'sinden alıp normalize eder. synthetic.mjs ise gerçek kaynak yerine 18 kategoride paragraflı Türkçe yapay haber üretir. Çıktı her zaman data/news.json'dır (her kaynak dosyayı baştan yazar). Yeni kaynaklar buraya eklenir.
* scripts/targets/ - Verinin yazıldığı vektör DB'ler (her dosya bir backend). qdrant.mjs: `node scripts/targets/qdrant.mjs <rebuild|upsert|clear|drop>` — rebuild (koleksiyonu silip sıfırdan kurar), upsert (silmeden ekler/günceller), clear (noktaları siler), drop (koleksiyonu siler). Yeni backend'ler (ör. pinecone) buraya eklenir.
* scripts/lib/ - Kaynak/backend bağımsız jenerik yardımcılar: images.mjs (oran/boyut katalogu + responsive set üreteci; CDN'e özel URL kurma her kaynağın kendi içindedir), html.mjs (metin/HTML temizleme), embed.mjs (embedding istemcisi), http.mjs (retry'li fetch + eşzamanlılık havuzu). Her kaynak kendi API çıkarımını ve görsel URL mantığını kendi dosyasında tutar.
* .env.example - Projenin ihtiyaç duyduğu çevre değişkenleri için şablon dosyasıdır.

## Sistem Gereksinimleri ve Kurulum

### Node.js Kurulumu
Node.js v20.6.0 veya daha yeni bir sürüm gereklidir (`--env-file` desteği için). Bağımlılıkları kurmak için proje kökünde `npm install` çalıştırın. Çalışma-zamanı bağımlılıkları metin/HTML temizlemede kullanılan `entities` (HTML entity çözme) ve `html-to-text` (gövde HTML'ini düz metne çevirme) paketleridir.

### Qdrant Kurulumu
Yerel geliştirme ortamında Docker kullanarak Qdrant veritabanını başlatmak için aşağıdaki komutu çalıştırabilirsiniz:

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```

Kurulum sonrasında Qdrant yönetim paneline tarayıcınızdan http://localhost:6333/dashboard adresiyle erişebilirsiniz.

### Ollama Kurulumu
Ollama'yı resmi web sitesi olan ollama.com adresinden indirebilir veya macOS kullanıyorsanız Homebrew ile kurabilirsiniz:

```bash
brew install ollama
```

Kurulum tamamlandıktan sonra, metinleri vektörleştirmek için kullanılacak varsayılan modeli indirmek için aşağıdaki komutu çalıştırın:

```bash
ollama pull nomic-embed-text
```

## Veri Şeması

Qdrant veritabanına yüklenen verilerin payload yapısı şu şekildedir:

```json
{
  "id": "c6218d6e-f783-3a1e-b8d4-53900a0b2d6a",
  "title": "Haber Başlığı",
  "url": "Haber Linki",
  "description": "Haber Özet Metni (embedding ve arama için kullanılan kısa alan)",
  "content": "Haber Gövdesi (görüntüleme için tam metin)",
  "category": "kategori",
  "source": "haberturk | bloomberght | synthetic",
  "publishedAt": "ISO Tarih Formatı (Örn: 2026-06-24T...)",
  "publishedAtTs": 1782298910940,
  "images": {
    "16x9": [
      { "name": "xs", "w": 320, "h": 180, "url": ".../320x180" }
      // ... small, medium, large, xlarge, xxlarge
    ],
    "1x1": [ /* 200..1280 */ ]
  }
}
```

Gerçek kaynaklarda besleme (RSS/sitemap) yalnızca haber ID'lerini keşfeder; `title`, `description`, `content`, `images` ve tarih dahil tüm alanlar kaynağın detay API'sinden o kaynağın kendi dosyasında normalize edilir. `description` kısa özettir (embedding girdisi: `title + description`), `content` görüntüleme için tam gövdedir. Kategori kaynağa göre belirlenir (beslemedeki bölüm eşlemesi ya da sabit bir değer). Detay API'sinden alınamayan haberler atlanır.

> Not: Arwenis panelindeki `textKey` ayarı bu alanı işaret etmelidir (`description`).

`images` alanı **ingest anında türetilir**: kaynağın görsel CDN'i URL üzerinden anlık boyutlandırma yaptığından, her kaynak kendi CDN'ine uygun bir `(w, h) => url` üreteci verir; `scripts/lib/images.mjs` içindeki jenerik `buildImageSet` bu üreteçle oran/boyut katalogunu doldurur. Her oran, `{ name, w, h, url }` varyantlarından oluşan bir dizidir. Frontend bunu doğrudan `<img srcset>` / `<picture>` yapısına map'leyebilir (örn. `toSrcsetAttr(images['16x9'])`); tek görsel gerektiğinde en büyüğü için `images['16x9'].at(-1)` veya isimle `images['16x9'].find(v => v.name === 'large')` kullanılır. Görsel alt metni için kaydın `title` alanı kullanılır. Görsel yoksa `images` `null` olur.

Bu şema, Arwenis panelinde tanımlanan arama ayarlarıyla (textKey, categoryKey, dateKey vb.) doğrudan uyumlu olmalıdır. Ayrıca `category` ve `source` alanları için Qdrant üzerinde otomatik olarak keyword payload indeksleri oluşturulmaktadır.

## Kullanım Kılavuzu

1. Bağımlılıkları kurun:

```bash
npm install
```

2. Çevre değişkenleri şablonunu kopyalayarak kendi yapılandırma dosyanızı oluşturun:

```bash
cp .env.example .env
```

3. .env dosyası içerisindeki bağlantı adreslerini ve model bilgilerini kendi ortamınıza göre güncelleyin.

4. Projeyi çalıştırmak için aşağıdaki npm komutlarını kullanabilirsiniz:

```bash
# 1) Kaynaktan veri üret → data/news.json (dosyayı baştan yazar)
npm run scrape:haberturk
npm run scrape:bloomberght
npm run generate:synthetic

# 2) data/news.json'ı Qdrant'a yaz
npm run db:rebuild    # koleksiyonu SİLER + sıfırdan kurar (tam yenileme)
npm run db:upsert     # koleksiyona DOKUNMADAN ekler/günceller (biriktirme)

# Bakım
npm run db:clear      # koleksiyon yapısını bozmadan tüm noktaları siler
npm run db:drop       # koleksiyonu tümüyle siler
```

Her komut tek iş yapar; "üret + yaz" için iki komutu zincirleyin:

```bash
# Tam yenileme (temizle + kur)
npm run scrape:haberturk && npm run db:rebuild

# Güncel ekle (biriktir) — günlük/cron için
npm run scrape:haberturk && npm run db:upsert
```

> Qdrant'ta iki yazma modu vardır: **`db:rebuild`** koleksiyonu her seferinde **sıfırlar** (tam yenileme); **`db:upsert`** **silmeden** yazar, böylece farklı kaynakları ve farklı günleri **biriktirebilirsiniz**. Nokta ID'leri haber URL'sinden deterministik üretildiğinden aynı haber tekrar geldiğinde güncellenir (duplicate olmaz), yeni haber eklenir.

> Günlük/saatlik güncelleme için zincirlenmiş komutu bir zamanlayıcıya bağlayın, örn. cron: `0 * * * * cd /proje/yolu && npm run scrape:haberturk && npm run db:upsert`.

## Çevre Değişkenleri

Aşağıdaki değişkenler .env dosyası üzerinden kontrol edilir:

| Değişken | Varsayılan Değer | Açıklama |
| --- | --- | --- |
| QDRANT_URL | http://127.0.0.1:6333 | Qdrant veritabanı erişim adresi |
| QDRANT_KEY | localkey | Qdrant erişim anahtarı (API Key) |
| COLLECTION | arwenis | Qdrant koleksiyon adı (Arwenis paneliyle aynı olmalıdır) |
| EMBED_BASE_URL | http://localhost:11434/v1 | Embedding API erişim adresi (Ollama veya OpenAI) |
| EMBED_KEY | ollama | Embedding API anahtarı |
| EMBED_MODEL | nomic-embed-text | Vektör dönüştürmede kullanılan model adı |
| TARGET_COUNT | 1000 | Sentetik üretimde hedeflenen / gerçek kaynakta üst sınır olan toplam kayıt sayısı |
| CONTENT_CONCURRENCY | 8 | Detay API'sinden içerik çekilirken eşzamanlı istek sayısı |

### Embedding Modeli Alternatifleri ve Yapılandırma

Projeyi yerel modeller yerine harici servisler veya farklı modellerle çalıştırmak isterseniz .env dosyasını aşağıdaki gibi yapılandırabilirsiniz:

* **Ollama ile Çok Dilli BGE-M3 Modeli Kullanımı:**
  Öncelikle terminalde `ollama pull bge-m3` komutunu çalıştırın. Ardından .env dosyasını güncelleyin:
  ```env
  EMBED_BASE_URL=http://localhost:11434/v1
  EMBED_KEY=ollama
  EMBED_MODEL=bge-m3
  ```

* **OpenAI API Kullanımı:**
  Metinleri bulutta OpenAI modelleriyle vektörleştirmek için:
  ```env
  EMBED_BASE_URL=https://api.openai.com/v1
  EMBED_KEY=sizin_openai_api_anahtariniz
  EMBED_MODEL=text-embedding-3-small
  ```

*Önemli Not:* Qdrant veritabanına yükleme yaparken kullanılan model ile Arwenis panelinde sorgulama yaparken tanımlanan modelin birebir aynı olması gerekir. Aksi takdirde vektör boyutları uyuşmayacağı için arama işlemleri sonuç vermeyecektir.
