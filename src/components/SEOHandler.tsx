import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO_MAP: Record<string, { title: string; description: string; keywords: string }> = {
  '/': {
    title: 'Agility Travels | Premium Umrah & Corporate Tours',
    description: 'Book customized Umrah, Haj, and Expo tour packages with Agility Travels. Enjoy premium travel guidance today! Explore our packages now.',
    keywords: 'Umrah packages, Haj tour, Corporate Expo, adventure travel Pakistan, Agility Travels, premium pilgrimage, luxury travels Makkah Madinah'
  },
  '/packages/umrah': {
    title: 'Premium Umrah Packages 2026 | Agility Travels',
    description: 'Book luxury group Umrah packages with 5-star Haram hotels and VIP transfers. Experience true spiritual comfort. Secure your spot today!',
    keywords: 'Umrah 2026, premium Umrah packages, luxury Umrah, 5 star hotels Makkah Madinah, Umrah visa Pakistan'
  },
  '/packages/haj': {
    title: 'Haj 2026 Packages & Pilgrim Guide | Agility Travels',
    description: 'Register for VIP Haj 2026 booking with certified guidance and premium Mina tents. Start your spiritual journey with us. Book online now.',
    keywords: 'Haj 2026 registration, VIP Haj packages, Haj guides, government scheme Haj, private Haj package'
  },
  '/packages/domestic-group': {
    title: 'Northern Pakistan Tours & Retreats | Agility Travels',
    description: 'Explore Skardu, Hunza, and SWAT with our custom group adventures and corporate retreats. Plan your unforgettable Pakistan holiday today!',
    keywords: 'Northern Pakistan tours, Hunza Skardu packages, family holiday Pakistan, corporate adventure travel'
  },
  '/packages/visa': {
    title: 'Fast-Track Visa Services & Consulting | Agility Travels',
    description: 'Get fast-track visa processing for Saudi Arabia, UK, USA, and Europe. Enjoy hassle-free documentation support. Apply for your visa now!',
    keywords: 'Saudi tourist visa, Dubai e-visa, UK visa consultancy, USA visa documentation, Schengen visa services'
  },
  '/packages/expo': {
    title: 'Global EXPO Packages & Business Tours | Agility Travels',
    description: 'Seamless business travel for global corporate expos and trade shows. Secure your hotel, flight, and trade pass today. View our EXPO deals.',
    keywords: 'Corporate travel agency, international business tours, trade expo packages, Canton fair booking'
  },
  '/packages/study-abroad': {
    title: 'Study Abroad Programs & Student Visas | Agility Travels',
    description: 'Expert admission and student visa guidance for universities in the UK, USA, and Canada. Unlock your educational future. Consult us today!',
    keywords: 'Study abroad consultancy, student visa UK, study in Canada, university admissions counselor'
  },
  '/faq': {
    title: 'FAQs & Pilgrim Travel Requirements | Agility Travels',
    description: 'Find answers to your questions on Umrah requirements, visa documents, and payment options. Read our travel guide for a safe trip.',
    keywords: 'Umrah requirements, passport validity, tour payment terms, travel insurance, flight cancellation'
  },
  '/contact': {
    title: 'Contact Agility Travels | 24/7 Support Assistance',
    description: 'Have a travel question? Contact Agility Travels via WhatsApp, email, or phone. Let our experts plan your next tour. Get in touch today!',
    keywords: 'Agility Travels contact number, Lahore travel agent phone, WhatsApp travel help, booking address'
  },
  '/login': {
    title: 'Traveler Portal Sign-In & Dashboard | Agility Travels',
    description: 'Access your Agility Travels booking orders, chat transcripts, and custom itineraries securely. Sign in to your traveler portal now!',
    keywords: 'Agility login, traveler portal, check booking status, upload passport'
  },
  '/profile': {
    title: 'My Profile & Bookings Dashboard | Agility Travels',
    description: 'Manage your active tour reservations, billing invoices, and passport information securely. Review your travel communication history now.',
    keywords: 'my travels dashboard, user booking record, update passport information'
  }
};

export default function SEOHandler() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Fetch metadata based on matching path or default fallback
    let seo = ROUTE_SEO_MAP[pathname];

    // If it's a dynamic package route like /package/:id, it will be handled by PackageDetails.tsx
    // directly, but we can set a generic fallback here first
    if (!seo && pathname.startsWith('/package/')) {
      seo = {
        title: 'Premium Custom Tour Package Details | Agility Travels',
        description: 'Explore our tailored flight options, premium 5-Star accommodations, day-by-day itineraries, and inclusions. Book online with Agility Travels.',
        keywords: 'tour package details, luxury itinerary, hotel inclusions, custom travel plan'
      };
    }

    if (!seo) {
      seo = ROUTE_SEO_MAP['/'];
    }

    // 2. Update Document Head properties
    document.title = seo.title;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', seo.description);
    }

    const keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (keywordsMeta) {
      keywordsMeta.setAttribute('content', seo.keywords);
    }

    // Update Open Graph tags for rich previews
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', seo.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', seo.description);

    const twitterTitle = document.querySelector('meta[property="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', seo.title);

    const twitterDesc = document.querySelector('meta[property="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', seo.description);

    // Update Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const currentDomain = window.location.origin || 'https://agilitytravels.com';
    canonical.setAttribute('href', `${currentDomain}${pathname}`);

    // 3. Inject Structured Data JSON-LD for Search Engines
    // Remove any previously injected structured data tag
    const oldJsonLd = document.getElementById('seo-structured-data');
    if (oldJsonLd) {
      oldJsonLd.remove();
    }

    // Create fresh Schema
    const script = document.createElement('script');
    script.id = 'seo-structured-data';
    script.type = 'application/ld+json';

    const travelAgencySchema = {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      'name': 'Agility Travels',
      'alternateName': 'Agility Tour & Travels',
      'image': 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800',
      'url': currentDomain,
      'telephone': '+92-300-0000000', // standard business placeholder
      'priceRange': '$$$',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': 'Agility Travels Headquarters, Main Boulevard',
        'addressLocality': 'Lahore',
        'addressRegion': 'Punjab',
        'postalCode': '54000',
        'addressCountry': 'PK'
      },
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+92-300-0000000',
        'contactType': 'customer service',
        'areaServed': 'PK',
        'availableLanguage': ['English', 'Arabic', 'Urdu']
      },
      'description': seo.description
    };

    script.text = JSON.stringify(travelAgencySchema);
    document.head.appendChild(script);

  }, [pathname]);

  return null;
}
