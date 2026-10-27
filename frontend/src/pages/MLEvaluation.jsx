
import React, { useMemo, useState } from "react";
import { evaluateDemandModel } from "../services/api";

// Reusable metric card
function MetricCard({ title, value, description }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.muted}>{title}</p>
      <h2 style={styles.metricValue}>{value}</h2>
      <small style={styles.muted}>{description}</small>
    </div>
  );
}

// Simple SVG line chart: actual sales vs predicted sales
function ActualVsPredictedChart({ predictions }) {
  const data = predictions
    .filter(
      (p) =>
        Number.isFinite(Number(p.actual)) &&
        Number.isFinite(Number(p.predicted))
    )
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-50);

  if (data.length < 2) {
    return <p>Not enough prediction data to draw this chart.</p>;
  }

  const width = 700;
  const height = 280;
  const pad = 40;

  const values = data.flatMap((p) => [
    Number(p.actual),
    Number(p.predicted),
  ]);

  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;

  const x = (i) =>
    pad + (i / (data.length - 1)) * (width - 2 * pad);

  const y = (value) =>
    height - pad -
    ((value - min) / range) * (height - 2 * pad);

  const makeLine = (key) =>
    data
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${x(i)} ${y(Number(p[key]))}`
      )
      .join(" ");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Actual and predicted sales line chart"
        style={{ width: "100%", minWidth: 320 }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const gy = pad + (i / 4) * (height - 2 * pad);
          return (
            <line
              key={i}
              x1={pad}
              y1={gy}
              x2={width - pad}
              y2={gy}
              stroke="#e5e7eb"
            />
          );
        })}

        <path
          d={makeLine("actual")}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
        />

        <path
          d={makeLine("predicted")}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
        />

        <text x={pad} y={20} fontSize="12" fill="currentColor">
          Sales units
        </text>

        <text
          x={pad}
          y={height - 8}
          fontSize="11"
          fill="currentColor"
        >
          {data[0].date}
        </text>

        <text
          x={width - pad}
          y={height - 8}
          fontSize="11"
          textAnchor="end"
          fill="currentColor"
        >
          {data[data.length - 1].date}
        </text>
      </svg>

      <div style={styles.legend}>
        <span>
          <span style={{ ...styles.legendDot, background: "#2563eb" }} />
          Actual sales
        </span>
        <span>
          <span style={{ ...styles.legendDot, background: "#f97316" }} />
          Predicted sales
        </span>
      </div>
      <small style={styles.muted}>
        Showing the latest 50 test observations.
      </small>
    </div>
  );
}

// Error distribution: predicted sales minus actual sales
function ErrorDistributionChart({ predictions }) {
  const errors = predictions
    .map((p) => Number(p.predicted) - Number(p.actual))
    .filter(Number.isFinite);

  if (!errors.length) {
    return <p>No valid prediction errors available.</p>;
  }

  const absMax = Math.max(1, ...errors.map(Math.abs));
  const binCount = 10;
  const binWidth = (2 * absMax) / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    label: `${Math.round(-absMax + i * binWidth)}`,
    count: 0,
  }));

  errors.forEach((error) => {
    const index = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((error + absMax) / binWidth))
    );
    bins[index].count += 1;
  });

  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  return (
    <div style={styles.histogram}>
      {bins.map((bin, i) => (
        <div key={i} style={styles.barColumn}>
          <small style={styles.muted}>{bin.count}</small>
          <div
            title={`${bin.label} error range: ${bin.count} observations`}
            style={{
              ...styles.bar,
              height: `${Math.max(3, (bin.count / maxCount) * 150)}px`,
              background: i < binCount / 2 ? "#f97316" : "#2563eb",
            }}
          />
          <small style={styles.binLabel}>{bin.label}</small>
        </div>
      ))}
    </div>
  );
}

// Compare model MAE and baseline MAE
function BaselineComparison({ modelMAE, baselineMAE }) {
  const model = Number(modelMAE);
  const baseline = Number(baselineMAE);

  if (
    !Number.isFinite(model) ||
    !Number.isFinite(baseline) ||
    model < 0 ||
    baseline < 0
  ) {
    return <p>Baseline comparison data is unavailable.</p>;
  }

  const maxValue = Math.max(model, baseline, 1);
  const improvement =
    baseline > 0 ? ((baseline - model) / baseline) * 100 : null;

  return (
    <div style={styles.chartSection}>
      <p>Model MAE: {model.toFixed(3)}</p>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.comparisonBar,
            width: `${(model / maxValue) * 100}%`,
            background: "#2563eb",
          }}
        />
      </div>

      <p>Baseline MAE: {baseline.toFixed(3)}</p>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.comparisonBar,
            width: `${(baseline / maxValue) * 100}%`,
            background: "#9ca3af",
          }}
        />
      </div>

      {improvement !== null && (
        <p style={{ marginTop: 16 }}>
          {improvement >= 0
            ? `${improvement.toFixed(2)}% lower MAE than baseline`
            : `${Math.abs(improvement).toFixed(2)}% higher MAE than baseline`}
        </p>
      )}
    </div>
  );
}

export default function MLEvaluation() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predictions = useMemo(
    () => (Array.isArray(result?.predictions) ? result.predictions : []),
    [result]
  );

  async function handleEvaluate() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await evaluateDemandModel(file);

      // Support services that return either data directly
      // or an Axios response containing data.
      const data = response?.data ?? response;

      if (!data || typeof data !== "object") {
        throw new Error("The API returned an invalid response.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Evaluation failed. Please check that Flask is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <h1>ML Model Evaluation</h1>
      <p style={styles.muted}>
        Evaluate demand forecasting accuracy and inspect prediction errors.
      </p>

      <section style={styles.panel}>
        <h3>Upload dataset</h3>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError("");
          }}
        />
        <button
          onClick={handleEvaluate}
          disabled={loading || !file}
          style={styles.button}
        >
          {loading ? "Evaluating..." : "Evaluate Model"}
        </button>

        {error && (
          <p role="alert" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
      </section>

      {result && (
        <>
          <section style={styles.metricGrid}>
            <MetricCard
              title="MAE"
              value={Number(result.mae).toFixed(3)}
              description="Lower is better"
            />
            <MetricCard
              title="RMSE"
              value={Number(result.rmse).toFixed(3)}
              description="Penalizes large errors"
            />
            <MetricCard
              title="R² Score"
              value={Number(result.r2).toFixed(4)}
              description="Higher is generally better"
            />
            <MetricCard
              title="MAPE"
              value={
                result.mape == null
                  ? "N/A"
                  : `${Number(result.mape).toFixed(2)}%`
              }
              description="Interpret carefully near zero sales"
            />
          </section>

          <section style={styles.panel}>
            <h2>Actual vs. Predicted Sales</h2>
            <p style={styles.muted}>
              Compare the model's predictions with real test-set sales.
            </p>
            <ActualVsPredictedChart predictions={predictions} />
          </section>

          <section style={styles.panel}>
            <h2>Forecast Error Distribution</h2>
            <p style={styles.muted}>
              Error = predicted sales − actual sales. Positive errors mean
              overprediction; negative errors mean underprediction.
            </p>
            <ErrorDistributionChart predictions={predictions} />
          </section>

          <section style={styles.panel}>
            <h2>Model vs. Baseline</h2>
            <p style={styles.muted}>
              Compare mean absolute errors. Lower is better.
            </p>
            <BaselineComparison
              modelMAE={result.mae}
              baselineMAE={result.baseline_mae}
            />
          </section>

          <section style={styles.panel}>
            <h2>Evaluation Summary</h2>
            <p>
              Total rows: <strong>{result.total_rows ?? "N/A"}</strong>
            </p>
            <p>
              Training rows: <strong>{result.training_rows ?? "N/A"}</strong>
            </p>
            <p>
              Testing rows: <strong>{result.testing_rows ?? "N/A"}</strong>
            </p>
            <p>
              Valid prediction records: <strong>{predictions.length}</strong>
            </p>
          </section>
        </>
      )}
    </main>
  );
}

const styles = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
    color: "var(--text-primary, #111827)",
    fontFamily: "Arial, sans-serif",
  },
  muted: {
    color: "var(--text-secondary, #6b7280)",
    lineHeight: 1.5,
  },
  panel: {
    background: "var(--card-bg, #ffffff)",
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    overflow: "hidden",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  metricCard: {
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: 12,
    padding: 18,
  },
  metricValue: {
    fontSize: 28,
    margin: "8px 0",
  },
  button: {
    marginLeft: 12,
    marginTop: 12,
    padding: "10px 18px",
    border: 0,
    borderRadius: 8,
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
  legend: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    margin: "8px 0",
    fontSize: 14,
  },
  legendDot: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginRight: 7,
  },
  histogram: {
    display: "flex",
    alignItems: "end",
    gap: 8,
    minHeight: 200,
    paddingTop: 20,
    overflowX: "auto",
  },
  barColumn: {
    flex: "1 0 35px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "end",
    gap: 5,
  },
  bar: {
    width: "100%",
    minWidth: 18,
    borderRadius: "4px 4px 0 0",
  },
  binLabel: {
    fontSize: 10,
    color: "var(--text-secondary, #6b7280)",
  },
  chartSection: {
    maxWidth: 650,
  },
  barTrack: {
    height: 18,
    background: "#e5e7eb",
    borderRadius: 9,
    overflow: "hidden",
  },
  comparisonBar: {
    height: "100%",
    borderRadius: 9,
    transition: "width 0.3s ease",
  },
};
