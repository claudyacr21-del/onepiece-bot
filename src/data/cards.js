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
  battleCard({ id: 1, code: "luffy_straw_hat", name: "Monkey D. Luffy", title: "Straw Hat", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Captain", atk: 210, hp: 1300, speed: 80, basePower: 2000, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Nika", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 2, code: "zoro_pirate_hunter", name: "Roronoa Zoro", title: "Pirate Hunter", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Three Sword Style", type: "Attacker", atk: 200, hp: 1100, speed: 75, basePower: 1990, weapon: "Wado Ichimonji, Sandai Kitetsu, Enma", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 3, code: "nami_cat_burglar", name: "Nami", title: "Cat Burglar", rarity: "B", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Support", atk: 88, hp: 600, speed: 95, basePower: 1470, weapon: "Basic Staff", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 4, code: "usopp_sniper", name: "Usopp", title: "Sniper", rarity: "B", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Ranged", atk: 88, hp: 620, speed: 88, basePower: 1450, weapon: "Basic Slingshot", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 5, code: "sanji_black_leg", name: "Sanji", title: "Black Leg", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Speed Fighter", atk: 180, hp: 900, speed: 90, basePower: 1970, weapon: "Black Leg Combat Shoes", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 6, code: "koby_aspiring_marine", name: "Koby", title: "Aspiring Marine", rarity: "B", arc: "East Blue", faction: "Marines", variant: "Early Days", type: "Support", atk: 76, hp: 520, speed: 70, basePower: 1475, weapon: "None", devilFruit: "None", equipType: "None", image: "" }),
  battleCard({ id: 7, code: "alvida_iron_club", name: "Alvida", title: "Iron Club", rarity: "C", arc: "East Blue", faction: "Alvida Pirates", variant: "Base", type: "Bruiser", atk: 72, hp: 740, speed: 42, basePower: 850, weapon: "Basic Iron Club", devilFruit: "Sube Sube no Mi", equipType: "Weapon", image: "" }),
  battleCard({ id: 8, code: "morgan_axe_hand", name: "Morgan", title: "Axe-Hand", rarity: "C", arc: "East Blue", faction: "Marines", variant: "Captain", type: "Bruiser", atk: 78, hp: 760, speed: 45, basePower: 860, weapon: "Basic Marine Saber", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 9, code: "helmeppo_spoiled_brat", name: "Helmeppo", title: "Spoiled Brat", rarity: "C", arc: "East Blue", faction: "Marines", variant: "Early Days", type: "Speed Fighter", atk: 54, hp: 500, speed: 62, basePower: 830, weapon: "Basic Marine Saber", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 10, code: "buggy_the_clown", name: "Buggy The Clown", title: "The Clown", rarity: "B", arc: "East Blue", faction: "Buggy Pirates", variant: "Chop-Chop Fruit", type: "Trickster", atk: 108, hp: 760, speed: 70, basePower: 1400, weapon: "Dual Daggers", devilFruit: "Bara Bara no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 11, code: "kuro_hundred_plans", name: "Kuro", title: "Of a Hundred Plans", rarity: "B", arc: "East Blue", faction: "Black Cat Pirates", variant: "Shakushi", type: "Assassin", atk: 110, hp: 700, speed: 96, basePower: 1200, weapon: "Cat Claws", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 12, code: "jango_hypnotist", name: "Jango", title: "Hypnotist", rarity: "C", arc: "East Blue", faction: "Black Cat Pirates", variant: "Hypnosis", type: "Control", atk: 62, hp: 540, speed: 73, basePower: 855, weapon: "Hypnosis Ring", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 13, code: "don_krieg_admiral", name: "Don Krieg", title: "Admiral", rarity: "B", arc: "East Blue", faction: "Krieg Pirates", variant: "Battle Armor", type: "Tank", atk: 116, hp: 880, speed: 55, basePower: 1300, weapon: "Wootz Steel Spear", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 14, code: "gin_man_demon", name: "Gin", title: "Man-Demon", rarity: "B", arc: "East Blue", faction: "Krieg Pirates", variant: "Tonfa Master", type: "Fighter", atk: 108, hp: 760, speed: 82, basePower: 1257, weapon: "Tonfa", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 15, code: "arlong_saw", name: "Arlong", title: "Saw", rarity: "A", arc: "East Blue", faction: "Arlong Pirates", variant: "Fish-Man", type: "Bruiser", atk: 142, hp: 980, speed: 68, basePower: 1500, weapon: "Kiribachi", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 16, code: "hatchan_six_sword_style", name: "Hatchan", title: "Six-Sword Style", rarity: "B", arc: "East Blue", faction: "Arlong Pirates", variant: "Octopus Swordsman", type: "Attacker", atk: 100, hp: 780, speed: 66, basePower: 1455, weapon: "Six Swords", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 17, code: "smoker_white_hunter", name: "Smoker", title: "White Hunter", rarity: "A", arc: "Loguetown", faction: "Marines", variant: "Smoke-Smoke Fruit", type: "Control", atk: 140, hp: 930, speed: 82, basePower: 1780, weapon: "Jitte", devilFruit: "Moku Moku no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 18, code: "tashigi_swordswoman", name: "Tashigi", title: "Swordswoman", rarity: "B", arc: "Loguetown", faction: "Marines", variant: "Base", type: "Attacker", atk: 104, hp: 720, speed: 78, basePower: 1775, weapon: "Basic Marine Saber", devilFruit: "None", equipType: "Weapon", image: "" }),

  // =========================
  // Passive / Boost cards
  // =========================
  boostCard({ id: 19, code: "chopper_cotton_candy_lover", name: "Tony Tony Chopper", title: "Cotton Candy Lover", rarity: "C", arc: "Drum Island", faction: "Straw Hat Pirates", variant: "Doctor Support", boostType: "daily", boostValue: 1, boostTarget: "account", basePower: 250, boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Hito Hito no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 20, code: "kaya_medical_patron", name: "Kaya", title: "Medical Patron", rarity: "C", arc: "East Blue", faction: "Syrup Village", variant: "Storage Support", boostType: "fragmentstorage", boostValue: 18, boostTarget: "account", basePower: 420, boostDescription: "Increase fragment storage by 18 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 21, code: "bepo_navigator_support", name: "Bepo", title: "Navigator Support", rarity: "B", arc: "Zou", faction: "Heart Pirates", variant: "Mink Support", boostType: "spd", boostValue: 4, boostTarget: "team", basePower: 555, boostDescription: "Increase team SPD by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 22, code: "killer_massacre_soldier", name: "Killer", title: "Massacre Soldier", rarity: "A", arc: "Wano", faction: "Kid Pirates", variant: "Support Tactics", boostType: "dmg", boostValue: 6, boostTarget: "team", basePower: 1352, boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 23, code: "marco_phoenix", name: "Marco", title: "The Phoenix", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Support Commander", boostType: "hp", boostValue: 8, boostTarget: "team", basePower: 1976, boostDescription: "Increase team HP by 8% passively.", devilFruit: "Tori Tori no Mi, Model: Phoenix", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 24, code: "ben_beckman", name: "Benn Beckman", title: "First Mate", rarity: "S", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Strategic Support", boostType: "atk", boostValue: 8, boostTarget: "team", basePower: 1985, boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 25, code: "charlotte_pudding", name: "Charlotte Pudding", title: "Three-Eyed Girl", rarity: "A", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Memory Support", boostType: "exp", boostValue: 8, boostTarget: "account", basePower: 1471, boostDescription: "Increase EXP gain by 8% passively.", devilFruit: "Memo Memo no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 26, code: "mansherry_healing_princess", name: "Mansherry", title: "Healing Princess", rarity: "A", arc: "Dressrosa", faction: "Tontatta Kingdom", variant: "Healing Support", boostType: "daily", boostValue: 1, boostTarget: "account", basePower: 1124, boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Chiyu Chiyu no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 27, code: "vegapunk_stella", name: "Vegapunk", title: "Stella", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Greatest Brain", boostType: "atk", boostValue: 12, boostTarget: "team", basePower: 2000, boostDescription: "Increase team ATK by 12% passively.", devilFruit: "Nomi Nomi no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 28, code: "lindbergh_revolutionary_genius", name: "Lindbergh", title: "Revolutionary Genius", rarity: "S", arc: "Final Saga", faction: "Revolutionary Army", variant: "Tech Support", boostType: "spd", boostValue: 8, boostTarget: "team", basePower: 1980, boostDescription: "Increase team SPD by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 29, code: "doc_q_sickly_support", name: "Doc Q", title: "Sickly Support", rarity: "B", arc: "Blackbeard Pirates", faction: "Blackbeard Pirates", variant: "Dark Medicine", boostType: "exp", boostValue: 4, boostTarget: "account", basePower: 954, boostDescription: "Increase EXP gain by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 30, code: "shirahoshi_sea_princess", name: "Shirahoshi", title: "Sea Princess", rarity: "S", arc: "Fish-Man Island", faction: "Ryugu Kingdom", variant: "Storage Blessing", boostType: "fragmentstorage", boostValue: 73, boostTarget: "account", basePower: 1900, boostDescription: "Increase fragment storage by 73 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 31, code: "hiyori_festival_support", name: "Kozuki Hiyori", title: "Festival Support", rarity: "B", arc: "Wano", faction: "Wano", variant: "Resource Blessing", boostType: "daily", boostValue: 1, boostTarget: "account", basePower: 657, boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 32, code: "carina_treasure_hunter", name: "Carina", title: "Treasure Hunter", rarity: "B", arc: "Film Gold", faction: "Independent", variant: "Treasure Support", boostType: "fragmentstorage", boostValue: 36, boostTarget: "account", basePower: 695, boostDescription: "Increase fragment storage by 36 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 33, code: "kalifa_cp9_support", name: "Kalifa", title: "CP9 Support", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Efficient Support", boostType: "exp", boostValue: 6, boostTarget: "account", basePower: 1455, boostDescription: "Increase EXP gain by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 34, code: "baccarat_lucky_draw", name: "Baccarat", title: "Lucky Draw", rarity: "S", arc: "Film Gold", faction: "Gran Tesoro", variant: "Fortune Support", boostType: "pullchance", boostValue: 1, boostTarget: "account", basePower: 1805, boostDescription: "Increase pull chance by 1 steps passively.", devilFruit: "Raki Raki no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 35, code: "perona_ghost_princess", name: "Perona", title: "Ghost Princess", rarity: "A", arc: "Thriller Bark", faction: "Thriller Bark Pirates", variant: "Negative Support", boostType: "dmg", boostValue: 4, boostTarget: "team", basePower: 1490, boostDescription: "Increase team damage by 4% passively.", devilFruit: "Horo Horo no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 36, code: "tsuru_tactical_support", name: "Tsuru", title: "Tactical Support", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Veteran Support", boostType: "daily", boostValue: 2, boostTarget: "account", basePower: 1577, boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "Woshu Woshu no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 37, code: "reiju_poison_pink", name: "Reiju", title: "Poison Pink", rarity: "A", arc: "Whole Cake Island", faction: "Germa 66", variant: "Germa Support", boostType: "hp", boostValue: 6, boostTarget: "team", basePower: 1463, boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 38, code: "otama_kibi_support", name: "Otama", title: "Kibi Support", rarity: "B", arc: "Wano", faction: "Wano", variant: "Beast Tamer", boostType: "daily", boostValue: 1, boostTarget: "account", basePower: 555, boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Kibi Kibi no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 39, code: "iceburg", name: "Iceburg", title: "City Support", rarity: "B", arc: "Water 7", faction: "Galley-La", variant: "Shipwright Support", boostType: "fragmentstorage", boostValue: 50, boostTarget: "account", basePower: 501, boostDescription: "Increase fragment storage by 50 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 40, code: "laboon", name: "Laboon", title: "Whale Memory", rarity: "C", arc: "Reverse Mountain", faction: "Independent", variant: "Memory Support", boostType: "hp", boostValue: 3, boostTarget: "team", basePower: 498, boostDescription: "Increase team HP by 3% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 41, code: "sniper_focus", name: "Sniper Focus", title: "Sniper Focus", rarity: "B", arc: "Support", faction: "Passive", variant: "Aim Support", boostType: "atk", boostValue: 4, boostTarget: "team", basePower: 602, boostDescription: "Increase team ATK by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 42, code: "weather_science", name: "Weather Science", title: "Weather Science", rarity: "C", arc: "Support", faction: "Passive", variant: "Climate Support", boostType: "spd", boostValue: 3, boostTarget: "team", basePower: 495, boostDescription: "Increase team SPD by 3% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 43, code: "wado_ichimonji_spirit", name: "Wado Ichimonji Spirit", title: "Sword Spirit", rarity: "A", arc: "Support", faction: "Passive", variant: "Sword Bond", boostType: "atk", boostValue: 6, boostTarget: "team", basePower: 1349, boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 44, code: "suna_suna_core", name: "Suna Suna Core", title: "Sand Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Desert Power", boostType: "dmg", boostValue: 6, boostTarget: "team", basePower: 1400, boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 45, code: "ohara_will", name: "Ohara Will", title: "Ohara Will", rarity: "A", arc: "Support", faction: "Passive", variant: "Scholar Legacy", boostType: "exp", boostValue: 8, boostTarget: "account", basePower: 1391, boostDescription: "Increase EXP gain by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 46, code: "goro_goro_core", name: "Goro Goro Core", title: "Thunder Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Lightning Power", boostType: "spd", boostValue: 6, boostTarget: "team", basePower: 1385, boostDescription: "Increase team SPD by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 47, code: "cola_engine", name: "Cola Engine", title: "Cola Engine", rarity: "B", arc: "Support", faction: "Passive", variant: "Cyborg Fuel", boostType: "atk", boostValue: 4, boostTarget: "team", basePower: 954, boostDescription: "Increase team ATK by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 48, code: "rokushiki_manual", name: "Rokushiki Manual", title: "Rokushiki Manual", rarity: "A", arc: "Support", faction: "Passive", variant: "Technique Support", boostType: "spd", boostValue: 5, boostTarget: "team", basePower: 1475, boostDescription: "Increase team SPD by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 49, code: "soul_solid", name: "Soul Solid", title: "Soul Solid", rarity: "A", arc: "Support", faction: "Passive", variant: "Soul Blade", boostType: "dmg", boostValue: 5, boostTarget: "team", basePower: 1450, boostDescription: "Increase team damage by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 50, code: "shadow_core", name: "Shadow Core", title: "Shadow Core", rarity: "B", arc: "Support", faction: "Passive", variant: "Shadow Power", boostType: "hp", boostValue: 4, boostTarget: "team", basePower: 653, boostDescription: "Increase team HP by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 51, code: "kuja_haki", name: "Kuja Haki", title: "Kuja Haki", rarity: "S", arc: "Support", faction: "Passive", variant: "Conqueror Support", boostType: "dmg", boostValue: 8, boostTarget: "team", basePower: 1954, boostDescription: "Increase team damage by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 52, code: "fishman_karate_scroll", name: "Fish-Man Karate Scroll", title: "Fish-Man Karate", rarity: "A", arc: "Support", faction: "Passive", variant: "Water Combat", boostType: "hp", boostValue: 6, boostTarget: "team", basePower: 1288, boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 53, code: "mera_mera_will", name: "Mera Mera Will", title: "Flame Will", rarity: "S", arc: "Support", faction: "Passive", variant: "Inherited Fire", boostType: "atk", boostValue: 8, boostTarget: "team", basePower: 1525, boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 54, code: "gura_gura_will", name: "Gura Gura Will", title: "Quake Will", rarity: "S", arc: "Support", faction: "Passive", variant: "Quake Power", boostType: "dmg", boostValue: 8, boostTarget: "team", basePower: 1520, boostDescription: "Increase team damage by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 55, code: "fist_of_love", name: "Fist of Love", title: "Fist of Love", rarity: "A", arc: "Support", faction: "Passive", variant: "Marine Training", boostType: "hp", boostValue: 5, boostTarget: "team", basePower: 1500, boostDescription: "Increase team HP by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 56, code: "golden_buddha_mandate", name: "Golden Buddha Mandate", title: "Golden Buddha", rarity: "S", arc: "Support", faction: "Passive", variant: "Justice Order", boostType: "daily", boostValue: 2, boostTarget: "account", basePower: 1501, boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 57, code: "magma_core", name: "Magma Core", title: "Magma Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Magma Power", boostType: "atk", boostValue: 7, boostTarget: "team", basePower: 1788, boostDescription: "Increase team ATK by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 58, code: "ice_core", name: "Ice Core", title: "Ice Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Ice Power", boostType: "spd", boostValue: 5, boostTarget: "team", basePower: 1357, boostDescription: "Increase team SPD by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 59, code: "light_core", name: "Light Core", title: "Light Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Light Power", boostType: "spd", boostValue: 7, boostTarget: "team", basePower: 1825, boostDescription: "Increase team SPD by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 60, code: "darkness_core", name: "Darkness Core", title: "Darkness Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Dark Power", boostType: "dmg", boostValue: 7, boostTarget: "team", basePower: 1556, boostDescription: "Increase team damage by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 61, code: "ope_ope_notes", name: "Ope Ope Notes", title: "Operation Notes", rarity: "A", arc: "Support", faction: "Passive", variant: "Medical Genius", boostType: "exp", boostValue: 6, boostTarget: "account", basePower: 1399, boostDescription: "Increase EXP gain by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 62, code: "magnet_core", name: "Magnet Core", title: "Magnet Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Magnetic Burst", boostType: "atk", boostValue: 6, boostTarget: "team", basePower: 1325, boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 63, code: "ito_ito_awakening", name: "Ito Ito Awakening", title: "String Awakening", rarity: "A", arc: "Support", faction: "Passive", variant: "String Control", boostType: "dmg", boostValue: 6, boostTarget: "team", basePower: 1285, boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 65, code: "future_sight", name: "Future Sight", title: "Future Sight", rarity: "S", arc: "Support", faction: "Passive", variant: "Observation Peak", boostType: "spd", boostValue: 8, boostTarget: "team", basePower: 1887, boostDescription: "Increase team SPD by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 66, code: "soru_soru_soul", name: "Soru Soru Soul", title: "Soul Pocus", rarity: "S", arc: "Support", faction: "Passive", variant: "Soul Empire", boostType: "hp", boostValue: 9, boostTarget: "team", basePower: 1890, boostDescription: "Increase team HP by 9% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 67, code: "lunarian_flame", name: "Lunarian Flame", title: "Lunarian Flame", rarity: "S", arc: "Support", faction: "Passive", variant: "Ancient Fire", boostType: "dmg", boostValue: 7, boostTarget: "team", basePower: 1905, boostDescription: "Increase team damage by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 68, code: "plague_tech", name: "Plague Tech", title: "Plague Tech", rarity: "A", arc: "Support", faction: "Passive", variant: "Science Warfare", boostType: "atk", boostValue: 6, boostTarget: "team", basePower: 1500, boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 69, code: "beast_core", name: "Beast Core", title: "Beast Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Beast Endurance", boostType: "hp", boostValue: 6, boostTarget: "team", basePower: 1375, boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 70, code: "oni_lineage", name: "Oni Lineage", title: "Oni Lineage", rarity: "S", arc: "Support", faction: "Passive", variant: "Ancient Blood", boostType: "hp", boostValue: 8, boostTarget: "team", basePower: 1521, boostDescription: "Increase team HP by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 71, code: "forest_core", name: "Forest Core", title: "Forest Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Forest Power", boostType: "hp", boostValue: 7, boostTarget: "team", basePower: 1510, boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 72, code: "nika_drums", name: "Drums of Liberation", title: "Nika Drums", rarity: "S", arc: "Support", faction: "Passive", variant: "Liberation Rhythm", boostType: "daily", boostValue: 1, boostTarget: "account", basePower: 1905, boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 73, code: "supreme_haki", name: "Supreme Haki", title: "Supreme Haki", rarity: "S", arc: "Support", faction: "Passive", variant: "King's Ambition", boostType: "dmg", boostValue: 10, boostTarget: "team", basePower: 1992, boostDescription: "Increase team damage by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 74, code: "black_blade_yoru", name: "Black Blade Yoru", title: "Black Blade", rarity: "S", arc: "Support", faction: "Passive", variant: "Legendary Blade Aura", boostType: "atk", boostValue: 9, boostTarget: "team", basePower: 1902, boostDescription: "Increase team ATK by 9% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 75, code: "chaos_core", name: "Chaos Core", title: "Chaos Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Rocks Legacy", boostType: "dmg", boostValue: 10, boostTarget: "team", basePower: 2000, boostDescription: "Increase team damage by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 76, code: "storm_mandate", name: "Storm Mandate", title: "Storm Mandate", rarity: "S", arc: "Support", faction: "Passive", variant: "Revolution Wind", boostType: "spd", boostValue: 9, boostTarget: "team", basePower: 1980, boostDescription: "Increase team SPD by 9% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 77, code: "empty_throne_edict", name: "Empty Throne Edict", title: "Throne Edict", rarity: "S", arc: "Support", faction: "Passive", variant: "World Decree", boostType: "daily", boostValue: 3, boostTarget: "account", basePower: 1750, boostDescription: "Increase daily reward quality by 3 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 78, code: "holy_knight_sigil", name: "Holy Knight Sigil", title: "Holy Knight Sigil", rarity: "S", arc: "Support", faction: "Passive", variant: "Holy Authority", boostType: "atk", boostValue: 8, boostTarget: "team", basePower: 1800, boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 79, code: "giant_curse", name: "Giant Curse", title: "Giant Curse", rarity: "S", arc: "Support", faction: "Passive", variant: "Elbaf Oath", boostType: "hp", boostValue: 8, boostTarget: "team", basePower: 1650, boostDescription: "Increase team HP by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 80, code: "samurai_spirit", name: "Samurai Spirit", title: "Samurai Spirit", rarity: "S", arc: "Support", faction: "Passive", variant: "Wano Resolve", boostType: "atk", boostValue: 8, boostTarget: "team", basePower: 1840, boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),

  // =========================
  // Grand Line / Alabasta to Thriller Bark
  // =========================
  battleCard({ id: 81, code: "crocodile_desert_king", name: "Crocodile", title: "Desert King", rarity: "S", arc: "Alabasta", faction: "Baroque Works", variant: "Sand Tyrant", type: "Control", atk: 160, hp: 1120, speed: 78, basePower: 2150, weapon: "Golden Hook", devilFruit: "Suna Suna no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 82, code: "nico_robin_devil_child", name: "Nico Robin", title: "Devil Child", rarity: "A", arc: "Alabasta", faction: "Straw Hat Pirates", variant: "Hana Hana Bloom", type: "Support", atk: 110, hp: 760, speed: 92, basePower: 1870, weapon: "None", devilFruit: "Hana Hana no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 83, code: "daz_bonez", name: "Daz Bonez", title: "Mr. 1", rarity: "B", arc: "Alabasta", faction: "Baroque Works", variant: "Blade Body", type: "Bruiser", atk: 120, hp: 980, speed: 60, basePower: 1332, weapon: "Steel Blades", devilFruit: "Supa Supa no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 84, code: "bellamy_hyena", name: "Bellamy", title: "The Hyena", rarity: "B", arc: "Jaya", faction: "Bellamy Pirates", variant: "Spring Legs", type: "Burst", atk: 118, hp: 760, speed: 88, basePower: 1154, weapon: "None", devilFruit: "Bane Bane no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 85, code: "wyper_shandian_warrior", name: "Wyper", title: "Shandian Warrior", rarity: "A", arc: "Skypiea", faction: "Shandia", variant: "Reject Dial", type: "Burst", atk: 150, hp: 980, speed: 82, basePower: 1550, weapon: "Burn Bazooka", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 86, code: "enel_god", name: "Enel", title: "God", rarity: "S", arc: "Skypiea", faction: "Skypiea", variant: "Thunder God", type: "Control", atk: 176, hp: 1080, speed: 96, basePower: 2200, weapon: "Golden Staff", devilFruit: "Goro Goro no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 87, code: "franky_cyborg", name: "Franky", title: "Cyborg", rarity: "A", arc: "Water 7", faction: "Straw Hat Pirates", variant: "Battle Franky", type: "Tank", atk: 138, hp: 1140, speed: 64, basePower: 1850, weapon: "General Franky Arsenal", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 88, code: "lucci_cp9", name: "Rob Lucci", title: "CP9", rarity: "S", arc: "Enies Lobby", faction: "World Government", variant: "Leopard Form", type: "Assassin", atk: 182, hp: 1020, speed: 100, basePower: 2250, weapon: "Rokushiki", devilFruit: "Neko Neko no Mi, Model: Leopard", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 89, code: "kaku_cp9", name: "Kaku", title: "CP9", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Giraffe Form", type: "Attacker", atk: 144, hp: 960, speed: 78, basePower: 1850, weapon: "Rokushiki Blades", devilFruit: "Ushi Ushi no Mi, Model: Giraffe", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 90, code: "brook_soul_king", name: "Brook", title: "Soul King", rarity: "A", arc: "Thriller Bark", faction: "Straw Hat Pirates", variant: "Soul Form", type: "Speed Fighter", atk: 140, hp: 780, speed: 106, basePower: 1820, weapon: "Soul Solid", devilFruit: "Yomi Yomi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 91, code: "gecko_moria", name: "Gecko Moria", title: "Shadow Master", rarity: "A", arc: "Thriller Bark", faction: "Thriller Bark Pirates", variant: "Shadow Asgard", type: "Control", atk: 150, hp: 1220, speed: 58, basePower: 1750, weapon: "Scissors", devilFruit: "Kage Kage no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 92, code: "bartholomew_kuma", name: "Bartholomew Kuma", title: "Tyrant", rarity: "S", arc: "Thriller Bark", faction: "Revolutionary Army", variant: "Pacifista Palm", type: "Tank", atk: 172, hp: 1260, speed: 70, basePower: 2300, weapon: "Bible", devilFruit: "Nikyu Nikyu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 93, code: "boa_hancock", name: "Boa Hancock", title: "Pirate Empress", rarity: "S", arc: "Amazon Lily", faction: "Kuja Pirates", variant: "Love Beam", type: "Control", atk: 168, hp: 1040, speed: 92, basePower: 2258, weapon: "Perfume Femur", devilFruit: "Mero Mero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 94, code: "jinbe_first_son_of_the_sea", name: "Jinbe", title: "First Son of the Sea", rarity: "A", arc: "Marineford", faction: "Straw Hat Pirates", variant: "Fish-Man Karate", type: "Tank", atk: 146, hp: 1180, speed: 72, basePower: 1950, weapon: "Fish-Man Karate", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 95, code: "ace_fire_fist", name: "Portgas D. Ace", title: "Fire Fist", rarity: "A", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Flame Emperor", type: "Burst", atk: 180, hp: 980, speed: 96, basePower: 2000, weapon: "None", devilFruit: "Mera Mera no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 96, code: "whitebeard_strongest_man", name: "Edward Newgate", title: "Strongest Man", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Earthshaker", type: "Legend", atk: 238, hp: 1660, speed: 62, basePower: 2420, weapon: "Bisento", devilFruit: "Gura Gura no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 98, code: "blackbeard_emperor_of_darkness", name: "Marshall D. Teach", title: "Emperor of Darkness", rarity: "S", arc: "Final Saga", faction: "Blackbeard Pirates", variant: "Dual Devil Fruits", type: "Legend", atk: 242, hp: 1580, speed: 72, basePower: 2400, weapon: "None", devilFruit: "Yami Yami no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 100, code: "garp_hero_of_the_marines", name: "Monkey D. Garp", title: "Hero of the Marines", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Galaxy Impact", type: "Legend", atk: 230, hp: 1600, speed: 78, basePower: 2460, weapon: "Fists", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 101, code: "sengoku_buddha", name: "Sengoku", title: "The Buddha", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Golden Buddha", type: "Tank", atk: 170, hp: 1300, speed: 60, basePower: 2410, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Daibutsu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 102, code: "akainu", name: "Sakazuki", title: "Akainu", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Magma Emperor", type: "Legend", atk: 245, hp: 1540, speed: 74, basePower: 2380, weapon: "Magma Fist", devilFruit: "Magu Magu no Mi", secondaryDevilFruit: "Gura Gura no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 103, code: "aokiji", name: "Kuzan", title: "Aokiji", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Ice Age", type: "Control", atk: 174, hp: 1120, speed: 84, basePower: 2370, weapon: "Ice Saber", devilFruit: "Hie Hie no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 104, code: "kizaru", name: "Borsalino", title: "Kizaru", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Light-Speed Assault", type: "Speed Fighter", atk: 176, hp: 1080, speed: 104, basePower: 2375, weapon: "None", devilFruit: "Pika Pika no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 105, code: "shanks_red_hair", name: "Shanks", title: "Red Hair", rarity: "S", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Divine Departure", type: "Legend", atk: 265, hp: 1600, speed: 96, basePower: 2497, weapon: "Gryphon", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 106, code: "mihawk_hawk_eyes", name: "Dracule Mihawk", title: "Hawk Eyes", rarity: "S", arc: "Final Saga", faction: "Cross Guild", variant: "Strongest Swordsman", type: "Legend", atk: 252, hp: 1460, speed: 90, basePower: 2350, weapon: "Yoru", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 107, code: "roger_king_of_the_pirates", name: "Gol D. Roger", title: "King of the Pirates", rarity: "S", arc: "Flashback", faction: "Roger Pirates", variant: "Divine Departure", type: "Legend", atk: 260, hp: 1520, speed: 88, basePower: 2460, weapon: "Ace", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 108, code: "xebec_captain_of_rocks", name: "Rocks D. Xebec", title: "Captain of Rocks", rarity: "S", arc: "God Valley", faction: "Rocks Pirates", variant: "Chaos Sovereign", type: "Legend", atk: 268, hp: 1540, speed: 86, basePower: 2470, weapon: "Eclipse", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 109, code: "dragon_revolutionary_leader", name: "Monkey D. Dragon", title: "Revolutionary Leader", rarity: "S", arc: "Final Saga", faction: "Revolutionary Army", variant: "Storm Vanguard", type: "Legend", atk: 240, hp: 1480, speed: 94, basePower: 2400, weapon: "None", devilFruit: "Arashi Arashi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 110, code: "saturn", name: "Saint Jaygarcia Saturn", title: "Warrior God of Science and Defense", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 236, hp: 1620, speed: 70, basePower: 2465, weapon: "None", devilFruit: "Ushi Ushi no Mi, Model: Gyuki", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 111, code: "mars", name: "Saint Marcus Mars", title: "Warrior God of Environment", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 234, hp: 1600, speed: 72, basePower: 2470, weapon: "None", devilFruit: "Tori Tori no Mi, Model: Itsumade", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 112, code: "warcury", name: "Saint Topman Warcury", title: "Warrior God of Justice", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 238, hp: 1680, speed: 72, basePower: 2485, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Fengxi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 113, code: "nusjuro", name: "Saint Ethanbaron V Nusjuro", title: "Warrior God of Finance", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 242, hp: 1480, speed: 92, basePower: 2480, weapon: "Shodai Kitetsu", devilFruit: "Uma Uma no Mi, Model: Bakotsu", equipType: "Weapon", image: "" }),
  battleCard({ id: 114, code: "ju_peter", name: "Saint Shepherd Ju Peter", title: "Warrior God of Agriculture", rarity: "S", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 232, hp: 1640, speed: 68, basePower: 2475, weapon: "None", devilFruit: "Mushi Mushi no Mi, Model: Sandworm", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 115, code: "imu", name: "Saint Nerona Imu", title: "Sovereign of the Void", rarity: "S", arc: "Final Saga", faction: "World Government", variant: "Shadow Throne", type: "Legend", atk: 275, hp: 1800, speed: 95, basePower: 2500, weapon: "None", devilFruit: "Akuma no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 116, code: "garling", name: "Figarland Garling", title: "Holy Knight Commander", rarity: "S", arc: "Final Saga", faction: "Holy Knights", variant: "Sacred Executioner", type: "Attacker", atk: 188, hp: 1180, speed: 86, basePower: 2465, weapon: "Sacred Saber", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 117, code: "loki", name: "Loki", title: "Prince of Elbaf", rarity: "S", arc: "Elbaf", faction: "Elbaf", variant: "Giant Warrior", type: "Bruiser", atk: 260, hp: 1750, speed: 70, weapon: "Ragnir", basePower: 2495, devilFruit: "Ryu Ryu no Mi, Model: Nidhöggr", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 118, code: "rayleigh_dark_king", name: "Silvers Rayleigh", title: "Dark King", rarity: "S", arc: "Sabaody", faction: "Roger Pirates", variant: "Prime Haki", type: "Legend", atk: 236, hp: 1440, speed: 92, basePower: 2455, weapon: "Long Sword", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 119, code: "oden", name: "Kozuki Oden", title: "Lord of Wano", rarity: "S", arc: "Wano", faction: "Kozuki Clan", variant: "Togen Totsuka", type: "Legend", atk: 244, hp: 1500, speed: 84, basePower: 2450, weapon: "Enma, Ame no Habakiri", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 120, code: "perospero", name: "Perospero", title: "Candy Minister", rarity: "A", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Candy Wall", type: "Control", atk: 140, hp: 960, speed: 74, basePower: 1800, weapon: "Candy Cane", devilFruit: "Pero Pero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 121, code: "trebol_underworld_support", name: "Trebol", title: "Underworld Broker", rarity: "A", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "Sticky Trap", type: "Control", atk: 132, hp: 1020, speed: 58, basePower: 1800, weapon: "Sticky Staff", devilFruit: "Beta Beta no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 122, code: "queen_the_plague", name: "Queen", title: "The Plague", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Cyborg Brachiosaur", type: "Tank", atk: 176, hp: 1360, speed: 60, basePower: 2100, weapon: "Plague Arsenal", devilFruit: "Ryu Ryu no Mi, Model: Brachiosaurus", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 123, code: "king_wildfire", name: "King", title: "Wildfire", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Lunarian Flames", type: "Burst", atk: 182, hp: 1220, speed: 84, basePower: 2200, weapon: "Imperial Blade", devilFruit: "Ryu Ryu no Mi, Model: Pteranodon", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 124, code: "jack_the_drought", name: "Jack", title: "The Drought", rarity: "A", arc: "Wano", faction: "Beasts Pirates", variant: "Ancient Mammoth", type: "Bruiser", atk: 150, hp: 1320, speed: 58, basePower: 2000, weapon: "Twin Blades", devilFruit: "Zou Zou no Mi, Model: Mammoth", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 125, code: "yamato_oni_princess", name: "Yamato", title: "Oni Princess", rarity: "S", arc: "Wano", faction: "Wano", variant: "Guardian Wolf", type: "Fighter", atk: 186, hp: 1240, speed: 82, basePower: 2200, weapon: "Kanabo", devilFruit: "Inu Inu no Mi, Model: Okuchi no Makami", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 126, code: "greenbull", name: "Aramaki", title: "Ryokugyu", rarity: "S", arc: "Wano", faction: "Marines", variant: "Forest Admiral", type: "Control", atk: 204, hp: 1400, speed: 68, basePower: 2250, weapon: "None", devilFruit: "Mori Mori no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 127, code: "kaido_strongest_creature", name: "Kaido", title: "Strongest Creature", rarity: "S", arc: "Wano", faction: "Beast Pirates", variant: "Azure Dragon Emperor", type: "Legend", atk: 258, hp: 1680, speed: 78, basePower: 2420, weapon: "Hassaikai", devilFruit: "Uo Uo no Mi, Model: Seiryu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 128, code: "doflamingo_heavenly_demon", name: "Donquixote Doflamingo", title: "Heavenly Demon", rarity: "A", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "String Tyrant", type: "Control", atk: 182, hp: 1160, speed: 86, basePower: 1900, weapon: "None", devilFruit: "Ito Ito no Mi", equipType: "Devil Fruit", image: "" })
];

const EXTRA_CANON_CARDS = [
  battleCard({ id: 129, code: "sabo_flame_emperor", name: "Sabo", title: "Flame Emperor", rarity: "S", arc: "Dressrosa", faction: "Revolutionary Army", variant: "Mera Successor", type: "Burst", atk: 178, hp: 1040, speed: 94, basePower: 2300, weapon: "Dragon Claw Gloves", devilFruit: "Mera Mera no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 130, code: "fujitora", name: "Issho", title: "Fujitora", rarity: "S", arc: "Dressrosa", faction: "Marines", variant: "Gravity Blade", type: "Control", atk: 170, hp: 1180, speed: 72, basePower: 2250, weapon: "Shikomizue", devilFruit: "Zushi Zushi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 131, code: "katakuri_strongest_sweet_commander", name: "Charlotte Katakuri", title: "Strongest Sweet Commander", rarity: "S", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Future Sight", type: "Control", atk: 184, hp: 1160, speed: 90, basePower: 2350, weapon: "Mogura", devilFruit: "Mochi Mochi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 132, code: "big_mom_emperor", name: "Charlotte Linlin", title: "Big Mom", rarity: "S", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Soul Emperor", type: "Legend", atk: 236, hp: 1700, speed: 66, basePower: 2410, weapon: "Napoleon", devilFruit: "Soru Soru no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 133, code: "shiryu", name: "Shiryu", title: "Rain of the All-Out War", rarity: "A", arc: "Blackbeard Pirates", faction: "Blackbeard Pirates", variant: "Invisible Slayer", type: "Assassin", atk: 188, hp: 1080, speed: 92, basePower: 1950, weapon: "Raiu", devilFruit: "Suke Suke no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 134, code: "boa_seraphim", name: "S-Snake", title: "Boa Seraphim", rarity: "A", arc: "Egghead", faction: "World Government", variant: "Pacifista Model", type: "Control", atk: 150, hp: 980, speed: 82, basePower: 1900, weapon: "Laser Kicks", devilFruit: "Mero Mero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 135, code: "mihawk_seraphim", name: "S-Hawk", title: "Mihawk Seraphim", rarity: "A", arc: "Egghead", faction: "World Government", variant: "Pacifista Model", type: "Attacker", atk: 158, hp: 960, speed: 86, basePower: 1900, weapon: "Black Blade Replica", devilFruit: "Supa Supa no Mi", equipType: "Devil Fruit", image: "" })
];

const EXTRA_REQ_SUPPORT = [
  boostCard({ id: 136, code: "germa_lineage_factor", name: "Germa Lineage Factor", title: "Germa Factor", rarity: "A", arc: "Support", faction: "Passive", variant: "Genetic Boost", boostType: "spd", boostValue: 6, boostTarget: "team", basePower: 1250, boostDescription: "Increase team SPD by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 137, code: "gravity_sheath", name: "Gravity Sheath", title: "Gravity Sheath", rarity: "A", arc: "Support", faction: "Passive", variant: "Heavy Pressure", boostType: "hp", boostValue: 6, boostTarget: "team", basePower: 1300, boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 138, code: "holy_knight_standard", name: "Holy Knight Standard", title: "Holy Standard", rarity: "S", arc: "Support", faction: "Passive", variant: "Celestial Authority", boostType: "atk", boostValue: 7, boostTarget: "team", basePower: 1750, boostDescription: "Increase team ATK by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 139, code: "revolutionary_banner", name: "Revolutionary Banner", title: "Freedom Banner", rarity: "S", arc: "Support", faction: "Passive", variant: "Freedom Uprising", boostType: "dmg", boostValue: 7, boostTarget: "team", basePower: 1700, boostDescription: "Increase team damage by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 140, code: "revolutionary_oath", name: "Revolutionary Oath", title: "Revolutionary Oath", rarity: "A", arc: "Support", faction: "Passive", variant: "Liberation Cause", boostType: "daily", boostValue: 1, boostTarget: "account", basePower: 1200, boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 141, code: "donquixote_family", name: "Donquixote Family", title: "Donquixote Family", rarity: "A", arc: "Support", faction: "Passive", variant: "Underworld Strings", boostType: "dmg", boostValue: 6, boostTarget: "team", basePower: 1450, boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 142, code: "beast_pirates_terror", name: "Beast Pirates Terror", title: "Beast Pirates Terror", rarity: "S", arc: "Support", faction: "Passive", variant: "Calamity Fear", boostType: "hp", boostValue: 7, boostTarget: "team", basePower: 1650, boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 143, code: "sweet_commander_pride", name: "Sweet Commander Pride", title: "Sweet Commander Pride", rarity: "A", arc: "Support", faction: "Passive", variant: "Totto Land Might", boostType: "atk", boostValue: 6, boostTarget: "team", basePower: 1500, boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 144, code: "cp0_mask", name: "CP0 Mask", title: "Cipher Pol Mask", rarity: "A", arc: "Support", faction: "Passive", variant: "Silent Order", boostType: "spd", boostValue: 6, boostTarget: "team", basePower: 1450, boostDescription: "Increase team SPD by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 145, code: "world_government_edict", name: "World Government Edict", title: "Government Edict", rarity: "S", arc: "Support", faction: "Passive", variant: "Absolute Order", boostType: "daily", boostValue: 2, boostTarget: "account", basePower: 1600, boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 146, code: "marineford_legacy", name: "Marineford Legacy", title: "Marineford Legacy", rarity: "S", arc: "Support", faction: "Passive", variant: "War Memory", boostType: "exp", boostValue: 10, boostTarget: "account", basePower: 1750, boostDescription: "Increase EXP gain by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 147, code: "cross_guild_bounty", name: "Cross Guild Bounty", title: "Cross Guild Bounty", rarity: "A", arc: "Support", faction: "Passive", variant: "Hunter Incentive", boostType: "fragmentstorage", boostValue: 55, boostTarget: "account", basePower: 1425, boostDescription: "Increase fragment storage by 55 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 148, code: "god_valley_echo", name: "God Valley Echo", title: "God Valley Echo", rarity: "S", arc: "Support", faction: "Passive", variant: "Lost History", boostType: "daily", boostValue: 3, boostTarget: "account", basePower: 1500, boostDescription: "Increase daily reward quality by 3 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 149, code: "elbaf_might", name: "Elbaf Might", title: "Elbaf Might", rarity: "S", arc: "Support", faction: "Passive", variant: "Giant Valor", boostType: "hp", boostValue: 7, boostTarget: "team", basePower: 1800, boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 150, code: "void_century_fragment", name: "Void Century Fragment", title: "Void Century Fragment", rarity: "S", arc: "Support", faction: "Passive", variant: "Forbidden Record", boostType: "exp", boostValue: 12, boostTarget: "account", basePower: 1795, boostDescription: "Increase EXP gain by 12% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 151, code: "relic_of_joy", name: "Relic of Joy", title: "Relic of Joy", rarity: "S", arc: "Support", faction: "Passive", variant: "Liberation Relic", boostType: "atk", boostValue: 10, boostTarget: "account", basePower: 1950, boostDescription: "Increase team HP by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 152, code: "pirate_king_log", name: "Pirate King Log", title: "Pirate King Log", rarity: "S", arc: "Support", faction: "Passive", variant: "Great Voyage Record", boostType: "hp", boostValue: 7, boostTarget: "account", basePower: 1940, boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" })
];

const EXTRA_CHARACTER_CARDS = [
  battleCard({ id: 153, code: "corazon", name: "Donquixote Rosinante", title: "Corazon", rarity: "A", arc: "Dressrosa", faction: "Marines", variant: "Silent Heart", type: "Support", atk: 112, hp: 860, speed: 84, basePower: 1700, weapon: "Silencer Handgun", devilFruit: "Nagi Nagi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 154, code: "yasopp", name: "Yasopp", title: "Red-Hair Sniper", rarity: "S", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Deadeye", type: "Ranged", atk: 176, hp: 980, speed: 96, basePower: 2400, weapon: "Long Rifle", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 155, code: "sentomaru", name: "Sentomaru", title: "Defense Captain", rarity: "A", arc: "Sabaody", faction: "Marines", variant: "Axe Guard", type: "Tank", atk: 144, hp: 1100, speed: 60, basePower: 1800, weapon: "Battle Axe", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 156, code: "gan_fall", name: "Gan Fall", title: "Sky Knight", rarity: "B", arc: "Skypiea", faction: "Skypiea", variant: "Sky Lance", type: "Attacker", atk: 102, hp: 760, speed: 74, basePower: 1450, weapon: "Sky Lance", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 157, code: "saul", name: "Jaguar D. Saul", title: "Giant Marine", rarity: "A", arc: "Ohara", faction: "Marines", variant: "Giant Resolve", type: "Tank", atk: 150, hp: 1280, speed: 48, basePower: 1850, weapon: "Giant Fists", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 158, code: "mr3", name: "Galdino", title: "Mr. 3", rarity: "B", arc: "Little Garden", faction: "Baroque Works", variant: "Wax Sculptor", type: "Control", atk: 96, hp: 700, speed: 68, basePower: 1350, weapon: "Wax Blade", devilFruit: "Doru Doru no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 159, code: "wapol", name: "Wapol", title: "Bliking King", rarity: "B", arc: "Drum Island", faction: "Drum Kingdom", variant: "Metal Mouth", type: "Bruiser", atk: 98, hp: 820, speed: 56, basePower: 1200, weapon: "Cannon Jaw", devilFruit: "Baku Baku no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 160, code: "caesar_clown", name: "Caesar Clown", title: "Master of Gas", rarity: "A", arc: "Punk Hazard", faction: "Independent", variant: "Gas Weapon", type: "Control", atk: 144, hp: 920, speed: 78, basePower: 1750, weapon: "Chemical Staff", devilFruit: "Gasu Gasu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 161, code: "gunko_holy_knight", name: "Manmayer Gunko", title: "Holy Knight", rarity: "S", arc: "Elbaf", faction: "Holy Knights", variant: "Arrow Executioner", type: "Control", atk: 186, hp: 1180, speed: 94, basePower: 2475, weapon: "None", devilFruit: "Aro Aro no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 162, code: "hody_jones", name: "Hody Jones", title: "Captain of the New Fish-Man Pirates", rarity: "A", arc: "Fish-Man Island", faction: "New Fish-Man Pirates", variant: "Steroid Tyrant", type: "Bruiser", atk: 142, hp: 1080, speed: 58, basePower: 1720, weapon: "Trident", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 163, code: "law_surgeon_of_death", name: "Trafalgar D. Water Law", title: "Surgeon of Death", rarity: "S", arc: "Dressrosa", faction: "Heart Pirates", variant: "Room", type: "Control", atk: 190, hp: 1180, speed: 92, basePower: 2385, weapon: "Kikoku", devilFruit: "Ope Ope no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 164, code: "kid_captain", name: "Eustass Kid", title: "Captain", rarity: "S", arc: "Wano", faction: "Kid Pirates", variant: "Punk Rotten", type: "Burst", atk: 215, hp: 1360, speed: 72, basePower: 2390, weapon: "Metal Arm", devilFruit: "Jiki Jiki no Mi", equipType: "Devil Fruit", image: "" })
];

const SPECIAL_FORMS = {
  luffy_straw_hat: ["The Beginning", "Revival", "Gear 5"],
  zoro_pirate_hunter: ["Three Sword Style", "King of Hell", "Asura"],
  nami_cat_burglar: ["Weather Rookie", "Thunder Tempo", "Zeus Queen"],
  usopp_sniper: ["Sniper Rookie", "Pop Green Arsenal", "God Usopp"],
  sanji_black_leg: ["The Beginning", "Germa Awakening", "Ifrit Jambe"],
  morgan_axe_hand: ["Captain Morgan", "Axe-Hand", "Fallen"],
  helmeppo_spoiled_brat: ["Early Helmeppo", "Post-Enies Lobby", "Marine HQ"],
  buggy_the_clown: ["Early Buggy", "Alabasta", "Impel Down Younkou"],
  kuro_hundred_plans: ["East Blue Saga", "Baratie", "Long Ring Long Land"],
  jango_hypnotist: ["Syrup Village", "Jango Dance Paradise", "Marine Phase"],
  don_krieg_admiral: ["East Blue Saga", "Syrup Village", "Baratie"],
  gin_man_demon: ["East Blue Saga", "Arlong Park", "Baratie"],
  arlong_saw: ["East Blue Saga", "Arlong Park", "Arlong Prime"],
  hatchan_six_sword_style: ["East Blue Saga", "Arlong Park", "Fish-Man Island"],
  smoker_white_hunter: ["East Blue", "Baroque Works", "New World"],
  tashigi_swordswoman: ["East Blue", "Alabasta", "Punk Hazard"],
  chopper_cotton_candy_lover: ["Heal Pulse", "Guard Point", "Monster Point Rampage"],
  kaya_medical_patron: ["Medical Aid", "Recovery Boost", "Full Team Heal"],
  bepo_navigator_support: ["Sabaody Archipelago", "Heart Pirates", "Final War"],
  killer_massacre_soldier: ["Sabaody Archipelago", "Wano Country", "Rooftop War"],
  marco_phoenix: ["Marineford", "Wano Country", "Whitebeard Remnants"],
  ben_beckman: ["Romance Dawn", "Post-Enies Lobby", "Egghead"],
  charlotte_pudding: ["Whole Cake Island", "Memory Eye", "Three-Eyed Awakening"],
  mansherry_healing_princess: ["Dressrosa", "Revolution Support", "Healing Kingdom"],
  vegapunk_stella: ["Dragon", "Egghead", "World Knowledge"],
  lindbergh_revolutionary_genius: ["Revolutionary Army", "Mary Geoise Raid", "Final War"],
  doc_q_sickly_support: ["Jaya", "Wano", "Blackbeard Pirates"],
  shirahoshi_sea_princess: ["Fish-Man Island", "Reverie", "Ancient Weapon"],
  hiyori_festival_support: ["Wano Country", "Onigashima", "Post-Wano"],
  carina_treasure_hunter: ["Film Gold", "New World Crime", "Underworld"],
  kalifa_cp9_support: ["Water 7", "Enies Lobby", "CP0"],
  baccarat_lucky_draw: ["Film Gold", "Underworld", "Luck Manipulation"],
  perona_ghost_princess: ["Thriller Bark", "Sabaody Archipelago", "Hawk Pirates"],
  tsuru_tactical_support: ["Sengoku Era", "Marineford", "Marine HQ"],
  reiju_poison_pink: ["Germa Kingdom", "Whole Cake Island", "Germa Support"],
  otama_kibi_support: ["Wano Country", "Onigashima", "New Era"],
  iceburg: ["Water 7", "Enies Lobby", "Pluton Era"],
  laboon: ["Reverse Mountain", "Thriller Bark", "Grand Line Eternal"],
  sniper_focus: ["East Blue Training", "Enies Lobby", "God Tier Sniper"],
  weather_science: ["Loguetown", "Grand Line", "Climate Warfare"],
  wado_ichimonji_spirit: ["Zoro Childhood", "Thriller Bark", "Black Blade Awakening"],
  suna_suna_core: ["Alabasta", "Crocodile", "Sand Dominion"],
  ohara_will: ["Ohara Incident", "Robin Flashback", "Void Century"],
  goro_goro_core: ["Skypiea", "Enel", "Lightning God"],
  cola_engine: ["Water 7", "Franky", "Pluton Energy"],
  rokushiki_manual: ["CP9 Training", "Enies Lobby", "CP0 Mastery"],
  soul_solid: ["Thriller Bark", "Brook", "Soul King"],
  shadow_core: ["Thriller Bark", "Moria", "Shadow Army"],
  kuja_haki: ["Amazon Lily", "Hancock", "Conqueror Queen"],
  fishman_karate_scroll: ["Fish-Man Island", "Jinbe Training", "Underwater Martial Arts"],
  mera_mera_will: ["Alabasta", "Dressrosa", "Flame Inheritance"],
  gura_gura_will: ["Marineford", "Blackbeard", "Earthquake Legacy"],
  fist_of_love: ["Garp Training", "Marine HQ", "Hero Punch Legacy"],
  golden_buddha_mandate: ["Sengoku", "Marineford", "Buddha Justice"],
  magma_core: ["Marineford", "Sakazuki", "Volcanic Justice"],
  ice_core: ["Marineford", "Aokiji", "Frozen Justice"],
  light_core: ["Sabaody", "Kizaru", "Photon Speed"],
  darkness_core: ["Jaya", "Blackbeard", "Void Devourer"],
  ope_ope_notes: ["Punk Hazard", "Dressrosa", "Immortality Surgery"],
  magnet_core: ["Punk Hazard", "Wano", "Magnetic Burst"],
  ito_ito_awakening: ["Dressrosa", "Doflamingo", "Puppet Kingdom"],
  future_sight: ["Whole Cake Island", "Katakuri", "Advanced Observation"],
  soru_soru_soul: ["Whole Cake Island", "Big Mom", "Soul Kingdom"],
  lunarian_flame: ["King Flashback", "Wano", "Lunar Race"],
  plague_tech: ["Queen", "Beast Pirates", "Bio Warfare"],
  beast_core: ["Zoan Awakening", "Wano", "Beast Dominion"],
  oni_lineage: ["Kaido Flashback", "Wano", "Demon Blood"],
  forest_core: ["Green Bull", "Nature Dominion", "Forest God"],
  nika_drums: ["Skypiea", "Wano", "Joy Boy Awakening"],
  supreme_haki: ["Rayleigh Training", "Yonko War", "King of Pirates"],
  black_blade_yoru: ["Baratie", "Marineford", "World's Strongest Swordsman"],
  chaos_core: ["Void Century", "Blackbeard Theory", "World Collapse"],
  storm_mandate: ["Weather Science", "Grand Line Storm", "World Climate War"],
  empty_throne_edict: ["Mary Geoise", "Imu Reveal", "World Control"],
  holy_knight_sigil: ["God Knights", "Mary Geoise Defense", "Final War"],
  giant_curse: ["Elbaf", "Ancient Giant", "Final War"],
  samurai_spirit: ["Wano Country", "Kozuki Legacy", "Sword Soul"],
  crocodile_desert_king: ["Desert Tyrant", "Awakened Sand", "Underworld King"],
  nico_robin_devil_child: ["Archaeologist", "Demonio Fleur", "Ohara's Flame"],
  daz_bonez: ["Alabasta", "Impel Down", "Underworld"],
  bellamy_hyena: ["Jaya", "Dressrosa", "New World Redemption"],
  wyper_shandian_warrior: ["Skypiea", "Upper Yard War", "Sky People"],
  enel_god: ["God", "Raigo", "Thunder God"],
  franky_cyborg: ["Water 7", "Enies Lobby", "Wano Country"],
  lucci_cp9: ["Water 7", "Enies Lobby", "Awakening"],
  kaku_cp9: ["Water 7", "Enies Lobby", "CP0"],
  brook_soul_king: ["Soul Prelude", "Soul Parade", "Underworld Maestro"],
  gecko_moria: ["Thriller Bark", "Marineford", "New World Shadows"],
  bartholomew_kuma: ["Tyrant", "Pacifista", "Liberation Program"],
  boa_hancock: ["Pirate Empress", "Love Beam", "Slave Arrow"],
  jinbe_first_son_of_the_sea: ["First Son of the Sea", "Helmsman", "Ocean Vanguard"],
  ace_fire_fist: ["Fire Fist", "Inherited Flame", "Flame Emperor"],
  whitebeard_strongest_man: ["Strongest Man", "Quake Emperor", "Prime Whitebeard"],
  blackbeard_emperor_of_darkness: ["Darkness", "Dual Devil Fruits", "Emperor of Darkness"],
  garp_hero_of_the_marines: ["Hero of the Marines", "Fist of Love", "Galaxy Impact"],
  sengoku_buddha: ["Fleet Admiral", "Buddha Form", "Golden Buddha"],
  akainu: ["Akainu", "Magma Emperor", "Absolute Justice"],
  aokiji: ["Aokiji", "Ice Age", "Frozen Admiral"],
  kizaru: ["Kizaru", "Light-Speed Assault", "Photon Admiral"],
  shanks_red_hair: ["Red Hair", "Conqueror Haki", "Divine Departure"],
  mihawk_hawk_eyes: ["Hawk Eyes", "Yoru Master", "World's Strongest Swordsman"],
  roger_king_of_the_pirates: ["Great Pirate", "Divine Departure", "King of the Pirates"],
  xebec_captain_of_rocks: ["Captain of Rocks", "Chaos Sovereign", "God Valley Terror"],
  dragon_revolutionary_leader: ["Revolutionary Leader", "Storm Vanguard", "World's Most Wanted"],
  saturn: ["Science Warrior God", "Demonic Form", "Gyuki Terror"],
  mars: ["Environment Warrior God", "Demonic Form", "Itsumade Terror"],
  warcury: ["Justice Warrior God", "Demonic Form", "Fengxi Terror"],
  nusjuro: ["Finance Warrior God", "Demonic Form", "Bakotsu Blade"],
  ju_peter: ["Agriculture Warrior God", "Demonic Form", "Sandworm Terror"],
  imu: ["Hidden Sovereign", "Empty Throne Shadow", "King Of The World"],
  garling: ["Holy Knight Commander", "Sacred Executioner", "God Valley Champion"],
  loki: ["Prince of Elbaf", "Giant Warrior", "Cursed Prince"],
  rayleigh_dark_king: ["Dark King", "Prime Haki", "Roger's Right Hand"],
  oden: ["Lord of Wano", "Togen Totsuka", "Legendary Samurai"],
  perospero: ["Candy Minister", "Candy Wall", "Totto Land Trickster"],
  trebol_underworld_support: ["Underworld Broker", "Sticky Trap", "Donquixote Executive"],
  queen_the_plague: ["The Plague", "Cyborg Brachiosaur", "Plague Arsenal"],
  king_wildfire: ["Wildfire", "Lunarian Flames", "Imperial Blade"],
  yamato_oni_princess: ["Oni Princess", "Guardian Wolf", "Oden's Will"],
  greenbull: ["Ryokugyu", "Forest Admiral", "Nature Dominion"],
  kaido_strongest_creature: ["Strongest Creature", "Azure Dragon", "Flaming Drum Dragon"],
  doflamingo_heavenly_demon: ["Heavenly Demon", "Birdcage", "Awakened Strings"],
  sabo_flame_emperor: ["Revolutionary Chief", "Flame Successor", "Flame Emperor"],
  fujitora: ["Fujitora", "Gravity Blade", "Meteor Justice"],
  katakuri_strongest_sweet_commander: ["Sweet Commander", "Future Sight", "Mochi Emperor"],
  big_mom_emperor: ["Big Mom", "Soul Emperor", "Totto Land Queen"],
  shiryu: ["Rain of the All-Out War", "Invisible Slayer", "Clear-Clear Assassin"],
  boa_seraphim: ["Boa Seraphim", "Pacifista Model", "Love Seraphim"],
  mihawk_seraphim: ["Mihawk Seraphim", "Pacifista Model", "Blade Seraphim"],
  germa_lineage_factor: ["Genetic Boost", "Germa Awakening", "Lineage Factor"],
  gravity_sheath: ["Heavy Pressure", "Crushing Force", "Gravity Domain"],
  holy_knight_standard: ["Celestial Authority", "Divine Banner", "Holy Order"],
  revolutionary_banner: ["Freedom Uprising", "Flame of Revolution", "Liberation Flag"],
  revolutionary_oath: ["Liberation Cause", "Will of Freedom", "Rebel's Promise"],
  donquixote_family: ["Underworld Strings", "Heavenly Demon Rule", "Puppet Kingdom"],
  beast_pirates_terror: ["Calamity Fear", "Beasts Dominion", "Onigashima Tyranny"],
  sweet_commander_pride: ["Totto Land Might", "Sweet Authority", "Big Mom's Elite"],
  cp0_mask: ["Silent Order", "Cipher Pol Aegis", "World Government Shadow"],
  world_government_edict: ["Absolute Order", "Global Authority", "Sovereign Command"],
  marineford_legacy: ["War Memory", "Paramount War Echo", "Era of Justice"],
  cross_guild_bounty: ["Hunter Incentive", "Marine Bounty System", "Guild of Chaos"],
  god_valley_echo: ["Lost History", "Rocks Era Secret", "Celestial Incident"],
  elbaf_might: ["Giant Valor", "Warrior Nation Pride", "Elbaf Honor"],
  void_century_fragment: ["Forbidden Record", "Lost Century Truth", "Ancient Secret"],
  relic_of_joy: ["Liberation Relic", "Drums of Freedom", "Sun God Legacy"],
  pirate_king_log: ["Great Voyage Record", "King's Journey", "Laugh Tale Path"],
  corazon: ["Silent Heart", "Kind Marine", "Nagi Protector"],
  yasopp: ["Deadeye", "Red Hair Sniper", "Unmatched Aim"],
  sentomaru: ["Axe Guard", "Defense Captain", "Pacifista Shield"],
  gan_fall: ["Sky Knight", "God's Guardian", "Divine Protector"],
  saul: ["Giant Resolve", "D. Clan Will", "Ohara Protector"],
  mr3: ["Wax Sculptor", "Candle Champion", "Strategic Trickster"],
  wapol: ["Metal Mouth", "Bliking King", "Devourer Tyrant"],
  caesar_clown: ["Gas Weapon", "Mad Scientist", "Toxic Genius"],
  gunko_holy_knight: ["Arrow Executioner", "Holy Knight Enforcer", "Divine Punisher"],
  hody_jones: ["Steroid Tyrant", "Fish-Man Supremacy", "Ocean Rebel"],
  law_surgeon_of_death: ["Surgeon of Death", "Kroom", "Silent Room"],
  kid_captain: ["Captain", "Awakened Magnet", "Damned Punk"],
};

function reqCard(code, m2Stage = 1, m3Stage = 2) {
  return {
    code,
    M2: m2Stage,
    M3: m3Stage,
  };
}

function reqBoost(code, m2Stage = 1, m3Stage = 2) {
  return {
    code,
    M2: m2Stage,
    M3: m3Stage,
  };
}

const BOOST_CANON_CARD_REQUIREMENTS = {
  nika_drums: [reqCard("luffy_straw_hat", 1, 2)],
  wado_ichimonji_spirit: [reqCard("zoro_pirate_hunter", 1, 2)],
  weather_science: [reqCard("nami_cat_burglar", 1, 2)],
  sniper_focus: [reqCard("usopp_sniper", 1, 2)],
  germa_lineage_factor: [reqCard("sanji_black_leg", 1, 2)],
  tsuru_tactical_support: [reqCard("smoker_white_hunter", 1, 2)],
  suna_suna_core: [reqCard("crocodile_desert_king", 1, 2)],
  ohara_will: [reqCard("nico_robin_devil_child", 1, 2)],
  goro_goro_core: [reqCard("enel_god", 1, 2)],
  cola_engine: [reqCard("franky_cyborg", 1, 2)],
  rokushiki_manual: [reqCard("lucci_cp9", 1, 2)],
  soul_solid: [reqCard("brook_soul_king", 1, 2)],
  shadow_core: [reqCard("gecko_moria", 1, 2)],
  kuja_haki: [reqCard("boa_hancock", 1, 2)],
  fishman_karate_scroll: [reqCard("jinbe_first_son_of_the_sea", 1, 2)],
  mera_mera_will: [reqCard("ace_fire_fist", 1, 2)],
  gura_gura_will: [reqCard("whitebeard_strongest_man", 1, 2)],
  fist_of_love: [reqCard("garp_hero_of_the_marines", 1, 2)],
  golden_buddha_mandate: [reqCard("sengoku_buddha", 1, 2)],
  magma_core: [reqCard("akainu", 1, 2)],
  ice_core: [reqCard("aokiji", 1, 2)],
  light_core: [reqCard("kizaru", 1, 2)],
  darkness_core: [reqCard("blackbeard_emperor_of_darkness", 1, 2)],
  ope_ope_notes: [reqCard("law_surgeon_of_death", 1, 2)],
  magnet_core: [reqCard("kid_captain", 1, 2)],
  ito_ito_awakening: [reqCard("doflamingo_heavenly_demon", 1, 2)],
  gravity_sheath: [reqCard("fujitora", 1, 2)],
  future_sight: [reqCard("katakuri_strongest_sweet_commander", 1, 2)],
  soru_soru_soul: [reqCard("big_mom_emperor", 1, 2)],
  lunarian_flame: [reqCard("king_wildfire", 1, 2)],
  plague_tech: [reqCard("queen_the_plague", 1, 2)],
  beast_core: [reqCard("kaido_strongest_creature", 1, 2)],
  oni_lineage: [reqCard("yamato_oni_princess", 1, 2)],
  forest_core: [reqCard("greenbull", 1, 2)],
  supreme_haki: [reqCard("shanks_red_hair", 1, 2)],
  black_blade_yoru: [reqCard("mihawk_hawk_eyes", 1, 2)],
  chaos_core: [reqCard("xebec_captain_of_rocks", 1, 2)],
  storm_mandate: [reqCard("dragon_revolutionary_leader", 1, 2)],
  empty_throne_edict: [reqCard("imu", 1, 2)],
  holy_knight_sigil: [reqCard("garling", 1, 2)],
  giant_curse: [reqCard("loki", 1, 2)],
  samurai_spirit: [reqCard("oden", 1, 2)],
};

const CANON_LINKS = {
  luffy_straw_hat: {
    cards: [
      reqCard("zoro_pirate_hunter", 1, 2),
      reqCard("nami_cat_burglar", 1, 2),
      reqCard("sanji_black_leg", 1, 2),
    ],
    boosts: [reqBoost("nika_drums", 1, 2)],
  },

  zoro_pirate_hunter: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("mihawk_hawk_eyes", 1, 2),
      reqCard("oden", 1, 2),
    ],
    boosts: [reqBoost("wado_ichimonji_spirit", 1, 2)],
  },

  nami_cat_burglar: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("usopp_sniper", 1, 2),
    ],
    boosts: [reqBoost("weather_science", 1, 2)],
  },

  usopp_sniper: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("yasopp", 1, 2),
      reqCard("nami_cat_burglar", 1, 2),
    ],
    boosts: [reqBoost("sniper_focus", 1, 2)],
  },

  sanji_black_leg: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("zoro_pirate_hunter", 1, 2),
      reqCard("reiju", 1, 2),
    ],
    boosts: [reqBoost("germa_lineage_factor", 1, 2)],
  },

  smoker_white_hunter: {
    cards: [
      reqCard("tashigi_swordswoman", 1, 2),
      reqCard("koby_aspiring_marine", 1, 2),
    ],
    boosts: [reqBoost("tsuru_tactical_support", 1, 2)],
  },

  crocodile_desert_king: {
    cards: [
      reqCard("nico_robin_devil_child", 1, 2),
      reqCard("daz_bonez", 1, 2),
    ],
    boosts: [reqBoost("suna_suna_core", 1, 2)],
  },

  nico_robin_devil_child: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("saul", 1, 2),
    ],
    boosts: [reqBoost("ohara_will", 1, 2)],
  },

  enel_god: {
    cards: [
      reqCard("wyper_shandian_warrior", 1, 2),
      reqCard("gan_fall", 1, 2),
    ],
    boosts: [reqBoost("goro_goro_core", 1, 2)],
  },

  franky_cyborg: {
    cards: [
      reqCard("iceburg", 1, 2),
      reqCard("brook_soul_king", 1, 2),
    ],
    boosts: [reqBoost("cola_engine", 1, 2)],
  },

  lucci_cp9: {
    cards: [
      reqCard("kaku_cp9", 1, 2),
      reqCard("kalifa_cp9_support", 1, 2),
    ],
    boosts: [reqBoost("rokushiki_manual", 1, 2)],
  },

  brook_soul_king: {
    cards: [
      reqCard("laboon", 1, 2),
      reqCard("franky_cyborg", 1, 2),
    ],
    boosts: [reqBoost("soul_solid", 1, 2)],
  },

  gecko_moria: {
    cards: [
      reqCard("bartholomew_kuma", 1, 2),
      reqCard("brook_soul_king", 1, 2),
    ],
    boosts: [reqBoost("shadow_core", 1, 2)],
  },

  boa_hancock: {
    cards: [
      reqCard("jinbe_first_son_of_the_sea", 1, 2),
      reqCard("luffy_straw_hat", 1, 2),
    ],
    boosts: [reqBoost("kuja_haki", 1, 2)],
  },

  jinbe_first_son_of_the_sea: {
    cards: [
      reqCard("ace_fire_fist", 1, 2),
      reqCard("luffy_straw_hat", 1, 2),
    ],
    boosts: [reqBoost("fishman_karate_scroll", 1, 2)],
  },

  ace_fire_fist: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("sabo_flame_emperor", 1, 2),
    ],
    boosts: [reqBoost("mera_mera_will", 1, 2)],
  },

  whitebeard_strongest_man: {
    cards: [
      reqCard("ace_fire_fist", 1, 2),
      reqCard("marco_phoenix", 1, 2),
    ],
    boosts: [reqBoost("gura_gura_will", 1, 2)],
  },

  garp_hero_of_the_marines: {
    cards: [
      reqCard("koby_aspiring_marine", 1, 2),
      reqCard("luffy_straw_hat", 1, 2),
    ],
    boosts: [reqBoost("fist_of_love", 1, 2)],
  },

  sengoku_buddha: {
    cards: [
      reqCard("garp_hero_of_the_marines", 1, 2),
      reqCard("tsuru_tactical_support", 1, 2),
    ],
    boosts: [reqBoost("golden_buddha_mandate", 1, 2)],
  },

  akainu: {
    cards: [
      reqCard("aokiji", 1, 2),
      reqCard("kizaru", 1, 2),
    ],
    boosts: [reqBoost("magma_core", 1, 2)],
  },

  aokiji: {
    cards: [
      reqCard("akainu", 1, 2),
      reqCard("garp_hero_of_the_marines", 1, 2),
    ],
    boosts: [reqBoost("ice_core", 1, 2)],
  },

  kizaru: {
    cards: [
      reqCard("akainu", 1, 2),
      reqCard("sentomaru", 1, 2),
    ],
    boosts: [reqBoost("light_core", 1, 2)],
  },

  blackbeard_emperor_of_darkness: {
    cards: [
      reqCard("doc_q_sickly_support", 1, 2),
      reqCard("shiryu", 1, 2),
    ],
    boosts: [reqBoost("darkness_core", 1, 2)],
  },

  law_surgeon_of_death: {
    cards: [
      reqCard("bepo_navigator_support", 1, 2),
      reqCard("corazon", 1, 2),
    ],
    boosts: [reqBoost("ope_ope_notes", 1, 2)],
  },

  kid_captain: {
    cards: [
      reqCard("killer_massacre_soldier", 1, 2),
      reqCard("law_surgeon_of_death", 1, 2),
    ],
    boosts: [reqBoost("magnet_core", 1, 2)],
  },

  doflamingo_heavenly_demon: {
    cards: [
      reqCard("trebol_underworld_support", 1, 2),
      reqCard("law_surgeon_of_death", 1, 2),
    ],
    boosts: [reqBoost("ito_ito_awakening", 1, 2)],
  },

  sabo_flame_emperor: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("ace_fire_fist", 1, 2),
      reqCard("dragon_revolutionary_leader", 1, 2),
    ],
    boosts: [reqBoost("mera_mera_will", 1, 2)],
  },

  fujitora: {
    cards: [
      reqCard("akainu", 1, 2),
      reqCard("greenbull", 1, 2),
    ],
    boosts: [reqBoost("gravity_sheath", 1, 2)],
  },

  katakuri_strongest_sweet_commander: {
    cards: [
      reqCard("big_mom_emperor", 1, 2),
      reqCard("charlotte_pudding", 1, 2),
    ],
    boosts: [reqBoost("future_sight", 1, 2)],
  },

  big_mom_emperor: {
    cards: [
      reqCard("katakuri_strongest_sweet_commander", 1, 2),
      reqCard("perospero", 1, 2),
    ],
    boosts: [reqBoost("soru_soru_soul", 1, 2)],
  },

  king_wildfire: {
    cards: [
      reqCard("queen_the_plague", 1, 2),
      reqCard("kaido_strongest_creature", 1, 2),
    ],
    boosts: [reqBoost("lunarian_flame", 1, 2)],
  },

  queen_the_plague: {
    cards: [
      reqCard("king_wildfire", 1, 2),
      reqCard("jack_the_drought", 1, 2),
    ],
    boosts: [reqBoost("plague_tech", 1, 2)],
  },

  jack_the_drought: {
    cards: [
      reqCard("kaido_strongest_creature", 1, 2),
      reqCard("king_wildfire", 1, 2),
    ],
    boosts: [reqBoost("beast_core", 1, 2)],
  },

  yamato_oni_princess: {
    cards: [
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("kaido_strongest_creature", 1, 2),
    ],
    boosts: [reqBoost("oni_lineage", 1, 2)],
  },

  kaido_strongest_creature: {
    cards: [
      reqCard("king_wildfire", 1, 2),
      reqCard("yamato_oni_princess", 1, 2),
      reqCard("big_mom_emperor", 1, 2),
    ],
    boosts: [reqBoost("oni_lineage", 1, 2)],
  },

  greenbull: {
    cards: [
      reqCard("akainu", 1, 2),
      reqCard("fujitora", 1, 2),
    ],
    boosts: [reqBoost("forest_core", 1, 2)],
  },

  shanks_red_hair: {
    cards: [
      reqCard("ben_beckman", 1, 2),
      reqCard("luffy_straw_hat", 1, 2),
      reqCard("rayleigh_dark_king", 1, 2),
    ],
    boosts: [reqBoost("supreme_haki", 1, 2)],
  },

  mihawk_hawk_eyes: {
    cards: [
      reqCard("zoro_pirate_hunter", 1, 2),
      reqCard("shanks_red_hair", 1, 2),
    ],
    boosts: [reqBoost("black_blade_yoru", 1, 2)],
  },

  roger_king_of_the_pirates: {
    cards: [
      reqCard("rayleigh_dark_king", 1, 2),
      reqCard("oden", 1, 2),
    ],
    boosts: [reqBoost("supreme_haki", 1, 2)],
  },

  xebec_captain_of_rocks: {
    cards: [
      reqCard("whitebeard_strongest_man", 1, 2),
      reqCard("big_mom_emperor", 1, 2),
      reqCard("kaido_strongest_creature", 1, 2),
    ],
    boosts: [reqBoost("chaos_core", 1, 2)],
  },

  dragon_revolutionary_leader: {
    cards: [
      reqCard("sabo_flame_emperor", 1, 2),
      reqCard("luffy_straw_hat", 1, 2),
    ],
    boosts: [reqBoost("storm_mandate", 1, 2)],
  },

  saturn: {
    cards: [
      reqCard("mars", 1, 2),
      reqCard("warcury", 1, 2),
    ],
    boosts: [reqBoost("empty_throne_edict", 1, 2)],
  },

  mars: {
    cards: [
      reqCard("saturn", 1, 2),
      reqCard("warcury", 1, 2),
    ],
    boosts: [reqBoost("empty_throne_edict", 1, 2)],
  },

  warcury: {
    cards: [
      reqCard("mars", 1, 2),
      reqCard("nusjuro", 1, 2),
    ],
    boosts: [reqBoost("empty_throne_edict", 1, 2)],
  },

  nusjuro: {
    cards: [
      reqCard("warcury", 1, 2),
      reqCard("ju_peter", 1, 2),
    ],
    boosts: [reqBoost("empty_throne_edict", 1, 2)],
  },

  ju_peter: {
    cards: [
      reqCard("nusjuro", 1, 2),
      reqCard("saturn", 1, 2),
    ],
    boosts: [reqBoost("empty_throne_edict", 1, 2)],
  },

  imu: {
    cards: [
      reqCard("saturn", 1, 2),
      reqCard("mars", 1, 2),
      reqCard("warcury", 1, 2),
    ],
    boosts: [
      reqBoost("empty_throne_edict", 1, 2),
      reqBoost("supreme_haki", 1, 2),
    ],
  },

  garling: {
    cards: [
      reqCard("shanks_red_hair", 1, 2),
      reqCard("imu", 1, 2),
    ],
    boosts: [reqBoost("holy_knight_sigil", 1, 2)],
  },

  loki: {
    cards: [
      reqCard("imu", 1, 2),
      reqCard("shanks_red_hair", 1, 2),
    ],
    boosts: [reqBoost("giant_curse", 1, 2)],
  },

  rayleigh_dark_king: {
    cards: [
      reqCard("roger_king_of_the_pirates", 1, 2),
      reqCard("shanks_red_hair", 1, 2),
    ],
    boosts: [reqBoost("supreme_haki", 1, 2)],
  },

  oden: {
    cards: [
      reqCard("roger_king_of_the_pirates", 1, 2),
      reqCard("whitebeard_strongest_man", 1, 2),
    ],
    boosts: [reqBoost("samurai_spirit", 1, 2)],
  },

  boa_seraphim: {
    cards: [
      reqCard("boa_hancock", 1, 2),
      reqCard("vegapunk_stella", 1, 2),
    ],
    boosts: [reqBoost("empty_throne_edict", 1, 2)],
  },

  mihawk_seraphim: {
    cards: [
      reqCard("mihawk_hawk_eyes", 1, 2),
      reqCard("vegapunk_stella", 1, 2),
    ],
    boosts: [reqBoost("black_blade_yoru", 1, 2)],
  },
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

function getAllCardTemplatesForReqName() {
  return [
    ...BASE_CARDS,
    ...EXTRA_CANON_CARDS,
    ...EXTRA_REQ_SUPPORT,
    ...EXTRA_CHARACTER_CARDS,
  ];
}

function prettifyCode(code) {
  return String(code || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getReqDisplayName(code) {
  const found = getAllCardTemplatesForReqName().find(
    (card) => String(card.code || "").toLowerCase() === String(code || "").toLowerCase()
  );

  return found?.displayName || found?.name || found?.title || prettifyCode(code);
}

function normalizeReqEntry(entry, stage) {
  if (!entry) return null;

  if (typeof entry === "string") {
    return {
      code: entry,
      name: getReqDisplayName(entry),
      stage: stage === 2 ? 1 : 2,
    };
  }

  return {
    code: entry.code,
    name: entry.name || getReqDisplayName(entry.code),
    stage: Number(entry[`M${stage}`] || entry.stage || (stage === 2 ? 1 : 2)),
  };
}

function formatReqEntry(entry) {
  if (!entry) return "";

  if (typeof entry === "string") return getReqDisplayName(entry);

  return `${entry.name || getReqDisplayName(entry.code)} M${Number(entry.stage || 1)}`;
}

function getRequirementCost(baseTier, stage, cardRole) {
  const isBoost = cardRole === "boost";
  const stageKey = `M${stage}`;

  const berryTable = {
    C: {
      M2: isBoost ? 75000 : 100000,
      M3: isBoost ? 180000 : 250000,
    },
    B: {
      M2: isBoost ? 120000 : 175000,
      M3: isBoost ? 280000 : 400000,
    },
    A: {
      M2: isBoost ? 180000 : 250000,
      M3: isBoost ? 350000 : 450000,
    },
    S: {
      M2: isBoost ? 250000 : 350000,
      M3: isBoost ? 400000 : 500000,
    },
  };

  const tierCost = berryTable[baseTier] || berryTable.C;

  return {
    berries: tierCost[stageKey] || tierCost.M2,
    fragments: stage === 2 ? 25 : 35,
    minLevel: stage === 2 ? 35 : 75,
  };
}

function inferRequirements(card, stage) {
  if (stage === 1) return null;

  const baseTier = cleanBaseTier(card);
  const costs = getRequirementCost(baseTier, stage, card.cardRole);
  const isBoost = card.cardRole === "boost";

  const links = isBoost
    ? {
        cards: BOOST_CANON_CARD_REQUIREMENTS[card.code] || [],
        boosts: [],
      }
    : CANON_LINKS[card.code] || {
        cards: [],
        boosts: [],
      };

  if (baseTier === "C" && !isBoost) {
    return {
      berries: costs.berries,
      selfFragments: costs.fragments,
      minLevel: costs.minLevel,
      cards: [],
      boosts: [],
      cardsText: [],
      boostsText: [],
      text: "Low-tier battle path needs berries, fragments, and level.",
    };
  }

  const cardCount = isBoost
    ? 1
    : baseTier === "B"
      ? stage === 2
        ? 1
        : 2
      : stage === 2
        ? 2
        : 3;

  const boostCount = isBoost ? 0 : baseTier === "B" ? 1 : stage === 2 ? 1 : 2;

  const cardsRequired = (links.cards || [])
    .slice(0, cardCount)
    .map((entry) => normalizeReqEntry(entry, stage))
    .filter((entry) => entry?.code);

  const boostsRequired = (links.boosts || [])
    .slice(0, boostCount)
    .map((entry) => normalizeReqEntry(entry, stage))
    .filter((entry) => entry?.code);

  return {
    berries: costs.berries,
    selfFragments: costs.fragments,
    minLevel: isBoost ? 0 : costs.minLevel,
    cards: cardsRequired,
    boosts: boostsRequired,
    cardsText: cardsRequired.map(formatReqEntry),
    boostsText: boostsRequired.map(formatReqEntry),
    text: isBoost
      ? "Canon-linked boost awaken path with 1 staged character requirement."
      : baseTier === "B"
        ? "Canon-linked B-tier awaken path with staged card/boost requirements."
        : baseTier === "A"
          ? "Canon-linked advanced awaken path with staged card/boost requirements."
          : "Canon-linked emperor/top-tier awaken path with staged card/boost requirements.",
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