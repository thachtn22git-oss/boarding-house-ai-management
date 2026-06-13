const examples = [
  "The room is very beautiful.",
  "The Wi-Fi is very slow.",
  "There are sparks from the socket.",
  "I have a question about my invoice.",
  "The hallway is dirty.",
  "The door lock is broken.",
];

const charts = {
  sentimentDistribution: null,
  categoryDistribution: null,
  priorityDistribution: null,
  modelPerformance: null,
};

let dashboardInitialized = false;

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function setStatus(message) {
  document.getElementById("analyze-status").textContent = message;
}

function makeBadge(value) {
  return `<span class="badge ${value}">${titleCase(value)}</span>`;
}

function renderResult(data) {
  const resultGrid = document.getElementById("result-grid");
  const confidenceList = document.getElementById("confidence-list");
  const warningBox = document.getElementById("warning-box");
  const confidenceValues = [
    ["Sentiment confidence", data.confidence.sentiment],
    ["Category confidence", data.confidence.category],
    ["Priority confidence", data.confidence.priority],
  ];
  const isLowConfidence = confidenceValues.some(([, value]) => Number(value) < 0.55);

  resultGrid.innerHTML = `
    <div class="result-card">
      <span>Sentiment</span>
      <strong>${makeBadge(data.sentiment)}</strong>
    </div>
    <div class="result-card">
      <span>Category</span>
      <strong>${makeBadge(data.category)}</strong>
    </div>
    <div class="result-card">
      <span>Priority</span>
      <strong>${makeBadge(data.priority)}</strong>
    </div>
    <div class="result-card summary-card">
      <span>Summary</span>
      <strong>${data.summary}</strong>
    </div>
    <div class="result-card summary-card">
      <span>Suggested Resolution</span>
      <strong>${data.suggested_resolution || "Not available"}</strong>
    </div>
    <div class="result-card summary-card">
      <span>Suggested Reply</span>
      <strong>${data.suggested_reply || "Not available"}</strong>
    </div>
  `;

  confidenceList.innerHTML = confidenceValues
    .map(
      ([label, value]) => `
        <div class="confidence-row">
          <div class="confidence-label">
            <span>${label}</span>
            <span>${asPercent(value)}</span>
          </div>
          <div class="confidence-track">
            <div class="confidence-fill" style="width: ${asPercent(value)}"></div>
          </div>
        </div>
      `,
    )
    .join("");

  warningBox.classList.toggle("hidden", !isLowConfidence);
  resultGrid.classList.remove("hidden");
  confidenceList.classList.remove("hidden");
}

async function analyzeFeedback() {
  const textarea = document.getElementById("feedback-input");
  const button = document.getElementById("analyze-button");
  const content = textarea.value.trim();

  if (!content) {
    setStatus("Please enter feedback text.");
    return;
  }

  button.disabled = true;
  button.textContent = "Analyzing...";
  setStatus("Running local models...");

  try {
    const response = await fetch("/api/feedback/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Unable to analyze feedback.");
    }

    const data = await response.json();
    renderResult(data);
    setStatus("Analysis complete.");
  } catch (error) {
    setStatus(error.message || "Unable to analyze feedback.");
  } finally {
    button.disabled = false;
    button.textContent = "Analyze Feedback";
  }
}

function renderExamples() {
  const container = document.getElementById("example-grid");
  container.innerHTML = examples
    .map(
      (example) => `
        <button class="example-card" type="button" data-example="${example}">
          ${example}
        </button>
      `,
    )
    .join("");

  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-example]");
    if (!button) return;
    document.getElementById("feedback-input").value = button.dataset.example;
    analyzeFeedback();
  });
}

function chartColors(labels) {
  const palette = {
    positive: "#16A34A",
    neutral: "#94A3B8",
    negative: "#DC2626",
    low: "#94A3B8",
    medium: "#2563EB",
    high: "#F59E0B",
    urgent: "#DC2626",
    electricity: "#F97316",
    water: "#0EA5E9",
    internet: "#8B5CF6",
    security: "#EF4444",
    cleanliness: "#22C55E",
    maintenance: "#F59E0B",
    billing: "#06B6D4",
    other: "#64748B",
  };
  return labels.map((label) => palette[label] || "#2563EB");
}

function createChart(chartKey, canvasId, config) {
  if (charts[chartKey]) {
    charts[chartKey].destroy();
  }
  charts[chartKey] = new Chart(document.getElementById(canvasId), config);
}

function renderDistributionChart(chartKey, canvasId, type, distribution, label, options = {}) {
  const labels = Object.keys(distribution);
  const values = Object.values(distribution);
  const isBarChart = type === "bar";
  const isHorizontal = options.horizontal === true;

  createChart(chartKey, canvasId, {
    type,
    data: {
      labels: labels.map(titleCase),
      datasets: [
        {
          label,
          data: values,
          backgroundColor: chartColors(labels),
          borderRadius: type === "bar" ? 8 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontal ? "y" : "x",
      plugins: {
        legend: {
          display: !isBarChart,
          position: "bottom",
        },
      },
      scales: isBarChart
        ? {
            x: {
              beginAtZero: true,
            },
            y: {
              beginAtZero: !isHorizontal,
              ticks: {
                autoSkip: false,
              },
            },
          }
        : undefined,
    },
  });
}

function renderPerformanceChart(metrics) {
  const tasks = ["sentiment", "category", "priority"];
  createChart("modelPerformance", "performance-chart", {
    type: "bar",
    data: {
      labels: tasks.map(titleCase),
      datasets: [
        {
          label: "Accuracy",
          data: tasks.map((task) => metrics[task]?.accuracy || 0),
          backgroundColor: "#2563EB",
          borderRadius: 8,
        },
        {
          label: "Macro F1",
          data: tasks.map((task) => metrics[task]?.macro_f1 || 0),
          backgroundColor: "#16A34A",
          borderRadius: 8,
        },
        {
          label: "Weighted F1",
          data: tasks.map((task) => metrics[task]?.weighted_f1 || 0),
          backgroundColor: "#F59E0B",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: { y: { beginAtZero: true, max: 1 } },
    },
  });
}

function renderModelFiles(info) {
  const container = document.getElementById("model-files");
  container.innerHTML = Object.entries(info.models)
    .map(
      ([name, model]) => `
        <div class="model-file">
          <strong>${titleCase(name)} model</strong>
          <span class="badge ${model.exists ? "positive" : "negative"}">
            ${model.exists ? "Available" : "Missing"}
          </span>
        </div>
      `,
    )
    .join("");
}

async function loadDashboardData() {
  const [infoResponse, statsResponse, metricsResponse] = await Promise.all([
    fetch("/api/model/info"),
    fetch("/api/model/dataset-stats"),
    fetch("/api/model/metrics"),
  ]);

  const info = await infoResponse.json();
  const stats = await statsResponse.json();
  const metrics = await metricsResponse.json();

  document.getElementById("dataset-size").textContent = `${stats.total_rows} dataset rows`;
  renderModelFiles(info);
  renderDistributionChart(
    "sentimentDistribution",
    "sentiment-chart",
    "pie",
    stats.sentiment_distribution,
    "Sentiment",
  );
  renderDistributionChart(
    "categoryDistribution",
    "category-chart",
    "bar",
    stats.category_distribution,
    "Category",
    { horizontal: true },
  );
  renderDistributionChart(
    "priorityDistribution",
    "priority-chart",
    "pie",
    stats.priority_distribution,
    "Priority",
  );

  if (!metrics.message) {
    renderPerformanceChart(metrics);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (dashboardInitialized) {
    return;
  }
  dashboardInitialized = true;

  renderExamples();
  document.getElementById("analyze-button").addEventListener("click", analyzeFeedback);
  loadDashboardData().catch((error) => {
    console.error("Dashboard data failed to load.", error);
    setStatus("Dashboard data failed to load.");
  });
});
