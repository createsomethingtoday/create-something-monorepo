# Court Reserve Embed Widget

Standalone booking widget that can be embedded on any website.

## Quick Start

```html
<div id="booking-widget"></div>

<script src="https://courtreserve.createsomething.space/embed.js"></script>
<script>
  CourtReserve.createWidget({
    facilitySlug: 'thestack',
    container: '#booking-widget',
    theme: 'dark'
  });
</script>
```

## API Reference

### `CourtReserve.createWidget(config)`

Creates and mounts a booking widget.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `facilitySlug` | `string` | Yes | Facility identifier (e.g., 'thestack') |
| `container` | `string` | Yes | CSS selector for container element |
| `theme` | `'light' \| 'dark'` | No | Widget theme (default: 'dark') |
| `date` | `string` | No | Initial date in YYYY-MM-DD format (default: today) |
| `courtType` | `string` | No | Filter by court type (e.g., 'pickleball', 'tennis') |
| `onReservationComplete` | `function` | No | Called when a reservation is completed |
| `onReady` | `function` | No | Called when the widget is initialized |
| `onError` | `function` | No | Called when an error occurs |

**Returns:** `WidgetInstance`

### `WidgetInstance` API

```typescript
interface WidgetInstance {
  destroy(): void;           // Unmount the widget
  updateDate(date: string): void;  // Change the displayed date
  refresh(): void;           // Re-fetch availability
}
```

## Examples

### With Callbacks

```javascript
const widget = CourtReserve.createWidget({
  facilitySlug: 'thestack',
  container: '#booking-widget',
  theme: 'dark',
  onReservationComplete: (reservation) => {
    console.log('Booked:', reservation);
    // reservation = {
    //   id: 'rsv_xxx',
    //   courtName: 'Court 1',
    //   startTime: '14:00',
    //   endTime: '15:00',
    //   price: 4000  // cents
    // }
  },
  onReady: () => {
    console.log('Widget loaded');
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});
```

### Dynamic Date Updates

```javascript
const widget = CourtReserve.createWidget({
  facilitySlug: 'thestack',
  container: '#booking-widget'
});

// Update to tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
widget.updateDate(tomorrow.toISOString().split('T')[0]);
```

### Cleanup

```javascript
const widget = CourtReserve.createWidget({ /* config */ });

// Later, when removing the widget
widget.destroy();
```

## Theming

The widget supports two themes:

**Dark Theme** (default):
- Background: `#1a1a1a`
- Text: `#ffffff`
- Accents: `rgba(255, 255, 255, 0.05-0.5)`

**Light Theme**:
- Background: `#ffffff`
- Text: `#1a1a1a`
- Accents: `rgba(0, 0, 0, 0.05-0.5)`

Themes are applied via `data-theme` attribute and use CSS variables for consistency.

## Development

### Build the Widget

```bash
cd packages/court-reserve
pnpm build:embed
```

Output: `packages/court-reserve/static/embed.js`

### Local Development

The widget is automatically available in dev mode:

```bash
pnpm dev
# Widget available at http://localhost:5173/embed.js
```

### Testing

See `static/embed-example.html` for a standalone test page:

```bash
pnpm dev
# Visit http://localhost:5173/embed-example.html
```

## Integration Examples

### SvelteKit (The Stack)

See `packages/agency/clients/the-stack/src/routes/book/+page.svelte`

### Plain HTML

See `packages/court-reserve/static/embed-example.html`

### React

```jsx
import { useEffect, useRef } from 'react';

function BookingWidget({ facilitySlug }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load script
    const script = document.createElement('script');
    script.src = 'https://courtreserve.createsomething.space/embed.js';
    script.async = true;
    script.onload = () => {
      widgetRef.current = window.CourtReserve.createWidget({
        facilitySlug,
        container: containerRef.current,
        theme: 'dark'
      });
    };
    document.head.appendChild(script);

    // Cleanup
    return () => {
      widgetRef.current?.destroy();
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [facilitySlug]);

  return <div ref={containerRef} />;
}
```

### Vue

```vue
<template>
  <div ref="widgetContainer"></div>
</template>

<script>
export default {
  props: {
    facilitySlug: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      widget: null
    };
  },
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://courtreserve.createsomething.space/embed.js';
    script.async = true;
    script.onload = () => {
      this.widget = window.CourtReserve.createWidget({
        facilitySlug: this.facilitySlug,
        container: this.$refs.widgetContainer,
        theme: 'dark'
      });
    };
    document.head.appendChild(script);
  },
  beforeUnmount() {
    this.widget?.destroy();
  }
};
</script>
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features required
- No IE11 support

## Bundle Size

- Minified: ~50KB (including Svelte runtime)
- Gzipped: ~18KB

## API Endpoint

The widget fetches availability from:

```
GET /api/availability?facility={slug}&date={YYYY-MM-DD}
```

Response format:
```json
{
  "facility": {
    "id": "fac_xxx",
    "name": "Facility Name",
    "slug": "facility-slug",
    "timezone": "America/Los_Angeles"
  },
  "date": "2025-12-30",
  "courts": [
    {
      "id": "crt_xxx",
      "name": "Court 1",
      "type": "pickleball",
      "surfaceType": "Sport Court",
      "slots": [
        {
          "startTime": "09:00",
          "endTime": "10:00",
          "status": "available",
          "priceCents": 4000
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Widget not loading

Check browser console for errors. Common issues:
- Container element not found (check CSS selector)
- Facility slug incorrect
- CORS issues (widget must be served from same domain or with proper headers)

### Empty availability

- Verify facility exists in database
- Check facility status is 'active'
- Ensure courts exist and are active
- Verify date is within advance booking window

### TypeScript Support

```typescript
declare global {
  interface Window {
    CourtReserve: {
      createWidget(config: WidgetConfig): WidgetInstance;
      version: string;
    };
  }
}
```

## License

Part of the Court Reserve system by CREATE SOMETHING.
