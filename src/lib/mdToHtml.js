export function mdToHtml(raw, options = {}) {
  const strongColor = options.strongColor || "#1d1d1f";
  if (!raw) return "";
  const lines = raw.split("\n");
  let html = "";
  let inUl = false;
  let inTable = false;
  const tableRows = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    html += "<table>";
    tableRows.forEach((row, ri) => {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c && !/^[-:]+$/.test(c));
      if (!cells.length) return;
      if (ri === 0) {
        html += `<thead><tr>${cells.map((c) => `<th>${inl(c)}</th>`).join("")}</tr></thead><tbody>`;
      } else {
        html += `<tr>${cells.map((c) => `<td>${inl(c)}</td>`).join("")}</tr>`;
      }
    });
    html += "</tbody></table>";
    tableRows.length = 0;
    inTable = false;
  };

  const flushUl = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
  };

  const inl = (t) => {
    t = t.replace(
      /\*\*(.+?)\*\*/g,
      `<strong style="color:${strongColor}">$1</strong>`
    );
    t = t.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
    t = t.replace(
      /\(([^)]{3,100}?)\s*[—–-]\s*program\s+outcome\)/gi,
      (_, principle) =>
        `<span class="outcome-ref">(${principle.trim()} — program outcome)</span>`
    );
    t = t.replace(/^#+\s*/, "");
    return t;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (/^[=\-*_]{3,}$/.test(line)) return;

    if (line.includes("|") && line.split("|").length >= 3) {
      flushUl();
      if (!inTable) inTable = true;
      if (!/^[\|\-\s:]+$/.test(line)) tableRows.push(line);
      return;
    }
    if (inTable) {
      flushTable();
    }

    if (/^# /.test(rawLine) || /^SECTION\s*\d+/i.test(line)) {
      flushUl();
      html += `<h2>${inl(line.replace(/^#+\s*/, "").replace(/^SECTION\s*\d+\s*:\s*/i, ""))}</h2>`;
      return;
    }
    if (/^## /.test(rawLine)) {
      flushUl();
      html += `<h3>${inl(line.replace(/^#+\s*/, ""))}</h3>`;
      return;
    }
    if (/^###/.test(rawLine)) {
      flushUl();
      html += `<h4>${inl(line.replace(/^#+\s*/, ""))}</h4>`;
      return;
    }
    if (/^\*\*[^*]{2,60}\*\*$/.test(line)) {
      flushUl();
      html += `<h4>${inl(line.replace(/\*\*/g, ""))}</h4>`;
      return;
    }

    if (/^[-*]\s/.test(line)) {
      if (!inUl) {
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${inl(line.replace(/^[-*]\s+/, ""))}</li>`;
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      flushUl();
      html += `<p style="margin-left:16px">${inl(line)}</p>`;
      return;
    }
    flushUl();
    if (line) html += `<p>${inl(line)}</p>`;
  });
  flushUl();
  if (inTable) flushTable();
  return html;
}
