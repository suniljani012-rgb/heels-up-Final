// src/utils/seo-renderer.js - Server-Side SEO & Schema Markup Injection for Cloudflare Workers

export const BASE_URL = 'https://heelsup.in';
export const BRAND_NAME = 'HeelsUp';
export const DEFAULT_IMAGE = 'https://heelsup.in/logo.webp';
export const INSTAGRAM_URL = 'https://www.instagram.com/heel_s_up/';
export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/7Vu3wkdbBczbQw8aA';

// Standard FAQ Data for Schema Markup
export const GLOBAL_FAQS = [
  {
    question: "Does HeelsUp offer cash on delivery (COD)?",
    answer: "Yes, HeelsUp offers cash on delivery (COD) on all orders across India."
  },
  {
    question: "What is HeelsUp's return and exchange policy?",
    answer: "HeelsUp offers an easy 7-day hassle-free exchange policy on all footwear and handbag purchases."
  },
  {
    question: "What are the shipping charges?",
    answer: "HeelsUp provides FREE shipping across India on all orders above ₹1599. Orders below ₹1599 have standard express shipping."
  },
  {
    question: "Where are HeelsUp products manufactured?",
    answer: "HeelsUp footwear is handcrafted by master artisans in Jodhpur, Rajasthan using premium materials."
  }
];

export const CATEGORY_SEO_DATA = {
  '/': {
    title: "Buy Heels & Heel Online India | #1 Ladies Footwear Store | HeelsUp",
    description: "Shop India's #1 collection of heels & heel footwear online at HeelsUp. Discover luxury block heels, stiletto heels, pencil heels, bridal heels, platform heels & sandals with free delivery across India, cash on delivery (COD) & easy 7-day exchanges.",
    canonical: `${BASE_URL}/`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/shop': {
    title: "Buy Luxury Heels & Ladies Footwear Online India | HeelsUp",
    description: "Explore the complete collection of luxury ladies heels, flats, sandals, wedges, and designer handbags online at HeelsUp. Free shipping above ₹1599, COD available, 7-day easy exchange.",
    canonical: `${BASE_URL}/shop`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/heels': {
    title: "Buy Luxury Heels Online India | Designer High Heels | HeelsUp",
    description: "Shop premium heels online for women in India. Explore block heels, stilettos, pencil heels, kitten heels, and bridal heels with COD and 7-day exchange.",
    canonical: `${BASE_URL}/heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/heels/block-heels': {
    title: "Buy Block Heels Online India | Comfortable & Stylish | HeelsUp",
    description: "Shop the latest block heels online at HeelsUp. Comfortable, stylish designs for office, party & daily wear. Free delivery above ₹1599, COD available, 7-day easy exchange.",
    canonical: `${BASE_URL}/heels/block-heels`,
    image: `${BASE_URL}/categories/block-heels.webp`,
    ogType: "website",
    categoryName: "Block Heels"
  },
  '/block-heels': {
    title: "Buy Block Heels Online India | Comfortable & Stylish | HeelsUp",
    description: "Shop the latest block heels online at HeelsUp. Comfortable, stylish designs for office, party & daily wear. Free delivery above ₹1599, COD available, 7-day easy exchange.",
    canonical: `${BASE_URL}/heels/block-heels`,
    image: `${BASE_URL}/categories/block-heels.webp`,
    ogType: "website",
    categoryName: "Block Heels"
  },
  '/heels/stiletto-heels': {
    title: "Buy Stiletto Heels Online India | Party & Wedding Wear | HeelsUp",
    description: "Discover elegant, head-turning stiletto heels online at HeelsUp. Perfect for weddings, parties, and night outs. Free shipping across India, COD available.",
    canonical: `${BASE_URL}/heels/stiletto-heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Stiletto Heels"
  },
  '/stilettos': {
    title: "Buy Stiletto Heels Online India | Party & Wedding Wear | HeelsUp",
    description: "Discover elegant, head-turning stiletto heels online at HeelsUp. Perfect for weddings, parties, and night outs. Free shipping across India, COD available.",
    canonical: `${BASE_URL}/heels/stiletto-heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Stiletto Heels"
  },
  '/heels/pencil-heels': {
    title: "Buy Designer Pencil Heels Online India | Chic High Heels | HeelsUp",
    description: "Elevate your elegance with designer pencil heels from HeelsUp. Handcrafted comfort with sleek, sophisticated silhouettes. Easy 7-day exchanges and COD.",
    canonical: `${BASE_URL}/heels/pencil-heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Pencil Heels"
  },
  '/pencil-heels': {
    title: "Buy Designer Pencil Heels Online India | Chic High Heels | HeelsUp",
    description: "Elevate your elegance with designer pencil heels from HeelsUp. Handcrafted comfort with sleek, sophisticated silhouettes. Easy 7-day exchanges and COD.",
    canonical: `${BASE_URL}/heels/pencil-heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Pencil Heels"
  },
  '/heels/bridal-heels': {
    title: "Buy Luxury Bridal Heels Online India | Wedding Footwear | HeelsUp",
    description: "Shop exquisite bridal heels and wedding shoes for brides and bridesmaids. Sparkling crystals, cushioned footbeds & handcrafted perfection. Free shipping India.",
    canonical: `${BASE_URL}/heels/bridal-heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Bridal Heels"
  },
  '/bridal-heels': {
    title: "Buy Luxury Bridal Heels Online India | Wedding Footwear | HeelsUp",
    description: "Shop exquisite bridal heels and wedding shoes for brides and bridesmaids. Sparkling crystals, cushioned footbeds & handcrafted perfection. Free shipping India.",
    canonical: `${BASE_URL}/heels/bridal-heels`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Bridal Heels"
  },
  '/heels/wedges': {
    title: "Buy Platform Wedges & Wedge Heels Online India | HeelsUp",
    description: "Shop comfortable, trendy wedge heels and platform sandals at HeelsUp. All-day arch support and chic modern designs with COD and easy exchanges.",
    canonical: `${BASE_URL}/heels/wedges`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Wedges"
  },
  '/wedges': {
    title: "Buy Platform Wedges & Wedge Heels Online India | HeelsUp",
    description: "Shop comfortable, trendy wedge heels and platform sandals at HeelsUp. All-day arch support and chic modern designs with COD and easy exchanges.",
    canonical: `${BASE_URL}/heels/wedges`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Wedges"
  },
  '/flats': {
    title: "Buy Designer Flat Sandals & Slides Online India | HeelsUp",
    description: "Discover handcrafted luxury flat sandals, slides, and slip-ons for women. Effortless daily elegance made in Jodhpur. Free shipping on orders above ₹1599.",
    canonical: `${BASE_URL}/flats`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Flats"
  },
  '/bags': {
    title: "Buy Luxury Women's Handbags & Clutches Online India | HeelsUp",
    description: "Shop premium designer handbags, shoulder bags, and party clutches for women at HeelsUp. Beautiful textures and spacious luxury styling.",
    canonical: `${BASE_URL}/bags`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website",
    categoryName: "Bags"
  },
  '/about': {
    title: "About HeelsUp | Handcrafted Luxury Footwear in Jodhpur, India",
    description: "Learn about HeelsUp — our heritage, artisanal craftsmanship, and commitment to delivering the most comfortable luxury heels in India.",
    canonical: `${BASE_URL}/about`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/contact': {
    title: "Contact HeelsUp Customer Care | Support & Order Help",
    description: "Get in touch with HeelsUp customer care for order tracking, size advice, returns, and support. Available via WhatsApp and Email.",
    canonical: `${BASE_URL}/contact`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/shipping-info': {
    title: "Shipping & Delivery Policy | Fast Pan-India Delivery | HeelsUp",
    description: "Read HeelsUp shipping information. Free delivery on orders above ₹1599, trusted courier partners (Delhivery, BlueDart, DTDC), and 3-5 day delivery.",
    canonical: `${BASE_URL}/shipping-info`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/returns': {
    title: "7-Day Easy Return & Exchange Policy | HeelsUp India",
    description: "Learn about HeelsUp's simple 7-day exchange and return policy. Hassle-free size replacement and direct doorstep reverse pickup.",
    canonical: `${BASE_URL}/returns`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/privacy': {
    title: "Privacy Policy | HeelsUp India",
    description: "Read HeelsUp's privacy policy and data security standards.",
    canonical: `${BASE_URL}/privacy`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  },
  '/terms': {
    title: "Terms & Conditions | HeelsUp India",
    description: "Terms and conditions for purchasing on HeelsUp.",
    canonical: `${BASE_URL}/terms`,
    image: `${BASE_URL}/logo.webp`,
    ogType: "website"
  }
};

// Check if route should be noindex
export function isNoIndexRoute(pathname) {
  const clean = pathname.replace(/\/$/, '');
  return (
    clean === '/cart' ||
    clean === '/checkout' ||
    clean === '/orders' ||
    clean === '/profile' ||
    clean === '/login' ||
    clean === '/register' ||
    clean === '/forgot-password' ||
    clean === '/reset-password' ||
    clean.startsWith('/admin')
  );
}

// Generate Organization & LocalBusiness Schema
export function generateSiteSchemas() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": BRAND_NAME,
    "url": `${BASE_URL}/`,
    "logo": `${BASE_URL}/logo.webp`,
    "sameAs": [
      INSTAGRAM_URL,
      GOOGLE_MAPS_URL
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi"]
    }
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ShoeStore",
    "name": BRAND_NAME,
    "image": `${BASE_URL}/logo.webp`,
    "url": `${BASE_URL}/`,
    "priceRange": "₹₹",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Jodhpur",
      "addressRegion": "Rajasthan",
      "addressCountry": "IN"
    },
    "sameAs": [
      INSTAGRAM_URL,
      GOOGLE_MAPS_URL
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": BRAND_NAME,
    "alternateName": ["Heels Up", "HeelsUp India", "Heels Up Store"],
    "url": `${BASE_URL}/`,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${BASE_URL}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return [orgSchema, localBusinessSchema, websiteSchema];
}

// Generate Product Schema
export function generateProductSchema(product, categorySlug, productSlug) {
  const images = [];
  if (product.image_url) images.push(product.image_url.startsWith('http') ? product.image_url : `${BASE_URL}${product.image_url}`);
  if (product.images_json) {
    try {
      const extra = JSON.parse(product.images_json);
      if (Array.isArray(extra)) {
        extra.forEach(img => {
          const url = typeof img === 'string' ? img : img.url;
          if (url && !images.includes(url)) {
            images.push(url.startsWith('http') ? url : `${BASE_URL}${url}`);
          }
        });
      }
    } catch (_) {}
  }
  if (images.length === 0) images.push(`${BASE_URL}/logo.webp`);

  const price = (product.price || 0) / 100;
  const canonicalUrl = `${BASE_URL}/heels/${categorySlug || 'footwear'}/${productSlug || product.id}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": images,
    "description": product.description || `Buy ${product.name} handcrafted luxury heels online at HeelsUp with free shipping across India.`,
    "sku": product.sku || `HU-${product.id}`,
    "brand": {
      "@type": "Brand",
      "name": BRAND_NAME
    },
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": "INR",
      "price": price.toFixed(2),
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": BRAND_NAME
      }
    }
  };

  // Only add aggregateRating if genuine reviews exist
  if (product.rating && product.rating > 0 && product.review_count && product.review_count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": product.rating.toString(),
      "reviewCount": product.review_count.toString()
    };
  }

  return schema;
}

// Generate BreadcrumbList Schema
export function generateBreadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

// Generate FAQPage Schema
export function generateFaqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// Main HTML Transformer function using Cloudflare HTMLRewriter
export async function transformHtmlWithSeo(response, request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  // 1. Check if NoIndex route (cart/checkout/admin)
  if (isNoIndexRoute(pathname)) {
    const rewriter = new HTMLRewriter()
      .on('meta[name="robots"]', {
        element(el) {
          el.setAttribute('content', 'noindex, nofollow');
        }
      })
      .on('title', {
        element(el) {
          el.setInnerContent(`Checkout & Cart | ${BRAND_NAME}`);
        }
      });
    return rewriter.transform(response);
  }

  // 2. Product Route Handling (/product/:id or /heels/:category/:product)
  let product = null;
  let categorySlug = 'footwear';
  let productSlug = '';

  const productMatch = pathname.match(/^\/product\/(\d+)/);
  const deepProductMatch = pathname.match(/^\/heels\/([^\/]+)\/([^\/]+)/);

  if (productMatch && env.DB) {
    const productId = productMatch[1];
    try {
      product = await env.DB.prepare('SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').bind(productId).first();
      if (product) {
        categorySlug = product.category_slug || (product.category_name ? product.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'footwear');
        productSlug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
    } catch (e) {
      console.warn('Product DB lookup error:', e);
    }
  } else if (deepProductMatch && env.DB) {
    categorySlug = deepProductMatch[1];
    productSlug = deepProductMatch[2];
    try {
      product = await env.DB.prepare('SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? OR p.id = ?').bind(productSlug, productSlug).first();
    } catch (e) {
      console.warn('Deep product DB lookup error:', e);
    }
  }

  // 3. Product Page SEO Transformation
  if (product) {
    const priceFormatted = ((product.price || 0) / 100).toLocaleString('en-IN');
    const title = `${product.name} | Buy Online at ₹${priceFormatted} | ${BRAND_NAME}`;
    const description = `Buy ${product.name} online at ${BRAND_NAME} for ₹${priceFormatted}. ${product.description ? product.description.slice(0, 120) : 'Handcrafted luxury ladies footwear.'} Free delivery above ₹1599, COD available, 7-day easy exchange.`;
    const canonical = `${BASE_URL}/heels/${categorySlug}/${productSlug || product.id}`;
    const imgUrl = product.image_url ? (product.image_url.startsWith('http') ? product.image_url : `${BASE_URL}${product.image_url}`) : DEFAULT_IMAGE;

    const productSchema = generateProductSchema(product, categorySlug, productSlug);
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: `${BASE_URL}/` },
      { name: product.category_name || "Heels", url: `${BASE_URL}/heels/${categorySlug}` },
      { name: product.name, url: canonical }
    ]);
    const siteSchemas = generateSiteSchemas();

    const allSchemas = [...siteSchemas, productSchema, breadcrumbSchema];

    const rewriter = new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', { element(el) { el.setAttribute('content', description); } })
      .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', canonical); } })
      .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', title); } })
      .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', description); } })
      .on('meta[property="og:image"]', { element(el) { el.setAttribute('content', imgUrl); } })
      .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', canonical); } })
      .on('meta[property="og:type"]', { element(el) { el.setAttribute('content', 'product'); } })
      .on('meta[name="twitter:title"]', { element(el) { el.setAttribute('content', title); } })
      .on('meta[name="twitter:description"]', { element(el) { el.setAttribute('content', description); } })
      .on('meta[name="twitter:image"]', { element(el) { el.setAttribute('content', imgUrl); } })
      .on('head', {
        element(el) {
          el.append(`<script type="application/ld+json">${JSON.stringify(allSchemas)}</script>`, { html: true });
        }
      });

    return rewriter.transform(response);
  }

  // 4. Category or Static Route Handling
  const catData = CATEGORY_SEO_DATA[pathname] || {
    title: `${pathname.slice(1).replace(/[-/]/g, ' ').toUpperCase()} | Buy Online | ${BRAND_NAME}`,
    description: "Shop luxury handcrafted women's heels, sandals, flats, wedges & designer handbags online at HeelsUp with cash on delivery & free delivery across India.",
    canonical: `${BASE_URL}${pathname}`,
    image: DEFAULT_IMAGE,
    ogType: "website"
  };

  const schemasToInject = [...generateSiteSchemas()];

  // Breadcrumbs for Category Pages
  if (pathname !== '/') {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: "Home", url: `${BASE_URL}/` }];
    let accPath = '';
    segments.forEach(seg => {
      accPath += `/${seg}`;
      breadcrumbs.push({
        name: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        url: `${BASE_URL}${accPath}`
      });
    });
    schemasToInject.push(generateBreadcrumbSchema(breadcrumbs));
  }

  // Category or FAQ Schema
  if (pathname === '/' || pathname.includes('heels') || pathname === '/shop' || pathname === '/flats' || pathname === '/bags' || pathname === '/shipping-info' || pathname === '/returns') {
    schemasToInject.push(generateFaqSchema(GLOBAL_FAQS));
  }

  const rewriter = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(catData.title); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', catData.description); } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', catData.canonical); } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', catData.title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', catData.description); } })
    .on('meta[property="og:image"]', { element(el) { el.setAttribute('content', catData.image); } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', catData.canonical); } })
    .on('meta[property="og:type"]', { element(el) { el.setAttribute('content', catData.ogType || 'website'); } })
    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute('content', catData.title); } })
    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute('content', catData.description); } })
    .on('meta[name="twitter:image"]', { element(el) { el.setAttribute('content', catData.image); } })
    .on('head', {
      element(el) {
        el.append(`<script type="application/ld+json">${JSON.stringify(schemasToInject)}</script>`, { html: true });
      }
    });

  return rewriter.transform(response);
}
