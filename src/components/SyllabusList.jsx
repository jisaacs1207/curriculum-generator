import { COURSES, GRADE_LEVELS } from "../constants";
import { FL } from "./FL";

export function SyllabusList({ items, onUpdate, onAdd, onRemove }) {
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          role="group"
          className="app-syllabus-row"
          aria-labelledby={`syllabus-row-${i}-course-label syllabus-row-${i}-grade-label`}
        >
          <div style={{ flex: 1 }}>
            <FL id={`syllabus-row-${i}-course-label`}>Course</FL>
            <select
              id={`syllabus-course-${i}`}
              value={item.course}
              onChange={(e) => onUpdate(i, "course", e.target.value)}
              aria-labelledby={`syllabus-row-${i}-course-label`}
              className="app-select focus-ring"
            >
              <option value="">Choose course...</option>
              {Object.entries(COURSES).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((c) => (
                    <option key={c.title} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={{ width: 150 }}>
            <FL id={`syllabus-row-${i}-grade-label`}>Grade / Level</FL>
            <select
              id={`syllabus-grade-${i}`}
              value={item.grade}
              onChange={(e) => onUpdate(i, "grade", e.target.value)}
              aria-labelledby={`syllabus-row-${i}-grade-label`}
              className="app-select focus-ring"
            >
              <option value="">Select...</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove course ${i + 1}`}
              className="focus-ring"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: "#FEE2E2",
                color: "#DC2626",
                cursor: "pointer",
                fontSize: 16,
                marginBottom: 2,
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={onAdd} className="focus-ring app-dashed-btn" aria-label="Add another course to curriculum">
        + Add Another Course
      </button>
    </div>
  );
}
