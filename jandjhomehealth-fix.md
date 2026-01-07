# J AND J HOME HEALTH - Contact Form Fix

## Problem
Form submits to `/api/contact` → returns 404 → shows "Failed to save contact"

## Quick Fix Option 1: Cloudflare Pages Functions

Create a `functions/api/contact.ts` file in the project root:

```typescript
// functions/api/contact.ts
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Validate required fields
    if (!body.name || !body.phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name and phone required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log submission (check in Cloudflare Dashboard → Workers & Pages → jandjhomehealth → Logs)
    console.log('[Contact Submission]', {
      name: body.name,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth,
      insuranceGroup: body.insuranceGroup,
      timestamp: new Date().toISOString()
    });

    // Option A: Store to KV
    if (context.env.CONTACT_SUBMISSIONS) {
      const id = crypto.randomUUID();
      await context.env.CONTACT_SUBMISSIONS.put(
        `submission:${id}`,
        JSON.stringify({ ...body, submittedAt: new Date().toISOString() })
      );
    }

    // Option B: Send email notification (requires Cloudflare Email Routing)
    // TODO: Add email integration

    return new Response(
      JSON.stringify({ success: true, message: 'Thank you. We will contact you within 24 hours.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Contact Error]', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Submission failed. Please call us directly.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Deploy**:
```bash
# Add the functions/ directory to your repo
git add functions/api/contact.ts
git commit -m "Add contact form API endpoint"
git push

# Cloudflare Pages will automatically redeploy
```

## Quick Fix Option 2: Formspree (Fastest, No Code)

1. Go to https://formspree.io
2. Create a free account
3. Create a new form
4. Get your form endpoint: `https://formspree.io/f/YOUR_FORM_ID`
5. Update the form in your Svelte component:

```svelte
<script>
  let formEndpoint = 'https://formspree.io/f/YOUR_FORM_ID';
  let status = '';

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch(formEndpoint, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        status = 'Thank you! We will contact you within 24 hours.';
        e.target.reset();
      } else {
        status = 'Failed to save contact';
      }
    } catch (error) {
      status = 'Failed to save contact';
    }
  }
</script>

<form on:submit={handleSubmit}>
  <label>
    <span>Name</span>
    <input type="text" name="name" required />
  </label>
  <label>
    <span>Date of Birth</span>
    <input type="text" name="dateOfBirth" required />
  </label>
  <label>
    <span>Phone</span>
    <input type="tel" name="phone" required />
  </label>
  <label>
    <span>Insurance Group <small>(optional)</small></span>
    <input type="text" name="insuranceGroup" />
  </label>

  {#if status}
    <p class:error={status.includes('Failed')}>{status}</p>
  {/if}

  <button type="submit">Send</button>
</form>
```

## Quick Fix Option 3: Google Forms Embed

1. Create a Google Form with the same fields
2. Get the embed code
3. Replace the custom form with the Google Form iframe

## Recommended: Option 1 (Cloudflare Functions)

- No external dependencies
- Free (included with Pages)
- Can store to KV for retrieval
- Can integrate with email later
- Serverless, scales automatically

## Next Steps

1. Tell me which repository this is deployed from (check Cloudflare Dashboard)
2. I'll add the `functions/api/contact.ts` file to fix it permanently
3. Or you can use Formspree (5 min setup, works immediately)
