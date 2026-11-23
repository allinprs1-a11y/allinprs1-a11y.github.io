// Site settings: name, Instagram account and categories.
window.FARDA_CONFIG = {
  // Site name (Persian / English)
  name: { fa: "ایرانِ فردا", en: "Iran Farda" },

  // Instagram username without @. Empty hides the Instagram buttons.
  instagram: "iranbesazim",

  // Story day shown in the header. null = highest "day" in data/places.json.
  dayOverride: null,

  // Weekly chapters of the story. The chapter whose day range contains the current day
  // is shown under the counter; tapping it flies to its city.
  chapters: [
    { from: 0, to: 7, city: "tehran", fa: "هفته ۱: تهران دوباره باز می‌شود", en: "Week 1: Tehran reopens" },
    { from: 8, to: 14, city: "isfahan", fa: "هفته ۲: اصفهان و شیراز", en: "Week 2: Isfahan & Shiraz" },
    { from: 15, to: 21, city: "rasht", fa: "هفته ۳: ساحل خزر", en: "Week 3: The Caspian coast" },
    { from: 22, to: 28, city: "kish", fa: "هفته ۴: خلیج فارس", en: "Week 4: The Persian Gulf" }
  ],

  // Seasonal theme: "auto" (Nowruz 14 Mar–2 Apr, Yalda 18–22 Dec), "nowruz", "yalda" or null.
  // Preview any theme with ?theme=nowruz or ?theme=yalda.
  theme: "auto",

  // Categories: key → label + colour
  categories: {
    vision:    { fa: "پروژه ملی",          en: "National project", color: "#2ec4b6" },
    brand:     { fa: "برند و کسب‌وکار",    en: "Brand & business", color: "#f4b942" },
    food:      { fa: "رستوران و کافه",     en: "Food & café",      color: "#ff8c42" },
    tech:      { fa: "فناوری",             en: "Technology",       color: "#4cc9f0" },
    tourism:   { fa: "گردشگری",            en: "Tourism",          color: "#b5e48c" },
    education: { fa: "آموزش",              en: "Education",        color: "#c77dff" },
    health:    { fa: "سلامت",              en: "Health",           color: "#ff6b8b" },
    art:       { fa: "هنر و فرهنگ",        en: "Art & culture",    color: "#ffd6a5" },
    agri:      { fa: "کشاورزی و آب",       en: "Agriculture & water", color: "#80ed99" },
    transport: { fa: "حمل‌ونقل",           en: "Transport",        color: "#a0c4ff" },
    energy:    { fa: "انرژی",              en: "Energy",           color: "#fdffb6" },
    sport:     { fa: "ورزش",               en: "Sport",            color: "#ffadad" }
  }
};
