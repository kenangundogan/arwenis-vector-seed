# Arwenis Vektör Veritabanı Besleme Aracı

Bu proje, Arwenis RAG (Retrieval-Augmented Generation) asistanının bilgi tabanını beslemek amacıyla geliştirilmiş bağımsız bir veri işleme ve yükleme aracıdır (veri kazıma/sentetik veri üretimi -> embedding oluşturma -> vektör veritabanına yükleme).

## Genel Bakış ve Mimarideki Yeri

Arwenis ürünü (Payload CMS ve RAG asistanı), veri kaynağı ve vektör veritabanı sağlayıcılarından bağımsız bir mimariye sahiptir. Yalnızca CMS paneli üzerinden tanımlanan vektör veritabanı adresini ve koleksiyonunu sorgular. 

Verilerin hangi kaynaklardan çekileceği, nasıl temizleneceği, hangi kategorilere ayrılacağı ve vektör veritabanına nasıl yükleneceği müşteriye ve projeye özel senaryolardır. Bu nedenle, vektör veritabanını besleyen bu araç ana Arwenis projesinden ayrı bir repo olarak konumlandırılmıştır.

## Kullanılan Teknolojiler

Projede kullanılan temel altyapılar ve görevleri aşağıda açıklanmıştır:

* **Docker:** Uygulama ve veritabanlarının işletim sisteminden bağımsız, izole bir konteyner içerisinde çalıştırılmasını sağlar. Bu projede vektör veritabanı olan Qdrant'ı yerel bilgisayarınızda kurmak ve çalıştırmak için kullanılır.
* **Qdrant:** Yüksek performanslı bir vektör veritabanıdır. Metinlerin anlamsal matematiksel karşılıklarını (embedding) saklar ve bunlar üzerinde hızlı semantik arama yapılmasına imkan tanır.
* **Ollama:** Büyük dil modellerini ve embedding modellerini yerel bilgisayarınızda çalıştırmanızı sağlayan araçtır. Projede metinleri vektör verilerine dönüştürmek için varsayılan olarak Ollama üzerindeki nomic-embed-text modeli kullanılmaktadır.

## Proje Klasör Yapısı

* scrape-news.mjs - Belirlenen RSS kaynaklarından gerçek haberleri çekerek data/news.json dosyasına kaydeder.
* generate-synthetic.mjs - Astrolojiden spora kadar 18 farklı kategoride, zengin içerikli ve paragraflı Türkçe yapay haberler üreterek data/news.json dosyasına kaydeder.
* seed-vector-db.mjs - Üretilen veya kazınan haber verilerini embedding API'si üzerinden vektörleştirerek Qdrant veritabanına yükler.
* delete-qdrant.mjs - Qdrant üzerindeki koleksiyonları silmek veya verileri temizlemek için kullanılan yardımcı araçtır.
* .env.example - Projenin ihtiyaç duyduğu çevre değişkenleri için şablon dosyasıdır.

## Sistem Gereksinimleri ve Kurulum

### Node.js Kurulumu
Node.js v20.6.0 veya daha yeni bir sürüm gereklidir. Projede yerleşik çevre değişkeni desteği (--env-file) kullanıldığı için ekstra bir paket yüklemeye gerek yoktur.

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
  "id": "c6218d6e-f783-3a1e-b8d4-53900a0b2d6a", // Haber URL'sinden üretilen deterministik UUID
  "title": "Haber Başlığı",
  "url": "Haber Linki",
  "text": "Haber Özet Metni (Arama için kullanılan kısa alan)",
  "content": "Haber İçeriği (1-5 paragraf arası gövde metni)",
  "category": "kategori",
  "source": "rss veya synthetic", // Verinin kaynağını belirtir
  "publishedAt": "ISO Tarih Formatı (Örn: 2026-06-24T...)",
  "publishedAtTs": 1782298910940
}
```

Bu şema, Arwenis panelinde tanımlanan arama ayarlarıyla (textKey, categoryKey, dateKey vb.) doğrudan uyumlu olmalıdır. Ayrıca `category` ve `source` alanları için Qdrant üzerinde otomatik olarak keyword payload indeksleri oluşturulmaktadır.

## Kullanım Kılavuzu

1. Çevre değişkenleri şablonunu kopyalayarak kendi yapılandırma dosyanızı oluşturun:

```bash
cp .env.example .env
```

2. .env dosyası içerisindeki bağlantı adreslerini ve model bilgilerini kendi ortamınıza göre güncelleyin.

3. Projeyi çalıştırmak için aşağıdaki npm komutlarını kullanabilirsiniz:

```bash
# RSS kaynağından gerçek haberleri çeker ve data/news.json dosyasına kaydeder
npm run scrape

# Belirtilen hedef sayıda sentetik haber üretir ve data/news.json dosyasına kaydeder
npm run synthetic

# data/news.json dosyasındaki verileri vektörleştirip Qdrant'a yükler
npm run seed

# Gerçek haberleri çeker ve doğrudan Qdrant'a yükler (Scrape + Seed)
npm run all:real

# Sentetik haberleri üretir ve doğrudan Qdrant'a yükler (Synthetic + Seed)
npm run all:synthetic

# Koleksiyon yapısını bozmadan Qdrant içerisindeki tüm verileri siler
npm run clear-points

# Qdrant üzerindeki koleksiyonu tüm yapısı ve verileriyle birlikte tamamen siler
npm run delete-collection
```

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
| TARGET_COUNT | 50000 | Sentetik veri üretiminde hedeflenen toplam kayıt sayısı |

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
