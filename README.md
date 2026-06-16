# arwenis-vector-seed

Arwenis için **vektör veritabanı besleme aracı** (scrape → embed → upsert).

Bu proje **bilerek Arwenis ürününden ayrıdır**. Arwenis (Payload CMS + RAG asistanı) sağlayıcı-bağımsızdır ve yalnızca panelde tanımlanan **Vektör DB (Retrieval)** ayarındaki URL/collection'ı **sorgular**. Bilgi tabanının vektör DB'ye nasıl yükleneceği ise müşteriye özeldir (kaynak, şema, kategoriler, koleksiyon adı müşterinin vektör URL'ine göre değişir). Bu yüzden besleme tooling'i burada, ürün reposunda değil.

## İçerik

- `scrape-news.mjs` — Kaynaktan (örnek: Habertürk RSS) haberleri `category` + `publishedAt` ile çekip `data/news.json` üretir.
- `seed-vector-db.mjs` — `data/news.json`'ı embed'leyip Qdrant koleksiyonu + payload index'leri (`category`, `publishedAtTs`) oluşturarak upsert eder.

## Üretilen payload şeması

```
{ title, url, text, category, publishedAt (ISO), publishedAtTs (epoch ms) }
```

Bu şema, Arwenis panelindeki **Retrieval** ayarıyla eşleşmelidir:
`textKey=text`, `categoryKey=category`, `dateKey=publishedAtTs`, ve `categories` listesi veri kümesindeki kategorilerle aynı olmalı.

## Kullanım

```bash
npm run scrape   # data/news.json üretir
npm run seed     # Qdrant'a yükler (koleksiyonu sıfırdan kurar)
# veya
npm run all
```

## Ortam değişkenleri (varsayılanlar yerel Ollama + Qdrant)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `QDRANT_URL` | `http://localhost:6333` | Vektör DB adresi (müşteriye göre değişir) |
| `QDRANT_KEY` | `localkey` | Qdrant api-key |
| `COLLECTION` | `gleam_demo` | Hedef koleksiyon (Arwenis `index` ile aynı olmalı) |
| `EMBED_BASE_URL` | `http://localhost:11434/v1` | OpenAI-uyumlu embedding ucu (Ollama) |
| `EMBED_KEY` | `ollama` | Embedding API anahtarı |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding modeli (Arwenis ile aynı olmalı) |
| `TARGET_COUNT` | `400` | Hedef kayıt sayısı (eksikse sentetik ile tamamlanır) |

> Embedding modeli Arwenis'in **Embedding** ayarıyla **aynı** olmalı; aksi halde boyut/uzay uyuşmaz ve arama bozulur.
