export const SITE_URL = "https://princess-pet-palace.createsomethingtoday.chatgpt.site";

export const SITE_DESCRIPTION =
  "A free, ad-free preschool game for ages 3–5 with letters, counting, animals, movement activities, spoken directions, and optional camera magic.";

export const faqItems = [
  {
    question: "What does Princess Pet Palace teach?",
    answer:
      "Children practice letter sounds, animal names, counting from one to six, listening, and simple balance and movement through six short play rooms.",
  },
  {
    question: "What age is Princess Pet Palace for?",
    answer:
      "The game is designed for preschool children around ages three to five, with large tap targets, spoken directions, and no reading required to begin.",
  },
  {
    question: "Is Princess Pet Palace free and ad-free?",
    answer:
      "Yes. The game is free to play and has no ads, accounts, purchases, or third-party tracking.",
  },
  {
    question: "How does camera magic protect privacy?",
    answer:
      "Camera magic is optional, starts only after a grown-up tap, never requests the microphone, and processes movement on the device without recording, uploading, or saving video.",
  },
] as const;

export const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Princess Pet Palace",
    alternateName: "Princess Pet Palace Preschool Learning Game",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Preschool learning game",
    isFamilyFriendly: true,
    interactivityType: "active",
    teaches: [
      "Letter recognition",
      "Animal vocabulary",
      "Counting from one to six",
      "Balance and guided movement",
    ],
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and a modern web browser.",
    isAccessibleForFree: true,
    inLanguage: "en-US",
    image: `${SITE_URL}/og.png`,
    screenshot: `${SITE_URL}/og.png`,
    educationalLevel: "Preschool",
    educationalUse: ["Letter recognition", "Counting practice", "Guided movement"],
    learningResourceType: "Interactive game",
    audience: {
      "@type": "PeopleAudience",
      suggestedMinAge: 3,
      suggestedMaxAge: 5,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Six randomized learning rooms",
      "Spoken instructions",
      "Letter and animal matching",
      "Counting from one to six",
      "Guided movement activities",
      "Optional local-only camera effects",
      "No ads, accounts, purchases, or tracking",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];
