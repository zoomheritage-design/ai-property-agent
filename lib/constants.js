/**
 * Areas of Lahore covered by the radar.
 * Users can search "All Lahore" or focus the scan on one area.
 */
export const AREAS = [
  "All Lahore",
  "DHA",
  "Bahria Town",
  "Johar Town",
  "Wapda Town",
  "Valencia Town",
  "Lake City",
  "Raiwind Road",
  "Model Town",
  "Garden Town",
  "Gulberg",
  "Faisal Town",
  "Township",
  "Askari",
  "LDA City",
  "Park View City",
  "Etihad Town",
  "Bedian Road",
  "Canal Road",
];

export const PROPERTY_TYPES = [
  "Residential Plot",
  "House",
  "Apartment / Flat",
  "Commercial Plot",
  "Shop",
  "Office",
  "Agricultural / Investment Land",
  "Unspecified",
];

/**
 * Buyer-intent search phrases in English, Roman Urdu, Urdu and Hindi.
 * Grouped by language so the scan job can rotate through them fairly.
 */
export const BUYER_KEYWORDS = {
  english: [
    "looking to buy a house in Lahore",
    "need 5 marla plot Lahore",
    "serious buyer DHA Lahore",
    "want to purchase commercial shop Lahore",
    "looking for property in Lahore",
    "need residential plot urgently",
    "buyer required property Lahore",
    "want to buy plot Bahria Town Lahore",
    "need apartment to buy Lahore Johar Town",
    "buy agricultural land near Lahore",
  ],
  roman_urdu: [
    "Lahore mein ghar khareedna hai",
    "plot lena chahta hun",
    "5 marla plot chahiye",
    "DHA mein ghar chahiye",
    "Lahore mein shop khareedni hai",
    "ghar purchase karna hai",
    "serious buyer hun",
    "plot ki talash hai",
    "Lahore mein flat chahiye khareedne ke liye",
    "commerce plot chahiye Lahore",
  ],
  urdu: [
    "لاہور میں گھر خریدنا ہے",
    "پلاٹ خریدنا ہے",
    "پانچ مرلہ پلاٹ چاہیے",
    "مکان خریدنے کا خواہشمند",
    "دکان خریدنی ہے",
    "ڈی ایچ اے میں پلاٹ چاہیے",
    "لاہور میں جائیداد خریدنی ہے",
  ],
  hindi: [
    "लाहौर में मकान खरीदना है",
    "लाहौर में प्लॉट खरीदना है",
    "लाहौर में दुकान खरीदनी है",
  ],
};

export const ALL_KEYWORDS = Object.values(BUYER_KEYWORDS).flat();

/**
 * Source availability as of November 2026. Rendered verbatim in the UI —
 * never pretend a restricted source works.
 */
export const SOURCE_STATUS = {
  google_indexed_web: {
    label: "Google-indexed public web (forums, classifieds, public pages)",
    status: "available",
    note: "Primary source. Runs through your Google Programmable Search / Serper API key.",
  },
  zameen: {
    label: "Zameen.com",
    status: "unavailable_or_restricted",
    note: "No public buyer-request API. Zameen does not offer an open developer API; scraping would bypass its access controls, so it is not used.",
  },
  graana: {
    label: "Graana.com",
    status: "unavailable_or_restricted",
    note: "No public developer API for buyer requests.",
  },
  olx_pakistan: {
    label: "OLX Pakistan",
    status: "unavailable_or_restricted",
    note: "No authorized public API. Buyer ('wanted') posts may still surface through Google-indexed web search.",
  },
  facebook: {
    label: "Facebook public posts & groups",
    status: "unavailable_or_restricted",
    note: "Meta's Groups API was deprecated in April 2024 and the Graph API cannot search arbitrary public posts or groups. Public buyer posts are still found indirectly via Google-indexed search.",
  },
  instagram: {
    label: "Instagram",
    status: "restricted",
    note: "Official hashtag search works only through an Instagram Business account linked to a Meta app (30 unique hashtags / 7 days). Optional: add a Meta access token in Settings to enable.",
  },
};
