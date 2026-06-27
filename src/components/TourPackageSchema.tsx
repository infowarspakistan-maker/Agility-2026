import { TravelPackage } from '@/src/types';

interface TourPackageSchemaProps {
  pkg: TravelPackage;
}

export default function TourPackageSchema({ pkg }: TourPackageSchemaProps) {
  if (!pkg) return null;

  const baseUrl = "https://agilitytravels.com";
  const packageUrl = `${baseUrl}/package/${pkg.id}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": packageUrl,
    "name": pkg.title,
    "description": pkg.description,
    "touristType": pkg.type === 'umrah' || pkg.type === 'haj' ? "Pilgrims" : 
                   pkg.type === 'study-abroad' ? "Students" : 
                   pkg.type === 'expo' ? "Business Delegates" : "Tourists",
    "provider": {
      "@type": "TravelAgency",
      "name": "Agility Travels",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`,
      "telephone": "+92-42-111-244-548",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Agility Travels HQ, Gulberg III",
        "addressLocality": "Lahore",
        "addressRegion": "Punjab",
        "postalCode": "54000",
        "addressCountry": "PK"
      }
    },
    "offers": {
      "@type": "Offer",
      "url": packageUrl,
      "priceCurrency": pkg.currency || "PKR",
      "price": pkg.price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": pkg.inventoryCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "image": pkg.images && pkg.images.length > 0 ? pkg.images : [
      "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800"
    ],
    "itinerary": pkg.itineraryDetails && pkg.itineraryDetails.length > 0 
      ? pkg.itineraryDetails.map((item, idx) => ({
          "@type": "TouristAttraction",
          "name": `Day ${idx + 1}: ${item.title}`,
          "description": item.description
        }))
      : (Array.isArray(pkg.itinerary) 
          ? pkg.itinerary.map((dayText, idx) => ({
              "@type": "TouristAttraction",
              "name": `Day ${idx + 1}`,
              "description": dayText
            }))
          : undefined)
  };

  return (
    <script 
      id={`jsonld-tour-${pkg.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
