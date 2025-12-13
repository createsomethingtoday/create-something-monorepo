#!/usr/bin/env node
/**
 * Generate template images using Nano Banana Pro (Gemini 3 Pro Image Preview)
 *
 * Heidegger: Aletheia - Images as unconcealment.
 * The photograph reveals what careful attention discloses.
 * Canon: Weniger, aber besser - Nothing that doesn't earn its existence.
 */

import { writeFile, mkdir, unlink } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

const GEMINI_API_KEY = 'AIzaSyDUGN6Z1cnkWzhSGajLhgKyI-ONdI9vMZ8';

// Force regeneration flag
const FORCE_REGENERATE = process.argv.includes('--force');

// Rate limiting: Pro model has stricter limits
const RATE_LIMIT_DELAY = 10000; // 10 seconds between requests

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(prompt, outputPath, retries = 3) {
  // Skip if file already exists (unless force flag)
  if (existsSync(outputPath) && !FORCE_REGENERATE) {
    console.log(`Skipping (exists): ${outputPath.split('/').slice(-2).join('/')}`);
    return true;
  }

  // Delete existing file if force regenerating
  if (existsSync(outputPath) && FORCE_REGENERATE) {
    await unlink(outputPath);
  }

  console.log(`Generating: ${outputPath.split('/').slice(-2).join('/')}`);

  try {
    // Using Gemini 2.0 Flash Experimental with imagen-3.0-generate-002 for high-res
    // Note: gemini-3-pro-image-preview may not be available yet, using imagen-3
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            outputOptions: {
              mimeType: 'image/jpeg'
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ⚠ Imagen-3 unavailable, falling back to Gemini 2.0 Flash...`);

      // Fallback to Gemini 2.0 Flash with enhanced prompts
      return await generateImageFallback(prompt, outputPath, retries);
    }

    const data = await response.json();

    // Extract image from Imagen response
    const imageData = data.predictions?.[0]?.bytesBase64Encoded;

    if (!imageData) {
      throw new Error('No image in response');
    }

    const imageBuffer = Buffer.from(imageData, 'base64');

    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, imageBuffer);

    console.log(`  ✓ Saved (Imagen-3)`);
    return true;
  } catch (error) {
    // Try fallback
    return await generateImageFallback(prompt, outputPath, retries);
  }
}

async function generateImageFallback(prompt, outputPath, retries = 2) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a high-resolution, professional photograph: ${prompt}. Style: editorial quality, 4K resolution, sharp focus, professional lighting.`
            }]
          }],
          generationConfig: {
            responseModalities: ["image", "text"],
            responseMimeType: "text/plain"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429 && retries > 0) {
        console.log(`  ⏳ Rate limited, waiting 45s...`);
        await sleep(45000);
        return generateImageFallback(prompt, outputPath, retries - 1);
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract image from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart) {
      throw new Error('No image in response');
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, imageBuffer);

    console.log(`  ✓ Saved`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE STUDIO IMAGES
// Principle: Let the architecture speak. Full-bleed, editorial.
// ═══════════════════════════════════════════════════════════════════════════

const architectureImages = [
  // Forest Cabin Project
  {
    prompt: 'Architectural photography of a modern forest cabin exterior, floor-to-ceiling glass walls reflecting tall pine trees, raw concrete and warm cedar wood materials, soft overcast Nordic light, the building in quiet dialogue with its environment, shot on medium format, editorial architecture photography, 8K resolution',
    path: 'packages/verticals/architecture-studio/static/projects/hero-forest-cabin.jpg'
  },
  {
    prompt: 'Interior architectural photograph of minimalist cabin living room, double-height space with forest visible through massive glass wall, white oak floors aged naturally, single Wegner chair, morning light falling across concrete floor, serene and contemplative, architectural interior photography',
    path: 'packages/verticals/architecture-studio/static/projects/forest-cabin-01.jpg'
  },
  {
    prompt: 'Modern cabin kitchen interior, poured concrete countertops with subtle aggregate visible, handleless oak cabinets, brass hardware patinated with use, view through window to misty forest, afternoon light, architectural detail photography',
    path: 'packages/verticals/architecture-studio/static/projects/forest-cabin-02.jpg'
  },
  {
    prompt: 'Cabin bedroom at dawn, simple platform bed with Belgian linen, floor-to-ceiling window facing pine forest, first light entering the room, minimal and contemplative, architectural interior, medium format quality',
    path: 'packages/verticals/architecture-studio/static/projects/forest-cabin-03.jpg'
  },
  // Hillside Residence
  {
    prompt: 'Modern hillside residence exterior at golden hour, cantilevered concrete volume hovering above steep terrain, weathered steel and board-formed concrete, dramatic mountain valley beyond, architecture integrated with landscape, editorial architectural photography, 8K',
    path: 'packages/verticals/architecture-studio/static/projects/exterior-hillside.jpg'
  },
  {
    prompt: 'Hillside house interior, vast open floor plan with panoramic valley views, polished concrete floor reflecting light, minimal furniture, architecture as frame for the landscape, late afternoon light, interior photography',
    path: 'packages/verticals/architecture-studio/static/projects/hillside-01.jpg'
  },
  {
    prompt: 'Hillside residence terrace at dusk, infinity edge pool merging with distant mountains, outdoor dining area with weathered teak furniture, warm interior light glowing through glass walls, architectural exterior photography',
    path: 'packages/verticals/architecture-studio/static/projects/hillside-02.jpg'
  },
  // Coastal Retreat
  {
    prompt: 'Mediterranean coastal house exterior, white lime-washed walls against deep blue sea, floor-to-ceiling windows with steel frames, weathered iroko deck, simple and timeless architecture, bright diffused daylight, architectural photography',
    path: 'packages/verticals/architecture-studio/static/projects/exterior-coastal.jpg'
  },
  {
    prompt: 'Coastal house interior, white plaster walls with subtle texture, natural linen upholstery, ocean horizon visible through window, soft Mediterranean light, minimal and serene, interior architecture photography',
    path: 'packages/verticals/architecture-studio/static/projects/coastal-01.jpg'
  },
  {
    prompt: 'Coastal retreat terrace, white stone paving, simple infinity pool reflecting sky, Mediterranean sea beyond, potted olive tree, architecture of restraint, bright daylight, architectural exterior',
    path: 'packages/verticals/architecture-studio/static/projects/coastal-02.jpg'
  },
  // Meadow Studio
  {
    prompt: 'Artist studio pavilion in wildflower meadow, black steel frame and glass box, Japanese-influenced minimalism, structure appearing to float above tall grasses, soft overcast light, architecture photography, medium format quality',
    path: 'packages/verticals/architecture-studio/static/projects/exterior-meadow.jpg'
  },
  {
    prompt: 'Artist studio interior, north-facing skylight flooding space with even light, polished concrete floor, white walls, single easel and wooden stool, meadow visible through glass walls, contemplative workspace, architectural interior',
    path: 'packages/verticals/architecture-studio/static/projects/meadow-01.jpg'
  },
  {
    prompt: 'Meadow studio detail, black steel window frame with wildflowers beyond, interior corner with afternoon light, architecture as frame for nature, detail photography',
    path: 'packages/verticals/architecture-studio/static/projects/meadow-02.jpg'
  },
  // Woodland House
  {
    prompt: 'Modern woodland house exterior, Cor-ten steel facade rusted to deep amber, glass and concrete volumes among mature oak trees, autumn foliage, dramatic clouded sky, architecture aging with its environment, editorial photography',
    path: 'packages/verticals/architecture-studio/static/projects/exterior-woodland.jpg'
  },
  {
    prompt: 'Woodland house great room interior, double-height space with massive stone fireplace, floor-to-ceiling glass wall with forest view, warm evening light, minimal furniture, architecture as shelter, interior photography',
    path: 'packages/verticals/architecture-studio/static/projects/woodland-01.jpg'
  },
  {
    prompt: 'Woodland house library corner, built-in walnut bookshelves worn smooth with use, leather reading chair by window, autumn trees visible, warm afternoon light, lived-in architectural space, interior detail',
    path: 'packages/verticals/architecture-studio/static/projects/woodland-02.jpg'
  },
  {
    prompt: 'Woodland house bathroom, freestanding stone tub, oak-framed window overlooking forest, natural materials aged beautifully, morning light, spa-like serenity, architectural interior photography',
    path: 'packages/verticals/architecture-studio/static/projects/woodland-03.jpg'
  },
  // Team & OG
  {
    prompt: 'Professional architect portrait, person in black turtleneck against minimal gray concrete background, natural window light, thoughtful expression, editorial portrait photography, sharp focus, 85mm lens quality',
    path: 'packages/verticals/architecture-studio/static/team/principal.jpg'
  },
  {
    prompt: 'Abstract architectural composition, concrete texture with diagonal shadow from skylight, minimal and contemplative, natural light, material study, suitable for brand image, editorial quality',
    path: 'packages/verticals/architecture-studio/static/og-image.jpg'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// CREATIVE AGENCY IMAGES
// Principle: Results speak louder. Bold, metrics-driven, dark aesthetic.
// ═══════════════════════════════════════════════════════════════════════════

const agencyImages = [
  // Vesta Brand Project
  {
    prompt: 'Luxury skincare brand identity photography, minimal glass bottles with custom typography on brushed brass tray, soft directional studio lighting, cream and gold palette, editorial product photography, sharp focus, 8K',
    path: 'packages/verticals/creative-agency/static/work/vesta-hero.jpg'
  },
  {
    prompt: 'Brand guidelines book spread, modern typography specimen with generous white space, earth tone color palette swatches, overhead flat lay on linen surface, editorial design photography, sharp focus',
    path: 'packages/verticals/creative-agency/static/work/vesta-01.jpg'
  },
  {
    prompt: 'Luxury packaging detail, embossed logo on heavy cream paper box, subtle gold foil, soft shadows, macro product photography, premium materials visible, studio lighting',
    path: 'packages/verticals/creative-agency/static/work/vesta-02.jpg'
  },
  {
    prompt: 'Brand collateral still life, shopping bag with tissue paper, business cards, thank you note on marble surface, cohesive luxury aesthetic, soft studio lighting, advertising photography',
    path: 'packages/verticals/creative-agency/static/work/vesta-03.jpg'
  },
  // Nimbus Tech Rebrand
  {
    prompt: 'Tech startup website mockup on MacBook Pro screen, clean dashboard UI with data visualization, blue accent color, minimal desk setup with coffee cup, natural window light, digital design photography',
    path: 'packages/verticals/creative-agency/static/work/nimbus-hero.jpg'
  },
  {
    prompt: 'Mobile app interface design, three iPhones floating with UI screens visible, clean design system, blue gradient accents on dark background, minimal product photography',
    path: 'packages/verticals/creative-agency/static/work/nimbus-01.jpg'
  },
  {
    prompt: 'Tech brand collateral flat lay, business cards and letterhead with geometric logo, blue and white palette, concrete background, overhead design photography, sharp focus',
    path: 'packages/verticals/creative-agency/static/work/nimbus-02.jpg'
  },
  // Heirloom Restaurant
  {
    prompt: 'Restaurant brand identity, elegant menu on dark walnut table, gold foil typography, warm candlelight ambiance, wine glass and napkin visible, hospitality design photography, moody lighting',
    path: 'packages/verticals/creative-agency/static/work/heirloom-hero.jpg'
  },
  {
    prompt: 'Restaurant interior signage, illuminated logo in gold on dark wall, warm atmospheric lighting, glimpse of dining room beyond, hospitality brand photography',
    path: 'packages/verticals/creative-agency/static/work/heirloom-01.jpg'
  },
  {
    prompt: 'Restaurant collateral on dark wood, leather-bound wine list, embossed coasters, elegant serif typography, candlelight warmth, hospitality branding photography',
    path: 'packages/verticals/creative-agency/static/work/heirloom-02.jpg'
  },
  // Team
  {
    prompt: 'Creative director portrait, confident professional against minimal dark background, soft key light from window, contemporary editorial portrait, slightly desaturated, medium format quality',
    path: 'packages/verticals/creative-agency/static/team/alex.jpg'
  },
  {
    prompt: 'Strategy lead headshot, thoughtful expression, clean neutral background, professional portrait with warm studio lighting, editorial style, sharp focus',
    path: 'packages/verticals/creative-agency/static/team/jordan.jpg'
  },
  {
    prompt: 'Creative agency brand image, abstract geometric composition with bold typography fragments, dark background with subtle gradient, design studio aesthetic, minimal and striking',
    path: 'packages/verticals/creative-agency/static/og-image.jpg'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// CREATIVE PORTFOLIO IMAGES
// Principle: Aletheia - Photography as unconcealment.
// The image reveals what careful attention discloses.
// Canon: The work fills the screen. Nothing that doesn't earn its existence.
// ═══════════════════════════════════════════════════════════════════════════

const portfolioImages = [
  // ─────────────────────────────────────────────────────────────────────────
  // SERIES 1: THRESHOLD DWELLING
  // Liminal spaces where being transitions. Doorways, windows, passages.
  // The moment between states. Light as disclosure.
  // ─────────────────────────────────────────────────────────────────────────
  {
    prompt: 'Architectural threshold photograph, heavy wooden door half-open revealing courtyard beyond with soft morning light, the space between inside and outside, contemplative and still, fine art photography, medium format quality, sharp focus, 8K',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/cover.jpg'
  },
  {
    prompt: 'Window as threshold, old industrial window frame with morning light streaming through dusty glass, the outside world abstracted, attention to the boundary itself, fine art photography, contemplative',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/01.jpg'
  },
  {
    prompt: 'Narrow alley passage in old city, light at the end drawing the eye, worn stone walls telling time, the path itself as subject, fine art street photography, quiet and observant',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/02.jpg'
  },
  {
    prompt: 'Stairwell threshold, spiral stairs descending with light falling from above, geometric and contemplative, the transition between levels, architectural photography as meditation',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/03.jpg'
  },
  {
    prompt: 'Gate at dusk, wrought iron gate slightly ajar with garden visible beyond, last light of day, the invitation and the boundary, fine art photography, liminal atmosphere',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/04.jpg'
  },
  {
    prompt: 'Curtain as threshold, sheer linen curtain with afternoon light filtering through, silhouette of window frame visible, the veil between spaces, minimal fine art photography',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/05.jpg'
  },
  {
    prompt: 'Bridge in fog, simple wooden footbridge disappearing into morning mist, the path forward unknown, threshold between visible and invisible, contemplative landscape photography',
    path: 'packages/verticals/creative-portfolio/static/work/threshold-dwelling/06.jpg'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SERIES 2: HANDS AT WORK
  // Zuhandenheit embodied. The maker disappearing into the making.
  // Tool-in-use, not tools displayed. The gesture that reveals.
  // ─────────────────────────────────────────────────────────────────────────
  {
    prompt: 'Craftsperson hands working clay on pottery wheel, hands covered in slip, complete focus on the emerging form, natural window light from side, the maker absorbed in making, documentary photography, 8K',
    path: 'packages/verticals/creative-portfolio/static/work/hands-at-work/cover.jpg'
  },
  {
    prompt: 'Hands kneading bread dough on worn wooden board, flour dust in morning light, the rhythm of the work visible in the gesture, simple kitchen setting, documentary fine art photography',
    path: 'packages/verticals/creative-portfolio/static/work/hands-at-work/01.jpg'
  },
  {
    prompt: 'Carpenter hands planing wood, shavings curling away, focus on the hands and the tool in use, workshop with natural light, the craft absorbed in the craftsperson, documentary photography',
    path: 'packages/verticals/creative-portfolio/static/work/hands-at-work/02.jpg'
  },
  {
    prompt: 'Hands writing in notebook with fountain pen, natural light on paper, the act of inscription, words forming under careful attention, quiet contemplative photograph',
    path: 'packages/verticals/creative-portfolio/static/work/hands-at-work/03.jpg'
  },
  {
    prompt: 'Gardener hands in soil, planting seedling, earth under fingernails, the care and attention visible, outdoor natural light, connection between human and ground, documentary photography',
    path: 'packages/verticals/creative-portfolio/static/work/hands-at-work/04.jpg'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SERIES 3: MATERIAL STUDIES
  // Light revealing the truth of materials. Concrete, wood, glass, water.
  // Not pretty decoration but the structure of things made visible.
  // ─────────────────────────────────────────────────────────────────────────
  {
    prompt: 'Material study of weathered concrete wall, afternoon sunlight revealing aggregate and form marks, subtle color variations in gray, the material speaking its own truth, fine art photography, 8K resolution',
    path: 'packages/verticals/creative-portfolio/static/work/material-studies/cover.jpg'
  },
  {
    prompt: 'Close study of aged wood grain, oak floorboard worn smooth by decades of footsteps, raking light revealing the pattern of years, material as record of time, fine art detail photography',
    path: 'packages/verticals/creative-portfolio/static/work/material-studies/01.jpg'
  },
  {
    prompt: 'Water surface study, still pool with subtle ripples catching light, reflections and transparency in tension, the material that has no fixed form, contemplative photography',
    path: 'packages/verticals/creative-portfolio/static/work/material-studies/02.jpg'
  },
  {
    prompt: 'Rusted steel surface detail, Cor-ten patina in warm orange and deep brown, texture formed by weather and time, industrial material returning to earth, material study photography',
    path: 'packages/verticals/creative-portfolio/static/work/material-studies/03.jpg'
  },
  {
    prompt: 'Handmade paper close-up, deckled edge and fiber texture visible, natural off-white with subtle imperfections, light passing through slightly, material that holds thought, fine art photography',
    path: 'packages/verticals/creative-portfolio/static/work/material-studies/04.jpg'
  },
  {
    prompt: 'Linen fabric detail, natural weave with light passing through, subtle cream color, the integrity of simple material, textile as subject, contemplative fine art photography',
    path: 'packages/verticals/creative-portfolio/static/work/material-studies/05.jpg'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SERIES 4: TIME MADE VISIBLE
  // Patina, weathering, wear patterns. Traces of human dwelling.
  // Not nostalgia but evidence. How presence inscribes itself.
  // ─────────────────────────────────────────────────────────────────────────
  {
    prompt: 'Worn marble staircase, centuries of footsteps carved into stone, the hollow worn by human passage, afternoon light on ancient material, time as sculptor, fine art architectural photography, 8K',
    path: 'packages/verticals/creative-portfolio/static/work/time-visible/cover.jpg'
  },
  {
    prompt: 'Door handle worn smooth by countless hands, brass darkened where gripped, the tool shaped by its use, evidence of daily ritual, contemplative detail photography',
    path: 'packages/verticals/creative-portfolio/static/work/time-visible/01.jpg'
  },
  {
    prompt: 'Painted wall with layers revealed, peeling paint showing previous colors beneath, archaeology of a surface, time as stratigraphy, fine art photography of decay',
    path: 'packages/verticals/creative-portfolio/static/work/time-visible/02.jpg'
  },
  {
    prompt: 'Well-used leather journal, cover softened and marked by years of handling, spine creased, the object shaped by its owner, still life as biography, natural light photography',
    path: 'packages/verticals/creative-portfolio/static/work/time-visible/03.jpg'
  },

  // OG Image - The portfolio itself as statement
  {
    prompt: 'Abstract fine art photograph, single shaft of light falling on textured concrete surface, minimal composition, the photograph as attention itself, suitable for brand identity, contemplative and precise',
    path: 'packages/verticals/creative-portfolio/static/og-image.jpg'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL INJURY LAW FIRM IMAGES
// Martinez & Rivera - San Diego PI Boutique
// Principle: Trust, urgency, results. Professional but accessible.
// ═══════════════════════════════════════════════════════════════════════════

const personalInjuryImages = [
  // Hero Image - San Diego skyline with scales of justice
  {
    prompt: 'Professional photograph of San Diego downtown skyline at golden hour dusk, Coronado bridge visible in distance, scales of justice silhouette subtly overlaid in dramatic orange and blue sky, modern law firm aesthetic, photorealistic, cinematic lighting, architectural photography style, 8K resolution',
    path: 'packages/verticals/personal-injury/static/images/hero-justice.png'
  },
  // Attorney: Carlos Martinez - Founding Partner, Latino male, mid-40s
  {
    prompt: 'Professional headshot portrait of a confident Latino male attorney in his mid-40s, distinguished salt and pepper hair, wearing dark navy suit with burgundy tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style, trustworthy and experienced expression, sharp focus, 8K',
    path: 'packages/verticals/personal-injury/static/images/attorney-martinez.png'
  },
  // Attorney: Elena Rivera - Managing Partner, Latina female, late 30s
  {
    prompt: 'Professional headshot portrait of a confident Latina woman attorney in her late 30s, dark hair pulled back professionally, wearing elegant black blazer with white silk blouse, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style, approachable yet authoritative expression, sharp focus, 8K',
    path: 'packages/verticals/personal-injury/static/images/attorney-rivera.png'
  },
  // Attorney: Marcus Johnson - Senior Associate, Black male, early 30s
  {
    prompt: 'Professional headshot portrait of a confident African American male attorney in his early 30s, short hair with neat fade, wearing charcoal gray suit with light blue tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate professional style, confident and determined expression, sharp focus, 8K',
    path: 'packages/verticals/personal-injury/static/images/attorney-johnson.png'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const allImages = [
    ...architectureImages,
    ...agencyImages,
    ...portfolioImages,
    ...personalInjuryImages
  ];

  console.log(`\n🎨 Generating ${allImages.length} images for templates\n`);
  console.log('Philosophy: Aletheia - Images as unconcealment.');
  console.log('Model: Gemini Pro (4K resolution)');
  console.log('Rate limit: 6 req/min - 10s delay between requests');
  if (FORCE_REGENERATE) console.log('🔄 Force regeneration enabled\n');
  else console.log('');

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const img of allImages) {
    const fullPath = `/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/${img.path}`;

    // Check if exists first (unless force flag)
    if (existsSync(fullPath) && !FORCE_REGENERATE) {
      console.log(`Skipping (exists): ${fullPath.split('/').slice(-2).join('/')}`);
      skipped++;
      continue;
    }

    const result = await generateImage(img.prompt, fullPath);
    if (result) success++;
    else failed++;

    // Delay between requests to stay under rate limit
    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`\n✨ Complete: ${success} generated, ${skipped} skipped, ${failed} failed\n`);
}

main().catch(console.error);
