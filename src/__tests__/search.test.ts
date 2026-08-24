import { describe, expect, it } from "vitest";
import {
  buildKeywordVariants,
  buildLocationVariants,
  findBonus,
  flattenJsonLd,
  jsonLdJobPosting,
} from "../../server/scrapers/utils.mjs";

describe("Scraper Utils & Extraction Enhancements", () => {
  it("extracts modern compensation packages including profit-sharing and 13th month", () => {
    const rawWithProfitSharing = `
      Poste : Diagnostiqueur DPE
      Entreprise : Bureau Expertises
      Salaire : 2800 € net
      Avantages : Intéressement, participation, prime de vacances et 13ème mois.
    `;
    const bonus = findBonus(rawWithProfitSharing);
    expect(bonus).not.toBe("Non mentionnées");
    expect(bonus.toLowerCase()).toContain("intéressement");
  });

  it("flattens complex @graph and multi-array JSON-LD structures", () => {
    const nestedGraph = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Page d'offre" },
        {
          "@type": "JobPosting",
          title: "Technicien DPE",
          description: "Recherche diagnostiqueur immobilier",
        },
      ],
    };
    const flattened = flattenJsonLd(nestedGraph);
    expect(flattened.length).toBe(3);
    const htmlSnippet = `<script type="application/ld+json">${JSON.stringify(nestedGraph)}</script>`;
    const jobPosting = jsonLdJobPosting(htmlSnippet);
    expect(jobPosting).not.toBeNull();
    expect(jobPosting.title).toBe("Technicien DPE");
  });

  it("handles JSON-LD where @type is an array", () => {
    const multiTypeJob = {
      "@context": "https://schema.org",
      "@type": ["JobPosting", "Offer"],
      title: "Auditeur énergétique débutant",
    };
    const htmlSnippet = `<script type="application/ld+json">${JSON.stringify(multiTypeJob)}</script>`;
    const jobPosting = jsonLdJobPosting(htmlSnippet);
    expect(jobPosting).not.toBeNull();
    expect(jobPosting.title).toBe("Auditeur énergétique débutant");
  });

  it("generates relevant location and keyword variants for reconversion", () => {
    const kw = buildKeywordVariants("Diagnostiqueur immobilier", true, "debutant_reconversion");
    expect(kw.length).toBeGreaterThan(5);
    expect(kw).toContain("diagnostiqueur immobilier débutant");

    const loc = buildLocationVariants("IDF", true);
    expect(loc).toContain("Île-de-France");
    expect(loc).toContain("Paris");
    expect(loc).toContain("75");
  });
});
