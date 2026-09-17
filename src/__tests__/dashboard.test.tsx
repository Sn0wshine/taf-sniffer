import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardPanel } from "../components/panels/DashboardPanel";

const renderDashboard = (offerCount: number) => renderToStaticMarkup(
  <DashboardPanel
    offerCount={offerCount}
    reviewCount={2}
    exploreCount={1}
    priorityCount={1}
    lastSearchSession={null}
    onStartSearch={vi.fn()}
    onShowResults={vi.fn()}
    onShowTools={vi.fn()}
  />,
);

describe("Accueil de l’agrégateur", () => {
  it("présente les compteurs comme des informations et non des filtres", () => {
    const html = renderDashboard(4);
    expect(html).toContain('<dl class="dashboard-metrics"');
    expect(html).toContain("<dt>offres rassemblées</dt><dd>4</dd>");
    expect(html.match(/<button /g)).toHaveLength(3);
  });

  it("guide le premier usage sans promettre une collecte exhaustive", () => {
    const html = renderDashboard(0);
    expect(html).toContain("disponibilité des sources");
    expect(html).toContain("Tes offres apparaîtront ici.");
    expect(html).toContain("sans clé API");
  });

  it("propose de reprendre le tri lorsque des offres existent", () => {
    expect(renderDashboard(4)).toContain("Reprendre le tri et les favoris.");
  });
});
