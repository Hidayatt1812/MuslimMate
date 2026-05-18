/**
 * Asbabun Nuzul — Sebab-sebab Turunnya Ayat Al-Qur'an
 * Berdasarkan riwayat shahih dari kitab-kitab tafsir dan hadits mu'tabar.
 *
 * Sumber utama:
 *  - Shahih Al-Bukhari & Shahih Muslim
 *  - Asbab al-Nuzul — Imam Al-Wahidi
 *  - Tafsir Ibn Katsir
 *  - Tafsir Al-Thabari
 *  - Sunan Abu Dawud, Tirmidzi, An-Nasa'i
 */

export interface AsbabunNuzulEntry {
  /** Nomor surah */
  surah: number;
  /** Ayat awal (dalam surah) */
  ayah: number;
  /** Ayat akhir jika mencakup range (opsional) */
  ayahEnd?: number;
  /** Judul singkat peristiwa */
  title: string;
  /** Narasi konteks peristiwa dalam bahasa Indonesia */
  context: string;
  /** Teks hadits / riwayat (termasuk sanad singkat) */
  hadith: string;
  /** Referensi sumber hadits */
  source: string;
  /** Referensi tautan tambahan (opsional) */
  referenceLinks?: string[];
}

/**
 * Key format: `${surahNumber}:${ayahNumber}`
 * Jika ayat range, key menggunakan ayat pertama.
 */
export const ASBABUN_NUZUL: Record<string, AsbabunNuzulEntry> = {

  // ── Al-Baqarah ─────────────────────────────────────────────────────────────

  '2:158': {
    surah: 2,
    ayah: 158,
    title: 'Sa\'i antara Shafa dan Marwah',
    context:
      'Para sahabat merasa ragu melakukan sa\'i antara Shafa dan Marwah karena di sana terdapat berhala dari masa jahiliyah. Mereka khawatir perbuatan itu termasuk pengagungan berhala.',
    hadith:
      'Urwah ibn Zubair berkata: "Aku bertanya kepada Aisyah radhiyallahu \'anha tentang firman Allah ini. Aisyah menjawab, \'Para Anshar sebelum masuk Islam biasa bertalbiyah untuk Manat —berhala yang ada di Musyallal— dan mereka merasa berdosa untuk ber-sa\'i antara Shafa dan Marwah. Ketika mereka masuk Islam, mereka bertanya kepada Rasulullah ﷺ tentang hal itu. Maka Allah menurunkan ayat ini.\'"\n\nNabi ﷺ bersabda: "Sesungguhnya Allah tidak menerima suatu amalan kecuali amalan yang ikhlas dan mengharap wajah-Nya."',
    source: 'HR. Al-Bukhari no. 1643, Muslim no. 1277',
    referenceLinks: ['https://sunnah.com/bukhari:1643', 'https://sunnah.com/muslim:1277'],
  },

  '2:187': {
    surah: 2,
    ayah: 187,
    title: 'Dibolehkannya makan & menggauli istri di malam Ramadhan',
    context:
      'Sebelum ayat ini turun, para sahabat yang berpuasa tidak boleh makan, minum, dan menggauli istri sejak terbenam matahari hingga malam berikutnya. Beberapa sahabat melanggar dan merasa sangat bersalah, lalu mengadu kepada Rasulullah ﷺ.',
    hadith:
      'Dari Al-Bara\' radhiyallahu \'anhu: "Ketika puasa Ramadhan diwajibkan, para sahabat tidak mendekati istri-istri mereka sebulan penuh. Ada beberapa orang yang tidak kuat menahan, lalu Allah menurunkan ayat: \'Dihalalkan bagi kamu pada malam hari bulan puasa bercampur dengan istri-istrimu...\' (QS. 2:187). Maka Allah meringankan mereka dan mereka pun bersyukur."\n\nDiriwayatkan pula dari Umar ibn Khattab radhiyallahu \'anhu bahwa ia mendatangi istrinya di malam Ramadhan setelah tertidur sebentar, lalu menyesal dan mengadu kepada Nabi ﷺ. Maka turunlah ayat ini.',
    source: 'HR. Al-Bukhari no. 1915, Abu Dawud no. 2313',
    referenceLinks: ['https://sunnah.com/bukhari:1915'],
  },

  '2:219': {
    surah: 2,
    ayah: 219,
    title: 'Bertanya tentang khamr (minuman keras)',
    context:
      'Umar ibn Khattab dan beberapa sahabat bertanya kepada Rasulullah ﷺ tentang hukum khamr karena ia merusak akal dan harta. Ayat ini turun sebagai jawaban pertama — belum mengharamkan secara penuh, melainkan menjelaskan bahwa dosanya lebih besar dari manfaatnya.',
    hadith:
      'Dari Umar ibn Khattab radhiyallahu \'anhu, ia berkata: "Ya Allah, jelaskanlah kepada kami tentang khamr dengan penjelasan yang terang." Maka turunlah QS. 2:219. Umar kembali dipanggil dan dibacakan ayat itu, namun ia masih berkata, "Ya Allah, jelaskanlah kepada kami secara terang." Kemudian turun QS. 4:43. Umar kembali dipanggil, lalu turun QS. 5:90-91 yang mengharamkan secara mutlak. Umar pun berkata, "Kami berhenti, kami berhenti."',
    source: 'HR. Abu Dawud no. 3670, At-Tirmidzi no. 3049 (hasan shahih)',
  },

  '2:222': {
    surah: 2,
    ayah: 222,
    title: 'Pertanyaan tentang haid dan adab suami-istri',
    context:
      'Sebagian sahabat bertanya tentang sikap terhadap istri saat haid, setelah mengetahui praktik berlebihan pada umat sebelumnya. Ayat ini turun menjelaskan adab yang seimbang: menjauhi jima saat haid, namun tetap bermuamalah baik.',
    hadith:
      'Dari Anas radhiyallahu anhu: Orang-orang Yahudi, jika istri mereka haid, mereka tidak makan bersama dan tidak tinggal serumah. Para sahabat bertanya kepada Nabi shallallahu alaihi wa sallam. Maka Allah menurunkan: "Mereka bertanya kepadamu tentang haid..." (QS. 2:222). Nabi bersabda agar tetap berinteraksi dengan istri, kecuali jima.',
    source: 'HR. Muslim no. 302',
    referenceLinks: ['https://sunnah.com/muslim:302'],
  },

  '2:144': {
    surah: 2,
    ayah: 144,
    title: 'Peralihan kiblat ke Ka\'bah',
    context:
      'Kaum muslimin awalnya shalat menghadap Baitul Maqdis. Rasulullah shallallahu alaihi wa sallam berharap kiblat diarahkan ke Ka\'bah. Lalu Allah menurunkan ayat perintah beralih kiblat sebagai ujian ketaatan dan penyempurna syiar umat.',
    hadith:
      'Dari Ibnu Umar radhiyallahu anhuma: Saat orang-orang sedang shalat Subuh di Quba, datang seorang pemberi kabar bahwa kiblat telah dialihkan ke Ka\'bah. Mereka pun langsung berputar menghadap Ka\'bah dalam shalat.',
    source: 'HR. Muslim no. 526',
    referenceLinks: ['https://sunnah.com/muslim:526'],
  },

  '2:256': {
    surah: 2,
    ayah: 256,
    title: 'Tidak ada paksaan dalam agama',
    context:
      'Seorang lelaki dari Anshar (Ibnu Al-Hushain) memiliki dua putra yang telah memeluk agama Nasrani karena dipengaruhi oleh pedagang dari Syam sebelum Islam datang. Sang ayah ingin memaksa keduanya masuk Islam dan bertanya kepada Nabi ﷺ.',
    hadith:
      'Dari Ibn Abbas radhiyallahu \'anhuma: "Ayat ini turun berkenaan dengan seorang lelaki Anshar dari Bani Salim ibn Auf yang bernama Al-Hushain. Ia memiliki dua putra yang beragama Nasrani. Ia berkata kepada Nabi ﷺ, \'Bolehkah aku memaksa mereka masuk Islam? Mereka menolak kecuali Nasrani.\' Maka Allah menurunkan: \'Tidak ada paksaan dalam (menganut) agama.\'"\n\nIbn Katsir berkata: "Meskipun ayat ini mempunyai sebab turun yang khusus, hukumnya berlaku umum. Iman adalah perkara hati yang tidak bisa dipaksakan."',
    source: 'HR. Abu Dawud no. 2682, Ibn Abi Hatim — shahih sanadnya',
  },

  // ── Ali Imran ───────────────────────────────────────────────────────────────

  '3:61': {
    surah: 3,
    ayah: 61,
    title: 'Mubahalah dengan delegasi Nasrani Najran',
    context:
      'Delegasi Nasrani dari Najran datang ke Madinah berdebat tentang Nabi Isa \'alaihissalam. Setelah hujjah tegak, Rasulullah ﷺ mengajak mereka bermubahalah (saling melaknat bersama keluarga masing-masing). Mereka menolak dan memilih membayar jizyah.',
    hadith:
      'Dari Hudzaifah radhiyallahu \'anhu: "Delegasi Nasrani Najran datang kepada Nabi ﷺ. Mereka berkata, \'Isa adalah anak Allah.\' Rasulullah ﷺ mendebat mereka hingga Allah menurunkan QS. 3:61. Rasulullah ﷺ pun memanggil Ali, Fatimah, Hasan, dan Husain, lalu berkata, \'Ya Allah, inilah keluargaku.\' Delegasi Najran bermusyawarah dan ketua mereka berkata, \'Jika kalian bermubahalah dengan orang ini, kalian akan binasa. Tidak ada Nasrani yang bermubahalah dengan seorang nabi melainkan mereka celaka.\' Akhirnya mereka sepakat membayar jizyah."',
    source: 'HR. Muslim no. 2404, At-Tirmidzi no. 2999',
    referenceLinks: ['https://sunnah.com/muslim:2404'],
  },

  // ── An-Nisa ─────────────────────────────────────────────────────────────────

  '4:11': {
    surah: 4,
    ayah: 11,
    title: 'Hukum waris — kasus putri Sa\'d ibn Rabi\'',
    context:
      'Sa\'d ibn Rabi\' gugur sebagai syahid di Perang Uhud. Saudaranya mengambil seluruh warisan karena menganggap perempuan tidak berhak waris. Istri Sa\'d mengadu kepada Nabi ﷺ karena anak-anaknya tidak mendapat bagian apa pun.',
    hadith:
      'Dari Jabir ibn Abdillah radhiyallahu \'anhu: "Istri Sa\'d ibn Rabi\' datang kepada Nabi ﷺ bersama dua putrinya dan berkata, \'Ya Rasulullah, ini adalah dua putri Sa\'d yang mati syahid di Uhud. Pamannya telah mengambil semua hartanya dan tidak menyisakan apa pun untuk mereka. Tidak ada yang menikahi mereka kecuali jika mereka memiliki harta.\' Nabi ﷺ bersabda, \'Allah akan memutuskan perkara ini.\' Kemudian turunlah ayat waris (4:11-12). Nabi ﷺ lalu memanggil pamannya dan berkata, \'Berikan kepada dua putri Sa\'d dua pertiga, kepada istrinya seperdelapan, dan sisanya untukmu.\'"',
    source: 'HR. Abu Dawud no. 2891, At-Tirmidzi no. 2092 (hasan shahih)',
  },

  '4:43': {
    surah: 4,
    ayah: 43,
    title: 'Larangan shalat dalam keadaan mabuk',
    context:
      'Sebelum khamr diharamkan secara total, seorang sahabat memimpin shalat Maghrib dalam keadaan mabuk dan salah membaca ayat. Peristiwa ini mendorong turunnya larangan shalat bagi yang sedang mabuk sebagai tahapan pengharaman khamr.',
    hadith:
      'Dari Ali ibn Abi Thalib radhiyallahu \'anhu: "Abdurrahman ibn Auf mengundang kami makan dan menghidangkan khamr. Kami pun minum hingga mabuk. Ketika waktu shalat tiba, mereka mendorongku menjadi imam. Aku membaca: \'Qul ya ayyuhal kafirun, la a\'budu ma ta\'budun, wa nahnu na\'budu ma ta\'budun.\' Maka Allah menurunkan ayat: \'Janganlah kamu mendekati shalat, sementara kamu dalam keadaan mabuk, sampai kamu mengerti apa yang kamu ucapkan...\'"',
    source: 'HR. Abu Dawud no. 3671, At-Tirmidzi no. 3026 (hasan)',
  },

  // ── Al-Maidah ───────────────────────────────────────────────────────────────

  '5:3': {
    surah: 5,
    ayah: 3,
    title: 'Penyempurnaan agama Islam di Arafah',
    context:
      'Ayat ini turun pada hari Jumat, hari Arafah, dalam Haji Wada\' (perpisahan) — haji terakhir Rasulullah ﷺ. Seorang Yahudi menyatakan kepada Umar bahwa ayat ini sangat agung hingga jika diturunkan kepada mereka, niscaya hari itu akan dijadikan hari raya.',
    hadith:
      'Dari Umar ibn Khattab radhiyallahu \'anhu: "Seorang Yahudi berkata kepadaku, \'Wahai Amirul Mukminin, ada satu ayat dalam kitabmu yang kamu baca. Seandainya ayat itu turun kepada kami orang Yahudi, niscaya kami jadikan hari turunnya sebagai hari raya.\' Aku berkata, \'Ayat mana?\' Ia menjawab, \'Pada hari ini telah Aku sempurnakan agamamu...\' (5:3). Umar berkata, \'Sungguh aku tahu kapan dan di mana ayat itu turun. Ia turun kepada Rasulullah ﷺ saat beliau berdiri di Arafah pada hari Jumat. Hari itu adalah hari raya kami (Idul Arafah dan Jumat) sekaligus.\'"',
    source: 'HR. Al-Bukhari no. 45, Muslim no. 3017',
    referenceLinks: ['https://sunnah.com/bukhari:45', 'https://sunnah.com/muslim:3017'],
  },

  // ── Al-Anfal ────────────────────────────────────────────────────────────────

  '8:1': {
    surah: 8,
    ayah: 1,
    title: 'Harta rampasan Perang Badr',
    context:
      'Setelah Perang Badr, para sahabat berselisih tentang pembagian harta rampasan (ghanimah). Yang bertempur di garis depan, yang berjaga, dan yang berdiri di sisi Nabi ﷺ masing-masing merasa lebih berhak. Ayat ini turun untuk menyelesaikan perselisihan dan menetapkan hak Allah dan Rasul-Nya atas ghanimah.',
    hadith:
      'Dari Ubadah ibn Ash-Shamit radhiyallahu \'anhu: "Kami para sahabat Badr berselisih tentang harta rampasan perang hingga akhlak kami memburuk. Maka Allah mencabut hal itu dari tangan kami dan menyerahkannya kepada Rasulullah ﷺ. Beliau membaginya secara merata di antara kaum Muslimin." Kemudian turunlah: "Mereka menanyakan kepadamu (Muhammad) tentang harta rampasan perang. Katakanlah: Harta rampasan perang itu milik Allah dan Rasul."',
    source: 'HR. Abu Dawud no. 2737, At-Tirmidzi no. 3079 (hasan)',
  },

  // ── An-Nur ──────────────────────────────────────────────────────────────────

  '24:11': {
    surah: 24,
    ayah: 11,
    ayahEnd: 20,
    title: 'Hadits Al-Ifk — fitnah atas Aisyah radhiyallahu \'anha',
    context:
      'Dalam perjalanan pulang dari Perang Bani Mustaliq, Aisyah tertinggal dari rombongan. Ia diantarkan pulang oleh Shafwan ibn Al-Mu\'aththal. Kaum munafik yang dipimpin Abdullah ibn Ubay menyebarkan fitnah keji tentang Aisyah. Selama satu bulan wahyu tidak turun, keluarga Nabi ﷺ dalam tekanan besar. Kemudian Allah menurunkan 10 ayat untuk membersihkan nama Aisyah.',
    hadith:
      'Dari Aisyah radhiyallahu \'anha — hadits panjang: "...Nabi ﷺ berdiri di mimbar dan bersabda, \'Wahai kaum Muslimin, siapakah yang akan membelaku dari seseorang yang telah menyakiti keluargaku? Demi Allah, aku tidak mengetahui tentang keluargaku kecuali kebaikan...\' Kemudian Allah menurunkan sepuluh ayat (24:11-20). Rasulullah ﷺ datang kepada kami dan membacakan wahyu itu. Maka Ayahku (Abu Bakar) berkata, \'Bangunlah dan pergi kepada beliau.\' Aku menjawab, \'Demi Allah, aku tidak akan beranjak dan tidak akan memuji kecuali Allah, karena Dialah yang menurunkan pembelaanku.\'"',
    source: 'HR. Al-Bukhari no. 4750, Muslim no. 2770',
    referenceLinks: ['https://sunnah.com/bukhari:4750', 'https://sunnah.com/muslim:2770'],
  },

  // ── Al-Ahzab ────────────────────────────────────────────────────────────────

  '33:37': {
    surah: 33,
    ayah: 37,
    title: 'Pernikahan Nabi ﷺ dengan Zainab bint Jahsy',
    context:
      'Zainab bint Jahsy adalah mantan istri Zaid ibn Haritsah, anak angkat Nabi ﷺ. Setelah Zaid menceraikannya, Nabi ﷺ mendapat wahyu untuk menikahinya guna menghapus tradisi jahiliyah yang menganggap anak angkat seperti anak kandung. Nabi ﷺ sempat menyembunyikan perintah ini karena takut cemooh manusia, lalu Allah menegurnya.',
    hadith:
      'Dari Anas ibn Malik radhiyallahu \'anhu: "Ketika Zaid ingin menceraikan Zainab, ia datang kepada Nabi ﷺ dan berkata, \'Aku akan menceraikan istriku.\' Nabi ﷺ bersabda, \'Pertahankanlah istrimu dan bertakwalah kepada Allah.\' Padahal Nabi ﷺ telah mengetahui (melalui wahyu) bahwa ia akan menikahinya. Itulah yang Allah maksud dalam: \'...dan kamu menyembunyikan di dalam hatimu apa yang Allah akan menyatakannya...\' Ketika Zaid menyelesaikan hajatnya (menceraikan Zainab), Allah menikahkan Nabi ﷺ dengannya dari langit."',
    source: 'HR. Al-Bukhari no. 7420, At-Tirmidzi no. 3213',
    referenceLinks: ['https://sunnah.com/bukhari:7420'],
  },

  '33:53': {
    surah: 33,
    ayah: 53,
    title: 'Turunnya ayat hijab pada walimah Zainab',
    context:
      'Pada walimah pernikahan Nabi ﷺ dengan Zainab bint Jahsy, beberapa tamu berlama-lama di dalam rumah dan berbicara tanpa memperhatikan keberadaan istri-istri Nabi ﷺ. Nabi ﷺ merasa tidak nyaman namun sungkan untuk meminta mereka pergi. Ayat ini turun menetapkan adab bertamu dan kewajiban hijab bagi ummahatul mukminin.',
    hadith:
      'Dari Anas ibn Malik radhiyallahu \'anhu: "Aku adalah orang yang paling mengetahui tentang ayat hijab. Ketika Zainab bint Jahsy dinikahkan dengan Nabi ﷺ... para undangan berkumpul dan tidak beranjak pergi. Nabi ﷺ bangkit, lalu duduk lagi. Kemudian turunlah ayat ini. Aku mengabarkan kepada orang-orang lalu mereka pun berdiri. Sejak saat itu ditetapkan hijab."',
    source: 'HR. Al-Bukhari no. 4791, Muslim no. 1428',
    referenceLinks: ['https://sunnah.com/bukhari:4791', 'https://sunnah.com/muslim:1428'],
  },

  // ── Al-Hujurat ──────────────────────────────────────────────────────────────

  '49:6': {
    surah: 49,
    ayah: 6,
    title: 'Tabayun — konfirmasi berita dari Al-Walid ibn Uqbah',
    context:
      'Nabi ﷺ mengutus Al-Walid ibn Uqbah untuk mengumpulkan zakat dari Bani Mustaliq. Bani Mustaliq menyambutnya dengan penuh hormat, namun Al-Walid menyangka mereka akan menyerangnya dan kembali melapor bohong. Nabi ﷺ hampir mengirim pasukan, lalu Allah menurunkan perintah tabayun.',
    hadith:
      'Dari Al-Harits ibn Dhirar Al-Khuza\'i radhiyallahu \'anhu: "Aku datang kepada Rasulullah ﷺ dan beliau mengajakku masuk Islam. Aku masuk Islam. Kemudian beliau mengajakku membayar zakat dan aku pun bersedia. Beliau berkata, \'Aku akan mengutus seseorang kepadamu pada waktu tertentu untuk mengambil zakat yang telah kamu kumpulkan.\' Beliau mengutus Al-Walid ibn Uqbah. Ketika ia datang dan kami keluar menyambutnya, ia ketakutan dan kembali ke Nabi ﷺ berkata, \'Bani Mustaliq menolak membayar zakat dan hendak menyerangku.\' Maka Allah menurunkan: \'Wahai orang-orang yang beriman, jika seorang fasik datang kepadamu membawa suatu berita, maka telitilah kebenarannya...\'"',
    source: 'HR. Ahmad (3/452), At-Thabrani — Ibn Katsir menshahihkannya',
  },

  '49:11': {
    surah: 49,
    ayah: 11,
    title: 'Larangan mengolok-olok dan memanggil dengan gelar buruk',
    context:
      'Nabi ﷺ mengharamkan nama-nama dan julukan jahiliyah yang merendahkan seseorang. Beberapa sahabat masih saling menyebut dengan nama-nama lama yang memalukan. Ayat ini turun untuk memutus tradisi itu.',
    hadith:
      'Dari Ibn Abbas radhiyallahu \'anhuma: "Dahulu seseorang di masa jahiliyah punya dua atau tiga nama. Bisa jadi seseorang memanggilnya dengan salah satu nama itu dan ia membenci nama tersebut. Maka Allah menurunkan: \'...dan janganlah kamu memanggil dengan gelar yang mengandung ejekan...\'"',
    source: 'HR. Abu Dawud no. 4962, At-Tirmidzi no. 3268',
  },

  // ── Al-Mujadilah ────────────────────────────────────────────────────────────

  '58:1': {
    surah: 58,
    ayah: 1,
    ayahEnd: 4,
    title: 'Zihar — pengaduan Khaulah bint Tsa\'labah',
    context:
      'Khaulah bint Tsa\'labah mengadu kepada Nabi ﷺ tentang suaminya, Aus ibn Ash-Shamit, yang mengucapkan zihar (perkataan: "Kamu bagiku seperti punggung ibuku," yang di masa jahiliyah berarti talak abadi). Khaulah menangis dan berdoa, lalu Allah mendengar pengaduannya dan menurunkan hukum kaffarah zihar.',
    hadith:
      'Dari Aisyah radhiyallahu \'anha: "Maha Suci Allah yang pendengarannya meliputi segala sesuatu. Aku mendengar sebagian perkataan Khaulah bint Tsa\'labah namun tersembunyi dariku ketika ia mengadu kepada Rasulullah ﷺ tentang suaminya. Ia berkata, \'Ya Rasulullah, ia telah menghabiskan masa mudaku dan aku telah melahirkan banyak anaknya. Kini setelah aku tua dan tidak melahirkan lagi, ia menjatuhkan zihar kepadaku...\' Aisyah berkata, \'Maka turunlah: Sungguh Allah telah mendengar perkataan perempuan yang mengajukan gugatan kepadamu...\'"',
    source: 'HR. Abu Dawud no. 2214, An-Nasa\'i no. 3460, Ibn Majah no. 2063',
  },

  '9:118': {
    surah: 9,
    ayah: 118,
    title: 'Taubat tiga sahabat yang tertinggal dari Tabuk',
    context:
      'Tiga sahabat yang jujur mengakui kesalahan karena tidak ikut Perang Tabuk: Ka\'b ibn Malik, Murarah ibn Rabi\', dan Hilal ibn Umayyah. Mereka diboikot sementara sampai Allah menerima taubat mereka.',
    hadith:
      'Ka\'b ibn Malik radhiyallahu anhu meriwayatkan kisah panjang tentang kejujuran beliau, masa boikot selama lima puluh hari, lalu turunnya ayat taubat (QS. 9:118).',
    source: 'HR. Al-Bukhari no. 4418',
    referenceLinks: ['https://sunnah.com/bukhari:4418'],
  },

  // ── At-Tahrim ───────────────────────────────────────────────────────────────

  '66:1': {
    surah: 66,
    ayah: 1,
    title: 'Nabi ﷺ mengharamkan sesuatu yang halal',
    context:
      'Rasulullah ﷺ pernah bersumpah untuk tidak makan madu lagi (atau tidak mendatangi Mariyah Al-Qibthiyyah — ada dua riwayat) untuk menyenangkan sebagian istrinya. Allah menegur Beliau karena mengharamkan yang dihalalkan Allah.',
    hadith:
      'Dari Aisyah radhiyallahu \'anha: "Nabi ﷺ biasa minum madu di rumah Zainab bint Jahsy dan bermalam di sana. Aku dan Hafshah sepakat bahwa siapapun yang didatangi beliau, kami akan berkata, \'Aku mencium bau maghafir (getah pohon berbau busuk) darimu.\' Maka Nabi ﷺ bersabda, \'Tidak, aku hanya minum madu di rumah Zainab. Aku tidak akan melakukannya lagi.\' Maka turunlah: \'Wahai Nabi, mengapa engkau mengharamkan apa yang dihalalkan Allah bagimu...\'"',
    source: 'HR. Al-Bukhari no. 4912, Muslim no. 1474',
    referenceLinks: ['https://sunnah.com/bukhari:4912', 'https://sunnah.com/muslim:1474'],
  },

  // ── Al-Isra ─────────────────────────────────────────────────────────────────

  '17:85': {
    surah: 17,
    ayah: 85,
    title: 'Pertanyaan orang Yahudi tentang ruh',
    context:
      'Orang-orang Yahudi menyuruh kaum Musyrikin Quraisy menanyakan kepada Nabi ﷺ tentang ruh. Jika beliau menjawab sesuai kitab mereka, ia adalah nabi. Jika tidak, ia bukan nabi. Wahyu turun menjelaskan bahwa ruh adalah urusan Allah semata.',
    hadith:
      'Dari Ibn Mas\'ud radhiyallahu \'anhu: "Aku berjalan bersama Nabi ﷺ di ladang Madinah. Beliau bersandar pada pelepah kurma. Sekelompok orang Yahudi lewat dan sebagian berkata, \'Tanyakanlah kepadanya tentang ruh.\' Mereka pun bertanya. Nabi ﷺ diam beberapa saat — aku tahu beliau sedang menerima wahyu — lalu turunlah: \'Dan mereka bertanya kepadamu (Muhammad) tentang ruh. Katakanlah: Ruh itu termasuk urusan Tuhanku, dan tidaklah kamu diberi pengetahuan kecuali sedikit.\'"',
    source: 'HR. Al-Bukhari no. 125, Muslim no. 2794',
    referenceLinks: ['https://sunnah.com/bukhari:125', 'https://sunnah.com/muslim:2794'],
  },

  // ── Al-Kahfi ────────────────────────────────────────────────────────────────

  '18:23': {
    surah: 18,
    ayah: 23,
    ayahEnd: 24,
    title: 'Larangan mengatakan "aku akan melakukan" tanpa "insya Allah"',
    context:
      'Orang-orang Quraisy bertanya kepada Nabi ﷺ tentang Ashabul Kahfi dan Dzulqarnayn. Nabi ﷺ berkata, "Aku akan memberitahu kalian besok," tanpa mengucapkan insya Allah. Wahyu tertunda selama beberapa hari, lalu turunlah ayat ini.',
    hadith:
      'Dari Ibn Abbas radhiyallahu \'anhuma: "Orang Quraisy mengutus An-Nadhr ibn Harits dan Uqbah ibn Abi Mu\'aith kepada pendeta Yahudi di Madinah untuk bertanya tentang Nabi ﷺ. Para pendeta berkata, \'Tanyakanlah tentang pemuda-pemuda yang pergi meninggalkan kaumnya, tentang seorang pengembara, dan tentang ruh.\' Ketika mereka bertanya, Nabi ﷺ bersabda, \'Besok aku akan mengabarkan kalian.\' Beliau lupa mengucapkan insya Allah. Wahyu tertunda selama lima belas hari. Beliau sangat sedih karena ini. Kemudian Jibril turun membawa surah Al-Kahfi dan ayat: \'Dan janganlah sekali-kali engkau mengatakan tentang sesuatu: Aku pasti melakukan itu besok, kecuali (dengan mengatakan) Insya Allah...\'"',
    source: 'HR. At-Tirmidzi no. 3141, Ibn Abi Hatim — hasan',
  },

  // ── Al-Alaq ─────────────────────────────────────────────────────────────────

  '96:1': {
    surah: 96,
    ayah: 1,
    ayahEnd: 5,
    title: 'Wahyu pertama turun di Gua Hira',
    context:
      'Ini adalah ayat yang pertama kali diturunkan kepada Nabi Muhammad ﷺ, di Gua Hira pada bulan Ramadhan, saat beliau berumur 40 tahun. Malaikat Jibril mendatangi beliau dan memeluknya tiga kali sebelum mewahyukan ayat-ayat ini.',
    hadith:
      'Dari Aisyah radhiyallahu \'anha: "Wahyu yang pertama kali datang kepada Rasulullah ﷺ adalah berupa mimpi yang benar dalam tidurnya. Tidaklah beliau bermimpi melainkan mimpi itu menjadi kenyataan seperti fajar menyingsing. Kemudian beliau diperintahkan untuk menyenangi kesendirian (di Gua Hira). Jibril mendatanginya dan berkata, \'Bacalah!\' Nabi bersabda, \'Aku tidak bisa membaca.\' Jibril memelukku hingga aku tidak berdaya, lalu melepaskanku dan berkata lagi, \'Bacalah!\' Setelah tiga kali, Jibril membacakan: \'Bacalah dengan (menyebut) nama Tuhanmu yang menciptakan...\' (96:1-5). Rasulullah ﷺ pulang dengan gemetar dan berkata kepada Khadijah, \'Selimuti aku! Selimuti aku!\'"',
    source: 'HR. Al-Bukhari no. 3, Muslim no. 160',
    referenceLinks: ['https://sunnah.com/bukhari:3', 'https://sunnah.com/muslim:160'],
  },

  // ── Al-Kautsar ──────────────────────────────────────────────────────────────

  '108:1': {
    surah: 108,
    ayah: 1,
    ayahEnd: 3,
    title: 'Jawaban atas ejekan Al-\'Ash ibn Wa\'il',
    context:
      'Al-\'Ash ibn Wa\'il As-Sahmi mengejek Nabi ﷺ dengan menyebutnya "abtar" (terputus keturunannya) setelah putra beliau, Abdullah/Ibrahim, meninggal dunia. Surah ini turun untuk menegaskan bahwa justru para pembenci Nabilah yang terputus kebaikannya.',
    hadith:
      'Dari Anas ibn Malik radhiyallahu \'anhu: "Ketika Nabi ﷺ sedang bersama kami, beliau mengantuk sebentar kemudian mengangkat kepalanya sambil tersenyum. Kami bertanya, \'Apa yang membuatmu tersenyum, ya Rasulullah?\' Beliau bersabda, \'Baru saja diturunkan kepadaku sebuah surah.\' Kemudian beliau membaca: Bismillahirrahmanirrahim — Inna a\'thayna kal kautsar... Kemudian beliau bersabda, \'Tahukah kalian apa itu Al-Kautsar?\' Kami berkata, \'Allah dan Rasul-Nya lebih tahu.\' Beliau bersabda, \'Itu adalah sebuah sungai yang Allah janjikan untukku di surga.\'"',
    source: 'HR. Muslim no. 400, Abu Dawud no. 784',
    referenceLinks: ['https://sunnah.com/muslim:400'],
  },

  // ── Al-Masad ────────────────────────────────────────────────────────────────

  '111:1': {
    surah: 111,
    ayah: 1,
    ayahEnd: 5,
    title: 'Sikap Abu Lahab dan istrinya terhadap dakwah Islam',
    context:
      'Ketika turun perintah untuk menyeru kerabat dekat (QS. 26:214), Nabi ﷺ naik ke bukit Shafa dan menyeru kabilah-kabilah Quraisy. Abu Lahab paman Nabi ﷺ menghina dan menolak dengan keras. Surah ini turun sebagai pengumuman kebinasaan Abu Lahab dan istrinya.',
    hadith:
      'Dari Ibn Abbas radhiyallahu \'anhuma: "Nabi ﷺ naik ke bukit Shafa dan berseru, \'Wahai keluarga Fulan! Wahai keluarga Fulan!\' menyebut berbagai kabilah Quraisy satu per satu. Ketika mereka berkumpul, beliau bersabda, \'Bagaimana pendapatmu jika aku kabarkan bahwa pasukan berkuda akan menyerang dari balik bukit ini?\' Mereka berkata, \'Kami tidak pernah mendapatimu berdusta.\' Beliau bersabda, \'Sesungguhnya aku adalah pemberi peringatan bagi kalian sebelum azab yang pedih menimpa kalian.\' Abu Lahab berkata, \'Celaka kamu! Apakah untuk ini kamu kumpulkan kami?\' Maka turunlah surah ini."',
    source: 'HR. Al-Bukhari no. 4770, Muslim no. 208',
    referenceLinks: ['https://sunnah.com/bukhari:4770', 'https://sunnah.com/muslim:208'],
  },

  // ── An-Nasr ─────────────────────────────────────────────────────────────────

  '110:1': {
    surah: 110,
    ayah: 1,
    ayahEnd: 3,
    title: 'Surah terakhir yang turun — pertanda wafatnya Nabi ﷺ',
    context:
      'An-Nasr adalah surah terakhir yang turun secara sempurna. Ketika Ibn Abbas mendengar Umar menangis setelah membacakan surah ini di hadapan para sahabat senior, ia menjelaskan bahwa surah ini adalah pertanda ajal Rasulullah ﷺ telah dekat.',
    hadith:
      'Dari Ibn Abbas radhiyallahu \'anhuma: "Umar ibn Khattab selalu mengajakku duduk bersama para sesepuh Badr. Sebagian dari mereka pernah berkata, \'Mengapa engkau mengajak anak muda ini? Kami pun punya anak sepertinya.\' Umar berkata, \'Ia termasuk orang yang kalian kenal.\' Suatu hari Umar mengajak mereka dan memanggil aku bersama mereka. Aku yakin hari itu Umar ingin menguji kami. Ia membaca: \'Apabila telah datang pertolongan Allah dan kemenangan...\' (110:1-3), dan bertanya tentang maknanya. Mereka berkata, \'Kita diperintahkan memuji Allah dan memohon ampun saat pertolongan dan kemenangan datang.\' Umar diam. Lalu ia bertanya kepadaku. Aku berkata, \'Surah itu adalah tanda ajal Rasulullah ﷺ. Allah memberitahu beliau bahwa saat kemenangan datang, itu adalah akhir tugasnya.\' Umar berkata, \'Aku pun berpendapat demikian.\'  Inilah surah terakhir yang turun sempurna."',
    source: 'HR. Al-Bukhari no. 4970',
    referenceLinks: ['https://sunnah.com/bukhari:4970'],
  },

};

/**
 * Mengambil semua data asbabun nuzul pada suatu surah.
 * Hanya mengembalikan entry utama (berdasarkan ayat awal / key utama).
 */
export function getAsbabunNuzulBySurah(surah: number): AsbabunNuzulEntry[] {
  return Object.values(ASBABUN_NUZUL)
    .filter(entry => entry.surah === surah)
    .sort((a, b) => a.ayah - b.ayah);
}

/**
 * Mengambil data asbabun nuzul untuk ayat tertentu.
 * Mengembalikan entry jika surah:ayah cocok (termasuk jika ayah masuk dalam range ayahEnd).
 */
export function getAsbabunNuzul(surah: number, ayah: number): AsbabunNuzulEntry | null {
  // Cek key langsung
  const key = `${surah}:${ayah}`;
  if (ASBABUN_NUZUL[key]) return ASBABUN_NUZUL[key];

  // Cek apakah ayat ini masuk dalam range suatu entry
  for (const entry of Object.values(ASBABUN_NUZUL)) {
    if (
      entry.surah === surah &&
      entry.ayahEnd &&
      ayah > entry.ayah &&
      ayah <= entry.ayahEnd
    ) {
      return entry;
    }
  }

  return null;
}
