export function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring app-pill${selected ? " is-selected" : ""}`}
    >
      {label}
    </button>
  );
}
