import { ae as fallback, a9 as head, ab as bind_props, a6 as escape_html, a4 as attr, aa as ensure_array_like } from "./index.js";
function SEO($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let title = $$props["title"];
    let description = $$props["description"];
    let keywords = fallback($$props["keywords"], "");
    let canonical = fallback($$props["canonical"], "");
    let ogImage = fallback($$props["ogImage"], "/og-image.png");
    let ogType = fallback($$props["ogType"], "website");
    let twitterCard = fallback($$props["twitterCard"], "summary_large_image");
    let author = fallback($$props["author"], "Create Something");
    let publishedTime = fallback($$props["publishedTime"], "");
    let modifiedTime = fallback($$props["modifiedTime"], "");
    let articleSection = fallback($$props["articleSection"], "");
    let articleTags = fallback($$props["articleTags"], () => [], true);
    let noindex = fallback($$props["noindex"], false);
    let nofollow = fallback($$props["nofollow"], false);
    let services = fallback($$props["services"], () => [], true);
    let faqItems = fallback($$props["faqItems"], () => [], true);
    let breadcrumbs = fallback($$props["breadcrumbs"], () => [], true);
    let reviews = fallback($$props["reviews"], () => [], true);
    let video = fallback(
      $$props["video"],
      null
      // VideoObject schema for video content
    );
    let course = fallback(
      $$props["course"],
      null
      // Course schema for educational content
    );
    let propertyName = fallback($$props["propertyName"], "space");
    const propertyConfig = {
      io: {
        domain: "https://createsomething.io",
        name: "CREATE SOMETHING",
        tagline: "Systems Thinking for AI-Native Development - Research papers with tracked experiments and rigorous methodology",
        color: "#000000"
      },
      space: {
        domain: "https://createsomething.space",
        name: "CREATE SOMETHING SPACE",
        tagline: "Interactive Tutorials for AI-Native Development - Learn by doing with runnable code examples",
        color: "#000000"
      },
      agency: {
        domain: "https://createsomething.agency",
        name: "CREATE SOMETHING Agency",
        tagline: "Custom MCP Development - Connect your tools to AI with fast turnaround and fixed pricing",
        color: "#000000"
      },
      ltd: {
        domain: "https://createsomething.ltd",
        name: "CREATE SOMETHING",
        tagline: "Weniger, aber besser",
        color: "#000000"
      }
    };
    const config = propertyConfig[propertyName];
    const fullTitle = title ? `${title} | ${config.name}` : config.name;
    const fullDescription = description || config.tagline;
    const canonicalUrl = canonical || `${config.domain}${typeof window !== "undefined" ? window.location.pathname : ""}`;
    const fullOgImage = ogImage.startsWith("http") ? ogImage : `${config.domain}${ogImage}`;
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CREATE SOMETHING",
      alternateName: "Create Something Agency",
      url: config.domain,
      logo: `${config.domain}/favicon.png`,
      sameAs: [
        "https://www.linkedin.com/in/micahryanjohnson/",
        "https://github.com/createsomethingtoday"
      ],
      description: propertyName === "agency" ? "Custom MCP server development connecting your existing tools to AI. Fast turnaround, fixed pricing, production-ready deployment." : propertyName === "io" ? "Research papers on AI-native development with tracked experiments and rigorous methodology" : propertyName === "space" ? "Interactive tutorials for learning AI-native development by doing" : "Design and technology practice",
      founder: {
        "@type": "Person",
        name: "Micah Johnson",
        jobTitle: "MCP Developer",
        sameAs: "https://www.linkedin.com/in/micahryanjohnson/"
      },
      knowsAbout: [
        "Model Context Protocol (MCP)",
        "MCP Server Development",
        "AI Integration",
        "Claude Desktop",
        "Cursor IDE",
        "API Integration",
        "OAuth Authentication",
        "Cloudflare Workers",
        "TypeScript",
        "AI Automation"
      ],
      areaServed: { "@type": "Place", name: "Worldwide" }
    };
    ({
      name: config.name,
      url: config.domain,
      description: config.tagline
    });
    const articleSchema = ogType === "article" ? {
      keywords: articleTags.join(", ")
    } : null;
    const serviceSchemas = services.length > 0 ? services.map((service) => ({
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      description: service.description,
      provider: organizationSchema,
      serviceType: service.type || "Professional Service",
      areaServed: { "@type": "Place", name: "Worldwide" },
      ...service.price && {
        offers: {
          "@type": "Offer",
          price: service.price,
          priceCurrency: "USD",
          description: service.priceDescription
        }
      }
    })) : [];
    const faqSchema = faqItems.length > 0 ? {
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer }
      }))
    } : null;
    const breadcrumbSchema = breadcrumbs.length > 0 ? {
      itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    } : null;
    const aggregateRatingSchema = reviews.length > 0 ? {
      aggregateRating: {
        ratingValue: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
        reviewCount: reviews.length
      },
      review: reviews.map((review) => ({
        "@type": "Review",
        author: { "@type": "Person", name: review.author },
        datePublished: review.date,
        reviewBody: review.content,
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1
        }
      }))
    } : null;
    const videoSchema = video ? {
      name: video.name || title,
      description: video.description || description,
      thumbnailUrl: video.thumbnail || fullOgImage,
      uploadDate: video.uploadDate,
      duration: video.duration,
      // ISO 8601 format (e.g., "PT1M30S")
      contentUrl: video.contentUrl,
      embedUrl: video.embedUrl,
      ...video.transcript && { transcript: video.transcript }
    } : null;
    const courseSchema = course ? {
      name: course.name || title,
      description: course.description || description,
      provider: {
        name: config.name,
        url: config.domain
      },
      ...course.instructor && { instructor: { "@type": "Person", name: course.instructor } },
      ...course.datePublished && { datePublished: course.datePublished },
      ...course.hasCourseInstance && {
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: course.hasCourseInstance.courseMode || "online",
          ...course.hasCourseInstance.startDate && { startDate: course.hasCourseInstance.startDate },
          ...course.hasCourseInstance.endDate && { endDate: course.hasCourseInstance.endDate }
        }
      }
    } : null;
    const robotsContent = [
      noindex ? "noindex" : "index",
      nofollow ? "nofollow" : "follow"
    ].join(", ");
    head("ijwlum", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(fullTitle)}</title>`);
      });
      $$renderer3.push(`<meta name="title"${attr("content", fullTitle)}/> <meta name="description"${attr("content", fullDescription)}/> `);
      if (keywords) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta name="keywords"${attr("content", keywords)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <meta name="robots"${attr("content", robotsContent)}/> <meta name="author"${attr("content", author)}/> <meta name="theme-color"${attr("content", config.color)}/> <link rel="canonical"${attr("href", canonicalUrl)}/> <meta property="og:type"${attr("content", ogType)}/> <meta property="og:url"${attr("content", canonicalUrl)}/> <meta property="og:title"${attr("content", fullTitle)}/> <meta property="og:description"${attr("content", fullDescription)}/> <meta property="og:image"${attr("content", fullOgImage)}/> <meta property="og:site_name"${attr("content", config.name)}/> `);
      if (ogType === "article") {
        $$renderer3.push("<!--[-->");
        if (publishedTime) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<meta property="article:published_time"${attr("content", publishedTime)}/>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (modifiedTime) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<meta property="article:modified_time"${attr("content", modifiedTime)}/>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (articleSection) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<meta property="article:section"${attr("content", articleSection)}/>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> <!--[-->`);
        const each_array = ensure_array_like(articleTags);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let tag = each_array[$$index];
          $$renderer3.push(`<meta property="article:tag"${attr("content", tag)}/>`);
        }
        $$renderer3.push(`<!--]-->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <meta property="twitter:card"${attr("content", twitterCard)}/> <meta property="twitter:url"${attr("content", canonicalUrl)}/> <meta property="twitter:title"${attr("content", fullTitle)}/> <meta property="twitter:description"${attr("content", fullDescription)}/> <meta property="twitter:image"${attr("content", fullOgImage)}/> <script type="application/ld+json">
    {JSON.stringify(organizationSchema)}
  <\/script> <script type="application/ld+json">
    {JSON.stringify(websiteSchema)}
  <\/script> `);
      if (articleSchema) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(articleSchema)}
    <\/script><!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <!--[-->`);
      const each_array_1 = ensure_array_like(serviceSchemas);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        each_array_1[$$index_1];
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(serviceSchema)}
    <\/script><!---->`);
      }
      $$renderer3.push(`<!--]--> `);
      if (faqSchema) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(faqSchema)}
    <\/script><!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (breadcrumbSchema) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(breadcrumbSchema)}
    <\/script><!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (aggregateRatingSchema) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(aggregateRatingSchema)}
    <\/script><!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (videoSchema) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(videoSchema)}
    <\/script><!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (courseSchema) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<script type="application/ld+json">
      {JSON.stringify(courseSchema)}
    <\/script><!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <link rel="icon" href="/favicon.png" type="image/png"/> <link rel="apple-touch-icon" href="/favicon.png"/> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <meta name="format-detection" content="telephone=no"/> <meta http-equiv="x-ua-compatible" content="IE=edge"/>`);
    });
    bind_props($$props, {
      title,
      description,
      keywords,
      canonical,
      ogImage,
      ogType,
      twitterCard,
      author,
      publishedTime,
      modifiedTime,
      articleSection,
      articleTags,
      noindex,
      nofollow,
      services,
      faqItems,
      breadcrumbs,
      reviews,
      video,
      course,
      propertyName
    });
  });
}
export {
  SEO as S
};
