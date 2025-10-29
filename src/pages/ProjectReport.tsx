import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ProjectReport = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SEO: title, description, canonical, structured data
    document.title = "Hatchery Weekly Report Jun 9–Aug 5"; // < 60 chars
    const desc = "Weekly progress report (June 9–August 5): features, updates, UI/UX, analytics, AI, exports."; // < 160 chars
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);

    // Structured data (Article)
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Hatchery Weekly Report (June 9–August 5)",
      datePublished: "2025-06-09",
      dateModified: "2025-08-05",
      author: { "@type": "Organization", name: "Hatchery Project" },
      url: window.location.href,
    } as const;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }, []);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    const el = reportRef.current;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight - pageHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");

    while (heightLeft > 0) {
      pdf.addPage();
      position -= pageHeight;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save("Hatchery_Project_Report.pdf");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={downloadPDF}>Download Report as PDF</Button>
      </div>

      <section ref={reportRef} id="report-content" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Core dashboards completed with multi-unit support and themed visualizations.</li>
              <li>Process Flow updated to HOI/HOF metrics with breed/age comparisons.</li>
              <li>Advanced Analytics: Predictions Panel (Supabase Edge + OpenAI) and AI Chart Insights.</li>
              <li>Alerting system wired to Supabase checks, plus export options (image/PDF).</li>
              <li>UX polish: navigation, colorful chart palette, responsive layouts.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Major Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Dashboards & Analytics</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Live Overview with KPIs and alerts.</li>
                  <li>Process Flow with HOI/HOF area charts and breed-age slices.</li>
                  <li>Performance & Comparison tabs with vibrant palette and radar/bar charts.</li>
                  <li>Advanced Analytics hub: Heatmap Calendar, Timeline, Sankey, Weekly Comparison.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Intelligence & Automation</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Predictions Panel via predict-metrics Edge Function.</li>
                  <li>AI Chart Insights via chart-insights Edge Function.</li>
                  <li>Alert Center with temperature/humidity/schedule checks.</li>
                  <li>One-click chart and flowchart downloads.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI/UX Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
              <li>Color system: semantic HSL tokens for charts (--chart-1..5).</li>
              <li>Navigation improvements with role-aware items and quick access.</li>
              <li>Responsive layouts, accessible contrasts, and consistent typography.</li>
              <li>Flowchart with zoom/pan and export, refreshed to reflect new features.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data & Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
              <li>Supabase tables for batches, flocks, QA, residue, and alerts.</li>
              <li>Real-time sync enabling alert updates and dashboard refresh.</li>
              <li>Edge Functions: predict-metrics (OpenAI) and chart-insights for explanations.</li>
              <li>Secure auth with role-based controls for management features.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
              <li>Weeks 1-2: Setup, auth, base schema.</li>
              <li>Weeks 3-5: Data models and entry flows.</li>
              <li>Weeks 6-9: Dashboards and process flow visualizations.</li>
              <li>Weeks 10-13: HOI/HOF + Analysis enhancements.</li>
              <li>Weeks 14-18: Advanced Analytics hub, AI integrations.</li>
              <li>Weeks 19-22: Alerts and export tooling.</li>
              <li>Weeks 23-27: Theming, color palette, UX polish, QA.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress (June 9 – August 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground">Week of June 9–15</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Hardened project setup, baseline SEO, and navigation skeleton with auth route wiring.</li>
                  <li>Scaffolded Data Entry pages for QA, Residue, Fertility, and Egg Pack flows.</li>
                  <li>Established HSL design tokens and semantic color usage across UI.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of June 16–22</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Built Overview Dashboard structure with initial KPIs and alert placeholders.</li>
                  <li>Implemented role-aware Navigation items and improved active link styling.</li>
                  <li>Set up Supabase wiring for future alerts and real-time sync.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of June 23–29</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Process Flow dashboards updated to HOI/HOF focus with age/breed hooks.</li>
                  <li>Introduced colorful, accessible chart palettes aligned with theme tokens.</li>
                  <li>Added comparison views groundwork for weekly and unit-based analysis.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of June 30–July 6</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Performance Charts and Comparison Analysis tabs expanded with radar/bar charts.</li>
                  <li>Refined typography, spacing, and responsive behavior across pages.</li>
                  <li>Initial report page created with multi-section Cards and PDF export hook exploration.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of July 7–13</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Advanced Analytics hub scaffolded: Heatmap Calendar, Incubation Timeline, Sankey, Weekly Comparison.</li>
                  <li>Wired toast notifications and improved feedback on long-running actions.</li>
                  <li>Stabilized table and tabs components for consistent UX.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of July 14–20</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Implemented Predictions Panel using predict-metrics Edge Function (OpenAI-backed).</li>
                  <li>Created AI Chart Insights via chart-insights Edge Function to explain trends.</li>
                  <li>Added System Flowchart with zoom, pan, and image export.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of July 21–27</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Alert Center connected to Supabase checks for temperature, humidity, and schedules.</li>
                  <li>Improved Advanced Analytics layouts and integrated multi-unit metrics.</li>
                  <li>Introduced one-click chart download via useChartDownload hook.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">Week of July 28–August 3</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Report page refined with structured sections and improved SEO metadata.</li>
                  <li>Stabilized PDF export parameters for consistent multi-page output.</li>
                  <li>Updated flowchart content to reflect new analytics and automation.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-foreground">August 4–5</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Final content pass: weekly breakdown, deliverables, and demo script.</li>
                  <li>Label sanitization in System Flow to prevent Mermaid parsing errors.</li>
                  <li>Accessibility checks and polishing of navigation/contrast.</li>
                </ul>
              </section>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Script</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
              <li>Open Main Dashboard → show KPIs and Alerts.</li>
              <li>Process Flow → highlight HOI/HOF and breed/age breakdowns.</li>
              <li>Analysis tab → radar and bar comparisons with new colors.</li>
              <li>Advanced Analytics → Predictions Panel and AI Insights.</li>
              <li>System Flow → updated architecture and milestones.</li>
              <li>Project Report → click "Download PDF" to share.</li>
            </ol>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ProjectReport;
