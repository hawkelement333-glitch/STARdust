const trendSignals = [
  {
    title: "Quiet luxury backlash",
    angle: "Personal style is replacing anonymous status dressing.",
    velocity: "+184%",
    posts: "38.4K",
    category: "Style",
    color: "#fffefa",
    script: "Quiet luxury is giving way to loud, personal style. The next flex is not looking expensive. It is looking unmistakably like yourself."
  },
  {
    title: "The 5-to-9 reset",
    angle: "Creators are reclaiming the hours after the workday.",
    velocity: "+122%",
    posts: "21.7K",
    category: "Lifestyle",
    color: "#171714",
    script: "Your five-to-nine matters more than your nine-to-five. The people changing their lives are protecting the hours everyone else gives away."
  },
  {
    title: "AI fatigue gets real",
    angle: "Human texture and imperfect work are becoming the signal.",
    velocity: "+96%",
    posts: "17.1K",
    category: "Culture",
    color: "#ff5b44",
    script: "Perfect content is starting to feel invisible. The next wave looks more human, more specific, and a little less polished."
  },
  {
    title: "Third-place fitness",
    angle: "Social clubs are replacing solo gym routines.",
    velocity: "+73%",
    posts: "12.8K",
    category: "Wellness",
    color: "#d8f45b",
    script: "The hottest fitness benefit is not a six pack. It is having somewhere to go and people who expect you there."
  },
  {
    title: "Mini-vlog receipts",
    angle: "Proof-of-life clips are beating polished recaps.",
    velocity: "+61%",
    posts: "9.6K",
    category: "Format",
    color: "#9ec7ff",
    script: "Stop summarizing the day. Show the tiny receipt that proves it happened. One detail makes a mini vlog feel real."
  },
  {
    title: "No-buy plot twist",
    angle: "People are turning restraint into an identity story.",
    velocity: "+55%",
    posts: "8.3K",
    category: "Money",
    color: "#e8b8f0",
    script: "The no-buy trend is not really about buying nothing. It is about deciding who gets to influence your next decision."
  }
];

const people = [
  { id: "maya", name: "Maya", vibe: "Direct • US English", initials: "MY", gradient: "linear-gradient(145deg,#ff6a4d,#9e2c25)" },
  { id: "noah", name: "Noah", vibe: "Warm • US English", initials: "NO", gradient: "linear-gradient(145deg,#305b70,#96c5cb)" },
  { id: "imani", name: "Imani", vibe: "Bold • UK English", initials: "IM", gradient: "linear-gradient(145deg,#563a78,#c98fcb)" },
  { id: "leo", name: "Leo", vibe: "Playful • US English", initials: "LE", gradient: "linear-gradient(145deg,#576a2e,#cfdb63)" }
];

const sounds = [
  { id: "snap", title: "Snap transition", description: "124 BPM • punchy reveal", lift: "+42% fit", beats: 8 },
  { id: "glow", title: "Soft synth climb", description: "108 BPM • reflective build", lift: "+31% fit", beats: 6 },
  { id: "stomp", title: "Floor tom edit", description: "132 BPM • hard cuts", lift: "+28% fit", beats: 10 }
];

const state = {
  visibleTrends: 3,
  title: trendSignals[0].title,
  topic: trendSignals[0].script,
  hook: "Nobody is talking about what comes next.",
  tone: "confident",
  person: people[0],
  sound: sounds[0],
  pace: 1,
  step: "idea",
  deferredInstall: null
};

const automationState = {
  available: false,
  loading: false,
  data: null,
  queueFilter: "all",
  selectedIds: new Set()
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function renderTrends() {
  const grid = $("#trend-grid");
  grid.innerHTML = trendSignals.slice(0, state.visibleTrends).map((trend, index) => `
    <article class="trend-card reveal" data-trend-index="${index}" style="animation-delay:${index * 0.06}s">
      <div class="trend-card-top">
        <span class="trend-number">0${index + 1} / ${trend.category}</span>
        <span class="velocity">${trend.velocity}</span>
      </div>
      <h3>${trend.title}</h3>
      <p>${trend.angle}</p>
      <div class="trend-footer"><span><b>${trend.posts}</b><br />posts sampled</span><span class="trend-arrow">→</span></div>
    </article>
  `).join("");

  $$(".trend-card", grid).forEach((card) => {
    card.addEventListener("click", () => buildFromTrend(Number(card.dataset.trendIndex)));
  });
}

function renderPeople() {
  $("#people-grid").innerHTML = people.map((person) => `
    <button class="person-card ${person.id === state.person.id ? "active" : ""}" data-person="${person.id}">
      <span class="person-avatar" style="background:${person.gradient}">${person.initials}</span>
      <span><b>${person.name}</b><small>${person.vibe}</small></span>
      <i class="selected-dot"></i>
    </button>
  `).join("");

  $$(".person-card").forEach((card) => card.addEventListener("click", () => {
    state.person = people.find((person) => person.id === card.dataset.person);
    renderPeople();
    updateFinishSummary();
  }));
}

function renderSounds() {
  $("#sound-list").innerHTML = sounds.map((sound) => `
    <button class="sound-card ${sound.id === state.sound.id ? "active" : ""}" data-sound="${sound.id}">
      <span class="sound-play">▶</span>
      <span><b>${sound.title}</b><small>${sound.description}</small></span>
      <span class="sound-meta">${sound.lift}</span>
    </button>
  `).join("");

  $$(".sound-card").forEach((card) => card.addEventListener("click", () => {
    state.sound = sounds.find((sound) => sound.id === card.dataset.sound);
    renderSounds();
    renderWaveform();
    updateFinishSummary();
  }));
}

function renderWaveform() {
  const waveform = $("#waveform");
  const heights = [16, 28, 42, 23, 52, 37, 61, 29, 48, 20, 58, 36, 65, 42, 25, 55, 31, 46, 19, 39, 60, 33, 50, 26, 43, 18, 56, 35, 63, 29, 47, 22, 54, 39, 28, 59];
  const cutEvery = Math.max(3, Math.floor(heights.length / state.sound.beats));
  waveform.innerHTML = heights.map((height, index) => `<i class="wave-bar ${index % cutEvery === 0 ? "cut" : ""}" style="height:${height}px"></i>`).join("");
  $("#beat-count").textContent = `${state.sound.beats} beats`;
}

function getTitleFromTopic() {
  return state.title || "New viral cut";
}

function updatePreview() {
  const title = getTitleFromTopic();
  $("#project-title").textContent = title.slice(0, 42);
  $("#preview-topic").innerHTML = title.toUpperCase().split(" ").reduce((lines, word) => {
    const current = lines[lines.length - 1];
    if (`${current} ${word}`.trim().length > 16) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`.trim();
    return lines;
  }, [""]).slice(0, 3).join("<br />");
  $("#preview-caption").textContent = state.hook;
  $("#duration-label").textContent = state.sound.beats >= 10 ? "00:18" : state.sound.beats <= 6 ? "00:12" : "00:15";
  updateFinishSummary();
}

function updateFinishSummary() {
  const summary = $("#finish-summary");
  if (!summary) return;
  summary.innerHTML = `
    <div class="summary-row"><span>Hook</span><b>${state.hook}</b></div>
    <div class="summary-row"><span>Presenter</span><b>${state.person.name} • ${state.pace.toFixed(1)}×</b></div>
    <div class="summary-row"><span>Sound map</span><b>${state.sound.title} • ${state.sound.beats} cuts</b></div>
    <div class="summary-row"><span>Format</span><b>9:16 • captions on</b></div>
  `;
}

function buildFromTrend(indexOrTitle) {
  const trend = typeof indexOrTitle === "number"
    ? trendSignals[indexOrTitle]
    : trendSignals.find((item) => item.title === indexOrTitle) || trendSignals[0];
  state.topic = trend.script;
  state.title = trend.title;
  $("#topic-input").value = trend.script;
  $("#topic-count").textContent = `${trend.script.length}/180`;
  updatePreview();
  navigate("studio");
  setStep("idea");
  showToast(`Loaded: ${trend.title}`);
}

function navigate(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === viewName));
  window.scrollTo({ top: 0, behavior: "auto" });
  if (viewName === "library") renderLibrary();
  if (viewName === "autopilot") loadAutomation();
}

function setStep(stepName) {
  state.step = stepName;
  $$(".step-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.step === stepName));
  $$(".step-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.stepPanel === stepName));
  if (stepName === "finish") updateFinishSummary();
}

function projectSnapshot() {
  return {
    id: Date.now(),
    title: getTitleFromTopic(),
    topic: state.topic,
    hook: state.hook,
    tone: state.tone,
    person: state.person.name,
    pace: state.pace,
    sound: state.sound.title,
    bpm: state.sound.description.split(" • ")[0],
    beats: state.sound.beats,
    createdAt: new Date().toISOString()
  };
}

function saveProject() {
  const projects = JSON.parse(localStorage.getItem("vyrl-projects") || "[]");
  const project = projectSnapshot();
  projects.unshift(project);
  localStorage.setItem("vyrl-projects", JSON.stringify(projects.slice(0, 20)));
  showToast("Template saved to your library");
}

function renderLibrary() {
  const projects = JSON.parse(localStorage.getItem("vyrl-projects") || "[]");
  const list = $("#library-list");
  if (!projects.length) {
    list.innerHTML = `<div class="empty-state"><span>✦</span><h3>No saved cuts yet</h3><p>Build a template from the Pulse feed, then save it here.</p><button class="small-action" data-nav="pulse">Explore signals</button></div>`;
    $("[data-nav='pulse']", list).addEventListener("click", () => navigate("pulse"));
    return;
  }
  list.innerHTML = projects.map((project) => `
    <article class="project-card">
      <div class="project-thumb"></div>
      <div><h3>${project.title}</h3><p>${project.person} • ${project.sound} • ${new Date(project.createdAt).toLocaleDateString()}</p></div>
      <button data-project-id="${project.id}" aria-label="Open ${project.title}">→</button>
    </article>
  `).join("");
  $$('[data-project-id]', list).forEach((button) => button.addEventListener("click", () => {
    const project = projects.find((item) => String(item.id) === button.dataset.projectId);
    state.topic = project.topic;
    state.title = project.title;
    state.hook = project.hook;
    state.tone = project.tone;
    state.person = people.find((person) => person.name === project.person) || people[0];
    state.sound = sounds.find((sound) => sound.title === project.sound) || sounds[0];
    state.pace = project.pace;
    $("#topic-input").value = state.topic;
    renderPeople();
    renderSounds();
    renderWaveform();
    updatePreview();
    navigate("studio");
  }));
}

function buildSheetText() {
  const duration = state.sound.beats >= 10 ? 18 : state.sound.beats <= 6 ? 12 : 15;
  const beatSpacing = duration / state.sound.beats;
  const cuts = Array.from({ length: state.sound.beats }, (_, index) => `${(index * beatSpacing).toFixed(1)}s`).join(", ");
  return `VYRL STUDIO — CAPCUT BUILD SHEET

PROJECT
${getTitleFromTopic()}

FORMAT
9:16 vertical | 1080 x 1920 | 30 fps | ${duration} seconds

VOICEOVER
${state.hook} ${state.topic}

PRESENTER
${state.person.name} | ${state.person.vibe} | ${state.pace.toFixed(1)}x pace

SOUND PROFILE
${state.sound.title} | ${state.sound.description}
Use a currently licensed sound with a similar energy inside CapCut.

CUT MARKERS
${cuts}

SCENE PLAN
0.0s — Hook: direct-to-camera opener, large title in upper safe zone
${(duration * 0.22).toFixed(1)}s — Proof: add 2-3 supporting clips or screenshots
${(duration * 0.55).toFixed(1)}s — Payoff: return to presenter and reveal the shift
${(duration * 0.86).toFixed(1)}s — CTA: one clear follow/save/comment prompt

CAPCUT CHECKLIST
[ ] Create a ${duration}s 9:16 project
[ ] Add licensed sound and align the first downbeat to 0.0s
[ ] Split visuals at the cut markers above
[ ] Generate auto-captions, then proofread every line
[ ] Keep text inside mobile safe zones
[ ] Confirm music, footage, voice, and likeness rights before posting

Generated by VYRL Studio. Human review required.`;
}

async function exportBuildSheet() {
  const content = buildSheetText();
  const fileName = `${slugify(getTitleFromTopic()) || "vyrl-template"}-capcut-build-sheet.txt`;
  const file = new File([content], fileName, { type: "text/plain" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "CapCut build sheet", text: "Your VYRL edit plan is ready.", files: [file] });
      showToast("Build sheet shared");
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  showToast("CapCut build sheet downloaded");
}

async function copyScript() {
  const script = `${state.hook} ${state.topic}`;
  try {
    await navigator.clipboard.writeText(script);
    showToast("Voiceover copied");
  } catch {
    showToast("Clipboard access is unavailable here");
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Server returned ${response.status}`);
  return data;
}

function formatAutomationDate(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function connectionName(key) {
  return { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", webhook: "Publishing webhook", renderer: "Media renderer" }[key] || key;
}

function connectionIcon(key) {
  return { tiktok: "T", instagram: "I", youtube: "Y", webhook: "↗", renderer: "✦" }[key] || "•";
}

function renderAutomation() {
  if (!automationState.available || !automationState.data) return;
  const { config, queue, connections, mode } = automationState.data;
  const intelligence = automationState.data.intelligence || {};
  $("#automation-live-dot").classList.add("live");
  $("#automation-mode-label").textContent = mode === "live-ready" ? "Live connectors available" : "Sandbox mode";
  $("#automation-status-title").textContent = config.enabled ? "Autopilot is running." : "Autopilot is paused.";
  $("#automation-next-run").textContent = config.enabled
    ? `Next generation run: ${formatAutomationDate(config.nextRunAt)}. Server schedules continue when your phone is closed.`
    : "Turn the schedule on, or generate a batch manually.";

  const metricValues = [
    `${intelligence.averageOpportunity || 0}/100`,
    `${intelligence.predictedRetention || 0}%`,
    `${intelligence.approvalRate || 0}%`,
    String(intelligence.throughput24h || 0)
  ];
  $$("#command-metrics article").forEach((card, index) => { $("strong", card).textContent = metricValues[index]; });
  const opportunities = intelligence.topOpportunities || [];
  $("#opportunity-list").innerHTML = opportunities.length ? opportunities.map((item) => `
    <div class="opportunity-row">
      <span class="opportunity-score">${item.opportunity}</span>
      <span><b>${escapeHtml(item.title)}</b><small>${item.predictedRetention}% retention • ${item.predictedShareRate}% share • ${escapeHtml(item.experiment?.variant || "control")}</small></span>
      <span class="opportunity-label">${escapeHtml(item.label)}</span>
    </div>
  `).join("") : `<div class="empty-state"><p>Generate fresh drafts to populate the opportunity model.</p></div>`;
  $("#model-disclaimer").textContent = intelligence.note || "Predictions are modeled estimates until live platform analytics are connected.";
  $("#experiment-name").textContent = automationState.data.experiments?.name || "No active experiment";
  $("#variant-list").innerHTML = (intelligence.variantStats || []).map((variant) => `
    <div class="variant-row"><span>${escapeHtml(variant.variant)}</span><span class="variant-track"><i style="width:${variant.averageOpportunity}%"></i></span><b>${variant.averageOpportunity || "—"}</b></div>
  `).join("");
  $("#quality-blocks").textContent = String(intelligence.blocked || 0);
  $("#system-health").textContent = mode === "live-ready" ? "Live-ready" : "Operational";
  $("#automation-enabled").checked = config.enabled;
  $("#automation-times").value = config.times.join(", ");
  $("#automation-count").value = String(config.batchSize);
  $("#approval-required").checked = config.approvalRequired;
  $("#auto-post-enabled").checked = config.autoPost;
  $$('[data-platform-choice]').forEach((input) => { input.checked = config.platforms.includes(input.value); });

  const liveCount = Object.entries(connections).filter(([key, value]) => key !== "renderer" && value.connected).length;
  $("#connection-summary").textContent = `${liveCount} live`;
  $("#connection-list").innerHTML = Object.entries(connections).map(([key, connection]) => `
    <article class="connection-card">
      <span class="connection-icon">${connectionIcon(key)}</span>
      <span><b>${connectionName(key)}</b><small>${escapeHtml(connection.detail)}</small></span>
      <span class="connection-state ${connection.connected ? "connected" : ""}">${connection.connected ? "Ready" : "Setup"}</span>
    </article>
  `).join("");

  const queueRoot = $("#automation-queue");
  const visibleQueue = automationState.queueFilter === "all" ? queue : queue.filter((item) => item.status === automationState.queueFilter);
  if (!visibleQueue.length) {
    queueRoot.innerHTML = `<div class="empty-state"><span>✦</span><h3>Your queue is clear</h3><p>Generate a batch now or let the next scheduled run create it.</p></div>`;
    updateBulkActions();
    return;
  }

  queueRoot.innerHTML = visibleQueue.map((item) => {
    const canApprove = item.status === "needs_approval";
    const canPublish = ["needs_approval", "scheduled", "failed", "partial"].includes(item.status);
    const canCancel = !["published", "cancelled", "publishing"].includes(item.status);
    const results = item.publishResults?.length ? item.publishResults.map((result) => `${result.platform}: ${result.ok ? "sent" : "failed"}`).join(" • ") : `${item.presenter} • ${item.sound}`;
    return `
      <article class="queue-card" data-queue-id="${escapeHtml(item.id)}">
        <input class="queue-select" type="checkbox" aria-label="Select ${escapeHtml(item.title)}" ${automationState.selectedIds.has(item.id) ? "checked" : ""} />
        <div class="queue-media"><img src="${escapeHtml(item.mediaPath || "assets/creator-hero.png")}" alt="Generated vertical media for ${escapeHtml(item.title)}" /><span>9:16</span></div>
        <div class="queue-copy">
          <span class="status-pill ${escapeHtml(item.status)}">${escapeHtml(item.status.replaceAll("_", " "))}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.caption)}</p>
          ${item.predictions ? `<div class="prediction-strip"><span>Score ${item.predictions.opportunity}</span><span>${item.predictions.predictedRetention}% retention</span><span>${item.predictions.confidence}% confidence</span><span>${escapeHtml(item.experiment?.variant || "control")}</span></div>` : ""}
          <div class="queue-meta"><span>${formatAutomationDate(item.scheduledAt)}</span><span>${escapeHtml(results)}</span></div>
        </div>
        <div class="queue-actions">
          ${canApprove ? `<button class="queue-action primary" data-queue-action="approve">Approve</button>` : ""}
          ${canPublish ? `<button class="queue-action ${canApprove ? "" : "primary"}" data-queue-action="publish">Publish now</button>` : ""}
          ${canCancel ? `<button class="queue-action" data-queue-action="cancel">Cancel</button>` : ""}
        </div>
      </article>`;
  }).join("");

  $$(".queue-select", queueRoot).forEach((checkbox) => checkbox.addEventListener("change", () => {
    const id = checkbox.closest("[data-queue-id]").dataset.queueId;
    if (checkbox.checked) automationState.selectedIds.add(id);
    else automationState.selectedIds.delete(id);
    updateBulkActions();
  }));

  $$('[data-queue-action]', queueRoot).forEach((button) => button.addEventListener("click", async () => {
    const card = button.closest("[data-queue-id]");
    button.disabled = true;
    try {
      automationState.data = await apiRequest(`/api/automation/queue/${encodeURIComponent(card.dataset.queueId)}/${button.dataset.queueAction}`, { method: "POST" });
      renderAutomation();
      showToast(button.dataset.queueAction === "cancel" ? "Queue item cancelled" : "Queue updated");
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  }));
  updateBulkActions();
}

function updateBulkActions() {
  const count = automationState.selectedIds.size;
  $("#selection-count").textContent = `${count} selected`;
  $("#bulk-approve").disabled = count === 0;
  $("#bulk-publish").disabled = count === 0;
}

async function runBulkAction(action) {
  if (!automationState.selectedIds.size) return;
  try {
    automationState.data = await apiRequest("/api/automation/bulk", {
      method: "POST",
      body: JSON.stringify({ action, ids: [...automationState.selectedIds] })
    });
    automationState.selectedIds.clear();
    renderAutomation();
    showToast(action === "publish" ? "Selected posts published" : "Selected posts approved");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAutomation(silent = false) {
  if (automationState.loading) return;
  automationState.loading = true;
  try {
    automationState.data = await apiRequest("/api/automation");
    automationState.available = true;
    renderAutomation();
  } catch (error) {
    automationState.available = false;
    $("#automation-live-dot").classList.remove("live");
    $("#automation-mode-label").textContent = "Server offline";
    $("#automation-status-title").textContent = "Start the Autopilot server.";
    $("#automation-next-run").textContent = "Run start.ps1 instead of a static file server to enable scheduled generation and publishing.";
    $("#automation-queue").innerHTML = `<div class="server-offline"><b>Autopilot API is unavailable.</b><br />Start the app with <code>.\\start.ps1</code>. The visual editor still works without the server.</div>`;
    if (!silent) showToast(error.message);
  } finally {
    automationState.loading = false;
  }
}

async function saveAutomationConfig() {
  const times = $("#automation-times").value.split(",").map((value) => value.trim()).filter(Boolean);
  const platforms = $$('[data-platform-choice]:checked').map((input) => input.value);
  const button = $("#save-automation");
  button.disabled = true;
  try {
    automationState.data = await apiRequest("/api/automation/config", {
      method: "PUT",
      body: JSON.stringify({
        enabled: $("#automation-enabled").checked,
        times,
        batchSize: Number($("#automation-count").value),
        approvalRequired: $("#approval-required").checked,
        autoPost: $("#auto-post-enabled").checked,
        platforms,
        niche: $("#niche-select").value
      })
    });
    renderAutomation();
    showToast("Autopilot settings saved");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function runAutomation(endpoint, message, body = {}) {
  const button = endpoint.endsWith("run") ? $("#run-autopilot") : $("#generate-batch");
  button.disabled = true;
  try {
    const result = await apiRequest(endpoint, { method: "POST", body: JSON.stringify(body) });
    automationState.data = result.state;
    automationState.available = true;
    renderAutomation();
    showToast(message);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

function wireEvents() {
  $$('[data-nav]').forEach((button) => button.addEventListener("click", () => navigate(button.dataset.nav)));
  $$(".step-tab").forEach((tab) => tab.addEventListener("click", () => setStep(tab.dataset.step)));
  $$(".next-step").forEach((button) => button.addEventListener("click", () => setStep(button.dataset.nextStep)));
  $$('[data-quick-build]').forEach((button) => button.addEventListener("click", () => buildFromTrend(button.dataset.quickBuild)));

  $("#topic-input").addEventListener("input", (event) => {
    state.topic = event.target.value;
    $("#topic-count").textContent = `${event.target.value.length}/180`;
    updatePreview();
  });
  $("#tone-select").addEventListener("change", (event) => { state.tone = event.target.value; });
  $("#pace-slider").addEventListener("input", (event) => {
    state.pace = Number(event.target.value);
    $("#pace-value").textContent = `${state.pace.toFixed(1)}× natural`;
    updateFinishSummary();
  });
  $$(".hook-chip").forEach((chip) => chip.addEventListener("click", () => {
    $$(".hook-chip").forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    state.hook = chip.dataset.hook;
    updatePreview();
  }));

  $("#play-preview").addEventListener("click", () => {
    const progress = $("#preview-progress-bar");
    progress.classList.remove("playing");
    void progress.offsetWidth;
    progress.classList.add("playing");
    $("#play-preview").style.opacity = "0";
    window.setTimeout(() => { $("#play-preview").style.opacity = "1"; }, 4000);
  });

  $("#save-project").addEventListener("click", saveProject);
  $("#export-capcut").addEventListener("click", exportBuildSheet);
  $("#copy-script").addEventListener("click", copyScript);
  $("#save-automation").addEventListener("click", saveAutomationConfig);
  $("#run-autopilot").addEventListener("click", () => runAutomation("/api/automation/run", "Autopilot generated a new run"));
  $("#generate-batch").addEventListener("click", () => runAutomation("/api/automation/generate", "Three drafts added to the queue", { count: 3 }));
  $$("[data-queue-filter]").forEach((button) => button.addEventListener("click", () => {
    automationState.queueFilter = button.dataset.queueFilter;
    $$("[data-queue-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderAutomation();
  }));
  $("#bulk-approve").addEventListener("click", () => runBulkAction("approve"));
  $("#bulk-publish").addEventListener("click", () => runBulkAction("publish"));

  $("#see-all-trends").addEventListener("click", () => {
    state.visibleTrends = state.visibleTrends === 3 ? trendSignals.length : 3;
    $("#see-all-trends").textContent = state.visibleTrends === 3 ? "See all" : "Show less";
    renderTrends();
  });

  $("#refresh-trends").addEventListener("click", () => {
    $("#signals-count").textContent = String(24 + Math.floor(Math.random() * 8));
    showToast("Demo radar refreshed");
  });

  $("#install-app").addEventListener("click", async () => {
    if (state.deferredInstall) {
      state.deferredInstall.prompt();
      await state.deferredInstall.userChoice;
      state.deferredInstall = null;
    } else {
      showToast("On iPhone: Share → Add to Home Screen");
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstall = event;
  });
}

function initialize() {
  renderTrends();
  renderPeople();
  renderSounds();
  renderWaveform();
  updatePreview();
  wireEvents();
  loadAutomation(true);
  window.setInterval(() => {
    if ($("#view-autopilot").classList.contains("active")) loadAutomation(true);
  }, 20000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

initialize();
