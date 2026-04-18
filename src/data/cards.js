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
  battleCard({ id: 1, code: "luffy_straw_hat", name: "Monkey D. Luffy", title: "Straw Hat", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Base", type: "Captain", atk: 150, hp: 1200, speed: 85, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Nika", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 2, code: "zoro_pirate_hunter", name: "Roronoa Zoro", title: "Pirate Hunter", rarity: "A", arc: "East Blue", faction: "Straw Hat Pirates", variant: "Three Sword Style", type: "Attacker", atk: 130, hp: 850, speed: 75, weapon: "Wado Ichimonji, Sandai Kitetsu, Enma", devilFruit: "None", equipType: "Weapon", image: "" }),
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
  boostCard({ id: 19, code: "chopper_cotton_candy_lover", name: "Tony Tony Chopper", title: "Cotton Candy Lover", rarity: "A", arc: "Drum Island", faction: "Straw Hat Pirates", variant: "Doctor Support", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Hito Hito no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 20, code: "kaya_medical_patron", name: "Kaya", title: "Medical Patron", rarity: "C", arc: "East Blue", faction: "Syrup Village", variant: "Storage Support", boostType: "fragmentStorage", boostValue: 25, boostTarget: "account", boostDescription: "Increase fragment storage by 25 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 21, code: "bepo_navigator_support", name: "Bepo", title: "Navigator Support", rarity: "B", arc: "Zou", faction: "Heart Pirates", variant: "Mink Support", boostType: "spd", boostValue: 4, boostTarget: "team", boostDescription: "Increase team SPD by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 22, code: "killer_massacre_soldier", name: "Killer", title: "Massacre Soldier", rarity: "A", arc: "Wano", faction: "Kid Pirates", variant: "Support Tactics", boostType: "dmg", boostValue: 6, boostTarget: "team", boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 23, code: "marco_phoenix", name: "Marco", title: "The Phoenix", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Support Commander", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Increase team HP by 8% passively.", devilFruit: "Tori Tori no Mi, Model: Phoenix", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 24, code: "ben_beckman", name: "Benn Beckman", title: "First Mate", rarity: "S", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Strategic Support", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 25, code: "charlotte_pudding", name: "Charlotte Pudding", title: "Three-Eyed Girl", rarity: "A", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Memory Support", boostType: "exp", boostValue: 8, boostTarget: "account", boostDescription: "Increase EXP gain by 8% passively.", devilFruit: "Memo Memo no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 26, code: "mansherry_healing_princess", name: "Mansherry", title: "Healing Princess", rarity: "A", arc: "Dressrosa", faction: "Tontatta Kingdom", variant: "Healing Support", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Chiyu Chiyu no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 27, code: "vegapunk_stella", name: "Vegapunk", title: "Stella", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Greatest Brain", boostType: "atk", boostValue: 12, boostTarget: "team", boostDescription: "Increase team ATK by 12% passively.", devilFruit: "Nomi Nomi no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 28, code: "lindbergh_revolutionary_genius", name: "Lindbergh", title: "Revolutionary Genius", rarity: "S", arc: "Final Saga", faction: "Revolutionary Army", variant: "Tech Support", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Increase team SPD by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 29, code: "doc_q_sickly_support", name: "Doc Q", title: "Sickly Support", rarity: "B", arc: "Blackbeard Pirates", faction: "Blackbeard Pirates", variant: "Dark Medicine", boostType: "exp", boostValue: 4, boostTarget: "account", boostDescription: "Increase EXP gain by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 30, code: "shirahoshi_sea_princess", name: "Shirahoshi", title: "Sea Princess", rarity: "S", arc: "Fish-Man Island", faction: "Ryugu Kingdom", variant: "Storage Blessing", boostType: "fragmentStorage", boostValue: 100, boostTarget: "account", boostDescription: "Increase fragment storage by 100 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 31, code: "hiyori_festival_support", name: "Kozuki Hiyori", title: "Festival Support", rarity: "B", arc: "Wano", faction: "Wano", variant: "Resource Blessing", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 32, code: "carina_treasure_hunter", name: "Carina", title: "Treasure Hunter", rarity: "B", arc: "Film Gold", faction: "Independent", variant: "Treasure Support", boostType: "fragmentStorage", boostValue: 50, boostTarget: "account", boostDescription: "Increase fragment storage by 50 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 33, code: "kalifa_cp9_support", name: "Kalifa", title: "CP9 Support", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Efficient Support", boostType: "exp", boostValue: 6, boostTarget: "account", boostDescription: "Increase EXP gain by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 34, code: "baccarat_lucky_draw", name: "Baccarat", title: "Lucky Draw", rarity: "S", arc: "Film Gold", faction: "Gran Tesoro", variant: "Fortune Support", boostType: "pullChance", boostValue: 2, boostTarget: "account", boostDescription: "Increase pull chance by 2 steps passively.", devilFruit: "Raki Raki no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 35, code: "perona_ghost_princess", name: "Perona", title: "Ghost Princess", rarity: "A", arc: "Thriller Bark", faction: "Thriller Bark Pirates", variant: "Negative Support", boostType: "dmg", boostValue: 4, boostTarget: "team", boostDescription: "Increase team damage by 4% passively.", devilFruit: "Horo Horo no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 36, code: "tsuru_tactical_support", name: "Tsuru", title: "Tactical Support", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Veteran Support", boostType: "daily", boostValue: 2, boostTarget: "account", boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "Woshu Woshu no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 37, code: "reiju_poison_pink", name: "Reiju", title: "Poison Pink", rarity: "A", arc: "Whole Cake Island", faction: "Germa 66", variant: "Germa Support", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 38, code: "otama_kibi_support", name: "Otama", title: "Kibi Support", rarity: "B", arc: "Wano", faction: "Wano", variant: "Beast Tamer", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "Kibi Kibi no Mi", equipType: "Devil Fruit", image: "" }),
  boostCard({ id: 39, code: "iceburg", name: "Iceburg", title: "City Support", rarity: "B", arc: "Water 7", faction: "Galley-La", variant: "Shipwright Support", boostType: "fragmentStorage", boostValue: 50, boostTarget: "account", boostDescription: "Increase fragment storage by 50 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 40, code: "laboon", name: "Laboon", title: "Whale Memory", rarity: "C", arc: "Reverse Mountain", faction: "Independent", variant: "Memory Support", boostType: "hp", boostValue: 3, boostTarget: "team", boostDescription: "Increase team HP by 3% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 41, code: "sniper_focus", name: "Sniper Focus", title: "Sniper Focus", rarity: "B", arc: "Support", faction: "Passive", variant: "Aim Support", boostType: "atk", boostValue: 4, boostTarget: "team", boostDescription: "Increase team ATK by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 42, code: "weather_science", name: "Weather Science", title: "Weather Science", rarity: "C", arc: "Support", faction: "Passive", variant: "Climate Support", boostType: "spd", boostValue: 3, boostTarget: "team", boostDescription: "Increase team SPD by 3% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 43, code: "wado_ichimonji_spirit", name: "Wado Ichimonji Spirit", title: "Sword Spirit", rarity: "A", arc: "Support", faction: "Passive", variant: "Sword Bond", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 44, code: "suna_suna_core", name: "Suna Suna Core", title: "Sand Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Desert Power", boostType: "dmg", boostValue: 6, boostTarget: "team", boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 45, code: "ohara_will", name: "Ohara Will", title: "Ohara Will", rarity: "A", arc: "Support", faction: "Passive", variant: "Scholar Legacy", boostType: "exp", boostValue: 8, boostTarget: "account", boostDescription: "Increase EXP gain by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 46, code: "goro_goro_core", name: "Goro Goro Core", title: "Thunder Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Lightning Power", boostType: "spd", boostValue: 6, boostTarget: "team", boostDescription: "Increase team SPD by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 47, code: "cola_engine", name: "Cola Engine", title: "Cola Engine", rarity: "B", arc: "Support", faction: "Passive", variant: "Cyborg Fuel", boostType: "atk", boostValue: 4, boostTarget: "team", boostDescription: "Increase team ATK by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 48, code: "rokushiki_manual", name: "Rokushiki Manual", title: "Rokushiki Manual", rarity: "A", arc: "Support", faction: "Passive", variant: "Technique Support", boostType: "spd", boostValue: 5, boostTarget: "team", boostDescription: "Increase team SPD by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 49, code: "soul_solid", name: "Soul Solid", title: "Soul Solid", rarity: "A", arc: "Support", faction: "Passive", variant: "Soul Blade", boostType: "dmg", boostValue: 5, boostTarget: "team", boostDescription: "Increase team damage by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 50, code: "shadow_core", name: "Shadow Core", title: "Shadow Core", rarity: "B", arc: "Support", faction: "Passive", variant: "Shadow Power", boostType: "hp", boostValue: 4, boostTarget: "team", boostDescription: "Increase team HP by 4% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 51, code: "kuja_haki", name: "Kuja Haki", title: "Kuja Haki", rarity: "S", arc: "Support", faction: "Passive", variant: "Conqueror Support", boostType: "dmg", boostValue: 8, boostTarget: "team", boostDescription: "Increase team damage by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 52, code: "fishman_karate_scroll", name: "Fish-Man Karate Scroll", title: "Fish-Man Karate", rarity: "A", arc: "Support", faction: "Passive", variant: "Water Combat", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 53, code: "mera_mera_will", name: "Mera Mera Will", title: "Flame Will", rarity: "S", arc: "Support", faction: "Passive", variant: "Inherited Fire", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 54, code: "gura_gura_will", name: "Gura Gura Will", title: "Quake Will", rarity: "S", arc: "Support", faction: "Passive", variant: "Quake Power", boostType: "dmg", boostValue: 8, boostTarget: "team", boostDescription: "Increase team damage by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 55, code: "fist_of_love", name: "Fist of Love", title: "Fist of Love", rarity: "A", arc: "Support", faction: "Passive", variant: "Marine Training", boostType: "hp", boostValue: 5, boostTarget: "team", boostDescription: "Increase team HP by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 56, code: "golden_buddha_mandate", name: "Golden Buddha Mandate", title: "Golden Buddha", rarity: "S", arc: "Support", faction: "Passive", variant: "Justice Order", boostType: "daily", boostValue: 2, boostTarget: "account", boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 57, code: "magma_core", name: "Magma Core", title: "Magma Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Magma Power", boostType: "atk", boostValue: 7, boostTarget: "team", boostDescription: "Increase team ATK by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 58, code: "ice_core", name: "Ice Core", title: "Ice Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Ice Power", boostType: "spd", boostValue: 5, boostTarget: "team", boostDescription: "Increase team SPD by 5% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 59, code: "light_core", name: "Light Core", title: "Light Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Light Power", boostType: "spd", boostValue: 7, boostTarget: "team", boostDescription: "Increase team SPD by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 60, code: "darkness_core", name: "Darkness Core", title: "Darkness Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Dark Power", boostType: "dmg", boostValue: 7, boostTarget: "team", boostDescription: "Increase team damage by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 61, code: "ope_ope_notes", name: "Ope Ope Notes", title: "Operation Notes", rarity: "A", arc: "Support", faction: "Passive", variant: "Medical Genius", boostType: "exp", boostValue: 6, boostTarget: "account", boostDescription: "Increase EXP gain by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 62, code: "magnet_core", name: "Magnet Core", title: "Magnet Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Magnetic Burst", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 63, code: "ito_ito_awakening", name: "Ito Ito Awakening", title: "String Awakening", rarity: "A", arc: "Support", faction: "Passive", variant: "String Control", boostType: "dmg", boostValue: 6, boostTarget: "team", boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 65, code: "future_sight", name: "Future Sight", title: "Future Sight", rarity: "S", arc: "Support", faction: "Passive", variant: "Observation Peak", boostType: "spd", boostValue: 8, boostTarget: "team", boostDescription: "Increase team SPD by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 66, code: "soru_soru_soul", name: "Soru Soru Soul", title: "Soul Pocus", rarity: "S", arc: "Support", faction: "Passive", variant: "Soul Empire", boostType: "hp", boostValue: 9, boostTarget: "team", boostDescription: "Increase team HP by 9% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 67, code: "lunarian_flame", name: "Lunarian Flame", title: "Lunarian Flame", rarity: "S", arc: "Support", faction: "Passive", variant: "Ancient Fire", boostType: "dmg", boostValue: 7, boostTarget: "team", boostDescription: "Increase team damage by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 68, code: "plague_tech", name: "Plague Tech", title: "Plague Tech", rarity: "A", arc: "Support", faction: "Passive", variant: "Science Warfare", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 69, code: "beast_core", name: "Beast Core", title: "Beast Core", rarity: "A", arc: "Support", faction: "Passive", variant: "Beast Endurance", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 70, code: "oni_lineage", name: "Oni Lineage", title: "Oni Lineage", rarity: "S", arc: "Support", faction: "Passive", variant: "Ancient Blood", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Increase team HP by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 71, code: "forest_core", name: "Forest Core", title: "Forest Core", rarity: "S", arc: "Support", faction: "Passive", variant: "Forest Power", boostType: "hp", boostValue: 7, boostTarget: "team", boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 72, code: "nika_drums", name: "Drums of Liberation", title: "Nika Drums", rarity: "UR", arc: "Support", faction: "Passive", variant: "Liberation Rhythm", boostType: "pullChance", boostValue: 3, boostTarget: "account", boostDescription: "Increase pull chance by 3 steps passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 73, code: "supreme_haki", name: "Supreme Haki", title: "Supreme Haki", rarity: "UR", arc: "Support", faction: "Passive", variant: "King's Ambition", boostType: "dmg", boostValue: 10, boostTarget: "team", boostDescription: "Increase team damage by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 74, code: "black_blade_yoru", name: "Black Blade Yoru", title: "Black Blade", rarity: "S", arc: "Support", faction: "Passive", variant: "Legendary Blade Aura", boostType: "atk", boostValue: 9, boostTarget: "team", boostDescription: "Increase team ATK by 9% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 75, code: "chaos_core", name: "Chaos Core", title: "Chaos Core", rarity: "UR", arc: "Support", faction: "Passive", variant: "Rocks Legacy", boostType: "dmg", boostValue: 10, boostTarget: "team", boostDescription: "Increase team damage by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 76, code: "storm_mandate", name: "Storm Mandate", title: "Storm Mandate", rarity: "S", arc: "Support", faction: "Passive", variant: "Revolution Wind", boostType: "spd", boostValue: 9, boostTarget: "team", boostDescription: "Increase team SPD by 9% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 77, code: "empty_throne_edict", name: "Empty Throne Edict", title: "Throne Edict", rarity: "UR", arc: "Support", faction: "Passive", variant: "World Decree", boostType: "daily", boostValue: 3, boostTarget: "account", boostDescription: "Increase daily reward quality by 3 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 78, code: "holy_knight_sigil", name: "Holy Knight Sigil", title: "Holy Knight Sigil", rarity: "S", arc: "Support", faction: "Passive", variant: "Holy Authority", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 79, code: "giant_curse", name: "Giant Curse", title: "Giant Curse", rarity: "S", arc: "Support", faction: "Passive", variant: "Elbaf Oath", boostType: "hp", boostValue: 8, boostTarget: "team", boostDescription: "Increase team HP by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 80, code: "samurai_spirit", name: "Samurai Spirit", title: "Samurai Spirit", rarity: "S", arc: "Support", faction: "Passive", variant: "Wano Resolve", boostType: "atk", boostValue: 8, boostTarget: "team", boostDescription: "Increase team ATK by 8% passively.", devilFruit: "None", equipType: "Passive", image: "" }),

  // =========================
  // Grand Line / Alabasta to Thriller Bark
  // =========================
  battleCard({ id: 81, code: "crocodile_desert_king", name: "Crocodile", title: "Desert King", rarity: "S", arc: "Alabasta", faction: "Baroque Works", variant: "Sand Tyrant", type: "Control", atk: 160, hp: 1120, speed: 78, weapon: "Golden Hook", devilFruit: "Suna Suna no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 82, code: "nico_robin_devil_child", name: "Nico Robin", title: "Devil Child", rarity: "A", arc: "Alabasta", faction: "Straw Hat Pirates", variant: "Hana Hana Bloom", type: "Support", atk: 110, hp: 760, speed: 92, weapon: "None", devilFruit: "Hana Hana no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 83, code: "daz_bonez", name: "Daz Bonez", title: "Mr. 1", rarity: "B", arc: "Alabasta", faction: "Baroque Works", variant: "Blade Body", type: "Bruiser", atk: 120, hp: 980, speed: 60, weapon: "Steel Blades", devilFruit: "Supa Supa no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 84, code: "bellamy_hyena", name: "Bellamy", title: "The Hyena", rarity: "B", arc: "Jaya", faction: "Bellamy Pirates", variant: "Spring Legs", type: "Burst", atk: 118, hp: 760, speed: 88, weapon: "None", devilFruit: "Bane Bane no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 85, code: "wyper_shandian_warrior", name: "Wyper", title: "Shandian Warrior", rarity: "A", arc: "Skypiea", faction: "Shandia", variant: "Reject Dial", type: "Burst", atk: 150, hp: 980, speed: 82, weapon: "Burn Bazooka", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 86, code: "enel_god", name: "Enel", title: "God", rarity: "S", arc: "Skypiea", faction: "Skypiea", variant: "Thunder God", type: "Control", atk: 176, hp: 1080, speed: 96, weapon: "Golden Staff", devilFruit: "Goro Goro no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 87, code: "franky_cyborg", name: "Franky", title: "Cyborg", rarity: "A", arc: "Water 7", faction: "Straw Hat Pirates", variant: "Battle Franky", type: "Tank", atk: 138, hp: 1140, speed: 64, weapon: "General Franky Arsenal", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 88, code: "lucci_cp9", name: "Rob Lucci", title: "CP9", rarity: "S", arc: "Enies Lobby", faction: "World Government", variant: "Leopard Form", type: "Assassin", atk: 182, hp: 1020, speed: 100, weapon: "Rokushiki", devilFruit: "Neko Neko no Mi, Model: Leopard", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 89, code: "kaku_cp9", name: "Kaku", title: "CP9", rarity: "A", arc: "Enies Lobby", faction: "World Government", variant: "Giraffe Form", type: "Attacker", atk: 144, hp: 960, speed: 78, weapon: "Rokushiki Blades", devilFruit: "Ushi Ushi no Mi, Model: Giraffe", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 90, code: "brook_soul_king", name: "Brook", title: "Soul King", rarity: "A", arc: "Thriller Bark", faction: "Straw Hat Pirates", variant: "Soul Form", type: "Speed Fighter", atk: 140, hp: 780, speed: 106, weapon: "Soul Solid", devilFruit: "Yomi Yomi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 91, code: "gecko_moria", name: "Gecko Moria", title: "Shadow Master", rarity: "A", arc: "Thriller Bark", faction: "Thriller Bark Pirates", variant: "Shadow Asgard", type: "Control", atk: 150, hp: 1220, speed: 58, weapon: "Scissors", devilFruit: "Kage Kage no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 92, code: "bartholomew_kuma", name: "Bartholomew Kuma", title: "Tyrant", rarity: "S", arc: "Thriller Bark", faction: "Revolutionary Army", variant: "Pacifista Palm", type: "Tank", atk: 172, hp: 1260, speed: 70, weapon: "Bible", devilFruit: "Nikyu Nikyu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 93, code: "boa_hancock", name: "Boa Hancock", title: "Pirate Empress", rarity: "S", arc: "Amazon Lily", faction: "Kuja Pirates", variant: "Love Beam", type: "Control", atk: 168, hp: 1040, speed: 92, weapon: "Perfume Femur", devilFruit: "Mero Mero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 94, code: "jinbe_first_son_of_the_sea", name: "Jinbe", title: "First Son of the Sea", rarity: "A", arc: "Marineford", faction: "Straw Hat Pirates", variant: "Fish-Man Karate", type: "Tank", atk: 146, hp: 1180, speed: 72, weapon: "Fish-Man Karate", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 95, code: "ace_fire_fist", name: "Portgas D. Ace", title: "Fire Fist", rarity: "S", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Flame Emperor", type: "Burst", atk: 180, hp: 980, speed: 96, weapon: "None", devilFruit: "Mera Mera no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 96, code: "whitebeard_strongest_man", name: "Edward Newgate", title: "Strongest Man", rarity: "UR", arc: "Marineford", faction: "Whitebeard Pirates", variant: "Earthshaker", type: "Legend", atk: 238, hp: 1660, speed: 62, weapon: "Bisento", devilFruit: "Gura Gura no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 98, code: "blackbeard_emperor_of_darkness", name: "Marshall D. Teach", title: "Emperor of Darkness", rarity: "UR", arc: "Final Saga", faction: "Blackbeard Pirates", variant: "Dual Devil Fruits", type: "Legend", atk: 242, hp: 1580, speed: 72, weapon: "None", devilFruit: "Yami Yami no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 100, code: "garp_hero_of_the_marines", name: "Monkey D. Garp", title: "Hero of the Marines", rarity: "UR", arc: "Marineford", faction: "Marines", variant: "Galaxy Impact", type: "Legend", atk: 230, hp: 1600, speed: 78, weapon: "Fists", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 101, code: "sengoku_buddha", name: "Sengoku", title: "The Buddha", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Golden Buddha", type: "Tank", atk: 170, hp: 1300, speed: 60, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Daibutsu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 102, code: "akainu", name: "Sakazuki", title: "Akainu", rarity: "UR", arc: "Marineford", faction: "Marines", variant: "Magma Emperor", type: "Legend", atk: 245, hp: 1540, speed: 74, weapon: "Magma Fist", devilFruit: "Magu Magu no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 103, code: "aokiji", name: "Kuzan", title: "Aokiji", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Ice Age", type: "Control", atk: 174, hp: 1120, speed: 84, weapon: "Ice Saber", devilFruit: "Hie Hie no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 104, code: "kizaru", name: "Borsalino", title: "Kizaru", rarity: "S", arc: "Marineford", faction: "Marines", variant: "Light-Speed Assault", type: "Speed Fighter", atk: 176, hp: 1080, speed: 104, weapon: "None", devilFruit: "Pika Pika no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 105, code: "shanks_red_hair", name: "Shanks", title: "Red Hair", rarity: "UR", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Divine Departure", type: "Legend", atk: 248, hp: 1500, speed: 96, weapon: "Gryphon", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 106, code: "mihawk_hawk_eyes", name: "Dracule Mihawk", title: "Hawk Eyes", rarity: "UR", arc: "Final Saga", faction: "Cross Guild", variant: "Strongest Swordsman", type: "Legend", atk: 252, hp: 1460, speed: 90, weapon: "Yoru", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 107, code: "roger_king_of_the_pirates", name: "Gol D. Roger", title: "King of the Pirates", rarity: "UR", arc: "Flashback", faction: "Roger Pirates", variant: "Divine Departure", type: "Legend", atk: 260, hp: 1520, speed: 88, weapon: "Ace", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 108, code: "xebec_captain_of_rocks", name: "Rocks D. Xebec", title: "Captain of Rocks", rarity: "UR", arc: "God Valley", faction: "Rocks Pirates", variant: "Chaos Sovereign", type: "Legend", atk: 268, hp: 1540, speed: 86, weapon: "Eclipse", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 109, code: "dragon_revolutionary_leader", name: "Monkey D. Dragon", title: "Revolutionary Leader", rarity: "UR", arc: "Final Saga", faction: "Revolutionary Army", variant: "Storm Vanguard", type: "Legend", atk: 240, hp: 1480, speed: 94, weapon: "None", devilFruit: "Unknown", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 110, code: "saturn", name: "Saint Jaygarcia Saturn", title: "Warrior God of Science and Defense", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 236, hp: 1620, speed: 70, weapon: "None", devilFruit: "Ushi Ushi no Mi, Model: Gyuki", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 111, code: "mars", name: "Saint Marcus Mars", title: "Warrior God of Environment", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 234, hp: 1600, speed: 72, weapon: "None", devilFruit: "Tori Tori no Mi, Model: Itsumade", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 112, code: "warcury", name: "Saint Topman Warcury", title: "Warrior God of Justice", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 238, hp: 1680, speed: 60, weapon: "None", devilFruit: "Hito Hito no Mi, Model: Fengxi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 113, code: "nusjuro", name: "Saint Ethanbaron V Nusjuro", title: "Warrior God of Finance", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 242, hp: 1480, speed: 92, weapon: "Shodai Kitetsu", devilFruit: "Uma Uma no Mi, Model: Bakotsu", equipType: "Weapon", image: "" }),
  battleCard({ id: 114, code: "ju_peter", name: "Saint Shepherd Ju Peter", title: "Warrior God of Agriculture", rarity: "UR", arc: "Egghead", faction: "World Government", variant: "Demonic Form", type: "Legend", atk: 232, hp: 1640, speed: 68, weapon: "None", devilFruit: "Mushi Mushi no Mi, Model: Sandworm", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 115, code: "imu", name: "Saint Nerona Imu", title: "Sovereign of the Void", rarity: "UR", arc: "Final Saga", faction: "World Government", variant: "Shadow Throne", type: "Legend", atk: 275, hp: 1800, speed: 95, weapon: "Unknown", devilFruit: "Akuma no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 116, code: "garling", name: "Figarland Garling", title: "Holy Knight Commander", rarity: "S", arc: "Final Saga", faction: "Holy Knights", variant: "Sacred Executioner", type: "Attacker", atk: 188, hp: 1180, speed: 86, weapon: "Sacred Saber", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 117, code: "loki", name: "Loki", title: "Prince of Elbaf", rarity: "S", arc: "Elbaf", faction: "Elbaf", variant: "Giant Warrior", type: "Bruiser", atk: 250, hp: 1700, speed: 70, weapon: "Ragnir", devilFruit: "Ryu Ryu no Mi, Model: Nidhöggr", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 118, code: "rayleigh_dark_king", name: "Silvers Rayleigh", title: "Dark King", rarity: "UR", arc: "Sabaody", faction: "Roger Pirates", variant: "Prime Haki", type: "Legend", atk: 236, hp: 1440, speed: 92, weapon: "Long Sword", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 119, code: "oden", name: "Kozuki Oden", title: "Lord of Wano", rarity: "UR", arc: "Wano", faction: "Kozuki Clan", variant: "Togen Totsuka", type: "Legend", atk: 244, hp: 1500, speed: 84, weapon: "Enma, Ame no Habakiri", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 120, code: "perospero", name: "Perospero", title: "Candy Minister", rarity: "A", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Candy Wall", type: "Control", atk: 140, hp: 960, speed: 74, weapon: "Candy Cane", devilFruit: "Pero Pero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 121, code: "trebol_underworld_support", name: "Trebol", title: "Underworld Broker", rarity: "A", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "Sticky Trap", type: "Control", atk: 132, hp: 1020, speed: 58, weapon: "Sticky Staff", devilFruit: "Beta Beta no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 122, code: "queen_the_plague", name: "Queen", title: "The Plague", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Cyborg Brachiosaur", type: "Tank", atk: 176, hp: 1360, speed: 60, weapon: "Plague Arsenal", devilFruit: "Ryu Ryu no Mi, Model: Brachiosaurus", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 123, code: "king_wildfire", name: "King", title: "Wildfire", rarity: "S", arc: "Wano", faction: "Beasts Pirates", variant: "Lunarian Flames", type: "Burst", atk: 182, hp: 1220, speed: 84, weapon: "Imperial Blade", devilFruit: "Ryu Ryu no Mi, Model: Pteranodon", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 124, code: "jack_the_drought", name: "Jack", title: "The Drought", rarity: "A", arc: "Wano", faction: "Beasts Pirates", variant: "Ancient Mammoth", type: "Bruiser", atk: 150, hp: 1320, speed: 58, weapon: "Twin Blades", devilFruit: "Zou Zou no Mi, Model: Mammoth", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 125, code: "yamato_oni_princess", name: "Yamato", title: "Oni Princess", rarity: "S", arc: "Wano", faction: "Wano", variant: "Guardian Wolf", type: "Fighter", atk: 186, hp: 1240, speed: 82, weapon: "Kanabo", devilFruit: "Inu Inu no Mi, Model: Okuchi no Makami", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 126, code: "greenbull", name: "Aramaki", title: "Ryokugyu", rarity: "S", arc: "Wano", faction: "Marines", variant: "Forest Admiral", type: "Control", atk: 204, hp: 1400, speed: 68, weapon: "None", devilFruit: "Mori Mori no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 159, code: "kaido_strongest_creature", name: "Kaido", title: "Strongest Creature", rarity: "UR", arc: "Wano", faction: "Beast Pirates", variant: "Azure Dragon Emperor", type: "Legend", atk: 258, hp: 1680, speed: 78, weapon: "Hassaikai", devilFruit: "Uo Uo no Mi, Model: Seiryu", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 160, code: "doflamingo_heavenly_demon", name: "Donquixote Doflamingo", title: "Heavenly Demon", rarity: "S", arc: "Dressrosa", faction: "Donquixote Pirates", variant: "String Tyrant", type: "Control", atk: 182, hp: 1160, speed: 86, weapon: "None", devilFruit: "Ito Ito no Mi", equipType: "Devil Fruit", image: "" })
];

const EXTRA_CANON_CARDS = [
  battleCard({ id: 127, code: "sabo_flame_emperor", name: "Sabo", title: "Flame Emperor", rarity: "S", arc: "Dressrosa", faction: "Revolutionary Army", variant: "Mera Successor", type: "Burst", atk: 178, hp: 1040, speed: 94, weapon: "Dragon Claw Gloves", devilFruit: "Mera Mera no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 128, code: "fujitora", name: "Issho", title: "Fujitora", rarity: "S", arc: "Dressrosa", faction: "Marines", variant: "Gravity Blade", type: "Control", atk: 170, hp: 1180, speed: 72, weapon: "Shikomizue", devilFruit: "Zushi Zushi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 129, code: "katakuri_strongest_sweet_commander", name: "Charlotte Katakuri", title: "Strongest Sweet Commander", rarity: "S", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Future Sight", type: "Control", atk: 184, hp: 1160, speed: 90, weapon: "Mogura", devilFruit: "Mochi Mochi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 130, code: "big_mom_emperor", name: "Charlotte Linlin", title: "Big Mom", rarity: "UR", arc: "Whole Cake Island", faction: "Big Mom Pirates", variant: "Soul Emperor", type: "Legend", atk: 236, hp: 1700, speed: 66, weapon: "Napoleon", devilFruit: "Soru Soru no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 131, code: "shiryu", name: "Shiryu", title: "Rain of the All-Out War", rarity: "S", arc: "Blackbeard Pirates", faction: "Blackbeard Pirates", variant: "Invisible Slayer", type: "Assassin", atk: 188, hp: 1080, speed: 92, weapon: "Raiu", devilFruit: "Suke Suke no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 132, code: "boa_seraphim", name: "S-Snake", title: "Boa Seraphim", rarity: "A", arc: "Egghead", faction: "World Government", variant: "Pacifista Model", type: "Control", atk: 150, hp: 980, speed: 82, weapon: "Laser Kicks", devilFruit: "Mero Mero no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 133, code: "mihawk_seraphim", name: "S-Hawk", title: "Mihawk Seraphim", rarity: "A", arc: "Egghead", faction: "World Government", variant: "Pacifista Model", type: "Attacker", atk: 158, hp: 960, speed: 86, weapon: "Black Blade Replica", devilFruit: "Supa Supa no Mi", equipType: "Devil Fruit", image: "" })
];

const EXTRA_REQ_SUPPORT = [
  boostCard({ id: 134, code: "germa_lineage_factor", name: "Germa Lineage Factor", title: "Germa Factor", rarity: "A", arc: "Support", faction: "Passive", variant: "Genetic Boost", boostType: "spd", boostValue: 6, boostTarget: "team", boostDescription: "Increase team SPD by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 135, code: "gravity_sheath", name: "Gravity Sheath", title: "Gravity Sheath", rarity: "A", arc: "Support", faction: "Passive", variant: "Heavy Pressure", boostType: "hp", boostValue: 6, boostTarget: "team", boostDescription: "Increase team HP by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 136, code: "holy_knight_standard", name: "Holy Knight Standard", title: "Holy Standard", rarity: "S", arc: "Support", faction: "Passive", variant: "Celestial Authority", boostType: "atk", boostValue: 7, boostTarget: "team", boostDescription: "Increase team ATK by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 137, code: "revolutionary_banner", name: "Revolutionary Banner", title: "Freedom Banner", rarity: "S", arc: "Support", faction: "Passive", variant: "Freedom Uprising", boostType: "dmg", boostValue: 7, boostTarget: "team", boostDescription: "Increase team damage by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 138, code: "revolutionary_oath", name: "Revolutionary Oath", title: "Revolutionary Oath", rarity: "A", arc: "Support", faction: "Passive", variant: "Liberation Cause", boostType: "daily", boostValue: 1, boostTarget: "account", boostDescription: "Increase daily reward quality by 1 tier passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 139, code: "donquixote_family", name: "Donquixote Family", title: "Donquixote Family", rarity: "A", arc: "Support", faction: "Passive", variant: "Underworld Strings", boostType: "dmg", boostValue: 6, boostTarget: "team", boostDescription: "Increase team damage by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 140, code: "beast_pirates_terror", name: "Beast Pirates Terror", title: "Beast Pirates Terror", rarity: "S", arc: "Support", faction: "Passive", variant: "Calamity Fear", boostType: "hp", boostValue: 7, boostTarget: "team", boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 141, code: "sweet_commander_pride", name: "Sweet Commander Pride", title: "Sweet Commander Pride", rarity: "A", arc: "Support", faction: "Passive", variant: "Totto Land Might", boostType: "atk", boostValue: 6, boostTarget: "team", boostDescription: "Increase team ATK by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 142, code: "cp0_mask", name: "CP0 Mask", title: "Cipher Pol Mask", rarity: "A", arc: "Support", faction: "Passive", variant: "Silent Order", boostType: "spd", boostValue: 6, boostTarget: "team", boostDescription: "Increase team SPD by 6% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 143, code: "world_government_edict", name: "World Government Edict", title: "Government Edict", rarity: "S", arc: "Support", faction: "Passive", variant: "Absolute Order", boostType: "daily", boostValue: 2, boostTarget: "account", boostDescription: "Increase daily reward quality by 2 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 144, code: "marineford_legacy", name: "Marineford Legacy", title: "Marineford Legacy", rarity: "S", arc: "Support", faction: "Passive", variant: "War Memory", boostType: "exp", boostValue: 10, boostTarget: "account", boostDescription: "Increase EXP gain by 10% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 145, code: "cross_guild_bounty", name: "Cross Guild Bounty", title: "Cross Guild Bounty", rarity: "A", arc: "Support", faction: "Passive", variant: "Hunter Incentive", boostType: "fragmentStorage", boostValue: 75, boostTarget: "account", boostDescription: "Increase fragment storage by 75 passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 146, code: "god_valley_echo", name: "God Valley Echo", title: "God Valley Echo", rarity: "UR", arc: "Support", faction: "Passive", variant: "Lost History", boostType: "daily", boostValue: 3, boostTarget: "account", boostDescription: "Increase daily reward quality by 3 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 147, code: "elbaf_might", name: "Elbaf Might", title: "Elbaf Might", rarity: "S", arc: "Support", faction: "Passive", variant: "Giant Valor", boostType: "hp", boostValue: 7, boostTarget: "team", boostDescription: "Increase team HP by 7% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 148, code: "void_century_fragment", name: "Void Century Fragment", title: "Void Century Fragment", rarity: "UR", arc: "Support", faction: "Passive", variant: "Forbidden Record", boostType: "exp", boostValue: 12, boostTarget: "account", boostDescription: "Increase EXP gain by 12% passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 149, code: "relic_of_joy", name: "Relic of Joy", title: "Relic of Joy", rarity: "UR", arc: "Support", faction: "Passive", variant: "Liberation Relic", boostType: "pullChance", boostValue: 3, boostTarget: "account", boostDescription: "Increase pull chance by 3 steps passively.", devilFruit: "None", equipType: "Passive", image: "" }),
  boostCard({ id: 150, code: "pirate_king_log", name: "Pirate King Log", title: "Pirate King Log", rarity: "UR", arc: "Support", faction: "Passive", variant: "Great Voyage Record", boostType: "daily", boostValue: 3, boostTarget: "account", boostDescription: "Increase daily reward quality by 3 tiers passively.", devilFruit: "None", equipType: "Passive", image: "" })
];

const EXTRA_CHARACTER_CARDS = [
  battleCard({ id: 151, code: "corazon", name: "Donquixote Rosinante", title: "Corazon", rarity: "A", arc: "Dressrosa", faction: "Marines", variant: "Silent Heart", type: "Support", atk: 112, hp: 860, speed: 84, weapon: "Silencer Handgun", devilFruit: "Nagi Nagi no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 152, code: "yasopp", name: "Yasopp", title: "Red-Hair Sniper", rarity: "S", arc: "Final Saga", faction: "Red Hair Pirates", variant: "Deadeye", type: "Ranged", atk: 176, hp: 980, speed: 96, weapon: "Long Rifle", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 153, code: "sentomaru", name: "Sentomaru", title: "Defense Captain", rarity: "A", arc: "Sabaody", faction: "Marines", variant: "Axe Guard", type: "Tank", atk: 144, hp: 1100, speed: 60, weapon: "Battle Axe", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 154, code: "gan_fall", name: "Gan Fall", title: "Sky Knight", rarity: "B", arc: "Skypiea", faction: "Skypiea", variant: "Sky Lance", type: "Attacker", atk: 102, hp: 760, speed: 74, weapon: "Sky Lance", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 155, code: "saul", name: "Jaguar D. Saul", title: "Giant Marine", rarity: "A", arc: "Ohara", faction: "Marines", variant: "Giant Resolve", type: "Tank", atk: 150, hp: 1280, speed: 48, weapon: "Giant Fists", devilFruit: "None", equipType: "Weapon", image: "" }),
  battleCard({ id: 156, code: "mr3", name: "Galdino", title: "Mr. 3", rarity: "B", arc: "Little Garden", faction: "Baroque Works", variant: "Wax Sculptor", type: "Control", atk: 96, hp: 700, speed: 68, weapon: "Wax Blade", devilFruit: "Doru Doru no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 157, code: "wapol", name: "Wapol", title: "Bliking King", rarity: "B", arc: "Drum Island", faction: "Drum Kingdom", variant: "Metal Mouth", type: "Bruiser", atk: 98, hp: 820, speed: 56, weapon: "Cannon Jaw", devilFruit: "Baku Baku no Mi", equipType: "Devil Fruit", image: "" }),
  battleCard({ id: 158, code: "caesar_clown", name: "Caesar Clown", title: "Master of Gas", rarity: "A", arc: "Punk Hazard", faction: "Independent", variant: "Gas Weapon", type: "Control", atk: 144, hp: 920, speed: 78, weapon: "Chemical Staff", devilFruit: "Gasu Gasu no Mi", equipType: "Devil Fruit", image: "" })
];

const SPECIAL_FORMS = {
  luffy_straw_hat: ["The Beginning", "Revival Arc", "Gear 5"],
  zoro_pirate_hunter: ["Three Sword Style", "King of Hell", "Asura"],
  nami_cat_burglar: ["Weather Rookie", "Thunder Tempo", "Zeus Queen"],
  usopp_sniper: ["Sniper Rookie", "Pop Green Arsenal", "God Usopp"],
  sanji_black_leg: ["The Beginning", "Germa Awakening", "Ifrit Jambe"],
  crocodile_desert_king: ["Desert Tyrant", "Awakened Sand", "Underworld King"],
  nico_robin_devil_child: ["Archaeologist", "Demonio Fleur", "Ohara's Flame"],
  brook_soul_king: ["Soul Prelude", "Soul Parade", "Underworld Maestro"],
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