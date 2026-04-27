/**
 * Card section — layout uses global CSS (Apple-style surfaces).
 */
export function Section({ title, children, dark, step, description, id }) {
  const isDark = Boolean(dark);
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={`app-section${isDark ? " app-section--dark" : ""}`}
    >
      <div className="app-section-inner">
        <div className="app-section-head">
          {step != null && (
            <span className="app-section-step" aria-hidden>
              {String(step).padStart(2, "0")}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              id={id ? `${id}-heading` : undefined}
              className={`app-section-title${isDark ? " app-section-title--dark" : ""}`}
            >
              {title}
            </h2>
            {description && (
              <p
                className={`app-section-desc${isDark ? " app-section-desc--dark" : ""}`}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="app-section-body">{children}</div>
      </div>
    </section>
  );
}
