import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO_MAP: Record<string, { title: string; description: string; keywords: string }> = {
  '/': {
    title: 'Agility Travels | Premium Umrah, Haj, and Corporate Tour Packages',
    description: 'Agility Travels offers customized, premium Umrah, Haj, Corporate Expo, and Adventure tour packages with fully integrated booking, reliable accommodations, and exceptional guidance.',
    keywords: 'Umrah packages, Haj tour, Corporate Expo, adventure travel Pakistan, Agility Travels, premium pilgrimage, luxury travels Makkah Madinah'
  },
  '/packages/umrah': {
    title: 'Premium Umrah Packages 2026/2027 | Agility Travels',
    description: 'Book customized, luxury, or economy group Umrah packages with 4/5-star hotels near Haram, VIP land transfers, and full visa guidance. Experience absolute spiritual comfort.',
    keywords: 'Umrah 2026, premium Umrah packages, luxury Umrah, 5 star hotels Makkah Madinah, Umrah visa Pakistan'
  },
  '/packages/haj': {
    title: 'Haj 2026 Packages | Official Pilgrim Services | Agility Travels',
    description: 'Register and secure your Haj 2026 booking with Agility Travels. Certified pilgrimage guidance, premium air-conditioned tents in Mina/Arafat, and direct flights.',
    keywords: 'Haj 2026 registration, VIP Haj packages, Haj guides, government scheme Haj, private Haj package'
  },
  '/packages/domestic-group': {
    title: 'Northern Pakistan Tours & Corporate Holidays | Agility Travels',
    description: 'Explore Hunza Valley, Skardu, Fairy Meadows, and SWAT. Custom group adventures, family holiday trips, and private corporate retreat logistics.',
    keywords: 'Northern Pakistan tours, Hunza Skardu packages, family holiday Pakistan, corporate adventure travel'
  },
  '/packages/visa': {
    title: 'Fast-Track Visa Services & Tourist Consultancy | Agility Travels',
    description: 'Hassle-free tourist and religious visa handling for Saudi Arabia, Dubai, UK, USA, Schengen Europe, and Turkey. Safe documentation assistance.',
    keywords: 'Saudi tourist visa, Dubai e-visa, UK visa consultancy, USA visa documentation, Schengen visa services'
  },
  '/packages/expo': {
    title: 'Global Corporate EXPO Packages & Business Tours | Agility Travels',
    description: 'Seamless custom business travel for international corporate expos and trade shows. Hotel booking, flights, and trade show registration support.',
    keywords: 'Corporate travel agency, international business tours, trade expo packages, Canton fair booking'
  },
  '/packages/study-abroad': {
    title: 'Study Abroad Programs & Visa Counseling | Agility Travels',
    description: 'Unlock premium educational consultants. Guidance for admissions and student visa processing in UK, USA, Australia, and Canada.',
    keywords: 'Study abroad consultancy, student visa UK, study in Canada, university admissions counselor'
  },
  '/faq': {
    title: 'FAQs & Pilgrim Travel Requirements Guide | Agility Travels',
    description: 'Read the latest updates and answers on Umrah medical certifications, visa documents, payment options, and customized travel requests.',
    keywords: 'Umrah requirements, passport validity, tour payment terms, travel insurance, flight cancellation'
  },
  '/contact': {
    title: 'Contact Agility Travels | 24/7 Guest Assistance Desk',
    description: 'Have a question? Connect with our dedicated tour coordinators via WhatsApp, live chat, email, or telephone. Visit our primary offices for in-person consultation.',
    keywords: 'Agility Travels contact number, Lahore travel agent phone, WhatsApp travel help, booking address'
  },
  '/login': {
    title: 'Traveler Portal Sign-In | Agility Travels',
    description: 'Access your luxury booking orders, real-time live chat transcripts, passenger passport details, and custom travel itineraries.',
    keywords: 'Agility login, traveler portal, check booking status, upload passport'
  },
  '/profile': {
    title: 'My Profile & Bookings Dashboard | Agility Travels',
    description: 'Manage your active reservations, passenger rosters, billing invoices, and communication history in one secure place.',
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
