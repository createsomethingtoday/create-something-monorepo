# Audit an Artifact

## Objective

Apply Rams' principle—"Does this earn its existence?"—to evaluate every element of a design artifact.

## Context

You're reviewing a landing page hero section. Each element must justify its presence.

## Target Artifact

```html
<section class="hero">
  <div class="hero-background">
    <video autoplay loop muted playsinline>
      <source src="/hero-bg.mp4" type="video/mp4" />
    </video>
    <div class="overlay"></div>
    <div class="particles"></div>
  </div>

  <div class="hero-content">
    <span class="badge">🚀 New Feature Available!</span>
    <span class="label">Professional Services</span>

    <h1 class="headline">
      Build <span class="gradient-text">Beautiful</span> Websites
      <br />
      That <span class="typewriter">Convert</span>
    </h1>

    <p class="subheadline">
      We help businesses create stunning digital experiences that
      drive results. Our team of experts combines design excellence
      with technical expertise to deliver websites that stand out.
    </p>

    <div class="cta-group">
      <button class="btn-primary">
        <span class="btn-icon">→</span>
        Get Started Now
      </button>
      <button class="btn-secondary">
        <span class="btn-icon">▶</span>
        Watch Demo
      </button>
      <button class="btn-tertiary">
        Learn More
      </button>
    </div>

    <div class="social-proof">
      <div class="avatars">
        <img src="/avatar1.jpg" />
        <img src="/avatar2.jpg" />
        <img src="/avatar3.jpg" />
        <img src="/avatar4.jpg" />
        <span>+1,234</span>
      </div>
      <div class="rating">
        ⭐⭐⭐⭐⭐ 4.9/5 on Trustpilot
      </div>
      <div class="badges">
        <img src="/badge-award1.png" />
        <img src="/badge-award2.png" />
        <img src="/badge-featured.png" />
      </div>
    </div>
  </div>

  <div class="scroll-indicator">
    <span>Scroll to explore</span>
    <div class="arrow animated"></div>
  </div>
</section>
```

## The Ten Principles Lens

Rams defined good design through ten principles. Apply these questions:

### 1. Is it innovative?
Does any element push the medium forward, or is it imitative?

### 2. Does it make the product useful?
Does each element help users accomplish their goal?

### 3. Is it aesthetic?
Does it serve visual harmony, or is it decorative noise?

### 4. Does it make the product understandable?
Does each element clarify or confuse the message?

### 5. Is it unobtrusive?
Does any element demand attention beyond its purpose?

### 6. Is it honest?
Does any element misrepresent capabilities or create false urgency?

### 7. Is it long-lasting?
Will any element feel dated in 6 months?

### 8. Is it thorough to the last detail?
Are any elements half-finished or inconsistent?

### 9. Is it environmentally friendly?
Do any elements waste bandwidth, CPU, or attention?

### 10. Is it as little design as possible?
What can be removed without loss of function?

## Task

Complete the audit table for each element:

| Element | Earns Existence? | Reasoning | Verdict |
|---------|-----------------|-----------|---------|
| Background video | ? | | Keep / Remove / Modify |
| Overlay | ? | | Keep / Remove / Modify |
| Particles | ? | | Keep / Remove / Modify |
| "New Feature" badge | ? | | Keep / Remove / Modify |
| "Professional Services" label | ? | | Keep / Remove / Modify |
| Gradient text | ? | | Keep / Remove / Modify |
| Typewriter effect | ? | | Keep / Remove / Modify |
| Subheadline (full text) | ? | | Keep / Remove / Modify |
| Primary CTA | ? | | Keep / Remove / Modify |
| Secondary CTA | ? | | Keep / Remove / Modify |
| Tertiary CTA | ? | | Keep / Remove / Modify |
| Avatar stack | ? | | Keep / Remove / Modify |
| Rating display | ? | | Keep / Remove / Modify |
| Award badges | ? | | Keep / Remove / Modify |
| Scroll indicator | ? | | Keep / Remove / Modify |

## Audit Guidelines

### Elements That Often Don't Earn Existence

- **Decorative motion**: Particles, animated backgrounds, floating elements
- **Redundant CTAs**: More than 2 call-to-action buttons
- **Unverifiable claims**: "1,234 customers" without source
- **Visual tricks**: Gradient text, typewriter effects
- **Urgency badges**: "New!", "Limited time!", "🚀"

### Elements That Usually Earn Existence

- **Clear headline**: What you do, for whom
- **Single CTA**: One clear next action
- **Value proposition**: Why choose this
- **Credibility signal**: ONE form of social proof

## Expected Output

After your audit, propose a simplified hero:

```html
<section class="hero">
  <div class="hero-content">
    <h1>__________________________________</h1>
    <p>__________________________________</p>
    <a href="/contact" class="cta">______________</a>
  </div>
</section>
```

## Success Criteria

- [ ] Every element evaluated with reasoning
- [ ] At least 5 elements marked for removal
- [ ] Remaining elements have clear justification
- [ ] Simplified version maintains core message
- [ ] No decorative elements without function

## Reflection

After completing this exercise:
1. What percentage of the original elements survived?
2. What patterns do you notice in what got removed?
3. How would you apply this lens to your own work?

**"Less, but better" is not minimalism for aesthetics—it's clarity for function.**
