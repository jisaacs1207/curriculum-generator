import { COURSES, GRADE_LEVELS } from "../constants";
import { FL } from "./FL";

export function CourseMatrix({ rows, cols, matrix, onCell, onGrade, onRemove, onAdd }) {
  return (
    <div className="app-table-wrap">
      <table className="app-matrix-table" aria-label="Course assignments by year and slot">
        <thead>
          <tr>
            <th scope="col" className="app-matrix-head app-matrix-th-year">
              Year / Level
            </th>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} scope="col" className="app-matrix-head app-matrix-th-course">
                Course {i + 1}
              </th>
            ))}
            <th scope="col" className="app-matrix-head app-matrix-th-remove" aria-label="Remove row" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 0 ? "app-matrix-row-even" : "app-matrix-row-odd"}
            >
              <td className="app-matrix-cell" style={{ padding: "7px 10px" }}>
                <select
                  value={row.grade || ""}
                  onChange={(e) => onGrade(ri, e.target.value)}
                  className="app-select focus-ring"
                >
                  <option value="">Select level...</option>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </td>
              {Array.from({ length: cols }, (_, ci) => (
                <td key={ci} className="app-matrix-cell" style={{ padding: "7px 10px" }}>
                  <select
                    value={matrix[`${ri}-${ci}`] || ""}
                    onChange={(e) => onCell(ri, ci, e.target.value)}
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
                </td>
              ))}
              <td
                className="app-matrix-cell"
                style={{ padding: "4px 6px", textAlign: "center" }}
              >
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove(ri)}
                    aria-label={`Remove year ${ri + 1}`}
                    className="focus-ring"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "none",
                      background: "#FEE2E2",
                      color: "#DC2626",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={onAdd} className="focus-ring app-dashed-btn" aria-label="Add another year or level row">
        + Add Year / Level
      </button>
    </div>
  );
}
