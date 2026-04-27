/**
 * User-visible and document copy built from Settings (no hardcoded institution).
 */

export function buildDocumentIntroHtml(organizationDisplayName, program, elevel) {
  const org = escapeHtml(organizationDisplayName || "Your organization");
  const prog = program ? ` This document outlines the curriculum for <strong>${escapeHtml(program)}</strong>.` : "";
  const el = elevel
    ? ` Instruction is calibrated for students at the <strong>${escapeHtml(elevel.label)} (${escapeHtml(elevel.name)})</strong> level of English proficiency: ${escapeHtml(elevel.desc)}`
    : "";
  return `${org} develops academically rigorous, internationally responsive programs that meet students where they are and guide them toward meaningful growth. Each course sequence is built with pedagogical intention, drawing on peer-reviewed scholarship and structured to foster critical inquiry, cross-cultural competency, and independent thinking. Programs are designed with flexibility at their core, allowing partner institutions to shape the curriculum to their students's needs while maintaining academic integrity and coherence.${prog}${el}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFooterAttributionHtml(organizationDisplayName, footerExtraLine) {
  const main = escapeHtml(
    organizationDisplayName || "Your organization"
  );
  const extra = footerExtraLine?.trim()
    ? ` ${escapeHtml(footerExtraLine.trim())}`
    : " Content may be adapted by partner institutions in alignment with local educational standards and institutional context.";
  return `Curriculum design by ${main}.${extra}`;
}
