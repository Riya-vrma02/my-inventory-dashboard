
import React, { useState } from "react";
import {
  previewSalesCsv,
  downloadCleanedSalesCsv,
} from "../services/api";

export default function DataPreprocessing() {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];

    setFile(null);
    setReport(null);
    setError("");

    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      e.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function handlePreview() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setError("");
    setReport(null);
    setLoading(true);

    try {
      const result = await previewSalesCsv(file);
      setReport(result);
    } catch (err) {
      setError(err.message || "Could not preprocess the CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setError("");
    setDownloading(true);

    try {
      await downloadCleanedSalesCsv(file);
    } catch (err) {
      setError(err.message || "Could not download the cleaned CSV.");
    } finally {
      setDownloading(false);
    }
  }

  const columns =
    report?.preview?.length > 0
      ? Object.keys(report.preview[0])
      : [];

  function displayValue(value, column) {
    if (value == null) return "—";

    if (column === "date") {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    }

    return String(value);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Data Quality</div>
          <h2>Data Preprocessing</h2>

          <p style={{ color: "var(--muted)" }}>
            Validate your data, remove invalid rows and duplicates,
            and download a cleaned CSV.
          </p>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="card">
        <h3>Upload CSV</h3>

        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Supported formats: standard sales CSV
          (sku, quantity_sold, date) and FMCG demand-forecasting CSV
          (Date, Product_Category, Sales_Volume, and related columns).
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={loading || downloading}
        />

        {file && (
          <p style={{ color: "var(--muted)", marginTop: 10 }}>
            Selected file: {file.name}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn"
            type="button"
            onClick={handlePreview}
            disabled={!file || loading || downloading}
          >
            {loading ? "Processing..." : "Preview cleaned data"}
          </button>

          <button
            className="btn"
            type="button"
            onClick={handleDownload}
            disabled={!file || loading || downloading}
          >
            {downloading ? "Preparing..." : "Download cleaned CSV"}
          </button>
        </div>
      </div>

      {report && (
        <>
          <div className="card">
            <h3>Preprocessing summary</h3>

            <p style={{ color: "var(--muted)" }}>
              Dataset type:{" "}
              {report.dataset_type === "forecasting"
                ? "FMCG Demand Forecasting"
                : "Standard Sales"}
            </p>

            <div className="form-row">
              <div className="field">
                <label>Input rows</label>
                <h2>{report.input_rows}</h2>
              </div>

              <div className="field">
                <label>Valid rows</label>
                <h2>{report.valid_rows}</h2>
              </div>

              <div className="field">
                <label>Rejected rows</label>
                <h2>{report.rejected_rows}</h2>
              </div>

              <div className="field">
                <label>Duplicates removed</label>
                <h2>{report.duplicates_removed}</h2>
              </div>
            </div>
          </div>

          {report.rejection_details?.length > 0 && (
            <div className="card">
              <h3>Rejected rows</h3>

              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>CSV row</th>
                      <th>SKU / Category</th>
                      <th>Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.rejection_details.map((item, index) => (
                      <tr key={`${item.row}-${index}`}>
                        <td>{item.row}</td>
                        <td>{item.sku || "—"}</td>
                        <td>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <h3>Cleaned data preview</h3>

            {!report.preview?.length ? (
              <p>No valid rows to preview.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {report.preview.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column}>
                            {displayValue(row[column], column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
