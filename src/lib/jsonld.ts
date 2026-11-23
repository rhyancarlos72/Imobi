// Dados estruturados (schema.org) do site.
import { FAQ, FEATURES, pricingList, site } from "./site";

export function organizationNode() {
  const contactPoint = [
    ...(site.email ? [{ "@type": "ContactPoint", contactType: "customer support", email: site.email, availableLanguage: ["pt-BR"], areaServed: "BR" }] : []),
    ...(site.whatsapp ? [{ "@type": "ContactPoint", contactType: "sales", telephone: `+${site.whatsapp}`, availableLanguage: ["pt-BR"], areaServed: "BR" }] : []),
  ];
  return {
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    ...(site.legalName ? { legalName: site.legalName } : {}),
    ...(site.cnpj ? { taxID: site.cnpj } : {}),
    url: site.url,
    logo: { "@type": "ImageObject", url: `${site.url}/logo.svg` },
    description: site.description,
    areaServed: { "@type": "Country", name: "Brasil" },
    knowsLanguage: "pt-BR",
    ...(site.email ? { email: site.email } : {}),
    ...(site.whatsapp ? { telephone: `+${site.whatsapp}` } : {}),
    ...(contactPoint.length ? { contactPoint } : {}),
    ...(site.sameAs.length ? { sameAs: site.sameAs } : {}),
  };
}

export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: site.tagline,
        inLanguage: site.locale,
        publisher: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        url: site.url,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        inLanguage: site.locale,
        description: site.description,
        featureList: FEATURES.map((f) => f.name),
        publisher: { "@id": `${site.url}/#organization` },
        offers: pricingList().map((p) => ({
          "@type": "Offer",
          name: `${p.name}: ${p.credits} créditos`,
          price: p.priceValue.toFixed(2),
          priceCurrency: "BRL",
          url: `${site.url}/precos`,
          availability: "https://schema.org/InStock",
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "WebPage",
        "@id": `${site.url}/#webpage`,
        url: site.url,
        name: `${site.name}: vídeos de imóveis com IA`,
        isPartOf: { "@id": `${site.url}/#website` },
        about: { "@id": `${site.url}/#app` },
        inLanguage: site.locale,
      },
    ],
  };
}

export function pageJsonLd(path: string, title: string, description: string) {
  const type = path === "/sobre" ? "AboutPage" : path === "/contato" ? "ContactPage" : "WebPage";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": type,
        "@id": `${site.url}${path}#webpage`,
        url: `${site.url}${path}`,
        name: title,
        description,
        inLanguage: site.locale,
        isPartOf: { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: site.name },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: site.url },
            { "@type": "ListItem", position: 2, name: title, item: `${site.url}${path}` },
          ],
        },
      },
    ],
  };
}

