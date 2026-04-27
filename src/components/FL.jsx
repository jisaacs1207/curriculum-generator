export function FL({ children, id, htmlFor }) {
  if (htmlFor) {
    return (
      <label id={id} htmlFor={htmlFor} className="app-field-label">
        {children}
      </label>
    );
  }
  return (
    <div id={id} className="app-field-label">
      {children}
    </div>
  );
}
