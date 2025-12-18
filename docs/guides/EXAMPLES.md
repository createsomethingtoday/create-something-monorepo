# Component Library Examples

This document provides complete, working examples of how to use the CREATE SOMETHING component library in real-world scenarios. Each example is production-ready and follows our standards.

## Table of Contents

1. [Landing Page](#landing-page)
2. [Article/Blog Page](#articleblog-page)
3. [About Page](#about-page)
4. [Contact Page](#contact-page)
5. [Error Page](#error-page)
6. [Dashboard/App Layout](#dashboardapp-layout)
7. [Component Composition Patterns](#component-composition-patterns)

---

## Landing Page

A complete landing page with hero section, features, and CTAs.

```svelte
<script lang="ts">
  import {
    Navigation,
    Footer,
    Button,
    Heading,
    Card
  } from '@create-something/components';
  import { page } from '$app/stores';
  import { fly, fade } from 'svelte/transition';

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];

  const features = [
    {
      title: 'Fast',
      description: 'Lightning-fast performance with edge computing.',
      icon: '⚡'
    },
    {
      title: 'Secure',
      description: 'Enterprise-grade security built in.',
      icon: '🔒'
    },
    {
      title: 'Scalable',
      description: 'Grows with your needs automatically.',
      icon: '📈'
    }
  ];

  const quickLinks = [
    { label: 'Documentation', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Support', href: '/support' }
  ];
</script>

<svelte:head>
  <title>CREATE SOMETHING - Build Better Software</title>
  <meta name="description" content="The modern platform for building exceptional digital products." />
</svelte:head>

<div class="min-h-screen bg-black text-white">
  <Navigation
    logo="CREATE SOMETHING"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel="Get Started"
    ctaHref="/signup"
  />

  <!-- Hero Section -->
  <section class="relative pt-32 pb-20 px-6">
    <div class="max-w-6xl mx-auto">
      <div
        in:fly={{ y: 20, duration: 600 }}
        class="text-center space-y-8"
      >
        <Heading level={1} class="text-white">
          Build Something<br />Exceptional
        </Heading>

        <p
          class="text-xl text-white/70 max-w-2xl mx-auto"
          in:fly={{ y: 20, duration: 600, delay: 100 }}
        >
          A modern platform for teams who refuse to compromise on quality.
          Fast, secure, and built for the future.
        </p>

        <div
          class="flex flex-col sm:flex-row gap-4 justify-center"
          in:fly={{ y: 20, duration: 600, delay: 200 }}
        >
          <Button href="/signup" size="lg">
            Start Building
          </Button>
          <Button href="/demo" variant="secondary" size="lg">
            Watch Demo
          </Button>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="py-20 px-6 border-t border-white/10">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <Heading level={2} class="text-white mb-4">
          Everything You Need
        </Heading>
        <p class="text-lg text-white/60">
          Built with care, designed for results.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        {#each features as feature, i}
          <div in:fly={{ y: 20, duration: 600, delay: i * 100 }}>
            <Card variant="ghost" class="h-full">
              <div class="text-5xl mb-4">{feature.icon}</div>
              <Heading level={3} class="text-white mb-2">
                {feature.title}
              </Heading>
              <p class="text-white/60">
                {feature.description}
              </p>
            </Card>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="py-20 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto text-center">
      <Heading level={2} class="text-white mb-6">
        Ready to Begin?
      </Heading>
      <p class="text-lg text-white/60 mb-8">
        Join thousands of teams building better software.
      </p>
      <Button href="/signup" size="lg">
        Get Started Free
      </Button>
    </div>
  </section>

  <Footer
    mode="ltd"
    showNewsletter={true}
    aboutText="CREATE SOMETHING helps teams build exceptional digital products."
    quickLinks={quickLinks}
    showSocial={true}
    showRamsQuote={true}
  />
</div>
```

---

## Article/Blog Page

A clean, readable article layout with proper typography hierarchy.

```svelte
<script lang="ts">
  import {
    Navigation,
    Footer,
    Button,
    Heading
  } from '@create-something/components';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';
  import { formatDate } from '$lib/utils';

  interface Props {
    data: {
      article: {
        title: string;
        description: string;
        author: string;
        publishedAt: string;
        readTime: string;
        content: string;
        tags: string[];
      };
    };
  }

  let { data }: Props = $props();
  const { article } = data;

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Articles', href: '/articles' },
    { label: 'Categories', href: '/categories' },
    { label: 'About', href: '/about' }
  ];

  const quickLinks = [
    { label: 'All Articles', href: '/articles' },
    { label: 'Subscribe', href: '#newsletter' },
    { label: 'RSS Feed', href: '/rss.xml' }
  ];
</script>

<svelte:head>
  <title>{article.title} | CREATE SOMETHING</title>
  <meta name="description" content={article.description} />
  <meta property="og:title" content={article.title} />
  <meta property="og:description" content={article.description} />
  <meta property="og:type" content="article" />
  <meta property="article:author" content={article.author} />
  <meta property="article:published_time" content={article.publishedAt} />
</svelte:head>

<div class="min-h-screen bg-black">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".io"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
  />

  <div class="pt-[72px]">
    <!-- Article Header -->
    <article class="py-20 px-6">
      <div class="max-w-3xl mx-auto">
        <header class="mb-12">
          <div
            in:fly={{ y: 20, duration: 600 }}
            class="space-y-6"
          >
            <!-- Tags -->
            <div class="flex flex-wrap gap-2">
              {#each article.tags as tag}
                <span class="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-md text-white/70">
                  {tag}
                </span>
              {/each}
            </div>

            <!-- Title -->
            <Heading level={1} class="text-white">
              {article.title}
            </Heading>

            <!-- Meta -->
            <div class="flex items-center gap-4 text-sm text-white/60">
              <span>{article.author}</span>
              <span>•</span>
              <time datetime={article.publishedAt}>
                {formatDate(article.publishedAt)}
              </time>
              <span>•</span>
              <span>{article.readTime} read</span>
            </div>

            <!-- Description -->
            <p class="text-xl text-white/70 leading-relaxed">
              {article.description}
            </p>
          </div>
        </header>

        <!-- Article Content -->
        <div
          class="prose prose-invert prose-lg max-w-none"
          in:fly={{ y: 20, duration: 600, delay: 100 }}
        >
          {@html article.content}
        </div>

        <!-- Article Footer -->
        <footer class="mt-16 pt-8 border-t border-white/10">
          <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <p class="text-white/60 mb-2">Written by</p>
              <p class="text-white font-medium">{article.author}</p>
            </div>
            <div class="flex gap-3">
              <Button href="/articles" variant="secondary" size="sm">
                ← More Articles
              </Button>
              <Button href="#newsletter" size="sm">
                Subscribe
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </article>

    <Footer
      mode="io"
      showNewsletter={true}
      aboutText="Deep dives into software engineering, AI, and building better products."
      quickLinks={quickLinks}
      showSocial={true}
    />
  </div>
</div>
```

---

## About Page

A professional about page with team grid and values.

```svelte
<script lang="ts">
  import {
    Navigation,
    Footer,
    Button,
    Heading,
    Card
  } from '@create-something/components';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Work', href: '/work' },
    { label: 'Contact', href: '/contact' }
  ];

  const values = [
    {
      title: 'Quality Over Speed',
      description: 'We take the time to do things right, not just fast.'
    },
    {
      title: 'Less, But Better',
      description: 'Following Rams\' principle of good design through restraint.'
    },
    {
      title: 'Open By Default',
      description: 'We share our work, methods, and learnings openly.'
    },
    {
      title: 'Human-Centered',
      description: 'Technology should serve people, not the other way around.'
    }
  ];

  const quickLinks = [
    { label: 'Our Work', href: '/work' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press Kit', href: '/press' }
  ];
</script>

<svelte:head>
  <title>About | CREATE SOMETHING</title>
  <meta name="description" content="We help teams build exceptional digital products through thoughtful engineering and design." />
</svelte:head>

<div class="min-h-screen bg-black">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".agency"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel="Work With Us"
    ctaHref="/contact"
  />

  <div class="pt-[72px]">
    <!-- Hero -->
    <section class="py-20 px-6">
      <div class="max-w-4xl mx-auto">
        <div in:fly={{ y: 20, duration: 600 }} class="space-y-6">
          <Heading level={1} class="text-white">
            Building Better,<br />Together
          </Heading>
          <p class="text-xl text-white/70 leading-relaxed">
            We're a small team of designers and engineers who believe that
            software should be thoughtful, accessible, and built to last.
          </p>
        </div>
      </div>
    </section>

    <!-- Mission -->
    <section class="py-20 px-6 border-t border-white/10">
      <div class="max-w-4xl mx-auto">
        <div in:fly={{ y: 20, duration: 600 }} class="space-y-8">
          <Heading level={2} class="text-white">
            Our Mission
          </Heading>
          <p class="text-lg text-white/70 leading-relaxed">
            In a world of bloated software and dark patterns, we're committed
            to building products that respect users' time, attention, and dignity.
            We believe in the power of constraints, the elegance of simplicity,
            and the importance of getting the details right.
          </p>
          <p class="text-lg text-white/70 leading-relaxed">
            Every project is an opportunity to demonstrate that quality and speed
            aren't mutually exclusive—they're complementary when you have the
            right process and principles.
          </p>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="py-20 px-6 border-t border-white/10">
      <div class="max-w-6xl mx-auto">
        <div class="mb-16">
          <Heading level={2} class="text-white mb-4">
            Our Values
          </Heading>
          <p class="text-lg text-white/60">
            The principles that guide our work.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          {#each values as value, i}
            <div in:fly={{ y: 20, duration: 600, delay: i * 100 }}>
              <Card variant="ghost" class="h-full">
                <Heading level={3} class="text-white mb-3">
                  {value.title}
                </Heading>
                <p class="text-white/60 leading-relaxed">
                  {value.description}
                </p>
              </Card>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6 border-t border-white/10">
      <div class="max-w-4xl mx-auto text-center">
        <Heading level={2} class="text-white mb-6">
          Let's Work Together
        </Heading>
        <p class="text-lg text-white/60 mb-8">
          Have a project in mind? We'd love to hear about it.
        </p>
        <Button href="/contact" size="lg">
          Get In Touch
        </Button>
      </div>
    </section>

    <Footer
      mode="agency"
      aboutText="A design and engineering studio building exceptional digital products."
      quickLinks={quickLinks}
      showSocial={true}
    />
  </div>
</div>
```

---

## Contact Page

A functional contact form with validation and proper accessibility.

```svelte
<script lang="ts">
  import {
    Navigation,
    Footer,
    Button,
    Heading
  } from '@create-something/components';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Work', href: '/work' },
    { label: 'Contact', href: '/contact' }
  ];

  let formData = $state({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  let errors = $state<Record<string, string>>({});
  let isSubmitting = $state(false);
  let submitSuccess = $state(false);

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!validateForm()) return;

    isSubmitting = true;

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        submitSuccess = true;
        formData = { name: '', email: '', company: '', message: '' };
      } else {
        errors.submit = 'Something went wrong. Please try again.';
      }
    } catch (error) {
      errors.submit = 'Failed to send message. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  const quickLinks = [
    { label: 'FAQ', href: '/faq' },
    { label: 'Support', href: '/support' },
    { label: 'Careers', href: '/careers' }
  ];
</script>

<svelte:head>
  <title>Contact | CREATE SOMETHING</title>
  <meta name="description" content="Get in touch with CREATE SOMETHING. We'd love to hear about your project." />
</svelte:head>

<div class="min-h-screen bg-black">
  <Navigation
    logo="CREATE SOMETHING"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
  />

  <div class="pt-[72px]">
    <section class="py-20 px-6">
      <div class="max-w-3xl mx-auto">
        <div in:fly={{ y: 20, duration: 600 }} class="mb-12">
          <Heading level={1} class="text-white mb-4">
            Let's Talk
          </Heading>
          <p class="text-xl text-white/70">
            Have a project in mind? We're here to help bring it to life.
          </p>
        </div>

        {#if submitSuccess}
          <div
            in:fly={{ y: 20, duration: 600 }}
            class="p-6 bg-green-500/10 border border-green-500/20 rounded-lg mb-8"
          >
            <Heading level={3} class="text-green-400 mb-2">
              Message Sent!
            </Heading>
            <p class="text-white/70">
              Thanks for reaching out. We'll get back to you within 24 hours.
            </p>
          </div>
        {/if}

        <form
          onsubmit={handleSubmit}
          class="space-y-6"
          in:fly={{ y: 20, duration: 600, delay: 100 }}
        >
          <!-- Name Field -->
          <div>
            <label for="name" class="block text-sm font-medium text-white mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              bind:value={formData.name}
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="John Smith"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {#if errors.name}
              <p id="name-error" class="mt-2 text-sm text-red-400">
                {errors.name}
              </p>
            {/if}
          </div>

          <!-- Email Field -->
          <div>
            <label for="email" class="block text-sm font-medium text-white mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              bind:value={formData.email}
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="john@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {#if errors.email}
              <p id="email-error" class="mt-2 text-sm text-red-400">
                {errors.email}
              </p>
            {/if}
          </div>

          <!-- Company Field (Optional) -->
          <div>
            <label for="company" class="block text-sm font-medium text-white mb-2">
              Company
            </label>
            <input
              type="text"
              id="company"
              bind:value={formData.company}
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="Acme Inc"
            />
          </div>

          <!-- Message Field -->
          <div>
            <label for="message" class="block text-sm font-medium text-white mb-2">
              Message *
            </label>
            <textarea
              id="message"
              bind:value={formData.message}
              rows="6"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="Tell us about your project..."
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
            ></textarea>
            {#if errors.message}
              <p id="message-error" class="mt-2 text-sm text-red-400">
                {errors.message}
              </p>
            {/if}
          </div>

          <!-- Submit Error -->
          {#if errors.submit}
            <div class="error-banner p-4">
              <p class="error-text">{errors.submit}</p>
            </div>
          {/if}

          <!--
            Canon-compliant error styling (in <style> block):
            .error-banner {
              background: var(--color-error-muted);
              border: 1px solid var(--color-error-border);
              border-radius: var(--radius-lg);
            }
            .error-text {
              color: var(--color-error);
              font-size: var(--text-body-sm);
            }
          -->

          <!-- Submit Button -->
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            class="w-full sm:w-auto"
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>

          <p class="text-sm text-white/50">
            * Required fields
          </p>
        </form>

        <!-- Alternative Contact Methods -->
        <div class="mt-16 pt-12 border-t border-white/10">
          <Heading level={3} class="text-white mb-6">
            Other Ways to Reach Us
          </Heading>
          <div class="space-y-4 text-white/70">
            <p>
              <strong class="text-white">Email:</strong>{' '}
              <a href="mailto:hello@createsomething.ltd" class="hover:text-white transition-colors">
                hello@createsomething.ltd
              </a>
            </p>
            <p>
              <strong class="text-white">Twitter:</strong>{' '}
              <a href="https://twitter.com/createsomething" class="hover:text-white transition-colors">
                @createsomething
              </a>
            </p>
            <p>
              <strong class="text-white">GitHub:</strong>{' '}
              <a href="https://github.com/createsomethingtoday" class="hover:text-white transition-colors">
                @createsomethingtoday
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>

    <Footer
      mode="ltd"
      aboutText="We help teams build exceptional digital products."
      quickLinks={quickLinks}
      showSocial={true}
    />
  </div>
</div>
```

---

## Error Page

A friendly 404 page with navigation options.

```svelte
<script lang="ts">
  import {
    Navigation,
    Footer,
    Button,
    Heading
  } from '@create-something/components';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];

  const suggestedLinks = [
    { label: 'Home', href: '/', description: 'Start from the beginning' },
    { label: 'About', href: '/about', description: 'Learn about us' },
    { label: 'Work', href: '/work', description: 'See our projects' },
    { label: 'Contact', href: '/contact', description: 'Get in touch' }
  ];
</script>

<svelte:head>
  <title>Page Not Found | CREATE SOMETHING</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-black flex flex-col">
  <Navigation
    logo="CREATE SOMETHING"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
  />

  <div class="flex-1 flex items-center justify-center px-6 pt-[72px]">
    <div class="max-w-2xl mx-auto text-center">
      <div in:fly={{ y: 20, duration: 600 }} class="space-y-8">
        <!-- Error Code -->
        <div class="text-8xl font-bold text-white/10">
          404
        </div>

        <!-- Message -->
        <div class="space-y-4">
          <Heading level={1} class="text-white">
            Page Not Found
          </Heading>
          <p class="text-xl text-white/60">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/" size="lg">
            Go Home
          </Button>
          <Button href="/contact" variant="secondary" size="lg">
            Contact Support
          </Button>
        </div>

        <!-- Suggested Links -->
        <div class="mt-16 pt-12 border-t border-white/10">
          <Heading level={3} class="text-white mb-6">
            Try These Instead
          </Heading>
          <div class="grid sm:grid-cols-2 gap-4">
            {#each suggestedLinks as link}
              <a
                href={link.href}
                class="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div class="text-white font-medium group-hover:underline mb-1">
                  {link.label}
                </div>
                <div class="text-sm text-white/60">
                  {link.description}
                </div>
              </a>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

  <Footer mode="ltd" />
</div>
```

---

## Dashboard/App Layout

A dashboard layout with sidebar navigation and content area.

```svelte
<script lang="ts">
  import {
    Navigation,
    Button,
    Heading,
    Card
  } from '@create-something/components';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/dashboard/projects' },
    { label: 'Settings', href: '/dashboard/settings' }
  ];

  const sidebarLinks = [
    { label: 'Overview', href: '/dashboard', icon: '📊' },
    { label: 'Projects', href: '/dashboard/projects', icon: '📁' },
    { label: 'Team', href: '/dashboard/team', icon: '👥' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' }
  ];

  const stats = [
    { label: 'Total Projects', value: '24' },
    { label: 'Active Users', value: '1,429' },
    { label: 'This Month', value: '+18%' },
    { label: 'Response Time', value: '124ms' }
  ];

  let sidebarOpen = $state(false);
</script>

<svelte:head>
  <title>Dashboard | CREATE SOMETHING</title>
</svelte:head>

<div class="min-h-screen bg-black">
  <Navigation
    logo="CREATE SOMETHING"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
  />

  <div class="pt-[72px]">
    <div class="flex">
      <!-- Sidebar -->
      <aside class="hidden lg:block w-64 min-h-[calc(100vh-72px)] border-r border-white/10 bg-white/[0.02]">
        <nav class="p-6 space-y-2">
          {#each sidebarLinks as link}
            <a
              href={link.href}
              class="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all {$page.url.pathname === link.href ? 'bg-white/10 text-white' : ''}"
            >
              <span class="text-xl">{link.icon}</span>
              <span>{link.label}</span>
            </a>
          {/each}
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-6 lg:p-10">
        <div class="max-w-6xl mx-auto">
          <!-- Page Header -->
          <div class="mb-10">
            <div class="flex items-center justify-between mb-2">
              <Heading level={1} class="text-white">
                Dashboard
              </Heading>
              <Button href="/dashboard/new">
                New Project
              </Button>
            </div>
            <p class="text-white/60">
              Welcome back! Here's what's happening with your projects.
            </p>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {#each stats as stat, i}
              <div in:fly={{ y: 20, duration: 600, delay: i * 50 }}>
                <Card variant="subtle">
                  <div class="text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div class="text-sm text-white/60">
                    {stat.label}
                  </div>
                </Card>
              </div>
            {/each}
          </div>

          <!-- Recent Activity -->
          <div in:fly={{ y: 20, duration: 600, delay: 200 }}>
            <Card>
              <div class="flex items-center justify-between mb-6">
                <Heading level={2} class="text-white">
                  Recent Activity
                </Heading>
                <Button variant="ghost" size="sm" href="/dashboard/activity">
                  View All
                </Button>
              </div>

              <div class="space-y-4">
                {#each Array(5) as _, i}
                  <div class="flex items-start gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
                    <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span class="text-lg">📝</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-white font-medium mb-1">
                        Project updated
                      </p>
                      <p class="text-sm text-white/60">
                        Changes pushed to production
                      </p>
                    </div>
                    <time class="text-sm text-white/40 whitespace-nowrap">
                      {i + 1}h ago
                    </time>
                  </div>
                {/each}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  </div>
</div>
```

---

## Component Composition Patterns

### Pattern 1: Hero with Multiple CTAs

```svelte
<section class="py-20 px-6">
  <div class="max-w-4xl mx-auto text-center space-y-8">
    <Heading level={1} class="text-white">
      Your Headline Here
    </Heading>

    <p class="text-xl text-white/70 max-w-2xl mx-auto">
      Supporting description that provides context and value proposition.
    </p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <Button href="/signup" size="lg">
        Primary Action
      </Button>
      <Button href="/learn-more" variant="secondary" size="lg">
        Secondary Action
      </Button>
      <Button href="/docs" variant="ghost" size="lg">
        Tertiary Action
      </Button>
    </div>
  </div>
</section>
```

### Pattern 2: Feature Grid with Cards

```svelte
<section class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <Heading level={2} class="text-white mb-4">
        Features
      </Heading>
      <p class="text-lg text-white/60">
        Everything you need to succeed.
      </p>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      {#each features as feature}
        <Card
          variant="ghost"
          onclick={() => handleFeatureClick(feature.id)}
          class="cursor-pointer"
        >
          <div class="text-4xl mb-4">{feature.icon}</div>
          <Heading level={3} class="text-white mb-2">
            {feature.title}
          </Heading>
          <p class="text-white/60">
            {feature.description}
          </p>
        </Card>
      {/each}
    </div>
  </div>
</section>
```

### Pattern 3: Content with Sidebar

```svelte
<div class="max-w-6xl mx-auto px-6 py-20">
  <div class="grid lg:grid-cols-[1fr_300px] gap-12">
    <!-- Main Content -->
    <article class="prose prose-invert prose-lg">
      <Heading level={1} class="text-white">
        Article Title
      </Heading>
      <!-- Content here -->
    </article>

    <!-- Sidebar -->
    <aside class="space-y-6">
      <Card variant="subtle">
        <Heading level={4} class="text-white mb-4">
          Quick Links
        </Heading>
        <nav class="space-y-2">
          {#each links as link}
            <a
              href={link.href}
              class="block text-white/70 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          {/each}
        </nav>
      </Card>

      <Card variant="subtle">
        <Heading level={4} class="text-white mb-4">
          Newsletter
        </Heading>
        <p class="text-white/60 text-sm mb-4">
          Get updates delivered to your inbox.
        </p>
        <Button href="#newsletter" size="sm" class="w-full">
          Subscribe
        </Button>
      </Card>
    </aside>
  </div>
</div>
```

### Pattern 4: Testimonial Carousel

```svelte
<section class="py-20 px-6 bg-white/[0.02]">
  <div class="max-w-4xl mx-auto">
    <Heading level={2} class="text-white text-center mb-12">
      What People Say
    </Heading>

    <Card class="text-center">
      <blockquote class="text-xl text-white/80 italic mb-6">
        "{testimonials[currentIndex].quote}"
      </blockquote>
      <cite class="text-white font-medium not-italic">
        {testimonials[currentIndex].author}
      </cite>
      <p class="text-white/60 text-sm">
        {testimonials[currentIndex].role}
      </p>

      <div class="flex gap-2 justify-center mt-8">
        {#each testimonials as _, i}
          <button
            onclick={() => currentIndex = i}
            class="w-2 h-2 rounded-full transition-colors {i === currentIndex ? 'bg-white' : 'bg-white/30'}"
            aria-label={`Go to testimonial ${i + 1}`}
          />
        {/each}
      </div>
    </Card>
  </div>
</section>
```

### Pattern 5: Pricing Table

```svelte
<section class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <Heading level={2} class="text-white mb-4">
        Simple, Transparent Pricing
      </Heading>
      <p class="text-lg text-white/60">
        Choose the plan that's right for you.
      </p>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      {#each plans as plan}
        <Card
          variant={plan.featured ? 'default' : 'subtle'}
          class="relative"
        >
          {#if plan.featured}
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span class="px-4 py-1 bg-white text-black text-sm font-medium rounded-full">
                Popular
              </span>
            </div>
          {/if}

          <Heading level={3} class="text-white mb-2">
            {plan.name}
          </Heading>

          <div class="mb-6">
            <span class="text-5xl font-bold text-white">
              ${plan.price}
            </span>
            <span class="text-white/60">/month</span>
          </div>

          <ul class="space-y-3 mb-8">
            {#each plan.features as feature}
              <li class="flex items-start gap-2 text-white/70">
                <span class="text-green-400 mt-0.5">✓</span>
                <span>{feature}</span>
              </li>
            {/each}
          </ul>

          <Button
            href={plan.ctaHref}
            variant={plan.featured ? 'primary' : 'secondary'}
            size="lg"
            class="w-full"
          >
            {plan.ctaLabel}
          </Button>
        </Card>
      {/each}
    </div>
  </div>
</section>
```

---

## Usage Notes

### Importing Components

```typescript
import {
  Navigation,
  Footer,
  Button,
  Heading,
  Card
} from '@create-something/components';
```

### Using Design Tokens

```typescript
import { spacing, radius, animation, zIndex } from '@create-something/components/utils';

// In your styles
const cardStyle = {
  padding: spacing.md,
  borderRadius: radius.lg,
  transitionDuration: animation.duration.standard
};
```

### Responsive Patterns

All examples use Tailwind's responsive utilities:
- `sm:` - 640px+
- `md:` - 768px+
- `lg:` - 1024px+
- `xl:` - 1280px+

### Accessibility Checklist

Every example includes:
- ✅ Proper heading hierarchy
- ✅ 44px minimum touch targets
- ✅ ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Focus states
- ✅ Screen reader friendly markup

---

## Next Steps

1. Copy the example that best matches your needs
2. Customize content and styling
3. Test on mobile and desktop
4. Verify accessibility with a screen reader
5. Deploy with confidence

For more details, see:
- [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) - Full component API
- [STANDARDS.md](./STANDARDS.md) - Design standards
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration instructions
