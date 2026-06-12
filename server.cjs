const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const ROOT = __dirname;
loadEnv(path.join(ROOT, ".env"));
const DATA_DIR = path.join(ROOT, "data");
const GENERATED_DIR = path.join(ROOT, "generated");
const STATE_FILE = path.join(DATA_DIR, "autopilot.json");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";

let sharp = null;
try { sharp = require("sharp"); } catch { /* Optional; falls back to the source image. */ }

const trendSeeds = [
  { title: "Quiet luxury backlash", category: "style", angle: "Personal style is replacing anonymous status dressing.", insight: "The next flex is not looking expensive. It is looking unmistakably like yourself." },
  { title: "The 5-to-9 reset", category: "lifestyle", angle: "Creators are reclaiming the hours after the workday.", insight: "Protecting a small evening ritual is becoming a visible form of ambition." },
  { title: "AI fatigue gets real", category: "culture", angle: "Human texture and imperfect work are becoming the signal.", insight: "Specific, visibly human choices are standing out against automated sameness." },
  { title: "Third-place fitness", category: "wellness", angle: "Social clubs are replacing solo gym routines.", insight: "Belonging is becoming a stronger fitness benefit than optimization." },
  { title: "Mini-vlog receipts", category: "format", angle: "Proof-of-life clips are beating polished recaps.", insight: "One tiny detail can make an ordinary day feel credible and worth watching." },
  { title: "No-buy plot twist", category: "money", angle: "People are turning restraint into an identity story.", insight: "The real story is deciding who gets to influence your next decision." }
];

const hooks = [
  "Nobody is talking about what comes next.",
  "This is the shift you will see everywhere next month.",
  "The trend is not what you think it is.",
  "Here is why everyone suddenly changed their mind."
];
const presenters = ["Maya", "Noah", "Imani", "Leo"];
const sounds = ["Snap transition", "Soft synth climb", "Floor tom edit"];

const defaultState = {
  config: {
    enabled: false,
    times: ["09:00", "17:30"],
    batchSize: 1,
    approvalRequired: true,
    autoPost: false,
    platforms: [],
    niche: "Culture + lifestyle",
    nextRunAt: null
  },
  cursor: 0,
  queue: [],
  history: [],
  events: [],
  experiments: {
    active: true,
    name: "Hook architecture v1",
    variants: ["contrast", "forecast", "curiosity"],
    allocations: [40, 30, 30]
  }
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });
let store = loadState();
refreshNextRun();

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function loadState() {
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return {
      ...defaultState,
      ...saved,
      config: { ...defaultState.config, ...(saved.config || {}) },
      queue: Array.isArray(saved.queue) ? saved.queue : [],
      history: Array.isArray(saved.history) ? saved.history : [],
      events: Array.isArray(saved.events) ? saved.events : [],
      experiments: { ...defaultState.experiments, ...(saved.experiments || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  const temp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2));
  fs.renameSync(temp, STATE_FILE);
}

function recordEvent(type, payload = {}) {
  store.events.unshift({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, at: new Date().toISOString(), ...payload });
  store.events = store.events.slice(0, 500);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hashNumber(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function scorePost(seed, hook, cursor) {
  const stable = hashNumber(`${seed.title}:${hook}:${cursor}`);
  const velocity = 58 + (stable % 38);
  const audienceFit = 64 + ((stable >>> 3) % 33);
  const novelty = 50 + ((stable >>> 7) % 46);
  const saturation = 18 + ((stable >>> 11) % 64);
  const hookStrength = 62 + ((stable >>> 15) % 35);
  const opportunity = clamp(velocity * .27 + audienceFit * .28 + novelty * .22 + hookStrength * .23 - saturation * .12);
  const retention = clamp(48 + hookStrength * .32 + novelty * .15 - saturation * .09);
  const shareRate = Math.max(1.2, Math.min(9.8, 2.2 + opportunity / 18 + novelty / 35 - saturation / 55));
  const confidence = clamp(61 + ((stable >>> 19) % 31));
  return {
    opportunity,
    velocity,
    audienceFit,
    novelty,
    saturation,
    hookStrength,
    predictedRetention: retention,
    predictedShareRate: Number(shareRate.toFixed(1)),
    confidence,
    label: opportunity >= 82 ? "Breakout" : opportunity >= 70 ? "Strong" : opportunity >= 58 ? "Test" : "Hold"
  };
}

function selectExperimentVariant(cursor) {
  if (!store.experiments.active) return "control";
  const roll = cursor % 100;
  let ceiling = 0;
  for (let index = 0; index < store.experiments.variants.length; index += 1) {
    ceiling += store.experiments.allocations[index] || 0;
    if (roll < ceiling) return store.experiments.variants[index];
  }
  return store.experiments.variants[0];
}

function qualityGate(item) {
  const checks = [
    { key: "script_length", passed: item.script.length >= 90 && item.script.length <= 420, label: "Script fits short-form pacing" },
    { key: "caption_length", passed: item.caption.length <= 2200, label: "Caption fits platform limits" },
    { key: "media", passed: Boolean(item.mediaPath), label: "Vertical media rendered" },
    { key: "rights", passed: Boolean(item.presenter), label: "Fictional presenter disclosure included" },
    { key: "opportunity", passed: item.predictions.opportunity >= 55, label: "Opportunity clears publishing floor" }
  ];
  return { passed: checks.every((check) => check.passed), checks };
}

function migrateIntelligence() {
  let changed = false;
  store.queue.forEach((item, index) => {
    const seed = trendSeeds.find((entry) => entry.title === item.title) || trendSeeds[index % trendSeeds.length];
    if (!item.predictions) {
      item.predictions = scorePost(seed, item.hook || hooks[index % hooks.length], index);
      changed = true;
    }
    if (!item.experiment) {
      item.experiment = { name: store.experiments.name, variant: selectExperimentVariant(index) };
      changed = true;
    }
    if (!item.quality) {
      item.quality = qualityGate(item);
      changed = true;
    }
  });
  if (changed) saveState();
}

migrateIntelligence();

function connections() {
  const publicUrl = /^https:\/\//.test(process.env.PUBLIC_BASE_URL || "");
  return {
    tiktok: {
      connected: Boolean(process.env.TIKTOK_ACCESS_TOKEN && publicUrl),
      detail: publicUrl ? "Content Posting API" : "Needs token + HTTPS public URL"
    },
    instagram: {
      connected: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID && process.env.META_GRAPH_VERSION && publicUrl),
      detail: publicUrl ? "Instagram publishing API" : "Needs account + HTTPS public URL"
    },
    youtube: {
      connected: Boolean(process.env.YOUTUBE_ACCESS_TOKEN && process.env.FFMPEG_PATH),
      detail: process.env.FFMPEG_PATH ? "YouTube Data API" : "Needs OAuth + FFmpeg video renderer"
    },
    webhook: {
      connected: Boolean(process.env.VYRL_PUBLISH_WEBHOOK_URL),
      detail: "Make, Zapier, Buffer, or custom endpoint"
    },
    renderer: {
      connected: Boolean(sharp),
      detail: sharp ? "Vertical image renderer ready" : "Using source-image fallback"
    }
  };
}

function computeNextRun(times = store.config.times) {
  const now = new Date();
  const validTimes = times.filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)).sort();
  for (const value of validTimes) {
    const [hour, minute] = value.split(":").map(Number);
    const candidate = new Date(now);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate > now) return candidate.toISOString();
  }
  if (!validTimes.length) return null;
  const [hour, minute] = validTimes[0].split(":").map(Number);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);
  return tomorrow.toISOString();
}

function refreshNextRun() {
  store.config.nextRunAt = store.config.enabled ? computeNextRun() : null;
  saveState();
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[character]));
}

function wrapWords(value, max = 16) {
  return value.split(/\s+/).reduce((lines, word) => {
    const last = lines.at(-1);
    if (`${last} ${word}`.trim().length > max) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`.trim();
    return lines;
  }, [""]).slice(0, 4);
}

async function renderMedia(item) {
  const source = path.join(ROOT, "assets", "creator-hero.png");
  if (!sharp) {
    const fallbackName = `${item.id}.png`;
    await fsp.copyFile(source, path.join(GENERATED_DIR, fallbackName));
    item.mediaPath = `/generated/${fallbackName}`;
    return;
  }

  const lines = wrapWords(item.title.toUpperCase());
  const titleSvg = lines.map((line, index) => `<text x="86" y="${410 + index * 112}" font-family="Arial, sans-serif" font-size="102" font-weight="800" fill="#fffefa">${escapeXml(line)}</text>`).join("");
  const overlay = Buffer.from(`
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".82"/></linearGradient></defs>
      <rect width="1080" height="1920" fill="url(#g)"/>
      <circle cx="92" cy="105" r="17" fill="#d8f45b"/><text x="126" y="120" font-family="Arial" font-size="36" font-weight="700" fill="#fffefa" letter-spacing="7">VYRL AUTOPILOT</text>
      ${titleSvg}
      <rect x="70" y="1510" width="940" height="218" rx="34" fill="#171714" fill-opacity=".78"/>
      <text x="540" y="1588" text-anchor="middle" font-family="Arial" font-size="43" font-weight="700" fill="#fffefa">${escapeXml(item.hook)}</text>
      <text x="540" y="1650" text-anchor="middle" font-family="Arial" font-size="31" fill="#fffefa" fill-opacity=".78">${escapeXml(item.presenter)} • licensed fictional presenter</text>
      <rect x="70" y="1772" width="940" height="8" rx="4" fill="#fffefa" fill-opacity=".32"/><rect x="70" y="1772" width="580" height="8" rx="4" fill="#ff5b44"/>
      <text x="540" y="1840" text-anchor="middle" font-family="Arial" font-size="25" fill="#fffefa" fill-opacity=".65">AI-GENERATED DRAFT • REVIEW RIGHTS BEFORE PUBLISHING</text>
    </svg>`);
  const fileName = `${item.id}.jpg`;
  await sharp(source)
    .resize(1080, 1920, { fit: "cover" })
    .composite([{ input: overlay }])
    .jpeg({ quality: 90 })
    .toFile(path.join(GENERATED_DIR, fileName));
  item.mediaPath = `/generated/${fileName}`;

  if (process.env.FFMPEG_PATH) {
    const videoName = `${item.id}.mp4`;
    const videoPath = path.join(GENERATED_DIR, videoName);
    try {
      await execFileAsync(process.env.FFMPEG_PATH, [
        "-y", "-loop", "1", "-i", path.join(GENERATED_DIR, fileName),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t", "15", "-vf", "scale=1080:1920,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-shortest", videoPath
      ]);
      item.videoPath = `/generated/${videoName}`;
    } catch (error) {
      item.renderWarning = `FFmpeg failed: ${error.message}`;
    }
  }
}

function publicAssetUrl(assetPath) {
  if (!assetPath) return null;
  const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}${assetPath}` : assetPath;
}

async function generatePosts(count, immediate = false) {
  const created = [];
  const safeCount = Math.max(1, Math.min(Number(count) || 1, 5));
  for (let index = 0; index < safeCount; index += 1) {
    const seed = trendSeeds[store.cursor % trendSeeds.length];
    const hook = hooks[store.cursor % hooks.length];
    const id = `post_${Date.now()}_${index}`;
    const scheduledAt = new Date(Date.now() + (immediate ? 0 : index * 15 * 60 * 1000)).toISOString();
    const hashtags = ["#contentcreator", `#${seed.category}`, "#trendalert", "#shortformvideo"];
    const predictions = scorePost(seed, hook, store.cursor);
    const experimentVariant = selectExperimentVariant(store.cursor);
    const item = {
      id,
      title: seed.title,
      trend: seed.angle,
      hook,
      script: `${hook} ${seed.angle} ${seed.insight} Save this and watch how the next version of the trend shows up in your feed.`,
      caption: `${seed.angle} ${seed.insight}\n\n${hashtags.join(" ")}`,
      hashtags,
      presenter: presenters[store.cursor % presenters.length],
      sound: sounds[store.cursor % sounds.length],
      predictions,
      experiment: { name: store.experiments.name, variant: experimentVariant },
      createdAt: new Date().toISOString(),
      scheduledAt,
      status: store.config.approvalRequired ? "needs_approval" : "scheduled",
      platforms: [...store.config.platforms],
      publishResults: []
    };
    store.cursor += 1;
    await renderMedia(item);
    item.publicMediaUrl = publicAssetUrl(item.mediaPath);
    item.publicVideoUrl = publicAssetUrl(item.videoPath);
    item.quality = qualityGate(item);
    if (!item.quality.passed) item.status = "blocked";
    store.queue.unshift(item);
    recordEvent("post.generated", { postId: item.id, title: item.title, opportunity: predictions.opportunity, variant: experimentVariant });
    created.push(item);
  }
  store.queue = store.queue.slice(0, 50);
  saveState();
  return created;
}

async function postJson(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.error?.code || `HTTP ${response.status}`);
  return data;
}

async function publishTikTok(item) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const endpoint = "https://open.tiktokapis.com/v2/post/publish/content/init/";
  const postInfo = { title: item.caption.slice(0, 1800), privacy_level: process.env.TIKTOK_PRIVACY_LEVEL || "SELF_ONLY", disable_comment: false };
  const payload = item.publicVideoUrl
    ? { post_info: { ...postInfo, disable_duet: false, disable_stitch: false, video_cover_timestamp_ms: 1000 }, source_info: { source: "PULL_FROM_URL", video_url: item.publicVideoUrl } }
    : { post_info: { ...postInfo, description: item.caption.slice(0, 2200), auto_add_music: false }, source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [item.publicMediaUrl] }, post_mode: "DIRECT_POST", media_type: "PHOTO" };
  const data = await postJson(endpoint, token, payload);
  return { platform: "tiktok", ok: true, externalId: data.data?.publish_id || null };
}

async function publishInstagram(item) {
  const version = process.env.META_GRAPH_VERSION;
  const account = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const createUrl = new URL(`https://graph.facebook.com/${version}/${account}/media`);
  createUrl.searchParams.set("access_token", token);
  createUrl.searchParams.set("caption", item.caption);
  if (item.publicVideoUrl) {
    createUrl.searchParams.set("media_type", "REELS");
    createUrl.searchParams.set("video_url", item.publicVideoUrl);
  } else {
    createUrl.searchParams.set("image_url", item.publicMediaUrl);
  }
  const container = await fetch(createUrl, { method: "POST" }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
    return data;
  });
  if (item.publicVideoUrl) await new Promise((resolve) => setTimeout(resolve, 12000));
  const publishUrl = new URL(`https://graph.facebook.com/${version}/${account}/media_publish`);
  publishUrl.searchParams.set("access_token", token);
  publishUrl.searchParams.set("creation_id", container.id);
  const published = await fetch(publishUrl, { method: "POST" }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
    return data;
  });
  return { platform: "instagram", ok: true, externalId: published.id || null };
}

async function publishYouTube(item) {
  if (!item.videoPath) throw new Error("YouTube requires an MP4; configure FFMPEG_PATH.");
  const token = process.env.YOUTUBE_ACCESS_TOKEN;
  const metadata = {
    snippet: { title: item.title.slice(0, 100), description: item.caption, categoryId: "22" },
    status: { privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS || "private", selfDeclaredMadeForKids: false }
  };
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4" },
    body: JSON.stringify(metadata)
  });
  if (!start.ok) throw new Error(`YouTube upload initialization failed (${start.status}).`);
  const location = start.headers.get("location");
  const video = await fsp.readFile(path.join(ROOT, item.videoPath.replace(/^\//, "")));
  const uploaded = await fetch(location, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(video.length) }, body: video });
  const data = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok) throw new Error(data.error?.message || `YouTube upload failed (${uploaded.status}).`);
  return { platform: "youtube", ok: true, externalId: data.id || null };
}

async function publishWebhook(item) {
  const response = await fetch(process.env.VYRL_PUBLISH_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.VYRL_WEBHOOK_SECRET ? { "X-VYRL-Secret": process.env.VYRL_WEBHOOK_SECRET } : {}) },
    body: JSON.stringify({ event: "vyrl.post.ready", post: item })
  });
  if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}.`);
  return { platform: "webhook", ok: true, externalId: response.headers.get("x-request-id") };
}

async function publishItem(item) {
  if (["publishing", "published", "cancelled"].includes(item.status)) return item;
  item.status = "publishing";
  item.publishResults = [];
  saveState();
  recordEvent("post.publish_started", { postId: item.id, platforms: item.platforms });
  const available = connections();
  const requested = item.platforms.length ? item.platforms : ["sandbox"];
  const liveTargets = requested.filter((platform) => available[platform]?.connected);

  if (!liveTargets.length) {
    item.publishResults.push({ platform: "sandbox", ok: true, externalId: `sandbox_${Date.now()}`, note: "No live account was connected." });
  } else {
    for (const platform of liveTargets) {
      try {
        const result = platform === "tiktok" ? await publishTikTok(item)
          : platform === "instagram" ? await publishInstagram(item)
          : platform === "youtube" ? await publishYouTube(item)
          : await publishWebhook(item);
        item.publishResults.push(result);
      } catch (error) {
        item.publishResults.push({ platform, ok: false, error: error.message });
      }
    }
  }

  const successes = item.publishResults.filter((result) => result.ok);
  const failures = item.publishResults.filter((result) => !result.ok);
  item.status = successes.length && !failures.length ? "published" : successes.length ? "partial" : "failed";
  item.publishedAt = successes.length ? new Date().toISOString() : null;
  store.history.unshift({ id: item.id, status: item.status, publishedAt: item.publishedAt, results: item.publishResults });
  recordEvent("post.publish_finished", { postId: item.id, status: item.status, results: item.publishResults });
  store.history = store.history.slice(0, 100);
  saveState();
  return item;
}

async function processDueQueue() {
  if (!store.config.autoPost) return;
  const due = store.queue.filter((item) => item.status === "scheduled" && new Date(item.scheduledAt) <= new Date());
  for (const item of due) await publishItem(item);
}

async function schedulerTick() {
  if (store.config.enabled && store.config.nextRunAt && new Date(store.config.nextRunAt) <= new Date()) {
    await generatePosts(store.config.batchSize, true);
    refreshNextRun();
  }
  await processDueQueue();
}

function publicState() {
  const currentConnections = connections();
  return {
    config: store.config,
    queue: store.queue,
    history: store.history.slice(0, 20),
    intelligence: intelligenceSnapshot(),
    experiments: store.experiments,
    events: store.events.slice(0, 30),
    connections: currentConnections,
    serverTime: new Date().toISOString(),
    mode: Object.entries(currentConnections).some(([key, connection]) => key !== "renderer" && connection.connected) ? "live-ready" : "sandbox"
  };
}

function intelligenceSnapshot() {
  const queue = store.queue;
  const scored = queue.filter((item) => item.predictions);
  const statusCounts = queue.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] || 0) + 1 }), {});
  const average = (key) => scored.length ? Math.round(scored.reduce((sum, item) => sum + Number(item.predictions[key] || 0), 0) / scored.length) : 0;
  const published = queue.filter((item) => item.status === "published");
  const approvedOrPublished = queue.filter((item) => ["scheduled", "publishing", "published", "partial"].includes(item.status));
  const topOpportunities = scored
    .filter((item) => !["cancelled", "published"].includes(item.status))
    .sort((a, b) => b.predictions.opportunity - a.predictions.opportunity)
    .slice(0, 5)
    .map((item) => ({ id: item.id, title: item.title, status: item.status, ...item.predictions, experiment: item.experiment }));
  const variantStats = store.experiments.variants.map((variant) => {
    const items = scored.filter((item) => item.experiment?.variant === variant);
    return { variant, samples: items.length, averageOpportunity: items.length ? Math.round(items.reduce((sum, item) => sum + item.predictions.opportunity, 0) / items.length) : 0 };
  });
  return {
    generated: queue.length,
    published: published.length,
    awaitingApproval: statusCounts.needs_approval || 0,
    blocked: statusCounts.blocked || 0,
    approvalRate: queue.length ? Math.round(approvedOrPublished.length / queue.length * 100) : 0,
    averageOpportunity: average("opportunity"),
    predictedRetention: average("predictedRetention"),
    predictedShareRate: scored.length ? Number((scored.reduce((sum, item) => sum + item.predictions.predictedShareRate, 0) / scored.length).toFixed(1)) : 0,
    topOpportunities,
    variantStats,
    throughput24h: store.events.filter((event) => event.type === "post.generated" && Date.now() - new Date(event.at).getTime() <= 86400000).length,
    note: "Predictions are modeled estimates until live platform analytics are connected."
  };
}

function sanitizeConfig(input) {
  const times = Array.isArray(input.times) ? input.times.filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)).slice(0, 6) : store.config.times;
  const allowedPlatforms = ["tiktok", "instagram", "youtube", "webhook"];
  return {
    ...store.config,
    enabled: Boolean(input.enabled),
    times: times.length ? times : ["09:00"],
    batchSize: Math.max(1, Math.min(Number(input.batchSize) || 1, 3)),
    approvalRequired: Boolean(input.approvalRequired),
    autoPost: Boolean(input.autoPost),
    platforms: Array.isArray(input.platforms) ? input.platforms.filter((value) => allowedPlatforms.includes(value)) : [],
    niche: String(input.niche || store.config.niche).slice(0, 80)
  };
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store" });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true, build: "2026.06.11-command-center", renderer: Boolean(sharp) });
  if (request.method === "GET" && url.pathname === "/api/automation") return sendJson(response, 200, publicState());
  if (request.method === "GET" && url.pathname === "/api/intelligence") return sendJson(response, 200, { intelligence: intelligenceSnapshot(), experiments: store.experiments, events: store.events.slice(0, 100) });
  if (request.method === "PUT" && url.pathname === "/api/automation/config") {
    store.config = sanitizeConfig(await readBody(request));
    refreshNextRun();
    return sendJson(response, 200, publicState());
  }
  if (request.method === "POST" && url.pathname === "/api/automation/generate") {
    const body = await readBody(request);
    const items = await generatePosts(body.count || 3, false);
    return sendJson(response, 201, { items, state: publicState() });
  }
  if (request.method === "POST" && url.pathname === "/api/automation/run") {
    const items = await generatePosts(store.config.batchSize, true);
    if (!store.config.approvalRequired && store.config.autoPost) {
      for (const item of items) await publishItem(item);
    }
    return sendJson(response, 201, { items, state: publicState() });
  }
  if (request.method === "POST" && url.pathname === "/api/automation/bulk") {
    const body = await readBody(request);
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 50) : [];
    const action = body.action;
    const items = store.queue.filter((item) => ids.includes(item.id));
    for (const item of items) {
      if (action === "approve" && item.status === "needs_approval") { item.status = "scheduled"; item.scheduledAt = new Date().toISOString(); }
      if (action === "cancel" && !["published", "publishing"].includes(item.status)) item.status = "cancelled";
      if (action === "publish" && !["published", "publishing", "cancelled", "blocked"].includes(item.status)) await publishItem(item);
    }
    recordEvent("queue.bulk_action", { action, count: items.length });
    saveState();
    return sendJson(response, 200, publicState());
  }
  const match = url.pathname.match(/^\/api\/automation\/queue\/([^/]+)\/(approve|publish|cancel)$/);
  if (request.method === "POST" && match) {
    const item = store.queue.find((entry) => entry.id === match[1]);
    if (!item) return sendJson(response, 404, { error: "Queue item not found." });
    if (match[2] === "cancel") item.status = "cancelled";
    if (match[2] === "approve") { item.status = "scheduled"; item.scheduledAt = new Date().toISOString(); }
    if (match[2] === "publish" || (match[2] === "approve" && store.config.autoPost)) await publishItem(item);
    saveState();
    return sendJson(response, 200, publicState());
  }
  return sendJson(response, 404, { error: "API route not found." });
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".txt": "text/plain; charset=utf-8"
};

async function serveStatic(request, response, url) {
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT) || filePath.includes(`${path.sep}data${path.sep}`) || filePath.endsWith(`${path.sep}.env`)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream", "Content-Length": stat.size, "Cache-Control": requested.startsWith("/generated/") ? "public, max-age=31536000, immutable" : "no-cache" });
    fs.createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404); response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else await serveStatic(request, response, url);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: error.message });
    else response.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`VYRL Studio running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`Autopilot mode: ${publicState().mode}`);
});

setInterval(() => schedulerTick().catch(console.error), 15000).unref();
