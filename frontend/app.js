const API = "http://127.0.0.1:8000";
let editingId = null;

const LIKELIHOOD_LABELS = {
    1: "Rare (unlikely in foreseeable future)",
    2: "Unlikely (has occurred in the industry)",
    3: "Possible (has occurred in the sector)",
    4: "Likely (occurs several times a year)",
    5: "Almost Certain (occurs regularly)"
};

const IMPACT_LABELS = {
    1: "Negligible (minimal disruption, no data loss)",
    2: "Minor (small disruption, easily recovered)",
    3: "Moderate (significant disruption, limited data loss)",
    4: "Major (serious disruption, reportable incident)",
    5: "Critical (severe disruption, significant data breach)"
};

function updateSlider(type, value) {
    const labels = type === "likelihood" ? LIKELIHOOD_LABELS : IMPACT_LABELS;
    document.getElementById(`${type}-val`).textContent = value;
    document.getElementById(`${type}-text`).textContent = labels[value];
}

async function loadRisks() {
    const status = document.getElementById("filter-status").value;
    const res = await fetch(`${API}/risks`);
    let risks = await res.json();

    if (status) risks = risks.filter(r => r.status === status);
    risks.sort((a, b) => b.risk_score - a.risk_score);

    const body = document.getElementById("risk-body");
    body.innerHTML = "";

    risks.forEach(r => {
        const scoreClass = r.risk_score <= 6 ? "score-low"
                         : r.risk_score <= 14 ? "score-medium"
                         : "score-high";
        const date = new Date(r.created_at).toLocaleDateString();
        body.innerHTML += `
            <tr>
                <td>${r.id}</td>
                <td>${r.title}</td>
                <td>${r.category}</td>
                <td>${r.owner}</td>
                <td>${r.likelihood}</td>
                <td>${r.impact}</td>
                <td><span class="score ${scoreClass}">${r.risk_score}</span></td>
                <td><span class="status-${r.status}">${r.status}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-edit" onclick="editRisk(${r.id}, '${r.title}', '${r.description}', ${r.likelihood}, ${r.impact}, '${r.owner}', '${r.status}', '${r.category}')">Edit</button>
                    <button class="btn-delete" onclick="deleteRisk(${r.id})">Delete</button>
                </td>
            </tr>`;
    });
}

function editRisk(id, title, description, likelihood, impact, owner, status, category) {
    editingId = id;
    document.getElementById("title").value       = title;
    document.getElementById("description").value = description;
    document.getElementById("likelihood").value  = likelihood;
    document.getElementById("impact").value      = impact;
    document.getElementById("owner").value       = owner;
    document.getElementById("status").value      = status;
    document.getElementById("category").value    = category;

    updateSlider("likelihood", likelihood);
    updateSlider("impact", impact);

    document.getElementById("form-title").textContent     = "Edit Risk";
    document.getElementById("submit-btn").textContent     = "Update Risk";
    document.getElementById("cancel-btn").style.display   = "inline-block";

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

    updateSlider("likelihood", 3);
    updateSlider("impact", 3);

    document.getElementById("form-title").textContent   = "Add Risk";
    document.getElementById("submit-btn").textContent   = "Add Risk";
    document.getElementById("cancel-btn").style.display = "none";
}

async function addRisk() {
    const risk = {
        title:       document.getElementById("title").value,
        description: document.getElementById("description").value,
        likelihood:  parseInt(document.getElementById("likelihood").value),
        impact:      parseInt(document.getElementById("impact").value),
        owner:       document.getElementById("owner").value,
        status:      document.getElementById("status").value,
        category:    document.getElementById("category").value,
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

loadRisks();