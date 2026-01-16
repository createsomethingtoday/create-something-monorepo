# @create-something/spritz

RSVP (Rapid Serial Visual Presentation) speed reading component with Optimal Recognition Point (ORP) highlighting.

## What is RSVP?

Traditional reading requires your eyes to move across lines of text. RSVP displays words one at a time in a fixed position, eliminating eye movement and allowing faster reading with better comprehension.

The **Optimal Recognition Point (ORP)** is a specific letter in each word where your eye naturally wants to focus. By highlighting this letter and aligning all words to it, your brain can recognize words faster.

## Use Cases

- **Video Production**: Create intro/transition/outro text overlays for walkthrough videos
- **Interactive Documentation**: Embed readers directly in docs for quick content consumption
- **Speed Reading Training**: Help users improve their reading speed
- **Accessibility**: Alternative text presentation for users who prefer sequential display

## Installation

```bash
pnpm add @create-something/spritz
```

## Usage

### Svelte Component

```svelte
<script>
  import { Spritz } from '@create-something/spritz';
</script>

<Spritz
  content="Welcome to the tutorial. Let's learn something new today."
  wpm={350}
  showControls
/>
```

### Multiple Messages (Video Segments)

```svelte
<Spritz
  content={[
    { label: 'Intro', text: 'Welcome to our product demo.' },
    { label: 'Step 1', text: 'First, create a new project.' },
    { label: 'Conclusion', text: 'Thanks for watching!' }
  ]}
  loop
/>
```

### Vanilla JavaScript

For non-Svelte projects or custom implementations:

```ts
import { SpritzEngine, createSpritzRenderer } from '@create-something/spritz/vanilla';

const container = document.getElementById('spritz');
const render = createSpritzRenderer(container);

const engine = new SpritzEngine({
  onWord: render,
  onComplete: () => console.log('Finished!'),
  wpm: 300
});

engine.setText('Your text content here. This will display one word at a time.');
engine.play();
```

### Video Recording Mode

For clean screen captures without UI chrome:

```svelte
<div class="spritz spritz--video spritz--lg">
  <Spritz
    content="Your message here"
    showControls={false}
    showProgress={false}
    showWpmControl={false}
    autoplay
  />
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| SpritzMessage[]` | required | Text or array of messages to display |
| `wpm` | `number` | `300` | Words per minute |
| `autoplay` | `boolean` | `false` | Start playing on mount |
| `loop` | `boolean` | `false` | Loop back when complete |
| `showControls` | `boolean` | `true` | Show play/pause/skip controls |
| `showProgress` | `boolean` | `true` | Show progress bar |
| `showWpmControl` | `boolean` | `true` | Show WPM slider |
| `minWpm` | `number` | `100` | Minimum WPM for slider |
| `maxWpm` | `number` | `800` | Maximum WPM for slider |
| `wpmStep` | `number` | `50` | WPM increment/decrement step |
| `class` | `string` | `''` | Additional CSS class |

### SpritzMessage Type

```ts
interface SpritzMessage {
  text: string;    // The text content
  label?: string;  // Optional label shown above the redicle
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` | Skip back 5 words |
| `→` | Skip forward 5 words |
| `↑` | Increase WPM |
| `↓` | Decrease WPM |
| `R` | Restart |

## Vanilla JS API

### SpritzEngine

```ts
const engine = new SpritzEngine({
  onWord: (word, orpIndex) => void,     // Called for each word
  onComplete?: () => void,               // Called when playback ends
  onStateChange?: (state) => void,       // 'playing' | 'paused' | 'stopped'
  onProgress?: (current, total) => void, // Progress updates
  wpm?: number,                          // Default: 300
  punctuationPause?: {                   // Pause multipliers
    comma: number,    // Default: 1.5
    period: number,   // Default: 2.0
    question: number, // Default: 2.0
    // ... etc
  }
});

// Methods
engine.setText(text: string)     // Set content
engine.play()                    // Start/resume
engine.pause()                   // Pause
engine.toggle()                  // Toggle play/pause
engine.stop()                    // Stop and reset
engine.seek(index: number)       // Jump to word
engine.skipForward(n?: number)   // Skip forward n words
engine.skipBackward(n?: number)  // Skip backward n words
engine.setWPM(wpm: number)       // Change speed
engine.getWPM(): number          // Get current WPM
engine.getState(): SpritzState   // Get current state
engine.isPlaying(): boolean      // Check if playing
engine.destroy()                 // Clean up
```

### Utility Functions

```ts
import { calculateORP, parseText } from '@create-something/spritz/vanilla';

// Get ORP index for a word
calculateORP('something'); // Returns 2

// Parse text into words
parseText('Hello, world!'); // Returns ['Hello,', 'world!']
```

## Styling

The component uses Canon design tokens by default. To customize:

```css
.spritz {
  /* Override the ORP highlight color */
  --spritz-orp-color: #ff0000;
  
  /* Adjust word letter spacing */
  --spritz-word-spacing: 0.1em;
}
```

### Size Variants

Add size classes to the container:

- `.spritz--sm` - Smaller text for compact displays
- `.spritz--lg` - Larger text for presentations

### Video Mode

Add `.spritz--video` for a clean, chromeless display suitable for screen recording.

## Accessibility

- Full keyboard navigation
- ARIA live regions for screen reader announcements
- Respects `prefers-reduced-motion`
- Focus indicators for all interactive elements
- Semantic HTML structure

## How ORP Works

The Optimal Recognition Point is calculated based on word length:

| Word Length | ORP Position |
|-------------|--------------|
| 1 char | Index 0 |
| 2-5 chars | Index 1 |
| 6-9 chars | Index 2 |
| 10-13 chars | Index 3 |
| 14+ chars | Index 4 |

This positions the focal point slightly left of center, where research shows the eye naturally wants to fixate for word recognition.

## Credits

Inspired by [Spritz](https://spritz.com/) and RSVP research in cognitive psychology.
