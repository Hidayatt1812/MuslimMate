export interface DhikrItem {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  transliteration: string;
  target: number;
  category: 'pagi' | 'petang' | 'sholat' | 'umum' | 'khusus';
  source?: string;
  hadith?: string;
}

export interface DuaItem {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  transliteration?: string;
  category: string;
  source?: string;
  hadith?: string;
}

export const DHIKR_LIST: DhikrItem[] = [
  {
    id: 'subhanallah',
    title: 'Subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    translation: 'Maha Suci Allah',
    transliteration: 'Subhānallāh',
    target: 33,
    category: 'umum',
    source: 'HR. Muslim no. 597',
    hadith:
      'Rasulullah ﷺ bersabda: "Barangsiapa yang membaca Subhanallah 33x, Alhamdulillah 33x, dan Allahu Akbar 33x setelah setiap shalat... dosa-dosanya diampuni meskipun sebanyak buih lautan." (HR. Muslim no. 597)',
  },
  {
    id: 'alhamdulillah',
    title: 'Alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    translation: 'Segala Puji bagi Allah',
    transliteration: 'Alhamdulillāh',
    target: 33,
    category: 'umum',
    source: 'HR. Muslim no. 597',
    hadith:
      'Rasulullah ﷺ bersabda: "Kalimat alhamdulillah memenuhi timbangan (amal), dan subhanallah serta alhamdulillah memenuhi antara langit dan bumi." (HR. Muslim no. 223)',
  },
  {
    id: 'allahuakbar',
    title: 'Allahu Akbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    translation: 'Allah Maha Besar',
    transliteration: 'Allāhu Akbar',
    target: 33,
    category: 'umum',
    source: 'HR. Muslim no. 597',
    hadith:
      'Rasulullah ﷺ bersabda: "Apakah salah seorang di antara kamu tidak mampu mengerjakan seribu kebaikan setiap harinya? Yaitu dengan bertasbih seratus kali, maka akan dituliskan seribu kebaikan dan dihapuskan seribu keburukan." (HR. Muslim no. 2698)',
  },
  {
    id: 'la-ilaha-illallah',
    title: 'La Ilaha Illallah',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
    translation: 'Tidak ada Tuhan selain Allah',
    transliteration: 'Lā ilāha illallāh',
    target: 100,
    category: 'umum',
    source: 'HR. Bukhari no. 3293 & Muslim no. 2691',
    hadith:
      'Rasulullah ﷺ bersabda: "Barangsiapa mengucapkan Lā ilāha illallāh wahdahū lā syarīka lah... 100 kali dalam sehari, pahalanya seperti memerdekakan 10 budak, dicatat 100 kebaikan, dihapus 100 kesalahan, dan menjadi pelindung dari setan hari itu." (HR. Bukhari no. 3293)',
  },
  {
    id: 'istighfar',
    title: 'Istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    translation: 'Aku memohon ampun kepada Allah',
    transliteration: 'Astaghfirullāh',
    target: 100,
    category: 'umum',
    source: 'HR. Abu Dawud no. 1518',
    hadith:
      'Rasulullah ﷺ bersabda: "Barangsiapa membiasakan istighfar, Allah akan memberikan jalan keluar dari setiap kesempitan, kelapangan dari setiap kesusahan, dan rezeki dari arah yang tidak disangka-sangka." (HR. Abu Dawud no. 1518, dihasankan Al-Albani)',
  },
  {
    id: 'sholawat',
    title: 'Sholawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
    translation: 'Ya Allah, limpahkanlah sholawat kepada Muhammad',
    transliteration: 'Allāhumma ṣalli ʿalā Muḥammad',
    target: 10,
    category: 'umum',
    source: 'HR. Muslim no. 408',
    hadith:
      'Rasulullah ﷺ bersabda: "Barangsiapa bersholawat kepadaku satu kali, Allah akan bersholawat kepadanya sepuluh kali, dihapus sepuluh kesalahannya, dan diangkat sepuluh derajatnya." (HR. Muslim no. 408)',
  },
  {
    id: 'hauqalah',
    title: 'Hauqalah',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    translation: 'Tidak ada daya dan kekuatan kecuali dengan pertolongan Allah',
    transliteration: 'Lā ḥawla walā quwwata illā billāh',
    target: 100,
    category: 'umum',
    source: 'HR. Bukhari no. 6384',
    hadith:
      'Rasulullah ﷺ bersabda: "Lā ḥawla walā quwwata illā billāh adalah salah satu perbendaharaan surga." (HR. Bukhari no. 6384 & Muslim no. 2704)',
  },
  {
    id: 'tasbih-pagi',
    title: 'Tasbih Pagi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    translation: 'Maha Suci Allah dan segala puji bagi-Nya',
    transliteration: 'Subhānallāhi wabiḥamdihī',
    target: 100,
    category: 'pagi',
    source: 'HR. Bukhari no. 6405 & Muslim no. 2691',
    hadith:
      'Rasulullah ﷺ bersabda: "Barangsiapa mengucapkan Subhānallāhi wabiḥamdihī 100 kali di pagi dan sore hari, tidak ada yang datang pada hari kiamat dengan membawa yang lebih baik darinya, kecuali orang yang mengucapkan yang semisal atau yang lebih banyak." (HR. Muslim no. 2692)',
  },
  {
    id: 'tasbih-sholat',
    title: "Tasbih Ba'da Sholat",
    arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَاللَّهُ أَكْبَرُ',
    translation: 'Maha Suci Allah, Segala Puji bagi Allah, Allah Maha Besar',
    transliteration: 'Subhānallāh walhamdulillāh wallāhu akbar',
    target: 33,
    category: 'sholat',
    source: 'HR. Muslim no. 597',
    hadith:
      'Abu Hurairah r.a. meriwayatkan bahwa Rasulullah ﷺ bersabda: "Barangsiapa setiap selesai shalat bertasbih 33 kali, bertahmid 33 kali, bertakbir 33 kali... maka diampuni dosa-dosanya walaupun seperti buih lautan." (HR. Muslim no. 597)',
  },
];

export const DUA_LIST: DuaItem[] = [
  {
    id: 'doa-makan',
    title: 'Doa Sebelum Makan',
    arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ',
    translation: 'Dengan nama Allah dan atas berkah Allah',
    transliteration: 'Bismillāhi wa ʿalā barakātillāh',
    category: 'harian',
    source: 'HR. Abu Dawud no. 3767',
    hadith:
      'Rasulullah ﷺ bersabda: "Jika salah seorang di antara kamu makan, maka hendaklah ia menyebut nama Allah. Jika ia lupa menyebut nama Allah di awal, maka hendaklah ia mengucapkan: Bismillāhi awwalahū wa ākhirahū." (HR. Abu Dawud no. 3767, Tirmidzi no. 1858)',
  },
  {
    id: 'doa-selesai-makan',
    title: 'Doa Sesudah Makan',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    translation:
      'Segala puji bagi Allah yang telah memberi kami makan, minum, dan menjadikan kami Muslim',
    transliteration:
      'Alhamdulillāhillażī aṭʿamanā wa saqānā wa jaʿalanā muslimīn',
    category: 'harian',
    source: 'HR. Abu Dawud no. 3850, Tirmidzi no. 3457',
    hadith:
      'Mu\'adz bin Anas r.a. meriwayatkan bahwa Rasulullah ﷺ bersabda: "Barangsiapa selesai makan kemudian mengucapkan doa ini, maka diampuni dosanya yang telah lalu." (HR. Abu Dawud no. 3850, Tirmidzi no. 3457)',
  },
  {
    id: 'doa-tidur',
    title: 'Doa Sebelum Tidur',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    translation: 'Dengan nama-Mu Ya Allah, aku mati dan hidup',
    transliteration: 'Bismikallāhumma amūtu wa aḥyā',
    category: 'harian',
    source: 'HR. Bukhari no. 6312',
    hadith:
      'Dari Hudzaifah r.a.: "Apabila Nabi ﷺ hendak tidur, beliau meletakkan tangan kanannya di bawah pipinya kemudian berdoa: Bismikallāhumma amūtu wa aḥyā." (HR. Bukhari no. 6312)',
  },
  {
    id: 'doa-bangun-tidur',
    title: 'Doa Bangun Tidur',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    translation:
      'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami kembali',
    transliteration:
      'Alhamdulillāhillażī aḥyānā baʿda mā amātanā wa ilayhin-nusyūr',
    category: 'harian',
    source: 'HR. Bukhari no. 6312',
    hadith:
      'Dari Al-Bara\' bin \'Azib r.a.: "Nabi ﷺ apabila bangun tidur mengucapkan: Alhamdulillāhillażī aḥyānā ba\'da mā amātanā wa ilayhin-nusyūr." (HR. Bukhari no. 6312)',
  },
  {
    id: 'doa-masuk-rumah',
    title: 'Doa Masuk Rumah',
    arabic:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ',
    translation:
      'Ya Allah, sesungguhnya aku memohon kepada-Mu kebaikan tempat masuk dan kebaikan tempat keluar',
    category: 'harian',
    source: 'HR. Abu Dawud no. 5096',
    hadith:
      'Rasulullah ﷺ bersabda: "Apabila seseorang masuk ke dalam rumahnya dan menyebut nama Allah ketika masuk dan ketika makan, maka setan berkata: Tidak ada tempat bermalam dan tidak ada makan malam untuk kalian." (HR. Muslim no. 2018)',
  },
  {
    id: 'doa-keluar-rumah',
    title: 'Doa Keluar Rumah',
    arabic:
      'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    translation:
      'Dengan nama Allah, aku bertawakkal kepada Allah, tidak ada daya dan kekuatan kecuali dengan Allah',
    category: 'harian',
    source: 'HR. Abu Dawud no. 5095, Tirmidzi no. 3426',
    hadith:
      'Rasulullah ﷺ bersabda: "Apabila seseorang keluar dari rumahnya dan mengucapkan doa ini, maka dikatakan kepadanya: Engkau diberi kecukupan, engkau dilindungi, dan setan pun menjauh darinya." (HR. Abu Dawud no. 5095, dihasankan Al-Albani)',
  },
  {
    id: 'doa-masuk-masjid',
    title: 'Doa Masuk Masjid',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    translation: 'Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu',
    category: 'ibadah',
    source: 'HR. Muslim no. 713',
    hadith:
      'Dari Abu Humaid atau Abu Usaid r.a.: "Apabila salah seorang di antara kamu memasuki masjid, hendaklah ia mengucapkan: Allāhummaftaḥ lī abwāba raḥmatik." (HR. Muslim no. 713)',
  },
  {
    id: 'doa-qunut',
    title: 'Doa Qunut Subuh',
    arabic:
      'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ وَعَافِنِي فِيمَنْ عَافَيْتَ',
    translation:
      'Ya Allah, berilah aku petunjuk bersama orang-orang yang Engkau beri petunjuk, dan sehatkanlah aku bersama orang-orang yang Engkau sehatkan',
    category: 'ibadah',
    source: 'HR. Abu Dawud no. 1425, Tirmidzi no. 464',
    hadith:
      'Dari Al-Hasan bin Ali r.a.: "Rasulullah ﷺ mengajariku beberapa kalimat yang aku ucapkan dalam qunut shalat witir: Allāhummahdinī fīman hadayt..." (HR. Abu Dawud no. 1425, Tirmidzi no. 464, dihasankan Al-Albani)',
  },
  {
    id: 'doa-bercermin',
    title: 'Doa Melihat Cermin',
    arabic: 'اللَّهُمَّ أَنْتَ حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي',
    translation:
      'Ya Allah, Engkau telah memperindah penciptaanku, maka perindahlah akhlakku',
    category: 'harian',
    source: 'HR. Ahmad no. 3759, Ibnu Hibban no. 959',
    hadith:
      'Dari Ibnu Mas\'ud r.a.: "Nabi ﷺ apabila melihat cermin beliau mengucapkan: Allāhumma anta ḥassanta khalqī faḥassin khuluqī." (HR. Ahmad no. 3759, dinyatakan hasan oleh para ulama hadits)',
  },
  {
    id: 'doa-naik-kendaraan',
    title: 'Doa Naik Kendaraan',
    arabic:
      'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ',
    translation:
      'Maha Suci (Allah) yang telah menundukkan semua ini bagi kami, padahal kami sebelumnya tidak mampu menguasainya',
    category: 'harian',
    source: 'HR. Abu Dawud no. 2602, Tirmidzi no. 3447',
    hadith:
      'Dari Ali bin Rabi\'ah: "Aku menyaksikan Ali r.a. ketika dibawakan seekor hewan tunggangannya... kemudian ia membaca doa naik kendaraan ini, lalu berkata: Demikianlah yang aku lihat Rasulullah ﷺ lakukan." (HR. Abu Dawud no. 2602, Tirmidzi no. 3447)',
  },
];
