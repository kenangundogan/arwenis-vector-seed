import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TARGET_COUNT = Number(process.env.TARGET_COUNT) || 1000

const CATEGORIES = [
    'gundem', 'ekonomi', 'spor', 'teknoloji', 'dunya',
    'saglik', 'yasam', 'magazin', 'kultur-sanat', 'turizm', 'otomobil',
    'astroloji', 'hava-durumu', 'egitim', 'bilim', 'cevre', 'sinema-dizi', 'yemek'
]

const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Rize", "Trabzon", "Adana", "Konya", "Eskişehir", "Muğla", "Gaziantep"]
const ORGS = ["Bakanlık", "Yerli Girişim", "Bilim Kurulu", "Teknoloji Devi", "Üniversite Heyeti", "Sektör Temsilcileri", "Dernek Yönetimi"]
const SIGNS = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"]
const NAMES = ["Ahmet Yılmaz", "Mehmet Kaya", "Ayşe Demir", "Fatma Çelik", "Mustafa Öztürk", "Emine Şahin", "Ali Koç", "Zeynep Yıldız", "Canan Karatay", "Burak Özçivit", "Murat Boz", "Hadise Açıkgöz", "Eda Erdem", "Arda Güler", "Kenan Yıldız", "Meryem Uzerli", "Haluk Levent", "Sertab Erener", "Tarkan Tevetoğlu", "Cem Yılmaz"]

const DATA_TEMPLATES = {
    gundem: {
        titles: [
            "{city}'da ulaşım projelerinde yeni dönem başladı",
            "{org} gıda denetimlerine ilişkin yeni kararı açıkladı",
            "{city}'da beklenen hava sıcaklıkları için uyarı yapıldı",
            "Bakan {name} sosyal destek paketinin detaylarını paylaştı",
            "{city} genelinde yeni güvenlik önlemleri devrede",
            "{org} toplu taşıma fiyat tarifelerini güncelledi"
        ],
        bodies: [
            "{city} genelinde yürütülen altyapı ve sosyal projelerin bütçesi artırıldı.",
            "Vatandaşların yaşam kalitesini artıracak adımlar atılıyor.",
            "Yetkililer ve Bakan {name} tarafından yapılan denetimlerde kurallara uymayan işletmelere cezai işlem uygulandı.",
            "Meteoroloji uzmanları önümüzdeki günlerde hava durumunun mevsim normallerinin üzerinde seyredeceğini belirtti.",
            "Valilik tarafından yapılan son dakika açıklamasında, halkın huzur ve güvenliği için ekiplerin 24 saat sahada olacağı vurgulandı.",
            "Grup temsilcileri belediyeyle ortaklaşa yürütülecek yeşil alan projelerinin detaylarını paylaştı.",
            "Trafik düzenlemeleri kapsamında bazı kritik yolların geçici olarak trafiğe kapatılacağı bildirildi.",
            "Sosyal yardımlaşma vakıfları aracılığıyla binlerce aileye kışlık yakacak ve gıda yardımı ulaştırılmaya başlandı."
        ]
    },
    ekonomi: {
        titles: [
            "{org} enflasyon rakamları beklentilerini paylaştı",
            "Borsa İstanbul güne yükselişle başladı",
            "Dolar ve Euro kurunda hareketli saatler yaşanıyor",
            "Altın fiyatlarında küresel dalgalanma sürüyor",
            "Asgari ücret komisyonu ilk toplantı tarihini belirledi",
            "Sanayi üretimi endeksinde beklenenin üzerinde büyüme gerçekleşti"
        ],
        bodies: [
            "Piyasalardaki hareketlilik yatırımcılar tarafından yakından izleniyor.",
            "Analistler temkinli duruşun önemini vurguluyor.",
            "Yeni ekonomi paketi kapsamında vergi düzenlemeleri ve destek teşvikleri meclis gündemine taşınıyor.",
            "Sektör temsilcileri atılan adımlardan umutlu.",
            "Küresel piyasalarda yaşanan gelişmeler iç pazarda döviz ve altın fiyatlarına doğrudan etki etmeye devam ediyor.",
            "Tüketici güven endeksi son üç ayın en yüksek seviyesine ulaşarak piyasalara moral verdi.",
            "Merkez Bankası PPK toplantısı öncesi yabancı aracı kurumlar faiz tahminlerini revize etti.",
            "İhracatçılar Birliği Başkanı, yerli üretimi artırmak adına yeni pazarlara açılmanın şart olduğunu dile getirdi."
        ]
    },
    teknoloji: {
        titles: [
            "{org} yeni yapay zeka modelini duyurdu",
            "Yerli yazılım firması küresel pazarda büyük bir anlaşmaya imza attı",
            "Yeni nesil akıllı cihazlar Türkiye pazarında satışa sunuldu",
            "Siber güvenlik uzmanlarından veri sızıntılarına karşı kritik uyarı",
            "Kuantum bilgisayarlar alanında tarihi bir keşfe imza atıldı",
            "Popüler sosyal medya platformu yeni gizlilik kurallarını devreye alıyor"
        ],
        bodies: [
            "Geliştirilen yerli yazılım sayesinde veri işleme hızları iki katına çıkarken güç tüketimi yarı yarıya azaldı.",
            "Yapay zeka algoritmalarının iş süreçlerine entegrasyonu hız kesmeden devam ediyor.",
            "Birçok şirket bu alanda Ar-Ge bütçelerini artırıyor.",
            "Yeni nesil elektrikli araç bataryaları daha hızlı şarj olabilme yeteneği sunarak sektörde devrim yaratmaya hazırlanıyor.",
            "Veri sızıntılarının önüne geçmek amacıyla şifreleme algoritmalarında köklü değişiklikler yapıldı.",
            "Geliştirici ekibi, yeni güncellemeyle kullanıcı arayüzünü tamamen yenilediklerini açıkladı.",
            "Akıllı ev teknolojilerinde sesli asistan entegrasyonu günlük yaşamı kolaylaştırmaya devam ediyor.",
            "Kriptoloji uzmanları gelecekte blokzincir tabanlı sistemlerin siber savunmanın temelini oluşturacağını söylüyor."
        ]
    },
    spor: {
        titles: [
            "Süper Lig'de kritik derbi hazırlıkları başladı",
            "{org} genç sporculara yönelik projeyi hayata geçirdi",
            "Milli sporcu {name} şampiyonada altın madalya kazandı",
            "Genç yıldız {name} transfer sezonunun en çok konuşulan ismi oldu",
            "Basketbol milli takımı Avrupa kupası elemelerinde sahaya çıkıyor",
            "Formula 1 heyecanı bu hafta sonu Türkiye etapıyla devam edecek"
        ],
        bodies: [
            "Takımlar antrenman temposunu artırırken teknik direktörler taktik planlar üzerinde çalışıyor.",
            "Heyecan dorukta.",
            "Genç yeteneklerin keşfedilmesi amacıyla başlatılan akademi projesi büyük ilgi gördü.",
            "Yeni yıldızlar yetişiyor.",
            "Müsabaka sonucunda rakibini mağlup eden sporcumuz {name}, Türk bayrağını dalgalandırarak gurur kaynağımız oldu.",
            "Kulüp başkanı kulübün borç yapısını yapılandırarak transfer yasağını kaldırdıklarını müjdeledi.",
            "Taraftarlar maça yoğun ilgi göstererek biletlerin tamamını satışa açıldıktan sadece 10 dakika sonra tüketti.",
            "Sağlık ekibi, sakatlığı bulunan milli oyuncunun fizik tedavi sürecinin planlanandan hızlı ilerlediğini bildirdi."
        ]
    },
    saglik: {
        titles: [
            "Prof. Dr. {name} yaz aylarında beslenme düzeni için uyardı",
            "{org} yeni tedavi yöntemi üzerindeki çalışmaları tamamladı",
            "Düzenli uykunun bağışıklık sistemi üzerindeki etkisi kanıtlandı",
            "Mevsimsel alerjiye karşı alınabilecek en etkili önlemler açıklandı",
            "Kanser araştırmalarında umut verici yeni molekül keşfedildi",
            "D vitamini eksikliğinin yol açtığı gizli tehlikelere dikkat"
        ],
        bodies: [
            "Konuyla ilgili açıklamalarda bulunan uzman hekim {name}, günde en az iki litre su tüketilmesini tavsiye ediyor.",
            "Geliştirilen tedavi protokolü sayesinde hastaların iyileşme süreci %30 oranında kısaldı.",
            "Klinik testler olumlu sonuç verdi.",
            "Stresten uzak durmanın ve dengeli beslenmenin kronik rahatsızlıkları önlemede en kritik faktörler olduğu belirtildi.",
            "Araştırmacılar yeni ilacın yan etkilerinin minimum düzeyde olduğunu ve bağışıklık sistemini desteklediğini belirtti.",
            "Dünya Sağlık Örgütü, salgın hastalıklara karşı küresel aşılamanın önemine bir kez daha dikkat çekti.",
            "Çocuk hekimleri ekran süresinin gelişim çağındaki çocuklarda uyku bozukluklarına neden olduğunu vurguluyor.",
            "Dengeli beslenme alışkanlığı kazanan bireylerde yaşam süresi beklentisinin kayda değer oranda yükseldiği gözlemlendi."
        ]
    },
    dunya: {
        titles: [
            "Küresel iklim zirvesinde yeni kararlar alındı",
            "Avrupa ülkelerinde enerji tasarrufu tedbirleri genişletiliyor",
            "Komşu ülkede genel seçim sonuçları açıklandı",
            "Uluslararası ticaret yollarında güvenlik önlemleri artırıldı",
            "Birleşmiş Milletler'den küresel insani yardım çağrısı yapıldı",
            "G-20 zirvesinde ekonomik işbirliği anlaşmaları imzalandı"
        ],
        bodies: [
            "Liderler karbon emisyonunu azaltmak amacıyla ortak bir mutabakata imza attı.",
            "Süreç yakından takip edilecek.",
            "Seçim sonuçlarına göre koalisyon hükümetinin kurulması bekleniyor.",
            "Siyasi analistler yeni dönemi değerlendirdi.",
            "Okyanus ötesi ülkeler arasındaki ekonomik işbirlikleri yeni anlaşmalarla güçlendirildi.",
            "Ticaret hacminin artması hedefleniyor.",
            "Sınır bölgelerindeki gerilimi azaltmak amacıyla taraflar ateşkes görüşmelerine başlama kararı aldı.",
            "Küresel gıda krizinin önüne geçmek adına tahıl koridoru anlaşmasının uzatıldığı duyuruldu."
        ]
    },
    magazin: {
        titles: [
            "Ünlü sanatçı {name} tarafından verilen açık hava konseri kapalı gişe gerçekleşti",
            "Yeni filmin galası görkemli bir törenle yapıldı",
            "Sosyal medyada çok konuşulan ünlü isim {name} evlendi",
            "Sevilen oyuncu {name} yeni projesiyle yakında izleyiciyle buluşuyor",
            "Ünlü şarkıcı {name} dünya turnesine çıkacağını müjdeledi",
            "Haftalık magazin turu: İşte ünlülerin son tatil rotaları"
        ],
        bodies: [
            "Hayranlarının yoğun ilgi gösterdiği gecede sanatçı eski ve yeni şarkılarını hep bir ağızdan seslendirdi.",
            "Gala gecesine sanat dünyasından çok sayıda ünlü isim katıldı.",
            "Kırmızı halı şıklığı göz kamaştırdı.",
            "Yeni sezonda iddialı bir yapımla ekranlara dönecek olan {name}, rolü için özel bir eğitim aldığını açıkladı.",
            "Kameralara yansıyan çift, evlilik yolunda ilk adımı attıklarını ve çok mutlu olduklarını belirtti.",
            "Basın mensuplarının sorularını yanıtlayan ünlü isim, yakında yeni bir albüm müjdesi vereceğini fısıldadı.",
            "Dizi setinden gelen son kareler sosyal medyada binlerce beğeni alarak günün en çok paylaşılan görseli oldu.",
            "Ünlü komedyen {name}, yeni stand-up şovunun turne takvimini sosyal medya hesabından paylaştı."
        ]
    },
    "kultur-sanat": {
        titles: [
            "İstanbul Kültür Sanat Festivali kapılarını sanatseverlere açtı",
            "{name} yılın en iyi edebiyat ödülüne layık görüldü",
            "Tarihi müze restore edilerek yeniden ziyarete açıldı",
            "Genç ressam {name} tarafından açılan ilk kişisel sergi büyük beğeni topladı",
            "Devlet Tiyatroları yeni sezonda sahneleceği oyunları duyurdu",
            "Ünlü yazar {name} imza gününde okurlarıyla buluştu"
        ],
        bodies: [
            "Hafta boyunca sürecek olan etkinliklerde yerli ve yabancı yüzlerce sanatçının eseri sergilenecek.",
            "Serginin açılışında konuşan {name}, sanatseverlerin gösterdiği ilgiden dolayı son derece mutlu olduğunu dile getirdi.",
            "Ödül töreninde konuşan yazarlar, edebiyatın birleştirici gücüne vurgu yaparak teşekkürlerini sundular.",
            "Tarihi binanın mimari yapısı aslına uygun olarak restore edilerek turizme kazandırıldı.",
            "Küratör festivalin bu yılki temasının 'sınırların ötesinde sanat' olduğunu açıkladı.",
            "Müzik otoriteleri tarafından hazırlanan konserde klasik müzik eserleri modern yorumlarla icra edildi.",
            "Antik kentte yürütülen kazı çalışmalarında Roma dönemine ait olduğu düşünülen yeni mozaikler gün yüzüne çıkarıldı.",
            "Ünlü tiyatro yönetmeni {name}, yeni oyunlarının prömiyerinin önümüzdeki ay yapılacağını söyledi."
        ]
    },
    yasam: {
        titles: [
            "Doğa yürüyüşü severler Rize yaylalarında buluştu",
            "Evde yapılabilecek pratik dekorasyon fikirleri paylaşıldı",
            "Sokak hayvanları için mahalle sakinlerinden alkışlanacak hareket",
            "Şehir yaşamından kaçıp köye yerleşenlerin sayısı artıyor",
            "Hobi bahçesi kültürü şehirlerde hızla yaygınlaşıyor",
            "Sıfır atık yaşam tarzını benimseyenlerin ilham veren hikayeleri"
        ],
        bodies: [
            "Kamp severlerin ve doğa tutkunlarının buluşma noktası olan yaylalar temiz havasıyla kendine hayran bıraktı.",
            "Kendi imkanlarıyla ahşap malzemelerden kedi evleri inşa eden gönüllüler örnek bir dayanışma sergiledi.",
            "Uzmanlar beton yığınlarından uzaklaşmanın insan psikolojisi üzerinde son derece olumlu etkileri olduğunu belirtiyor.",
            "Doğal tarım tekniklerini kullanarak kendi sebzesini yetiştiren aileler sağlıklı yaşamın sırrını paylaştı.",
            "Evde kullanılmayan eski eşyaları geri dönüştürerek yepyeni tasarımlar ortaya çıkaran genç tasarımcı ilgi çekti.",
            "Sosyal sorumluluk projesi kapsamında sokak hayvanları için kentin çeşitli noktalarına mama kapları yerleştirildi.",
            "Uzun yaşamın sırrı olarak görülen Akdeniz diyeti ve temiz hava alışkanlığı her geçen gün daha popüler hale geliyor.",
            "Yerel pazarlardan yapılan taze ve organik alışverişlerin aile bütçesine ve sağlığına katkısı tartışıldı."
        ]
    },
    turizm: {
        titles: [
            "Ege ve Akdeniz otellerinde erken rezervasyon yoğunluğu yaşanıyor",
            "Kültür turizmi kapsamında GAP turlarına ilgi arttı",
            "Turizm sezonunda doluluk oranları beklentileri aştı",
            "Yabancı turistlerin en çok tercih ettiği rotalar belli oldu",
            "Kış turizminin gözdesi Uludağ'da kar kalınlığı rekor seviyede",
            "Alternatif tatil arayanlar için glamping çadır turları gözde"
        ],
        bodies: [
            "Sıcak havaların gelmesiyle oteller kapılarını açtı.",
            "Erken rezervasyon imkanları tatilciler için avantaj sağladı.",
            "Tarihi ve kültürel zenginlikleriyle ön plana çıkan bölgelere düzenlenen turlar bu yıl rekor katılım aldı.",
            "Sektör temsilcileri bu sezon elde edilen gelirlerin ülke ekonomisine büyük katkı sağlayacağını ifade etti.",
            "Kruvaziyer gemilerinin limana yanaşmasıyla birlikte kent merkezinde esnafın yüzü gülmeye başladı.",
            "Kültür ve Turizm Bakanlığı, tarihi ören yerlerinin ziyaretçi saatlerini yaz sezonuna özel olarak uzattı.",
            "Yayla turizmi ve ekolojik turlar, doğayla baş başa kalmak isteyen modern gezginlerin gözdesi oldu.",
            "Yerli turistler hafta sonu kaçamakları için yakın mesafedeki doğa otellerini tercih ediyor."
        ]
    },
    otomobil: {
        titles: [
            "Yerli otomobilde yeni donanım ve renk seçenekleri satışa sunuldu",
            "Elektrikli SUV modellerinde fiyat indirimleri başladı",
            "Yeni nesil hibrit motor teknolojisi tanıtıldı",
            "İkinci el otomobil piyasasında fiyatlar dengeleniyor",
            "Klasik otomobil tutkunları geçit töreninde bir araya geldi",
            "Otonom sürüş destekli yeni nesil tırlar yollara çıkıyor"
        ],
        bodies: [
            "Gelişmiş sürüş destek sistemleri ile donatılan yeni paket alıcılardan tam not almayı başardı.",
            "Yarı elektrikli yeni motor seçeneği düşük yakıt tüketimiyle ailelerin ilk tercihleri arasına girdi.",
            "Yetkililer piyasadaki denetimlerin artmasıyla suni fiyat artışlarının önüne geçildiğini vurguladı.",
            "Şarj istasyonlarının otobanlarda yaygınlaşması elektrikli otomobillere olan talebi hızla artırıyor.",
            "Yeni modelin lansmanında konuşan mühendislik ekibi, aerodinamik tasarım sayesinde menzilin %15 arttığını belirtti.",
            "Otomotiv distribütörleri derneği, yılın ilk yarısındaki araç satış rakamlarını detaylı bir raporla paylaştı.",
            "Akıllı şerit takip sistemi ve acil fren desteği gibi güvenlik donanımları artık giriş seviyesindeki araçlarda standart olacak.",
            "Klasik araba restorasyonuyla uğraşan usta, yedek parça teminindeki zorluklara rağmen tutkusundan vazgeçmediğini belirtti."
        ]
    },
    astroloji: {
        titles: [
            "Haftalık burç yorumları: Gökyüzü bu hafta {burc} burcunu nasıl etkileyecek?",
            "Merkür retrosu başlıyor: {burc} burcundaki hareketlilik nelere dikkat etmeyi gerektiriyor?",
            "Dolunay enerjisi kapıda: {burc} burcu kariyerinde büyük kararların eşiğinde",
            "Aşk ve para haritası: Yıldızlar bu ay en çok {burc} burcuna şans getiriyor",
            "Güneş tutulması etkisi: {burc} burcu için dönüm noktası başlıyor",
            "Yıldız haritası analizi: Önümüzdeki günlerde {burc} burcunu neler bekliyor?",
            "Aşk hayatında sürprizler: Bu hafta {burc} burcu için romantizm rüzgarları esecek",
            "{burc} burcu için kariyer ve para kapıları aralanıyor: Gökyüzü destekliyor"
        ],
        bodies: [
            "Gezegenlerin konumu özellikle {burc} burçları için finansal ve ilişkisel konularda yeni fırsatları beraberinde getirebilir.",
            "Adımlarınızı güvenle atın.",
            "Astrologlar, {burc} burcu mensuplarının bu dönemde iletişim kazalarına karşı temkinli olması ve iş hayatında aceleci kararlar almaması gerektiğini belirtiyor.",
            "İçsel dönüşümün zirveye ulaştığı bu haftada, {burc} burçları kendilerini keşfetmeye ve hayatlarında yeni bir sayfa açmaya odaklanacak.",
            "Güneş ve Uranüs arasındaki olumlu açı, {burc} burcu için beklenmedik kariyer fırsatlarını tetikleyebilir.",
            "Yeniliklere açık olmanız gereken bir süreçtesiniz.",
            "Maddi konularda uzun süredir beklediğiniz haberler nihayet geliyor.",
            "{burc} burcu bu dönemde yatırımlarını değerlendirirken sezgilerine güvenmeli.",
            "Sağlık ve zindelik konularında {burc} burcu için olumlu etkiler devrede.",
            "Enerjinizi yüksek tutacak aktivitelere yönelmeniz faydalı olacaktır."
        ]
    },
    "hava-durumu": {
        titles: [
            "Meteoroloji uyardı: {city}'da sağanak yağış ve fırtına bekleniyor",
            "Haftalık hava durumu: Sıcaklıklar mevsim normallerinin üzerine çıkıyor",
            "Balkanlar üzerinden gelen soğuk hava dalgası {city}'da etkili olacak",
            "Uzmanlardan sıcak hava dalgasına karşı kritik uyarılar yapıldı",
            "Yüksek nem oranları {city}'da bunaltıcı günleri beraberinde getirecek",
            "Hafta sonu planı yapacaklar dikkat: İl il güncel hava tahmini raporu"
        ],
        bodies: [
            "Özellikle öğle saatlerinde kronik rahatsızlığı olanların ve yaşlıların güneş ışınlarına doğrudan maruz kalmaması gerektiği vurgulandı.",
            "Yağışların ani sel ve su baskınlarına yol açabileceği belirtilerek, sürücülerin ve vatandaşların dikkatli olması istendi.",
            "Hava sıcaklıklarının önümüzdeki haftadan itibaren iç kesimlerde 4 ila 6 derece artacağı tahmin ediliyor.",
            "Rüzgar güney yönlerden hafif esecek.",
            "Marmara ve Ege bölgelerinde rüzgarın yer yer fırtına hızına ulaşması beklendiğinden deniz ulaşımında aksamalar yaşanabilir.",
            "Tarım sektörü temsilcileri, beklenmedik dolu yağışlarının ekili alanlara zarar vermesinden endişe ediyor.",
            "Baraj doluluk oranları son yağışlarla birlikte %5 oranında artarak içme suyu sıkıntısı endişelerini hafifletti.",
            "Kar yağışının yüksek kesimlerde etkisini artırması nedeniyle bazı köy yollarının ulaşıma kapandığı bildirildi."
        ]
    },
    egitim: {
        titles: [
            "Milli Eğitim Bakanlığı yeni müfredat detaylarını açıkladı",
            "Yükseköğretim Kurumları Sınavı (YKS) başvuruları başladı",
            "Uzmanlar okul öncesi eğitimin gelişimsel önemini vurguladı",
            "Öğretmen {name} geliştirdiği eğitim modeliyle uluslararası ödül aldı",
            "Okullarda yapay zeka ve kodlama dersleri yaygınlaşıyor",
            "Üniversitelerde tercih dönemi: Doğru bölüm seçimi için rehber"
        ],
        bodies: [
            "Yeni müfredat programı, öğrencilerin analitik düşünme becerilerini ve pratik uygulamaları geliştirmeyi hedefliyor.",
            "Başvuruların önümüzdeki ayın sonuna kadar online sistem üzerinden yapılacağı bildirildi.",
            "Eğitim uzmanı {name}, çocukların sosyal becerilerinin erken yaşta oyun yoluyla geliştiğini ifade etti.",
            "Kodlama derslerinin müfredata eklenmesiyle birlikte çocukların problem çözme becerilerinin arttığı gözlemlendi.",
            "Öğretmenler, teknoloji destekli sınıflarda öğrenme sürecinin daha eğlenceli ve kalıcı olduğunu dile getiriyor.",
            "Bakanlık, mesleki eğitim merkezlerine olan bütçeyi artırarak genç istihdamını desteklemeyi planlıyor.",
            "Yabancı dil öğretiminde modern metodolojilerin kullanılmasıyla öğrencilerin konuşma pratiklerinin arttığı belirtildi.",
            "Okul yönetimi, velilerle yapılan ortak toplantıda okul içi güvenlik ve sosyal kulüp faaliyetleri hakkında bilgi verdi."
        ]
    },
    bilim: {
        titles: [
            "Kuantum fiziği araştırmalarında çığır açan yeni buluş",
            "Yerli gökbilimci {name} yeni bir ötegezegen keşfetti",
            "Genetik bilimciler DNA şifresini çözmede önemli bir eşiği aştı",
            "Yapay yaprak teknolojisiyle güneş ışığından yakıt üretildi",
            "Antarktika araştırma ekibi yeni buzul örnekleriyle Türkiye'ye döndü",
            "Nanoteknoloji laboratuvarında kanserli hücreleri yok eden robotlar geliştirildi"
        ],
        bodies: [
            "Yapılan deneyler sonucunda, kuantum dolanıklığının mesafe sınırları olmadan çalıştığı bir kez daha kanıtlandı.",
            "Bilim insanı {name}, elde edilen verilerin evrenin genişleme hızına dair yeni ipuçları sunduğunu söyledi.",
            "Geliştirilen nanorobotlar, sağlıklı dokulara zarar vermeden doğrudan hedef bölgeye ilaç taşıyabilme yeteneğine sahip.",
            "Yapay fotosentez yöntemiyle üretilen temiz enerji, fosil yakıtlara karşı güçlü bir alternatif oluşturabilir.",
            "Genetik mühendisleri, tarım ürünlerinin kuraklığa dayanıklı hale getirilmesi için çalışmalarını hızlandırdı.",
            "Laboratuvar ortamında yürütülen araştırmalar uluslararası saygın bilim dergilerinde kapak konusu oldu.",
            "Uzay teleskobundan gelen son görüntüler, galaksilerin oluşum süreçlerine dair bilinen teorileri sarsıyor.",
            "Geliştirici heyet, projenin tamamen yerli imkanlarla ve genç araştırmacıların öncülüğünde yürütüldüğünü gururla belirtti."
        ]
    },
    cevre: {
        titles: [
            "Küresel ısınmaya karşı sıfır emisyon hedefleri açıklandı",
            "Rüzgar ve güneş enerjisi yatırımlarında rekor büyüme",
            "Plastik atıkları geri dönüştüren mikroorganizmalar keşfedildi",
            "Ekolojist {name} kuruyan göllerin kurtarılması için plan hazırladı",
            "Okyanus temizleme projesinde tonlarca atık toplandı",
            "Sürdürülebilir tarım teknikleriyle su tasarrufunda büyük başarı"
        ],
        bodies: [
            "Çevre uzmanları, karbon ayak izini azaltmak adına sanayi tesislerinde acil filtreleme sistemlerine geçilmesini istiyor.",
            "Yenilenebilir enerji kaynaklarının toplam elektrik üretimindeki payı bu yıl ilk kez %40 seviyesine ulaştı.",
            "Biyolog {name}, keşfedilen bakterinin doğada yüzyıllarca kalan plastikleri haftalar içinde çözebildiğini belirtti.",
            "Damla sulama sistemlerinin kullanımıyla tarımsal sulamada %50 oranında su tasarrufu sağlandığı açıklandı.",
            "Sürdürülebilir yaşam derneği, bireysel olarak alınabilecek basit çevre dostu önlemleri listeleyen bir rehber yayınladı.",
            "Hava kalitesini artırmak amacıyla şehir merkezlerinde araçsız yeşil bölgelerin oluşturulması planlanıyor.",
            "Deniz ekolojisini korumak adına balıkçılık faaliyetlerinde av yasağı denetimlerinin sıkılaştırıldığı bildirildi.",
            "İklim aktivistleri, büyük sanayi ülkelerinin çevre anlaşmalarındaki taahhütlerine uymaları çağrısında bulundu."
        ]
    },
    "sinema-dizi": {
        titles: [
            "Yılın en çok beklenen bilim kurgu filmi vizyona girdi",
            "Ünlü yönetmen {name} yeni festival filminin çekimlerine başladı",
            "Dijital platformun yeni yerli dizisi rekor izlenme oranlarına ulaştı",
            "Prestijli film festivalinde en iyi yönetmen ödülü {name}'e gitti",
            "Sinema salonlarında bilet satışları son beş yılın zirvesinde",
            "Efsanevi dizi serisinin devam halkası izleyicilerle buluşuyor"
        ],
        bodies: [
            "Görsel efektleri ve müzikleriyle sinemaseverlerden tam not alan yapım, ilk hafta sonunda gişe rekoru kırdı.",
            "Yönetmen {name}, filmin çekimlerinin büyük bir kısmının tarihi mekanlarda gerçekleştirileceğini açıkladı.",
            "Senaryosuyla izleyicileri ekrana kilitleyen dizi, sosyal medyada en çok konuşulan konular listesinde zirveye yerleşti.",
            "Oyuncu kadrosunda usta isimlerin yer aldığı tiyatro oyunu, gala gecesinde dakikalarca ayakta alkışlandı.",
            "Sinema eleştirmenleri, filmin oyunculuk performansları ve derin felsefi altyapısıyla bu yıla damga vuracağını belirtiyor.",
            "Platform yöneticisi, yeni sezon onayını verdiklerini ve hazırlıklara hemen başladıklarını duyurdu.",
            "Klasikleşmiş roman uyarlaması olan dizinin dekor ve kostüm tasarımı için aylar süren bir çalışma yapıldığı öğrenildi.",
            "Ödüllü oyuncu {name}, canlandırdığı karakterin psikolojik derinliğinin kendisini çok etkilediğini ifade etti."
        ]
    },
    yemek: {
        titles: [
            "Geleneksel Türk mutfağının en sevilen lezzetlerinin sırları açıklandı",
            "Ünlü şef {name} zeytinyağlı yemeklerin püf noktalarını paylaştı",
            "Dünya mutfaklarından evde kolayca yapabileceğiniz pratik tarifler",
            "Gastronomi festivalinde yerel lezzetler ziyaretçilerle buluştu",
            "Sağlıklı beslenmek isteyenler için unsuz ve şekersiz tatlı tarifleri",
            "Tescilli lezzet: Coğrafi işaretli o yemek koruma altına alındı"
        ],
        bodies: [
            "Şef {name}, yemeğin lezzet sırrının taze malzemeler ve kısık ateşte yavaş pişirme olduğunu vurguladı.",
            "Evde kolayca hazırlayabileceğiniz bu tarif, hem ekonomik hem de son derece besleyici bir alternatif sunuyor.",
            "Yöresel lezzetlerin sergilendiği stantlar, gastronomi meraklılarının ve gurmelerin akınına uğradı.",
            "Fırından yeni çıkmış sıcak ekmek kokusu eşliğinde hazırlanan sunumlar davetlilerden tam not aldı.",
            "Beslenme uzmanları, paketli gıdalar yerine ev yapımı doğal sosların tercih edilmesini tavsiye ediyor.",
            "Tarihi saray mutfağının unutulmaya yüz tutmuş tarifleri, genç aşçılar tarafından modern sunumlarla yeniden hayat buldu.",
            "Mutfak akademisi, hafta sonu gerçekleştireceği workshop programı ile pasta yapım tekniklerini öğretecek.",
            "Organik tarım ürünleriyle hazırlanan menü, çevre dostu beslenme akımının en güzel örneklerinden birini oluşturdu."
        ]
    }
}

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]

const replacePlaceholders = (text) => {
    return text
        .replace(/{city}/g, getRandomItem(CITIES))
        .replace(/{org}/g, getRandomItem(ORGS))
        .replace(/{burc}/g, getRandomItem(SIGNS))
        .replace(/{name}/g, getRandomItem(NAMES))
}

const makeParagraph = (cat) => {
    const templates = DATA_TEMPLATES[cat] || DATA_TEMPLATES['gundem']
    const sentenceCount = Math.floor(Math.random() * 2) + 2 // 2 veya 3 cümle
    const sentences = []
    for (let i = 0; i < sentenceCount; i++) {
        sentences.push(replacePlaceholders(getRandomItem(templates.bodies)))
    }
    return sentences.join(" ")
}

const generateContent = (cat) => {
    const paragraphCount = Math.floor(Math.random() * 5) + 1 // 1 ila 5 paragraf
    const paragraphs = []
    for (let i = 0; i < paragraphCount; i++) {
        paragraphs.push(makeParagraph(cat))
    }
    return paragraphs.join("\n\n")
}

const CATEGORY_IMAGES = {
    gundem: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80',
    ekonomi: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    spor: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    teknoloji: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    dunya: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    saglik: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    yasam: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    magazin: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    'kultur-sanat': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
    otomobil: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
    astroloji: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80',
    'hava-durumu': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80',
    egitim: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    bilim: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
    cevre: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
    'sinema-dizi': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    yemek: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    seyahat: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
}

const makeSynthetic = (count) => {
    const docs = []
    for (let i = 0; i < count; i++) {
        const cat = CATEGORIES[i % CATEGORIES.length]
        const templates = DATA_TEMPLATES[cat] || DATA_TEMPLATES['gundem']
        const titleTemplate = getRandomItem(templates.titles)
        const bodyTemplate = getRandomItem(templates.bodies)

        const title = `${replacePlaceholders(titleTemplate)} (#${i + 1})`
        const text = `${replacePlaceholders(bodyTemplate)} Bu konuda yaşanan son dakika gelişmelerini ve analizleri anlık olarak aktarmaya devam edeceğiz.`
        const content = generateContent(cat)
        const url = `https://www.haberturk.com/sentetik/${cat}/haber-detay-${900000 + i}`

        const ageMs = Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        const d = new Date(Date.now() - ageMs)

        docs.push({
            title,
            url,
            image: CATEGORY_IMAGES[cat] || CATEGORY_IMAGES['gundem'],
            text,
            content,
            category: cat,
            source: 'synthetic',
            publishedAt: d.toISOString(),
            publishedAtTs: d.getTime()
        })
    }
    return docs
}

const main = async () => {
    console.log(`[+] Sentetik haber üretimi başlatılıyor... (Hedef: ${TARGET_COUNT})`)
    const docs = makeSynthetic(TARGET_COUNT)

    const dataDir = path.join(__dirname, '..', 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    const target = path.join(dataDir, 'news.json')
    fs.writeFileSync(target, JSON.stringify(docs, null, 2), 'utf-8')

    const cats = {}
    for (const d of docs) cats[d.category] = (cats[d.category] || 0) + 1

    console.log(`\n[+] ${docs.length} adet sentetik kayıt başarıyla üretildi: ${target}`)
    console.log('[+] Kategori dağılımı:', JSON.stringify(cats))
}

main().catch((e) => {
    console.error('[-] Hata:', e)
    process.exit(1)
})
