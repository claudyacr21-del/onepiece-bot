const battleCard = (data) => ({
  displayName: data.name,
  cardRole: "battle",
  boostType: null,
  boostValue: 0,
  boostTarget: null,
  boostDescription: "",
  image: "",
  ...data
});

const boostCard = (data) => ({
  displayName: data.name,
  cardRole: "boost",
  type: "Passive",
  atk: 0,
  hp: 0,
  speed: 0,
  weapon: "None",
  devilFruit: "None",
  equipType: "Passive",
  image: "",
  ...data
});

const BASE_CARDS = [
  // =========================
  // East Blue / Early Saga
  // =========================
  battleCard({ id: 1, code: "luffy_straw_hat", name: "Monkey D. Luffy", title: "Straw Hat", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Captain", atk: 120, hp: 900, speed: 80, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Nika", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 2, code: "zoro_pirate_hunter", name: "Roronoa Zoro", title: "Pirate Hunter", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Three Sword Style", type: "Attacker", atk: 130, hp: 850, speed: 75, weapon: "Wado Ichimonji", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 3, code: "nami_cat_burglar", name: "Nami", title: "Cat Burglar", rarity: "B", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Support", atk: 80, hp: 600, speed: 95, weapon: "Basic Staff", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 4, code: "usopp_sniper", name: "Usopp", title: "Sniper", rarity: "B", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Ranged", atk: 85, hp: 620, speed: 88, weapon: "Basic Slingshot", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 5, code: "sanji_black_leg", name: "Sanji", title: "Black Leg", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Speed Fighter", atk: 125, hp: 820, speed: 90, weapon: "Black Leg Combat Shoes", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 6, code: "koby_aspiring_marine", name: "Koby", title: "Aspiring Marine", rarity: "C", arc: "East Blue", faction: "Marines", variant: "Early Days", type: "Support", atk: 52, hp: 520, speed: 70, weapon: "None", devilFruit: "None", equipType: "None", image: "" }),
  battleCard({ id: 7, code: "alvida_iron_club", name: "Alvida", title: "Iron Club", rarity: "C", arc: "East Blue", faction: "Alvida Pirates", variant: "Base", type: "Bruiser", atk: 68, hp: 740, speed: 42, weapon: "Basic Iron Club", devilFruit: "Sube Sube no Mi", equipType: "Weapon", image: "" }),
  battleCard({ id: 8, code: "morgan_axe_hand", name: "Morgan", title: "Axe-Hand", rarity: "C", arc: "East Blue", faction: "Marines", variant: "Captain", type: "Bruiser", atk: 72, hp: 760, speed: 45, weapon: "Basic Marine Saber", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 9, code: "helmeppo_spoiled_brat", name: "Helmeppo", title: "Spoiled Brat", rarity: "C", arc: "East Blue", faction: "Marines", variant: "Early Days", type: "Speed Fighter", atk: 48, hp: 500, speed: 62, weapon: "Basic Marine Saber", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 10, code: "buggy_the_clown", name: "Buggy", title: "The Clown", rarity: "B", arc: "East Blue", faction: "Buggy Pirates", variant: "Chop-Chop Fruit", type: "Trickster", atk: 95, hp: 760, speed: 70, weapon: "Dual Daggers", devilFruit: "Bara Bara no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 11, code: "kuro_hundred_plans", name: "Kuro", title: "Of a Hundred Plans", rarity: "B", arc: "East Blue", faction: "Black Cat Pirates", variant: "Shakushi", type: "Assassin", atk: 102, hp: 700, speed: 96, weapon: "Cat Claws", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 12, code: "jango_hypnotist", name: "Jango", title: "Hypnotist", rarity: "C", arc: "East Blue", faction: "Black Cat Pirates", variant: "Hypnosis", type: "Control", atk: 56, hp: 540, speed: 73, weapon: "Hypnosis Ring", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 13, code: "don_krieg_admiral", name: "Don Krieg", title: "Admiral", rarity: "B", arc: "East Blue", faction: "Krieg Pirates", variant: "Battle Armor", type: "Tank", atk: 105, hp: 880, speed: 55, weapon: "Wootz Steel Spear", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 14, code: "gin_man_demon", name: "Gin", title: "Man-Demon", rarity: "B", arc: "East Blue", faction: "Krieg Pirates", variant: "Tonfa Master", type: "Fighter", atk: 98, hp: 760, speed: 82, weapon: "Tonfa", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 15, code: "arlong_saw", name: "Arlong", title: "Saw", rarity: "A", arc: "East Blue", faction: "Arlong Pirates", variant: "Fish-Man", type: "Bruiser", atk: 135, hp: 980, speed: 68, weapon: "Kiribachi", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 16, code: "hatchan_six_sword_style", name: "Hatchan", title: "Six-Sword Style", rarity: "B", arc: "East Blue", faction: "Arlong Pirates", variant: "Octopus Swordsman", type: "Attacker", atk: 92, hp: 780, speed: 66, weapon: "Six Swords", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 17, code: "smoker_white_hunter", name: "Smoker", title: "White Hunter", rarity: "A", arc: "Loguetown", faction: "Marines", variant: "Smoke-Smoke Fruit", type: "Control", atk: 128, hp: 930, speed: 82, weapon: "Jitte", devilFruit: "Moku Moku no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 18, code: "tashigi_swordswoman", name: "Tashigi", title: "Swordswoman", rarity: "B", arc: "Loguetown", faction: "Marines", variant: "Base", type: "Attacker", atk: 92, hp: 720, speed: 78, weapon: "Basic Marine Saber", devilFruit: "None", equipType: "Weapon", image: "" }),

  // =========================
  // Passive / Boost cards
  // =========================
  boostCard({ id: 19, code: "chopper_cotton_candy_lover", name: "Tony Tony Chopper", title: "Cotton Candy Lover", rarity: "A", arc: "Drum Island", faction: "Straw Hat Pirates", variant: "Doctor Support", boostType: "daily", boostValue: 2, boostTarget: "account", boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "Hito Hito no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 20, code: "kaya_medical_patron", name: "Kaya", title: "Medical Patron", rarity: "C", arc: "East Blue", faction: "Syrup Village", variant: "Storage Support", boostType: "fragmentStorage", boostValue: 50, boostTarget: "account", boostDescription: "Increase fragment storage by 50 passively.", devilFruit: "Storage Blessing Fruit", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 21, code: "bepo_navigator_support", name: "Bepo", title: "Navigator Support", rarity: "B", arc: "Zou", faction: "Heart Pirates", variant: "Mink Support", boostType: "spd", boostValue: 4, boostTarget: "team", boostDescription: "Increase team SPD by 4% passively.", devilFruit: "Mink Sprint Fruit", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 22, code: "killer_massacre_soldier", name: "Killer", title: "Massacre Soldier", rarity: "A", arc: "Wano", faction: "Kid Pirates", variant: "Support Tactics", boostType: "dmg", boostValue: 6, boostTarget: "team", boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 23, code: "marco_phoenix", name: "Marco", title: "The Phoenix", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Support Commander", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Increase team HP by 8% passively.", devilFruit: "Tori Tori no Mi, Model: Phoenix", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 24, code: "ben_beckman", name: "Benn Beckman", title: "First Mate", rarity: "S", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Strategic Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 25, code: "charlotte_pudding", name: "Charlotte Pudding", title: "Three-Eyed Girl", rarity: "A", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Memory Support", boostType: "exp", boostValue: 8, boostTarget: "account", boostDescription: "Increase EXP gain by 8% passively.", devilFruit: "Memo Memo no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 26, code: "mansherry_healing_princess", name: "Mansherry", title: "Healing Princess", rarity: "A", arc: "Dressrosa", faction: "Tontatta Kingdom", variant: "Healing Support", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Chiyu Chiyu no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 27, code: "vegapunk_stella", name: "Vegapunk", title: "Stella", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Greatest Brain", boostType: "atk", boostValue: 12, boostTarget: "team", boostDescription: "Increase team ATK by 12% passively.", devilFruit: "Nomi Nomi no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 28, code: "lindbergh_revolutionary_genius", name: "Lindbergh", title: "Revolutionary Genius", rarity: "S", arc: "Final Saga", faction: "Revolutionary Army", variant: "Tech Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Increase team SPD by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 29, code: "doc_q_sickly_support", name: "Doc Q", title: "Sickly Support", rarity: "B", arc: "Blackbeard Pirates", faction: "Blackbeard Pirates", variant: "Dark Medicine", boostType: "exp", boostValue: 4, boostTarget: "account", boostDescription: "Increase EXP gain by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 30, code: "shirahoshi_sea_princess", name: "Shirahoshi", title: "Sea Princess", rarity: "S", arc: "Fish-Man Island", faction: "Ryugu Kingdom", variant: "Storage Blessing", boostType: "fragmentStorage", boostValue: 50, boostTarget: "account", boostDescription: "Increase fragment storage by 50 passively.", devilFruit: "Storage Blessing Fruit", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 31, code: "hiyori_festival_support", name: "Kozuki Hiyori", title: "Festival Support", rarity: "B", arc: "Wano", faction: "Wano", variant: "Resource Blessing", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 32, code: "carina_treasure_hunter", name: "Carina", title: "Treasure Hunter", rarity: "B", arc: "Film Gold", faction: "Independent", variant: "Treasure Support", boostType: "fragmentStorage", boostValue: 50, boostTarget: "account", boostDescription: "Increase fragment storage by 50 passively.", devilFruit: "Storage Blessing Fruit", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 33, code: "kalifa_cp9_support", name: "Kalifa", title: "CP9 Support", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Efficient Support", boostType: "exp", boostValue: 6, boostTarget: "account", boostDescription: "Increase EXP gain by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 34, code: "baccarat_lucky_draw", name: "Baccarat", title: "Lucky Draw", rarity: "S", arc: "Film Gold", faction: "Gran Tesoro", variant: "Fortune Support", boostType: "pullChance", boostValue: 2, boostTarget: "account", boostDescription: "Increase pull chance by 2 steps passively. Only the highest pull chance boost applies.", devilFruit: "Fortuna Fortuna Fruit", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 35, code: "trebol_underworld_support", name: "Trebol", title: "Underworld Support", rarity: "B", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "Sticky Planner", boostType: "dmg", boostValue: 3, boostTarget: "team", boostDescription: "Increase team damage by 3% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 36, code: "tsuru_tactical_support", name: "Tsuru", title: "Great Staff Officer", rarity: "S", arc: "Marines", faction: "Marines", variant: "Tactical Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),

  // =========================
  // Remaining battle cards
  // =========================
  battleCard({ id: 37, code: "vivi_princess", name: "Nefertari Vivi", title: "Princess", rarity: "B", arc: "Alabasta", faction: "Alabasta Kingdom", variant: "Base", type: "Support", atk: 60, hp: 610, speed: 78, weapon: "Peacock Slasher", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 38, code: "crocodile_desert_king", name: "Crocodile", title: "Desert King", rarity: "S", arc: "Alabasta", faction: "Baroque Works", variant: "Sand-Sand Fruit", type: "Control", atk: 170, hp: 1100, speed: 84, weapon: "Golden Hook", devilFruit: "Suna Suna no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 39, code: "nico_robin_devil_child", name: "Nico Robin", title: "Devil Child", rarity: "A", arc: "Alabasta", faction: "Straw Hat Pirates", variant: "Miss All Sunday", type: "Control", atk: 118, hp: 760, speed: 90, weapon: "None", devilFruit: "Hana Hana no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 40, code: "bon_clay", name: "Bentham", title: "Bon Clay", rarity: "A", arc: "Alabasta", faction: "Baroque Works", variant: "Mr. 2", type: "Fighter", atk: 138, hp: 900, speed: 88, weapon: "Ballet Shoes", devilFruit: "Mane Mane no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 41, code: "daz_bonez", name: "Daz Bonez", title: "Mr. 1", rarity: "A", arc: "Alabasta", faction: "Baroque Works", variant: "Blade Body", type: "Attacker", atk: 145, hp: 990, speed: 70, weapon: "None", devilFruit: "Supa Supa no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 42, code: "wapol", name: "Wapol", title: "Tyrant King", rarity: "B", arc: "Drum Island", faction: "Drum Kingdom", variant: "Munch-Munch Fruit", type: "Tank", atk: 96, hp: 950, speed: 48, weapon: "None", devilFruit: "Baku Baku no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 43, code: "mr3", name: "Galdino", title: "Mr. 3", rarity: "B", arc: "Little Garden", faction: "Baroque Works", variant: "Wax Master", type: "Control", atk: 90, hp: 720, speed: 60, weapon: "None", devilFruit: "Doru Doru no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 44, code: "enel_god", name: "Enel", title: "God", rarity: "S", arc: "Skypiea", faction: "God's Army", variant: "Lightning God", type: "Burst", atk: 185, hp: 1080, speed: 98, weapon: "Golden Staff", devilFruit: "Goro Goro no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 45, code: "wyper_shandian_warrior", name: "Wyper", title: "Shandian Warrior", rarity: "A", arc: "Skypiea", faction: "Shandians", variant: "Burn Bazooka", type: "Attacker", atk: 142, hp: 940, speed: 86, weapon: "Burn Bazooka", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 46, code: "gan_fall", name: "Gan Fall", title: "Sky Knight", rarity: "B", arc: "Skypiea", faction: "Skypiea", variant: "Knight", type: "Tank", atk: 95, hp: 860, speed: 58, weapon: "Lance", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 47, code: "franky_cyborg", name: "Franky", title: "Cyborg", rarity: "A", arc: "Water 7", faction: "Straw Hat Pirates", variant: "Base", type: "Bruiser", atk: 140, hp: 1020, speed: 65, weapon: "Franky Iron Gauntlet", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 48, code: "lucci_cp9", name: "Rob Lucci", title: "CP9", rarity: "S", arc: "Enies Lobby", faction: "World Government", variant: "Leopard", type: "Assassin", atk: 188, hp: 1120, speed: 95, weapon: "Rokushiki", devilFruit: "Neko Neko no Mi, Model: Leopard", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 49, code: "kaku_cp9", name: "Kaku", title: "CP9", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Giraffe", type: "Attacker", atk: 150, hp: 980, speed: 82, weapon: "Four-Sword Style", devilFruit: "Ushi Ushi no Mi, Model: Giraffe", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 50, code: "brook_soul_king", name: "Brook", title: "Soul King", rarity: "A", arc: "Thriller Bark", faction: "Straw Hat Pirates", variant: "Base", type: "Speed Fighter", atk: 136, hp: 810, speed: 97, weapon: "Soul Solid", devilFruit: "Yomi Yomi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 51, code: "gecko_moria", name: "Gecko Moria", title: "Shadow's Asgard", rarity: "S", arc: "Thriller Bark", faction: "Thriller Bark Pirates", variant: "Shadow Master", type: "Summoner", atk: 176, hp: 1180, speed: 62, weapon: "Scissors", devilFruit: "Kage Kage no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 52, code: "bartholomew_kuma", name: "Bartholomew Kuma", title: "Tyrant", rarity: "S", arc: "Thriller Bark", faction: "Revolutionary Army", variant: "Pacifista Prototype", type: "Tank", atk: 182, hp: 1260, speed: 68, weapon: "None", devilFruit: "Nikyu Nikyu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 53, code: "boa_hancock", name: "Boa Hancock", title: "Pirate Empress", rarity: "S", arc: "Amazon Lily", faction: "Kuja Pirates", variant: "Love-Love Fruit", type: "Control", atk: 180, hp: 1060, speed: 92, weapon: "Perfume Femur", devilFruit: "Mero Mero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 54, code: "jinbe_first_son_of_the_sea", name: "Jinbe", title: "First Son of the Sea", rarity: "S", arc: "Marineford", faction: "Straw Hat Pirates", variant: "Fish-Man Karate", type: "Tank", atk: 172, hp: 1200, speed: 72, weapon: "None", devilFruit: "None", equipType: "None", image: "" }),
  battleCard({ id: 55, code: "ace_fire_fist", name: "Portgas D. Ace", title: "Fire Fist", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Flame Emperor", type: "Burst", atk: 165, hp: 980, speed: 94, weapon: "None", devilFruit: "Mera Mera no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 56, code: "whitebeard_strongest_man", name: "Edward Newgate", title: "Whitebeard", rarity: "UR", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Strongest Man", type: "Legend", atk: 230, hp: 1450, speed: 70, weapon: "Murakumogiri", devilFruit: "Gura Gura no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 57, code: "garp_hero_of_the_marines", name: "Monkey D. Garp", title: "Hero of the Marines", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Fist of Love", type: "Bruiser", atk: 205, hp: 1320, speed: 78, weapon: "None", devilFruit: "None", equipType: "None", image: "" }),
  battleCard({ id: 58, code: "sengoku_buddha", name: "Sengoku", title: "The Buddha", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Golden Buddha", type: "Tank", atk: 196, hp: 1380, speed: 68, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Daibutsu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 59, code: "akainu", name: "Sakazuki", title: "Akainu", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Magma Admiral", type: "Burst", atk: 220, hp: 1400, speed: 74, weapon: "None", devilFruit: "Magu Magu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 60, code: "aokiji", name: "Kuzan", title: "Aokiji", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Ice Admiral", type: "Control", atk: 212, hp: 1380, speed: 76, weapon: "None", devilFruit: "Hie Hie no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 61, code: "kizaru", name: "Borsalino", title: "Kizaru", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Light Admiral", type: "Speed Fighter", atk: 218, hp: 1320, speed: 100, weapon: "None", devilFruit: "Pika Pika no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 62, code: "blackbeard_emperor_of_darkness", name: "Marshall D. Teach", title: "Blackbeard", rarity: "UR", arc: "Marineford", faction: "Blackbeard Pirates", variant: "Dark Emperor", type: "Legend", atk: 238, hp: 1480, speed: 66, weapon: "None", devilFruit: "Yami Yami no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 63, code: "luffy_gear4", name: "Monkey D. Luffy", title: "Gear Fourth", rarity: "S", arc: "Dressrosa", faction: "Straw Hat Pirates", variant: "Boundman", type: "Burst", atk: 198, hp: 1280, speed: 88, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Nika", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 64, code: "zoro_demon_aura", name: "Roronoa Zoro", title: "Demon Aura", rarity: "S", arc: "Wano", faction: "Straw Hat Pirates", variant: "King of Hell", type: "Attacker", atk: 210, hp: 1240, speed: 82, weapon: "Enma", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 65, code: "law_surgeon_of_death", name: "Trafalgar D. Water Law", title: "Surgeon of Death", rarity: "S", arc: "Dressrosa", faction: "Heart Pirates", variant: "Room Master", type: "Control", atk: 188, hp: 1120, speed: 95, weapon: "Kikoku", devilFruit: "Ope Ope no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 66, code: "kid_captain", name: "Eustass Kid", title: "Captain", rarity: "S", arc: "Wano", faction: "Kid Pirates", variant: "Magnet Master", type: "Bruiser", atk: 194, hp: 1240, speed: 80, weapon: "Metal Arm", devilFruit: "Jiki Jiki no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 67, code: "doflamingo_heavenly_demon", name: "Donquixote Doflamingo", title: "Heavenly Demon", rarity: "S", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "Awakened Strings", type: "Control", atk: 210, hp: 1280, speed: 93, weapon: "None", devilFruit: "Ito Ito no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 68, code: "sabo_flame_emperor", name: "Sabo", title: "Flame Emperor", rarity: "S", arc: "Dressrosa", faction: "Revolutionary Army", variant: "Flame Dragon King", type: "Burst", atk: 178, hp: 1020, speed: 96, weapon: "Dragon Claw", devilFruit: "Mera Mera no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 69, code: "fujitora", name: "Issho", title: "Fujitora", rarity: "S", arc: "Dressrosa", faction: "Marines", variant: "Gravity Admiral", type: "Control", atk: 206, hp: 1360, speed: 70, weapon: "Shikomizue", devilFruit: "Zushi Zushi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 70, code: "caesar_clown", name: "Caesar Clown", title: "Master of Gas", rarity: "A", arc: "Punk Hazard", faction: "Caesar's Gang", variant: "Gas Logia", type: "Control", atk: 158, hp: 980, speed: 76, weapon: "None", devilFruit: "Gasu Gasu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 71, code: "katakuri_strongest_sweet_commander", name: "Charlotte Katakuri", title: "Strongest Sweet Commander", rarity: "S", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Future Sight", type: "Assassin", atk: 222, hp: 1340, speed: 99, weapon: "Mogura", devilFruit: "Mochi Mochi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 72, code: "big_mom_emperor", name: "Charlotte Linlin", title: "Big Mom", rarity: "UR", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Soul Sovereign", type: "Legend", atk: 245, hp: 1550, speed: 74, weapon: "Napoleon", devilFruit: "Soru Soru no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 73, code: "king_wildfire", name: "King", title: "The Wildfire", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Lunarian", type: "Tank", atk: 190, hp: 1240, speed: 84, weapon: "Katana", devilFruit: "Ryu Ryu no Mi, Model: Pteranodon", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 74, code: "queen_the_plague", name: "Queen", title: "The Plague", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Cyber Dino", type: "Bruiser", atk: 186, hp: 1320, speed: 67, weapon: "Plague Launcher", devilFruit: "Ryu Ryu no Mi, Model: Brachiosaurus", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 75, code: "jack_the_drought", name: "Jack", title: "The Drought", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Mammoth", type: "Tank", atk: 182, hp: 1360, speed: 60, weapon: "Twin Scythes", devilFruit: "Zou Zou no Mi, Model: Mammoth", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 76, code: "yamato_oni_princess", name: "Yamato", title: "Oni Princess", rarity: "S", arc: "Wano", faction: "Wano", variant: "Guardian Wolf", type: "Bruiser", atk: 215, hp: 1290, speed: 91, weapon: "Kanabo", devilFruit: "Inu Inu no Mi, Model: Okuchi no Makami", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 77, code: "kaido_strongest_creature", name: "Kaido", title: "Strongest Creature", rarity: "UR", arc: "Wano", faction: "Beasts Pirates", variant: "Azure Dragon", type: "Legend", atk: 260, hp: 1700, speed: 80, weapon: "Kanabo", devilFruit: "Uo Uo no Mi, Model: Seiryu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 78, code: "greenbull", name: "Aramaki", title: "Ryokugyu", rarity: "S", arc: "Wano", faction: "Marines", variant: "Forest Admiral", type: "Control", atk: 204, hp: 1400, speed: 68, weapon: "None", devilFruit: "Mori Mori no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 80, code: "luffy_sun_god_nika", name: "Monkey D. Luffy", title: "Sun God Nika", rarity: "UR", arc: "Wano", faction: "Straw Hat Pirates", variant: "Gear Fifth", type: "Mythical", atk: 255, hp: 1480, speed: 108, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Nika", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 81, code: "shanks_red_hair", name: "Shanks", title: "Red-Hair", rarity: "UR", arc: "Legend", faction: "Red Hair Pirates", variant: "Emperor", type: "Legend", atk: 248, hp: 1460, speed: 104, weapon: "Gryphon", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 82, code: "mihawk_hawk_eyes", name: "Dracule Mihawk", title: "Hawk-Eyes", rarity: "UR", arc: "Legend", faction: "Cross Guild", variant: "World's Strongest Swordsman", type: "Legend", atk: 252, hp: 1380, speed: 102, weapon: "Yoru", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 83, code: "roger_king_of_the_pirates", name: "Gol D. Roger", title: "King of the Pirates", rarity: "UR", arc: "Legend", faction: "Roger Pirates", variant: "Conqueror", type: "Legend", atk: 270, hp: 1600, speed: 102, weapon: "Ace", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 84, code: "xebec_captain_of_rocks", name: "Rocks D. Xebec", title: "Captain of Rocks", rarity: "UR", arc: "Legend", faction: "Rocks Pirates", variant: "Chaos Incarnate", type: "Legend", atk: 280, hp: 1650, speed: 96, weapon: "Eclipse", devilFruit: "Unknown", equipType: "Weapon", image: "" }),
  battleCard({ id: 85, code: "dragon_revolutionary_leader", name: "Monkey D. Dragon", title: "Supreme Commander", rarity: "UR", arc: "Final Saga", faction: "Revolutionary Army", variant: "Leader", type: "Legend", atk: 246, hp: 1500, speed: 98, weapon: "None", devilFruit: "Unknown", equipType: "None", image: "" }),
  battleCard({ id: 87, code: "saturn", name: "Saint Jaygarcia Saturn", title: "Warrior God of Science and Defense", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Elder Form", type: "Final Saga", atk: 244, hp: 1520, speed: 88, weapon: "None", devilFruit: "Ushi Ushi no Mi, Model: Gyuki", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 88, code: "mars", name: "Saint Marcus Mars", title: "Warrior God of Environment", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Elder Form", type: "Final Saga", atk: 242, hp: 1500, speed: 90, weapon: "None", devilFruit: "Tori Tori no Mi, Model: Itsumade", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 89, code: "warcury", name: "Saint Topman Warcury", title: "Warrior God of Justice", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Elder Form", type: "Final Saga", atk: 240, hp: 1580, speed: 80, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Fengxi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 90, code: "nusjuro", name: "Saint Ethanbaron V. Nusjuro", title: "Warrior God of Finance", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Elder Form", type: "Final Saga", atk: 248, hp: 1460, speed: 96, weapon: "Cursed Blade", devilFruit: "Uma Uma no Mi, Model: Bakotsu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 91, code: "ju_peter", name: "Saint Shepherd Ju Peter", title: "Warrior God of Agriculture", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Elder Form", type: "Final Saga", atk: 238, hp: 1540, speed: 86, weapon: "None", devilFruit: "Mushi Mushi no Mi, Model: Sandworm", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 92, code: "imu", name: "St. Nerona Imu", title: "King of the World", rarity: "UR", arc: "Final Saga", faction: "World Government", variant: "Sovereign of the Empty Throne", type: "Final Saga", atk: 300, hp: 1750, speed: 108, weapon: "Unknown", devilFruit: "Akuma no Mi", equipType: "None", image: "" }),
  battleCard({ id: 93, code: "garling", name: "Figarland Garling", title: "God's Knight Supreme Commander", rarity: "UR", arc: "Final Saga", faction: "World Government", variant: "Holy Knight", type: "Final Saga", atk: 236, hp: 1460, speed: 94, weapon: "Sacred Blade", devilFruit: "Unknown", equipType: "Weapon", image: "" }),
  battleCard({ id: 94, code: "loki", name: "Loki", title: "Prince of Elbaf", rarity: "UR", arc: "Elbaf", faction: "Elbaf Royal Family", variant: "Accursed Prince", type: "Mythical", atk: 250, hp: 1520, speed: 98, weapon: "Ragnir", devilFruit: "Ryu Ryu no Mi, Model: Nidhoggr", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 95, code: "rayleigh_dark_king", name: "Silvers Rayleigh", title: "Dark King", rarity: "UR", arc: "Legend", faction: "Roger Pirates", variant: "First Mate", type: "Legend", atk: 244, hp: 1440, speed: 100, weapon: "Sword", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 96, code: "oden", name: "Kozuki Oden", title: "Daimyo of Kuri", rarity: "UR", arc: "Wano", faction: "Wano", variant: "Legendary Samurai", type: "Legend", atk: 246, hp: 1420, speed: 94, weapon: "Enma", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 97, code: "sanji_ifrit_jambe", name: "Sanji", title: "Ifrit Jambe", rarity: "S", arc: "Wano", faction: "Straw Hat Pirates", variant: "Ifrit Jambe", type: "Speed Fighter", atk: 202, hp: 1160, speed: 104, weapon: "Black Leg Combat Shoes", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 98, code: "kid_damned_punk", name: "Eustass Kid", title: "Damned Punk", rarity: "S", arc: "Wano", faction: "Kid Pirates", variant: "Awakened", type: "Burst", atk: 208, hp: 1280, speed: 82, weapon: "Punk Railgun", devilFruit: "Jiki Jiki no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 99, code: "law_awakened_room", name: "Trafalgar D. Water Law", title: "Awakened Surgeon", rarity: "S", arc: "Wano", faction: "Heart Pirates", variant: "Awakened Room", type: "Control", atk: 214, hp: 1160, speed: 98, weapon: "Kikoku", devilFruit: "Ope Ope no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 100, code: "boa_seraphim", name: "S-Snake", title: "Seraphim", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Seraphim", type: "Control", atk: 176, hp: 1180, speed: 90, weapon: "Laser", devilFruit: "Mero Mero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 101, code: "mihawk_seraphim", name: "S-Hawk", title: "Seraphim", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Seraphim", type: "Attacker", atk: 198, hp: 1220, speed: 90, weapon: "Black Blade Replica", devilFruit: "Supa Supa no Mi", equipType: "Devil Fruit", image: "" })
];

const EXTRA_CANON_CARDS = [
  boostCard({ id: 1001, code: "nika_drums", name: "Drums of Liberation", title: "Liberation Echo", rarity: "S", arc: "Wano", faction: "Inherited Will", variant: "Mythic Support", boostType: "atk", boostValue: 10, boostTarget: "team", boostDescription: "Boosts the will of liberation.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1002, code: "wado_ichimonji_spirit", name: "Wado Ichimonji Spirit", title: "Sword Soul", rarity: "A", arc: "East Blue", faction: "Shimotsuki", variant: "Sword Support", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "The spirit of a legendary blade.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1003, code: "germa_lineage_factor", name: "Germa Lineage Factor", title: "Awakened Genes", rarity: "A", arc: "Wano", faction: "Germa 66", variant: "Genetic Support", boostType: "spd", boostValue: 6, boostTarget: "team", boostDescription: "Awakened enhancements from Germa lineage.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1004, code: "weather_science", name: "Weather Science", title: "Climate Wisdom", rarity: "B", arc: "Weatheria", faction: "Weatheria", variant: "Tool Support", boostType: "spd", boostValue: 4, boostTarget: "team", boostDescription: "Advanced climate knowledge for support cards.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1005, code: "sniper_focus", name: "Sniper Focus", title: "Sharpshooter Instinct", rarity: "B", arc: "Dressrosa", faction: "Sharpshooter", variant: "Precision Support", boostType: "dmg", boostValue: 4, boostTarget: "team", boostDescription: "Increases precision and damage focus.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1006, code: "rumble_ball", name: "Rumble Ball", title: "Monster Medicine", rarity: "A", arc: "Drum Island", faction: "Straw Hat Pirates", variant: "Medical Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Medical support item used for awakening.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1007, code: "ohara_will", name: "Will of Ohara", title: "Forbidden Knowledge", rarity: "A", arc: "Ohara", faction: "Scholars of Ohara", variant: "History Support", boostType: "exp", boostValue: 6, boostTarget: "account", boostDescription: "Knowledge that supports Robin's growth.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1008, code: "cola_engine", name: "Cola Engine", title: "Power Fuel", rarity: "B", arc: "Water 7", faction: "Franky Family", variant: "Fuel Support", boostType: "atk", boostValue: 4, boostTarget: "team", boostDescription: "Powers up cyborg construction.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1009, code: "soul_solid", name: "Soul Solid Resonance", title: "Frozen Soul", rarity: "A", arc: "Whole Cake Island", faction: "Straw Hat Pirates", variant: "Soul Support", boostType: "spd", boostValue: 6, boostTarget: "team", boostDescription: "Brook's soul resonance support.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1010, code: "fishman_karate_scroll", name: "Fish-Man Karate Scroll", title: "Sea Current Arts", rarity: "A", arc: "Fish-Man Island", faction: "Fish-Man Karate", variant: "Technique Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Advanced martial training from the sea.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1011, code: "mera_mera_will", name: "Mera Mera Will", title: "Inherited Flame", rarity: "A", arc: "Dressrosa", faction: "Inherited Will", variant: "Flame Support", boostType: "dmg", boostValue: 6, boostTarget: "team", boostDescription: "The inherited will of the flame fruit.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1012, code: "ope_ope_notes", name: "Ope Ope Notes", title: "Surgical Theory", rarity: "A", arc: "Punk Hazard", faction: "Heart Pirates", variant: "Medical Support", boostType: "exp", boostValue: 6, boostTarget: "account", boostDescription: "Surgical notes for awakening Law.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1013, code: "magnet_core", name: "Magnet Core", title: "Railgun Catalyst", rarity: "A", arc: "Wano", faction: "Kid Pirates", variant: "Magnetic Support", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Magnetic core used by Kid's awakenings.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1014, code: "oni_lineage", name: "Oni Lineage", title: "Blood of Onigashima", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Heritage Support", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Ancient oni lineage support.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1015, code: "soru_soru_soul", name: "Soru Soru Soul", title: "Soul Harvest", rarity: "S", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Soul Support", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Soul manipulation catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1016, code: "supreme_haki", name: "Supreme Haki", title: "Conqueror Aura", rarity: "S", arc: "Legend", faction: "Haki Masters", variant: "Kingly Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Power of supreme kings.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1017, code: "black_blade_yoru", name: "Black Blade Yoru", title: "Night Blade", rarity: "S", arc: "Legend", faction: "World's Strongest Swordsman", variant: "Blade Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Support from the supreme black blade.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1018, code: "ito_ito_awakening", name: "Ito Ito Awakening", title: "Parasite Strings", rarity: "S", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "String Support", boostType: "dmg", boostValue: 8, boostTarget: "team", boostDescription: "Support from awakened strings.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1019, code: "suna_suna_core", name: "Suna Suna Core", title: "Desert Core", rarity: "S", arc: "Alabasta", faction: "Baroque Works", variant: "Sand Support", boostType: "dmg", boostValue: 8, boostTarget: "team", boostDescription: "Desert tyrant catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1020, code: "goro_goro_core", name: "Goro Goro Core", title: "Thunder Core", rarity: "S", arc: "Skypiea", faction: "God's Army", variant: "Lightning Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Thunder god catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1021, code: "empty_throne_edict", name: "Empty Throne Edict", title: "World Silence", rarity: "S", arc: "Final Saga", faction: "World Government", variant: "Forbidden Support", boostType: "hp", boostValue: 10, boostTarget: "team", boostDescription: "A forbidden decree from the empty throne.", devilFruit: "None", equipType: "Passive", image: "" })
];

const EXTRA_REQ_SUPPORT = [
  boostCard({ id: 1101, code: "rokushiki_manual", name: "Rokushiki Manual", title: "Cipher Pol Doctrine", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Technique Support", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Technique manual for CP agents.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1102, code: "shadow_core", name: "Shadow Core", title: "Thriller Essence", rarity: "A", arc: "Thriller Bark", faction: "Thriller Bark Pirates", variant: "Shadow Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Shadow catalyst for undead awakenings.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1103, code: "kuja_haki", name: "Kuja Haki", title: "Amazon Lily Aura", rarity: "A", arc: "Amazon Lily", faction: "Kuja Pirates", variant: "Haki Support", boostType: "spd", boostValue: 6, boostTarget: "team", boostDescription: "Kuja warrior spirit support.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1104, code: "gura_gura_will", name: "Gura Gura Will", title: "Earthshaker Spirit", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Quake Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Legacy of the quake emperor.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1105, code: "fist_of_love", name: "Fist of Love", title: "Marine Legend", rarity: "A", arc: "Marineford", faction: "Marines", variant: "Fist Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Garp's overwhelming fist support.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1106, code: "golden_buddha_mandate", name: "Golden Buddha Mandate", title: "Fleet Wisdom", rarity: "A", arc: "Marineford", faction: "Marines", variant: "Command Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Command support inspired by Sengoku.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1107, code: "magma_core", name: "Magma Core", title: "Absolute Justice", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Magma Support", boostType: "dmg", boostValue: 8, boostTarget: "team", boostDescription: "Molten core of absolute justice.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1108, code: "ice_core", name: "Ice Core", title: "Cold Justice", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Ice Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Frozen support core.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1109, code: "light_core", name: "Light Core", title: "Sacred Speed", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Light Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Speed of light catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1110, code: "darkness_core", name: "Darkness Core", title: "Abyss Catalyst", rarity: "S", arc: "Marineford", faction: "Blackbeard Pirates", variant: "Dark Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Abyssal darkness catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1111, code: "gravity_sheath", name: "Gravity Sheath", title: "Meteor Weight", rarity: "S", arc: "Dressrosa", faction: "Marines", variant: "Gravity Support", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Heavy gravity support.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1112, code: "future_sight", name: "Future Sight", title: "Observation Peak", rarity: "S", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Vision Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Observation support at the highest level.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1113, code: "lunarian_flame", name: "Lunarian Flame", title: "Ancient Fire", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Flame Support", boostType: "dmg", boostValue: 8, boostTarget: "team", boostDescription: "Ancient flame catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1114, code: "plague_tech", name: "Plague Tech", title: "Queen's Lab", rarity: "A", arc: "Wano", faction: "Beasts Pirates", variant: "Science Support", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Scientific plague tech support.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1115, code: "beast_core", name: "Beast Core", title: "Zoan Ferocity", rarity: "A", arc: "Wano", faction: "Beasts Pirates", variant: "Beast Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Bestial support catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1116, code: "forest_core", name: "Forest Core", title: "Green Growth", rarity: "S", arc: "Wano", faction: "Marines", variant: "Forest Support", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Forest logia catalyst.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1117, code: "chaos_core", name: "Chaos Core", title: "Rocks Legacy", rarity: "S", arc: "Legend", faction: "Rocks Pirates", variant: "Chaos Support", boostType: "atk", boostValue: 10, boostTarget: "team", boostDescription: "Catalyst of the Rocks era.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1118, code: "storm_mandate", name: "Storm Mandate", title: "Revolutionary Gale", rarity: "S", arc: "Final Saga", faction: "Revolutionary Army", variant: "Storm Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Storm support from the revolutionary leader.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1119, code: "holy_knight_sigil", name: "Holy Knight Sigil", title: "Noble Authority", rarity: "S", arc: "Final Saga", faction: "World Government", variant: "Holy Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Authority support of the holy knights.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1120, code: "giant_curse", name: "Giant Curse", title: "Elbaf Doom", rarity: "S", arc: "Elbaf", faction: "Elbaf Royal Family", variant: "Giant Support", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Ancient curse of Elbaf.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 1121, code: "samurai_spirit", name: "Samurai Spirit", title: "Wano Resolve", rarity: "S", arc: "Wano", faction: "Wano", variant: "Blade Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Resolve of legendary samurai.", devilFruit: "None", equipType: "Passive", image: "" })
];

const EXTRA_CHARACTER_CARDS = [
  battleCard({ id: 1201, code: "yasopp", name: "Yasopp", title: "Deadshot", rarity: "A", arc: "Legend", faction: "Red Hair Pirates", variant: "Sniper", type: "Ranged", atk: 150, hp: 920, speed: 94, weapon: "Sniper Rifle", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 1202, code: "reiju", name: "Vinsmoke Reiju", title: "Poison Pink", rarity: "A", arc: "Whole Cake Island", faction: "Germa 66", variant: "Raid Suit", type: "Support", atk: 142, hp: 940, speed: 92, weapon: "Raid Suit", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 1203, code: "saul", name: "Jaguar D. Saul", title: "Giant Friend", rarity: "A", arc: "Ohara", faction: "Marines", variant: "Vice Admiral", type: "Tank", atk: 150, hp: 1080, speed: 70, weapon: "Giant Fists", devilFruit: "None", equipType: "None", image: "" }),
  battleCard({ id: 1204, code: "iceburg", name: "Iceburg", title: "Mayor of Water 7", rarity: "B", arc: "Water 7", faction: "Galley-La", variant: "Shipwright", type: "Support", atk: 78, hp: 700, speed: 62, weapon: "Blueprint Hammer", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 1205, code: "laboon", name: "Laboon", title: "Whale Promise", rarity: "B", arc: "Reverse Mountain", faction: "Twin Cape", variant: "Promise", type: "Tank", atk: 82, hp: 960, speed: 40, weapon: "None", devilFruit: "None", equipType: "None", image: "" }),
  battleCard({ id: 1206, code: "corazon", name: "Donquixote Rosinante", title: "Corazon", rarity: "A", arc: "Dressrosa", faction: "Marines", variant: "Silent Protector", type: "Support", atk: 132, hp: 900, speed: 88, weapon: "Pistol", devilFruit: "Nagi Nagi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 1207, code: "sentomaru", name: "Sentomaru", title: "Science Guard", rarity: "A", arc: "Egghead", faction: "World Government", variant: "Battle Axe", type: "Tank", atk: 155, hp: 1080, speed: 70, weapon: "Battle Axe", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 1208, code: "shiryu", name: "Shiryu", title: "Of the Rain", rarity: "S", arc: "Final Saga", faction: "Blackbeard Pirates", variant: "Invisible Killer", type: "Assassin", atk: 210, hp: 1220, speed: 94, weapon: "Raiu", devilFruit: "Suke Suke no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 1209, code: "perospero", name: "Charlotte Perospero", title: "Candy Minister", rarity: "A", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Candy Master", type: "Control", atk: 148, hp: 980, speed: 76, weapon: "Candy Cane", devilFruit: "Pero Pero no Mi", equipType: "Devil Fruit", image: "" })
];

const SPECIAL_FORMS = {
  luffy_straw_hat: ["The Beginning", "Revival Arc", "Gear 5"],
  zoro_pirate_hunter: ["East Blue Swordsman", "King of Hell Prelude", "King of Hell"],
  nami_cat_burglar: ["Cat Burglar", "Weather Queen", "Zeus Tempo"],
  usopp_sniper: ["Village Sniper", "God Usopp", "Legend Shot"],
  sanji_black_leg: ["Baratie Cook", "Germa Flame", "Ifrit Jambe"],
  koby_aspiring_marine: ["Rookie Marine", "Honesty Impact Prelude", "Marine Hero"],
  buggy_the_clown: ["The Clown", "Cross Guild Rogue", "Bombastic Emperor"],
  crocodile_desert_king: ["Desert King", "Cross Guild Crocodile", "Sand Tyrant"],
  nico_robin_devil_child: ["Devil Child", "Scholar of the Revolution", "Demonio Fleur"],
  franky_cyborg: ["Cyborg", "General Franky", "Iron Pirate"],
  brook_soul_king: ["Soul King", "Frozen Soul", "Underworld Maestro"],
  jinbe_first_son_of_the_sea: ["First Son of the Sea", "Helmsman", "Ocean Vanguard"],
  ace_fire_fist: ["Fire Fist", "Inherited Flame", "Flame Emperor"],
  law_surgeon_of_death: ["Surgeon of Death", "Kroom", "Silent Room"],
  kid_captain: ["Captain", "Awakened Magnet", "Damned Punk"],
  enel_god: ["God", "Raigo", "Thunder God"],
  doflamingo_heavenly_demon: ["Heavenly Demon", "Birdcage", "Awakened Strings"],
  sabo_flame_emperor: ["Revolutionary Chief", "Flame Successor", "Flame Emperor"],
  katakuri_strongest_sweet_commander: ["Sweet Commander", "Future Sight", "Mochi Emperor"],
  kaido_strongest_creature: ["Strongest Creature", "Azure Dragon", "Flaming Drum Dragon"],
  imu: ["Hidden Sovereign", "Empty Throne Shadow", "World Silence"]
};

const CANON_LINKS = {
  luffy_straw_hat: { cards: ["zoro_pirate_hunter", "nami_cat_burglar", "sanji_black_leg"], boosts: ["nika_drums"] },
  zoro_pirate_hunter: { cards: ["luffy_straw_hat", "mihawk_hawk_eyes", "oden"], boosts: ["wado_ichimonji_spirit"] },
  nami_cat_burglar: { cards: ["luffy_straw_hat", "usopp_sniper"], boosts: ["weather_science"] },
  usopp_sniper: { cards: ["luffy_straw_hat", "yasopp", "nami_cat_burglar"], boosts: ["sniper_focus"] },
  sanji_black_leg: { cards: ["luffy_straw_hat", "zoro_pirate_hunter", "reiju"], boosts: ["germa_lineage_factor"] },
  smoker_white_hunter: { cards: ["tashigi_swordswoman", "koby_aspiring_marine"], boosts: ["tsuru_tactical_support"] },
  crocodile_desert_king: { cards: ["nico_robin_devil_child", "daz_bonez"], boosts: ["suna_suna_core"] },
  nico_robin_devil_child: { cards: ["luffy_straw_hat", "saul"], boosts: ["ohara_will"] },
  enel_god: { cards: ["wyper_shandian_warrior", "gan_fall"], boosts: ["goro_goro_core"] },
  franky_cyborg: { cards: ["iceburg", "brook_soul_king"], boosts: ["cola_engine"] },
  lucci_cp9: { cards: ["kaku_cp9", "kalifa_cp9_support"], boosts: ["rokushiki_manual"] },
  brook_soul_king: { cards: ["laboon", "franky_cyborg"], boosts: ["soul_solid"] },
  gecko_moria: { cards: ["bartholomew_kuma", "brook_soul_king"], boosts: ["shadow_core"] },
  boa_hancock: { cards: ["jinbe_first_son_of_the_sea", "luffy_straw_hat"], boosts: ["kuja_haki"] },
  jinbe_first_son_of_the_sea: { cards: ["ace_fire_fist", "luffy_straw_hat"], boosts: ["fishman_karate_scroll"] },
  ace_fire_fist: { cards: ["luffy_straw_hat", "sabo_flame_emperor"], boosts: ["mera_mera_will"] },
  whitebeard_strongest_man: { cards: ["ace_fire_fist", "marco_phoenix"], boosts: ["gura_gura_will"] },
  garp_hero_of_the_marines: { cards: ["koby_aspiring_marine", "luffy_straw_hat"], boosts: ["fist_of_love"] },
  sengoku_buddha: { cards: ["garp_hero_of_the_marines", "tsuru_tactical_support"], boosts: ["golden_buddha_mandate"] },
  akainu: { cards: ["aokiji", "kizaru"], boosts: ["magma_core"] },
  aokiji: { cards: ["akainu", "garp_hero_of_the_marines"], boosts: ["ice_core"] },
  kizaru: { cards: ["akainu", "sentomaru"], boosts: ["light_core"] },
  blackbeard_emperor_of_darkness: { cards: ["doc_q_sickly_support", "shiryu"], boosts: ["darkness_core"] },
  law_surgeon_of_death: { cards: ["bepo_navigator_support", "corazon"], boosts: ["ope_ope_notes"] },
  kid_captain: { cards: ["killer_massacre_soldier", "law_surgeon_of_death"], boosts: ["magnet_core"] },
  doflamingo_heavenly_demon: { cards: ["trebol_underworld_support", "law_surgeon_of_death"], boosts: ["ito_ito_awakening"] },
  sabo_flame_emperor: { cards: ["luffy_straw_hat", "ace_fire_fist", "dragon_revolutionary_leader"], boosts: ["mera_mera_will"] },
  fujitora: { cards: ["akainu", "greenbull"], boosts: ["gravity_sheath"] },
  katakuri_strongest_sweet_commander: { cards: ["big_mom_emperor", "charlotte_pudding"], boosts: ["future_sight"] },
  big_mom_emperor: { cards: ["katakuri_strongest_sweet_commander", "perospero"], boosts: ["soru_soru_soul"] },
  king_wildfire: { cards: ["queen_the_plague", "kaido_strongest_creature"], boosts: ["lunarian_flame"] },
  queen_the_plague: { cards: ["king_wildfire", "jack_the_drought"], boosts: ["plague_tech"] },
  jack_the_drought: { cards: ["kaido_strongest_creature", "king_wildfire"], boosts: ["beast_core"] },
  yamato_oni_princess: { cards: ["luffy_straw_hat", "kaido_strongest_creature"], boosts: ["oni_lineage"] },
  kaido_strongest_creature: { cards: ["king_wildfire", "yamato_oni_princess", "big_mom_emperor"], boosts: ["oni_lineage"] },
  greenbull: { cards: ["akainu", "fujitora"], boosts: ["forest_core"] },
  luffy_sun_god_nika: { cards: ["zoro_demon_aura", "sanji_ifrit_jambe", "jinbe_first_son_of_the_sea"], boosts: ["nika_drums"] },
  shanks_red_hair: { cards: ["ben_beckman", "luffy_straw_hat", "rayleigh_dark_king"], boosts: ["supreme_haki"] },
  mihawk_hawk_eyes: { cards: ["zoro_pirate_hunter", "shanks_red_hair"], boosts: ["black_blade_yoru"] },
  roger_king_of_the_pirates: { cards: ["rayleigh_dark_king", "oden"], boosts: ["supreme_haki"] },
  xebec_captain_of_rocks: { cards: ["whitebeard_strongest_man", "big_mom_emperor", "kaido_strongest_creature"], boosts: ["chaos_core"] },
  dragon_revolutionary_leader: { cards: ["sabo_flame_emperor", "luffy_straw_hat"], boosts: ["storm_mandate"] },
  saturn: { cards: ["mars", "warcury"], boosts: ["empty_throne_edict"] },
  mars: { cards: ["saturn", "warcury"], boosts: ["empty_throne_edict"] },
  warcury: { cards: ["mars", "nusjuro"], boosts: ["empty_throne_edict"] },
  nusjuro: { cards: ["warcury", "ju_peter"], boosts: ["empty_throne_edict"] },
  ju_peter: { cards: ["nusjuro", "saturn"], boosts: ["empty_throne_edict"] },
  imu: { cards: ["saturn", "mars", "warcury"], boosts: ["empty_throne_edict", "supreme_haki"] },
  garling: { cards: ["shanks_red_hair", "imu"], boosts: ["holy_knight_sigil"] },
  loki: { cards: ["imu", "shanks_red_hair"], boosts: ["giant_curse"] },
  rayleigh_dark_king: { cards: ["roger_king_of_the_pirates", "shanks_red_hair"], boosts: ["supreme_haki"] },
  oden: { cards: ["roger_king_of_the_pirates", "whitebeard_strongest_man"], boosts: ["samurai_spirit"] },
  sanji_ifrit_jambe: { cards: ["sanji_black_leg", "zoro_pirate_hunter"], boosts: ["germa_lineage_factor"] },
  kid_damned_punk: { cards: ["kid_captain", "killer_massacre_soldier"], boosts: ["magnet_core"] },
  law_awakened_room: { cards: ["law_surgeon_of_death", "bepo_navigator_support"], boosts: ["ope_ope_notes"] },
  boa_seraphim: { cards: ["boa_hancock", "vegapunk_stella"], boosts: ["empty_throne_edict"] },
  mihawk_seraphim: { cards: ["mihawk_hawk_eyes", "vegapunk_stella"], boosts: ["black_blade_yoru"] }
};

const STAGE_MULTIPLIERS = { 1: 1, 2: 1.2, 3: 1.45 };
const TIER_PATHS = { C: ["C", "B", "A"], B: ["B", "A", "S"], A: ["A", "S", "SS"], S: ["S", "SS", "UR"] };

function cleanBaseTier(card) {
  const raw = String(card.baseTier || card.rarity || "C").toUpperCase();
  if (["C", "B", "A", "S"].includes(raw)) return raw;
  if (raw === "SS") return "A";
  if (raw === "UR") return card.cardRole === "boost" ? "A" : "S";
  return "C";
}

function inferForms(card) {
  return SPECIAL_FORMS[card.code] || [card.variant || card.title || "Base", `${card.variant || card.title || "Base"} Awakened`, `${card.variant || card.title || "Base"} Final`];
}

function inferRequirements(card, stage) {
  if (stage === 1) return null;
  const baseTier = cleanBaseTier(card);

  if (baseTier === "C") {
    return {
      berries: stage === 2 ? 6000 : 15000,
      cards: [],
      boosts: [],
      text: card.cardRole === "boost" ? "Low-tier boost path only needs berries." : "Low-tier battle path only needs berries.",
    };
  }

  const links = CANON_LINKS[card.code] || { cards: [], boosts: [] };
  const cardCount = baseTier === "B" ? (stage === 2 ? 1 : 2) : stage === 2 ? 2 : 3;
  const boostCount = baseTier === "B" ? 1 : stage === 2 ? 1 : 2;
  const fallbackBoost = `${card.code}_legacy`;
  const boosts = links.boosts?.length ? links.boosts.slice(0, boostCount) : [fallbackBoost].slice(0, boostCount);

  return {
    berries:
      baseTier === "B" ? (stage === 2 ? 18000 : 42000)
      : baseTier === "A" ? (stage === 2 ? 32000 : 76000)
      : (stage === 2 ? 55000 : 130000),
    cards: (links.cards || []).slice(0, cardCount),
    boosts,
    text:
      baseTier === "B" ? "Canon-linked B-tier awaken path."
      : baseTier === "A" ? "Canon-linked advanced awaken path."
      : "Canon-linked emperor/top-tier awaken path.",
  };
}

function applyEvolution(card) {
  const baseTier = cleanBaseTier(card);
  const forms = inferForms(card);
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const weaponBonus = {
    atk: Number(card?.weaponBonus?.atk || 0),
    hp: Number(card?.weaponBonus?.hp || 0),
    speed: Number(card?.weaponBonus?.speed || 0),
  };
  const mult = STAGE_MULTIPLIERS[stage];
  const tier = TIER_PATHS[baseTier][stage - 1];

  return {
    ...card,
    baseTier,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
    currentTier: tier,
    rarity: tier,
    baseAtk: Number(card.baseAtk ?? card.atk ?? 0),
    baseHp: Number(card.baseHp ?? card.hp ?? 0),
    baseSpeed: Number(card.baseSpeed ?? card.speed ?? 0),
    atk: Math.floor(Number(card.baseAtk ?? card.atk ?? 0) * mult) + weaponBonus.atk,
    hp: Math.floor(Number(card.baseHp ?? card.hp ?? 0) * mult) + weaponBonus.hp,
    speed: Math.floor(Number(card.baseSpeed ?? card.speed ?? 0) * mult) + weaponBonus.speed,
    weaponBonus,
    evolutionForms: [
      { stage: 1, key: "M1", tier: TIER_PATHS[baseTier][0], name: forms[0], require: null },
      { stage: 2, key: "M2", tier: TIER_PATHS[baseTier][1], name: forms[1], require: inferRequirements(card, 2) },
      { stage: 3, key: "M3", tier: TIER_PATHS[baseTier][2], name: forms[2], require: inferRequirements(card, 3) },
    ],
    awakenRequirements: {
      M2: inferRequirements(card, 2),
      M3: inferRequirements(card, 3),
    },
  };
}

module.exports = [...BASE_CARDS, ...EXTRA_CANON_CARDS, ...EXTRA_REQ_SUPPORT, ...EXTRA_CHARACTER_CARDS]
  .filter((card) => card.code !== "joy_boy")
  .map(applyEvolution);