const API = "";
let editingId = null;
let editingAssetId = null;

const LIKELIHOOD_LABELS = {
    1: "Svært usannsynlig (usannsynlig i overskuelig fremtid)",
    2: "Usannsynlig (har skjedd i Norge)",
    3: "Mulig (har skjedd i sektoren)",
    4: "Sannsynlig (skjer flere ganger i året)",
    5: "Nesten sikkert (skjer regelmessig)"
};

const IMPACT_LABELS = {
    1: "Ubetydelig (minimal forstyrrelse, ingen datatap)",
    2: "Lav (liten forstyrrelse, lett å gjenopprette)",
    3: "Moderat (betydelig forstyrrelse, begrenset datatap)",
    4: "Alvorlig (stor forstyrrelse, rapporteringspliktig hendelse)",
    5: "Kritisk (alvorlig forstyrrelse, betydelig databrudd)"
};

const CIA_LABELS = {
    1: "Svært lav",
    2: "Lav",
    3: "Moderat",
    4: "Høy",
    5: "Svært høy"
};

function updateSlider(type, value) {
    const labels = type === "likelihood" ? LIKELIHOOD_LABELS : IMPACT_LABELS;
    document.getElementById(`${type}-val`).textContent = value;
    document.getElementById(`${type}-text`).textContent = labels[value];
}

function updateAssetSlider(type, value) {
    document.getElementById(`${type}-val`).textContent = value;
    document.getElementById(`${type}-text`).textContent = CIA_LABELS[value];
}

function switchTab(tab) {
    document.getElementById("tab-risks").style.display     = tab === "risks"     ? "block" : "none";
    document.getElementById("tab-assets").style.display    = tab === "assets"    ? "block" : "none";
    document.getElementById("tab-dashboard").style.display = tab === "dashboard" ? "block" : "none";
    document.querySelectorAll(".tab-btn").forEach((btn, i) => {
        btn.classList.toggle("active",
            (i === 0 && tab === "assets") ||
            (i === 1 && tab === "risks") ||
            (i === 2 && tab === "dashboard")
        );
    });
    if (tab === "risks")     loadRisks();
    if (tab === "assets")    loadAssets();
    if (tab === "dashboard") loadDashboard();
}

// ── INFORMASJONSVERDIER ──────────────────────────────────

async function loadAssets() {
    const res = await fetch(`${API}/assets`);
    const assets = await res.json();
    populateAssetDropdown(assets);

    const body = document.getElementById("asset-body");
    body.innerHTML = "";
    assets.forEach(a => {
        const date = new Date(a.created_at).toLocaleDateString("no-NO");
        const valueClass = a.asset_value <= 2 ? "score-low"
                         : a.asset_value <= 3 ? "score-medium"
                         : "score-high";
        body.innerHTML += `
            <tr>
                <td>${a.id}</td>
                <td>${a.name}</td>
                <td>${a.category}</td>
                <td>${a.owner}</td>
                <td>${a.confidentiality}</td>
                <td>${a.integrity}</td>
                <td>${a.availability}</td>
                <td><span class="score ${valueClass}">${a.asset_value}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-edit" onclick="editAsset(${a.id}, '${a.name}', '${a.description || ""}', '${a.category}', '${a.owner}', ${a.confidentiality}, ${a.integrity}, ${a.availability})">Rediger</button>
                    <button class="btn-delete" onclick="deleteAsset(${a.id})">Slett</button>
                </td>
            </tr>`;
    });
}

function populateAssetDropdown(assets) {
    const select = document.getElementById("asset-link");
    const current = select.value;
    select.innerHTML = `<option value="">— Koble til informasjonsverdi (valgfritt) —</option>`;
    assets.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.name} (verdi: ${a.asset_value})</option>`;
    });
    select.value = current;
}

async function addAsset() {
    const asset = {
        name:             document.getElementById("asset-name").value,
        description:      document.getElementById("asset-description").value,
        category:         document.getElementById("asset-category").value,
        owner:            document.getElementById("asset-owner").value,
        confidentiality:  parseInt(document.getElementById("confidentiality").value),
        integrity:        parseInt(document.getElementById("integrity").value),
        availability:     parseInt(document.getElementById("availability").value),
    };

    if (editingAssetId) {
        await fetch(`${API}/assets/${editingAssetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(asset)
        });
        cancelAssetEdit();
    } else {
        await fetch(`${API}/assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(asset)
        });
    }
    loadAssets();
}

function editAsset(id, name, description, category, owner, c, i, a) {
    editingAssetId = id;
    document.getElementById("asset-name").value        = name;
    document.getElementById("asset-description").value = description;
    document.getElementById("asset-category").value    = category;
    document.getElementById("asset-owner").value       = owner;
    document.getElementById("confidentiality").value   = c;
    document.getElementById("integrity").value         = i;
    document.getElementById("availability").value      = a;
    updateAssetSlider("confidentiality", c);
    updateAssetSlider("integrity", i);
    updateAssetSlider("availability", a);
    document.getElementById("asset-form-title").textContent   = "Rediger informasjonsverdi";
    document.getElementById("asset-submit-btn").textContent   = "Oppdater informasjonsverdi";
    document.getElementById("asset-cancel-btn").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelAssetEdit() {
    editingAssetId = null;
    document.getElementById("asset-name").value        = "";
    document.getElementById("asset-description").value = "";
    document.getElementById("asset-category").value    = "data";
    document.getElementById("asset-owner").value       = "";
    document.getElementById("confidentiality").value   = 3;
    document.getElementById("integrity").value         = 3;
    document.getElementById("availability").value      = 3;
    updateAssetSlider("confidentiality", 3);
    updateAssetSlider("integrity", 3);
    updateAssetSlider("availability", 3);
    document.getElementById("asset-form-title").textContent   = "Legg til informasjonsverdi";
    document.getElementById("asset-submit-btn").textContent   = "Legg til informasjonsverdi";
    document.getElementById("asset-cancel-btn").style.display = "none";
}

async function deleteAsset(id) {
    await fetch(`${API}/assets/${id}`, { method: "DELETE" });
    loadAssets();
}

// ── RISIKOREGISTER ────────────────────────────────────────

async function loadRisks() {
    const status = document.getElementById("filter-status").value;
    const [risksRes, assetsRes] = await Promise.all([
        fetch(`${API}/risks`),
        fetch(`${API}/assets`)
    ]);
    let risks = await risksRes.json();
    const assets = await assetsRes.json();
    const assetMap = Object.fromEntries(assets.map(a => [a.id, a.name]));
    populateAssetDropdown(assets);

    if (status) risks = risks.filter(r => r.status === status);
    risks.sort((a, b) => b.risk_score - a.risk_score);

    const body = document.getElementById("risk-body");
    body.innerHTML = "";

    risks.forEach(r => {
        const scoreClass = r.risk_score <= 6 ? "score-low"
                         : r.risk_score <= 14 ? "score-medium"
                         : "score-high";
        const date = new Date(r.created_at).toLocaleDateString("no-NO");
        const treatment = r.treatment || "—";
        const treatmentPreview = treatment.length > 40 ? treatment.substring(0, 40) + "..." : treatment;
        const assetName = r.asset_id ? (assetMap[r.asset_id] || "—") : "—";
        body.innerHTML += `
            <tr>
                <td>${r.id}</td>
                <td>${r.title}</td>
                <td>${r.category}</td>
                <td>${r.owner}</td>
                <td>${assetName}</td>
                <td>${r.likelihood}</td>
                <td>${r.impact}</td>
                <td><span class="score ${scoreClass}">${r.risk_score}</span></td>
                <td><span class="status-${r.status}">${translateStatus(r.status)}</span></td>
                <td title="${treatment}">${treatmentPreview}</td>
                <td>${date}</td>
                <td>
                    <button class="btn-edit" onclick="editRisk(${r.id}, '${r.title}', '${r.description}', ${r.likelihood}, ${r.impact}, '${r.owner}', '${r.status}', '${r.category}', '${r.treatment || ""}', ${r.asset_id || 0})">Rediger</button>
                    <button class="btn-delete" onclick="deleteRisk(${r.id})">Slett</button>
                </td>
            </tr>`;
    });
}

function translateStatus(status) {
    const map = { open: "Åpen", mitigated: "Håndtert", accepted: "Akseptert" };
    return map[status] || status;
}

function editRisk(id, title, description, likelihood, impact, owner, status, category, treatment, assetId) {
    editingId = id;
    document.getElementById("title").value       = title;
    document.getElementById("description").value = description;
    document.getElementById("likelihood").value  = likelihood;
    document.getElementById("impact").value      = impact;
    document.getElementById("owner").value       = owner;
    document.getElementById("status").value      = status;
    document.getElementById("category").value    = category;
    document.getElementById("treatment").value   = treatment || "";
    document.getElementById("asset-link").value  = assetId || "";
    updateSlider("likelihood", likelihood);
    updateSlider("impact", impact);
    document.getElementById("form-title").textContent   = "Rediger risiko";
    document.getElementById("submit-btn").textContent   = "Oppdater risiko";
    document.getElementById("cancel-btn").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
    editingId = null;
    document.getElementById("title").value       = "";
    document.getElementById("description").value = "";
    document.getElementById("likelihood").value  = 3;
    document.getElementById("impact").value      = 3;
    document.getElementById("owner").value       = "";
    document.getElementById("status").value      = "open";
    document.getElementById("category").value    = "";
    document.getElementById("treatment").value   = "";
    document.getElementById("asset-link").value  = "";
    updateSlider("likelihood", 3);
    updateSlider("impact", 3);
    document.getElementById("form-title").textContent   = "Legg til risiko";
    document.getElementById("submit-btn").textContent   = "Legg til risiko";
    document.getElementById("cancel-btn").style.display = "none";
}

async function addRisk() {
    const assetId = document.getElementById("asset-link").value;
    const risk = {
        title:       document.getElementById("title").value,
        description: document.getElementById("description").value,
        likelihood:  parseInt(document.getElementById("likelihood").value),
        impact:      parseInt(document.getElementById("impact").value),
        owner:       document.getElementById("owner").value,
        status:      document.getElementById("status").value,
        category:    document.getElementById("category").value,
        treatment:   document.getElementById("treatment").value,
        asset_id:    assetId ? parseInt(assetId) : null,
    };

    if (editingId) {
        await fetch(`${API}/risks/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(risk)
        });
        cancelEdit();
    } else {
        await fetch(`${API}/risks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(risk)
        });
    }
    loadRisks();
}

async function deleteRisk(id) {
    await fetch(`${API}/risks/${id}`, { method: "DELETE" });
    loadRisks();
}

switchTab('assets');

// ── DASHBOARD ─────────────────────────────────────────────

async function loadDashboard() {
    const [risksRes, assetsRes] = await Promise.all([
        fetch(`${API}/risks`),
        fetch(`${API}/assets`)
    ]);
    const risks  = await risksRes.json();
    const assets = await assetsRes.json();

    // Status counts
    document.getElementById("count-open").textContent      = risks.filter(r => r.status === "open").length;
    document.getElementById("count-mitigated").textContent = risks.filter(r => r.status === "mitigated").length;
    document.getElementById("count-accepted").textContent  = risks.filter(r => r.status === "accepted").length;

    // Asset category breakdown
    const catMap = {};
    assets.forEach(a => { catMap[a.category] = (catMap[a.category] || 0) + 1; });
    const catLabels = { data: "Data", system: "System", service: "Tjeneste", physical: "Fysisk", people: "Personer" };
    const catDiv = document.getElementById("asset-category-stats");
    catDiv.innerHTML = "";
    Object.entries(catMap).forEach(([cat, count]) => {
        catDiv.innerHTML += `
            <div class="cat-row">
                <span class="cat-label">${catLabels[cat] || cat}</span>
                <div class="cat-bar-wrap">
                    <div class="cat-bar" style="width:${Math.min(count * 40, 200)}px"></div>
                </div>
                <span class="cat-count">${count}</span>
            </div>`;
    });

    // Risk matrix (5x5)
    const matrix = document.getElementById("risk-matrix");
    matrix.innerHTML = "";
    for (let l = 5; l >= 1; l--) {
        for (let i = 1; i <= 5; i++) {
            const score = l * i;
            const cellClass = score <= 6 ? "cell-low" : score <= 14 ? "cell-medium" : "cell-high";
            const cellRisks = risks.filter(r => r.likelihood === l && r.impact === i);
            const dots = cellRisks.map(r =>
                `<span class="matrix-dot" title="${r.title} (${r.risk_score})">${r.id}</span>`
            ).join("");
            matrix.innerHTML += `<div class="matrix-cell ${cellClass}">${dots}</div>`;
        }
    }

    // Top 5 risks
    const top5 = [...risks].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
    const topBody = document.getElementById("top-risks");
    topBody.innerHTML = "";
    top5.forEach(r => {
        const scoreClass = r.risk_score <= 6 ? "score-low" : r.risk_score <= 14 ? "score-medium" : "score-high";
        topBody.innerHTML += `
            <tr>
                <td>${r.title}</td>
                <td>${r.category}</td>
                <td>${r.owner}</td>
                <td><span class="score ${scoreClass}">${r.risk_score}</span></td>
                <td><span class="status-${r.status}">${translateStatus(r.status)}</span></td>
            </tr>`;
    });
}