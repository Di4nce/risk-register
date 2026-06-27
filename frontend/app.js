const API = "http://127.0.0.1:8000";

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
                <td><button class="btn-delete" onclick="deleteRisk(${r.id})">Delete</button></td>
            </tr>`;
    });
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

    await fetch(`${API}/risks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(risk)
    });

    loadRisks();
}

async function deleteRisk(id) {
    await fetch(`${API}/risks/${id}`, { method: "DELETE" });
    loadRisks();
}

loadRisks();