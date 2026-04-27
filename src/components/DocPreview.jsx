import { useState, useMemo } from "react";
import { ENGLISH_LEVELS, getCourse } from "../constants";
import { getPdfUrl } from "../constants/logo";
import { buildDocHTML, buildDocPreviewCss } from "../lib/docBuilder";
import { buildDocumentIntroHtml, buildFooterAttributionHtml } from "../lib/branding";
import { useSettings } from "../context/SettingsContext";

function slugFile(s) {
  return String(s || "Curriculum")
    .replace(/[^\w\-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "Curriculum";
}

export function DocPreview({
  mapRows,
  matrix,
  slots,
  sections,
  partner,
  program,
  mode,
  englishLevel,
  logoUrl,
  logoShieldUrl,
}) {
  const { settings, palette } = useSettings();
  const year = new Date().getFullYear();
  const elevel = ENGLISH_LEVELS.find((e) => e.id === englishLevel);
  const org = settings.organizationDisplayName?.trim() || "Your organization";
  const school = settings.schoolName?.trim() || "Your School";
  const site = settings.websiteLabel?.trim() || "";

  const docTitle =
    mode === "map"
      ? "Program Course Map"
      : mode === "syllabus"
        ? "Course Curriculum"
        : "Program Course Map and Curriculum";

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const printLogoUrl = logoUrl || `${origin}/branding-placeholder.svg`;
  const printShieldUrl = logoShieldUrl || printLogoUrl;

  const pdfEndpoint = getPdfUrl();
  const [pdfLoading, setPdfLoading] = useState(false);

  const previewCss = useMemo(() => buildDocPreviewCss(palette), [palette]);

  const branding = useMemo(
    () => ({
      organizationDisplayName: org,
      schoolName: school,
      websiteLabel: site,
      footerExtraLine: settings.footerExtraLine,
    }),
    [org, school, site, settings.footerExtraLine]
  );

  const introHtml = useMemo(
    () => buildDocumentIntroHtml(org, program, elevel),
    [org, program, elevel]
  );

  const footerHtml = useMemo(
    () => buildFooterAttributionHtml(org, settings.footerExtraLine),
    [org, settings.footerExtraLine]
  );

  async function toDataUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Logo fetch failed");
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  const handleDownloadPdf = async () => {
    if (!pdfEndpoint) {
      handlePrint();
      return;
    }
    setPdfLoading(true);
    try {
      const logoData = await toDataUrl(printLogoUrl);
      let shieldData = "";
      try {
        shieldData = await toDataUrl(printShieldUrl);
      } catch {
        shieldData = logoData;
      }
      const html = buildDocHTML(
        mapRows,
        matrix,
        slots,
        sections,
        partner,
        program,
        mode,
        englishLevel,
        logoData,
        shieldData,
        branding,
        palette
      );
      const filename = `${slugFile(school)}-${slugFile(program)}-${docTitle.replace(/\s+/g, "-")}.pdf`;
      const res = await fetch(pdfEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, filename }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `PDF failed: ${res.status}`);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message || "Download failed. Use Print to save as PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    const html = buildDocHTML(
      mapRows,
      matrix,
      slots,
      sections,
      partner,
      program,
      mode,
      englishLevel,
      printLogoUrl,
      printShieldUrl,
      branding,
      palette
    );
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Please allow popups to print.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

  const mapCoursePairs = [];
  mapRows.forEach((row, ri) => {
    Array.from({ length: slots }, (_, ci) => {
      const t = matrix[`${ri}-${ci}`];
      if (t && !mapCoursePairs.find((p) => p.title === t)) mapCoursePairs.push(getCourse(t));
    });
  });

  const hasMapContent =
    (mode === "map" || mode === "both") &&
    mapRows.some((_, ri) =>
      Array.from({ length: slots }, (_, ci) => matrix[`${ri}-${ci}`]).some(Boolean)
    );

  return (
    <div style={{ marginTop: 28 }}>
      <style>{previewCss}</style>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h3 id="preview-heading" className="app-preview-heading">
            Preview
          </h3>
          <div className="app-preview-actions">
            {pdfEndpoint && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="focus-ring app-btn-solid"
                aria-label="Download document as PDF"
              >
                {pdfLoading ? "Generating…" : "Download PDF"}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className={`focus-ring app-btn-ghost${pdfEndpoint ? "" : " app-btn-ghost-fill"}`}
              aria-label="Open print dialog to save as PDF or print"
            >
              {pdfEndpoint ? "Print" : "Download or print"}
            </button>
          </div>
        </div>
        {!pdfEndpoint && (
          <p className="app-preview-hint">
            Server-side PDF is not configured. Use <strong>Print</strong> (or &quot;Download or
            print&quot;) and choose <strong>Save as PDF</strong> in the dialog—this works on static
            hosts without a PDF service.
          </p>
        )}
      </div>
      <div className="app-preview-card">
        <div className="dw">
          <div className="dh">
            <img
              src={printLogoUrl}
              alt=""
              style={{ height: 48, width: "auto", objectFit: "contain" }}
            />
            <div className="dhr">
              <div className="dht">{docTitle}</div>
              {partner && <div className="dhp">{partner}</div>}
            </div>
          </div>
          <div className="ds" />
          <div className="db">
            <p className="di" dangerouslySetInnerHTML={{ __html: introHtml }} />

            {hasMapContent && (
              <>
                <h2 className="ignore">Program Progression</h2>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Year / Level</th>
                      {Array.from({ length: slots }, (_, i) => (
                        <th key={i}>Course {i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapRows.map((row, ri) => {
                      const has = Array.from(
                        { length: slots },
                        (_, ci) => matrix[`${ri}-${ci}`]
                      ).some(Boolean);
                      if (!has) return null;
                      return (
                        <tr key={ri}>
                          <td>
                            <strong>{row.grade || `Year ${ri + 1}`}</strong>
                          </td>
                          {Array.from({ length: slots }, (_, ci) => {
                            const t = matrix[`${ri}-${ci}`];
                            return (
                              <td key={ci}>
                                {t ? (
                                  <div className="prog-cn">{t}</div>
                                ) : (
                                  <span style={{ color: "#aaa" }}>-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {mapCoursePairs.length > 0 && (
                  <div className="book-map">
                    <div className="book-map-title">Course Texts and Authors</div>
                    {mapCoursePairs.map((info) => (
                      <div key={info.title} className="book-row">
                        <span className="bc-course">{info.title}</span>
                        <span className="bc-book">{info.book}</span>
                        <span className="bc-author">{info.authors}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {sections.map((sec, i) => (
              <div key={i}>
                {i > 0 && <hr className="sec-rule" />}
                <div dangerouslySetInnerHTML={{ __html: sec.html }} />
              </div>
            ))}

            <hr className="sec-rule" />
            <p
              style={{
                fontSize: "9.5px",
                color: palette.inkMuted,
                lineHeight: 1.7,
              }}
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
          </div>
          <div className="dfb">
            <div className="dfbot">
              <div className="dfl">{org.toUpperCase()}</div>
              <div className="dfr">{site}</div>
            </div>
            <div className="dfc">
              Copyright &copy; {year} {school}. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
