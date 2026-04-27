import { ENGLISH_LEVELS, getCourse } from "../constants";
import { buildDocumentIntroHtml, buildFooterAttributionHtml } from "./branding";

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function buildPrintCss(p) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:${p.ink};background:${p.surface};font-size:11px;line-height:1.7;}
    .doc-header{background:${p.headerBar};padding:16px 32px;display:flex;align-items:center;justify-content:space-between;}
    .doc-header-right{text-align:right;}
    .doc-title{color:#fff;font-size:15px;font-weight:600;letter-spacing:-0.02em;}
    .doc-partner{color:rgba(255,255,255,0.55);font-size:10px;margin-top:4px;}
    .doc-stripe{height:3px;background:${p.accent};}
    .doc-body{padding:28px 32px 20px;}
    .doc-intro{font-size:11px;color:${p.inkMuted};line-height:1.82;margin-bottom:20px;border-left:3px solid ${p.accent};padding-left:14px;}
    h2{font-size:14px;color:${p.accent};font-weight:600;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid ${p.border};}
    h3{font-size:12.5px;color:${p.ink};font-weight:600;margin:16px 0 6px;}
    h4{font-size:11.5px;color:${p.ink};font-weight:600;margin:12px 0 5px;}
    p{font-size:11px;color:${p.inkMuted};line-height:1.8;margin:0 0 8px;}
    ul{margin:4px 0 10px 18px;padding:0;}
    li{font-size:11px;color:${p.inkMuted};line-height:1.75;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:10.5px;}
    th{background:${p.headerBar};color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:10px;border-bottom:2px solid ${p.accent};}
    td{padding:7px 10px;border-bottom:1px solid ${p.border};color:${p.inkMuted};vertical-align:top;line-height:1.55;}
    tr:nth-child(even) td{background:${p.tableStripe};}
    .outcome-ref{color:${p.accent};font-style:italic;font-size:10px;}
    .prog-table th{background:${p.headerBar};}
    .prog-table .cn{font-weight:600;color:${p.ink};font-size:11px;}
    .prog-table .bk{color:${p.inkMuted};font-size:9.5px;margin-top:2px;}
    .section-rule{border:none;border-top:1px solid ${p.border};margin:26px 0;}
    .book-map{background:${p.tableStripe};border:1px solid ${p.border};border-radius:8px;padding:14px 16px;margin:14px 0;}
    .book-map-title{font-weight:600;font-size:10.5px;color:${p.ink};margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase;}
    .book-row{display:flex;gap:12px;align-items:baseline;padding:4px 0;border-bottom:1px solid ${p.border};font-size:10.5px;}
    .book-row:last-child{border-bottom:none;}
    .course-name-col{font-weight:600;color:${p.ink};min-width:200px;}
    .book-col{color:${p.inkMuted};}
    .author-col{color:${p.inkMuted};font-size:9.5px;opacity:0.9;}
    .doc-footer-bar{background:${p.headerBar};padding:12px 32px;margin-top:28px;}
    .doc-footer-note{font-size:9px;color:rgba(255,255,255,0.45);line-height:1.6;margin-bottom:8px;}
    .doc-footer-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);}
    .doc-footer-left{color:${p.accent};font-size:8.5px;letter-spacing:0.08em;font-weight:600;}
    .doc-footer-right{color:rgba(255,255,255,0.4);font-size:8px;}
    .doc-footer-copy{color:rgba(255,255,255,0.32);font-size:8px;margin-top:4px;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} h2,h3{page-break-after:avoid;} table{page-break-inside:avoid;} .no-print{display:none!important;} @page{size:letter;margin:0;}}
  `;
}

/**
 * @param {object} branding — organizationDisplayName, schoolName, websiteLabel, footerExtraLine
 * @param {object} palette — resolvePalette() output
 */
export function buildDocHTML(
  mapRows,
  matrix,
  slots,
  sections,
  partner,
  program,
  mode,
  englishLevel,
  fullLogoB64,
  shieldB64,
  branding,
  palette
) {
  const elevel = ENGLISH_LEVELS.find((e) => e.id === englishLevel);
  const year = new Date().getFullYear();
  const org = branding?.organizationDisplayName || "Your organization";
  const school = branding?.schoolName || "Your School";
  const site = branding?.websiteLabel || "";
  const css = buildPrintCss(palette);

  const mapCoursePairs = [];
  mapRows.forEach((row, ri) => {
    Array.from({ length: slots }, (_, ci) => {
      const t = matrix[`${ri}-${ci}`];
      if (t) {
        const info = getCourse(t);
        if (!mapCoursePairs.find((p) => p.title === t)) mapCoursePairs.push(info);
      }
    });
  });

  let progTable = "";
  if (
    (mode === "map" || mode === "both") &&
    mapRows.some((_, ri) =>
      Array.from({ length: slots }, (_, ci) => matrix[`${ri}-${ci}`]).some(Boolean)
    )
  ) {
    const headers = `<tr><th style="width:120px">Year / Level</th>${Array.from(
      { length: slots },
      (_, i) => `<th>Course ${i + 1}</th>`
    ).join("")}</tr>`;
    const bodyRows = mapRows
      .map((row, ri) => {
        const hasCourse = Array.from(
          { length: slots },
          (_, ci) => matrix[`${ri}-${ci}`]
        ).some(Boolean);
        if (!hasCourse) return "";
        const cells = Array.from({ length: slots }, (_, ci) => {
          const t = matrix[`${ri}-${ci}`];
          return t
            ? `<td><div class="cn">${escAttr(t)}</div></td>`
            : `<td style="color:#aaa">-</td>`;
        }).join("");
        return `<tr><td><strong>${escAttr(row.grade || `Year ${ri + 1}`)}</strong></td>${cells}</tr>`;
      })
      .filter(Boolean)
      .join("");
    progTable = `<h2>Program Progression</h2><table class="prog-table"><thead>${headers}</thead><tbody>${bodyRows}</tbody></table>`;
    if (mapCoursePairs.length > 0) {
      const bookRows = mapCoursePairs
        .map(
          (info) =>
            `<div class="book-row"><span class="course-name-col">${escAttr(info.title)}</span><span class="book-col"><em>${escAttr(info.book)}</em></span><span class="author-col">${escAttr(info.authors)}</span></div>`
        )
        .join("");
      progTable += `<div class="book-map"><div class="book-map-title">Course Texts and Authors</div>${bookRows}</div>`;
    }
  }

  const introHtml = buildDocumentIntroHtml(org, program, elevel);
  const footerNote = buildFooterAttributionHtml(org, branding?.footerExtraLine || "");
  const sectionHTML = sections
    .map((sec, i) => `${i > 0 ? '<hr class="section-rule">' : ""}${sec.html}`)
    .join("");

  const docTitle =
    mode === "map"
      ? "Program Course Map"
      : mode === "syllabus"
        ? "Course Curriculum"
        : "Program Course Map and Curriculum";

  const logoAlt = escAttr(org);
  const footerLeft = escAttr(org).toUpperCase();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escAttr(org)}</title><style>${css}</style></head><body>
<div class="doc-header">
  <img src="${fullLogoB64}" alt="${logoAlt}" style="height:52px;width:auto;object-fit:contain;">
  <div class="doc-header-right">
    <div class="doc-title">${escAttr(docTitle)}</div>
    ${partner ? `<div class="doc-partner">${escAttr(partner)}</div>` : ""}
  </div>
</div>
<div class="doc-stripe"></div>
<div class="doc-body">
  <p class="doc-intro">${introHtml}</p>
  ${progTable}
  ${sectionHTML}
  <hr class="section-rule">
  <p style="font-size:9.5px;color:${palette.inkMuted};line-height:1.7;">${footerNote}</p>
</div>
<div class="doc-footer-bar">
  <div class="doc-footer-bottom">
    <div class="doc-footer-left">${footerLeft}</div>
    <div class="doc-footer-right">${escAttr(site)}</div>
  </div>
  <div class="doc-footer-copy">Copyright &copy; ${year} ${escAttr(school)}. All rights reserved.</div>
</div>
</body></html>`;
}

/** In-app preview CSS scoped under .dw */
export function buildDocPreviewCss(p) {
  return `
  .dw{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif;color:${p.ink};background:${p.surface};font-size:11px;line-height:1.7;}
  .dh{background:${p.headerBar};padding:16px 28px;display:flex;align-items:center;justify-content:space-between;}
  .dhr{text-align:right;}
  .dht{color:#fff;font-size:14px;font-weight:600;letter-spacing:-0.02em;}
  .dhp{color:rgba(255,255,255,0.55);font-size:10px;margin-top:3px;}
  .ds{height:3px;background:${p.accent};}
  .db{padding:24px 28px 16px;}
  .di{font-size:11px;color:${p.inkMuted};line-height:1.82;margin-bottom:18px;border-left:3px solid ${p.accent};padding-left:14px;}
  .dw h2{font-size:14px;color:${p.accent};font-weight:600;margin:20px 0 7px;padding-bottom:4px;border-bottom:1px solid ${p.border};}
  .dw h3{font-size:12px;color:${p.ink};font-weight:600;margin:14px 0 5px;}
  .dw h4{font-size:11px;color:${p.ink};font-weight:600;margin:10px 0 4px;}
  .dw p{font-size:11px;color:${p.inkMuted};line-height:1.8;margin:0 0 7px;}
  .dw ul{margin:4px 0 10px 16px;padding:0;}
  .dw li{font-size:11px;color:${p.inkMuted};line-height:1.75;margin-bottom:3px;}
  .dw table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:10.5px;}
  .dw th{background:${p.headerBar};color:#fff;padding:7px 9px;text-align:left;font-weight:600;font-size:10px;border-bottom:2px solid ${p.accent};}
  .dw td{padding:6px 9px;border-bottom:1px solid ${p.border};color:${p.inkMuted};vertical-align:top;line-height:1.5;}
  .dw tr:nth-child(even) td{background:${p.tableStripe};}
  .outcome-ref{color:${p.accent};font-style:italic;font-size:10px;}
  .prog-cn{font-weight:600;color:${p.ink};font-size:11px;}
  .prog-bk{color:${p.inkMuted};font-size:9.5px;margin-top:1px;}
  .book-map{background:${p.tableStripe};border:1px solid ${p.border};border-radius:8px;padding:12px 14px;margin:12px 0;}
  .book-map-title{font-weight:600;font-size:10px;color:${p.ink};margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;}
  .book-row{display:flex;gap:10px;align-items:baseline;padding:4px 0;border-bottom:1px solid ${p.border};font-size:10.5px;flex-wrap:wrap;}
  .book-row:last-child{border-bottom:none;}
  .bc-course{font-weight:600;color:${p.ink};min-width:180px;}
  .bc-book{color:${p.inkMuted};font-style:italic;}
  .bc-author{color:${p.inkMuted};font-size:9.5px;}
  .sec-rule{border:none;border-top:1px solid ${p.border};margin:22px 0;}
  .dfb{background:${p.headerBar};padding:11px 28px;margin-top:22px;}
  .dfn{font-size:9px;color:rgba(255,255,255,0.4);line-height:1.65;margin-bottom:7px;}
  .dfbot{display:flex;justify-content:space-between;align-items:center;padding-top:7px;border-top:1px solid rgba(255,255,255,0.12);}
  .dfl{color:${p.accent};font-size:8.5px;letter-spacing:0.08em;font-weight:600;}
  .dfr{color:rgba(255,255,255,0.35);font-size:8px;}
  .dfc{color:rgba(255,255,255,0.28);font-size:8px;margin-top:3px;}
`;
}
