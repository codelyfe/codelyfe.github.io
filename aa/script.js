const LOOP_DURATIONS = {
    1: 648,
    2: 1200,
    3: 621,
    4: 1200
};

const SHIP_STATES = {
    1: { className: "timer-blue", text: "Sailing to Solis", color: "#007bff" },
    2: { className: "timer-red", text: "Docked at Solis", color: "#dc3545" },
    3: { className: "timer-blue", text: "Sailing to Two Crowns", color: "#007bff" },
    4: { className: "timer-green", text: "Docked at Two Crowns", color: "#28a745" }
};

let servers = {};
let currentServer;

function formatTime(ts) {
    return new Date(ts * 1000).toLocaleTimeString("en-GB");
}

function formatRemaining(ts, now) {
    const diff = ts - now;
    if (diff <= 0) return "--";
    if (diff < 60) return "less than 1 minute";
    if (diff < 120) return "in 1 minute";
    return `in ${Math.floor(diff / 60)} minutes`;
}

function calculateLoopAndPosition(server, now) {
    const elapsed = now - server.timestamp;
    const cycles = Math.floor(elapsed / 3669);
    let position = elapsed - cycles * 3669 + Math.floor(cycles / 2);

    let loop = 1;
    let posInLoop = position;

    switch (server.location) {
        case 1:
            if (position <= 648) loop = 1;
            else if (position <= 1848) { loop = 2; posInLoop -= 648; }
            else if (position <= 2469) { loop = 3; posInLoop -= 1848; }
            else { loop = 4; posInLoop -= 2469; }
            break;
        case 2:
            if (position <= 1200) loop = 2;
            else if (position <= 1821) { loop = 3; posInLoop -= 1200; }
            else if (position <= 3021) { loop = 4; posInLoop -= 1821; }
            else { loop = 1; posInLoop -= 3021; }
            break;
        case 3:
            if (position <= 621) loop = 3;
            else if (position <= 1821) { loop = 4; posInLoop -= 621; }
            else if (position <= 2469) { loop = 1; posInLoop -= 1821; }
            else { loop = 2; posInLoop -= 2469; }
            break;
        case 4:
            if (position <= 1200) loop = 4;
            else if (position <= 1848) { loop = 1; posInLoop -= 1200; }
            else if (position <= 3048) { loop = 2; posInLoop -= 1848; }
            else { loop = 3; posInLoop -= 3048; }
            break;
        default:
            loop = 1;
    }

    return { loop, posInLoop };
}

function updateServerInfo() {
    if (!currentServer) return;
    document.getElementById("current-server").textContent =
        `Current server : ${currentServer.description}`;

    const date = new Date(currentServer.timestamp * 1000);
    document.getElementById("last-update").textContent =
        `Last update : ${date.toLocaleString("en-GB")}`;
}

function setShipVisualState(loop) {
    const cargoBox = document.getElementById("cargo-timer");
    const shipLocationElem = document.getElementById("ship-location");
    const state = SHIP_STATES[loop] || SHIP_STATES[1];

    cargoBox.classList.remove("timer-blue", "timer-red", "timer-green");
    cargoBox.classList.add(state.className);
    shipLocationElem.textContent = state.text;
    shipLocationElem.style.color = state.color;
}

function updateProgress(loop, posInLoop, departure, now) {
    const totalDuration = LOOP_DURATIONS[loop] || LOOP_DURATIONS[1];
    const percent = Math.min(100, (posInLoop / totalDuration) * 100);
    const progress = document.getElementById("progress");

    progress.style.width = `${percent}%`;
    progress.setAttribute("aria-valuenow", String(Math.floor(percent)));
    progress.classList.remove("yellow", "red");

    if (loop === 2 || loop === 4) {
        const remainingDeparture = departure - now;
        if (remainingDeparture <= 60) progress.classList.add("red");
        else if (remainingDeparture <= 300) progress.classList.add("yellow");
    }
}

function updateTimer() {
    if (!currentServer) return;
    const now = Math.floor(Date.now() / 1000);
    const { loop, posInLoop } = calculateLoopAndPosition(currentServer, now);
    const arrival = now - posInLoop;

    let departure;
    let nextTwoCrowns;
    let nextSolis;
    switch (loop) {
        case 1:
            departure = arrival + 648;
            nextTwoCrowns = departure;
            nextSolis = departure + 1821;
            break;
        case 2:
            departure = arrival + 1200;
            nextTwoCrowns = departure + 2469;
            nextSolis = departure + 621;
            break;
        case 3:
            departure = arrival + 621;
            nextTwoCrowns = departure + 1848;
            nextSolis = departure;
            break;
        case 4:
        default:
            departure = arrival + 1200;
            nextTwoCrowns = departure + 648;
            nextSolis = departure + 2469;
            break;
    }

    setShipVisualState(loop);
    updateProgress(loop, posInLoop, departure, now);

    const arrTimeElem = document.getElementById("arr-time");
    const depTimeElem = document.getElementById("dep-time");
    const arrDiffElem = document.getElementById("arr-diff");
    const depDiffElem = document.getElementById("dep-diff");

    if (loop === 1 || loop === 3) {
        depTimeElem.textContent = formatTime(arrival);
        depDiffElem.textContent = formatRemaining(arrival, now);
        arrTimeElem.textContent = formatTime(departure);
        arrDiffElem.textContent = formatRemaining(departure, now);
    } else {
        depTimeElem.textContent = formatTime(departure);
        depDiffElem.textContent = formatRemaining(departure, now);
        arrTimeElem.textContent = formatTime(arrival);
        arrDiffElem.textContent = formatRemaining(arrival, now);
    }

    // Match IDs with actual destination columns.
    document.getElementById("next-tc-time").textContent = formatTime(nextTwoCrowns);
    document.getElementById("next-solis-time").textContent = formatTime(nextSolis);
    document.getElementById("next-tc-diff").textContent = formatRemaining(nextTwoCrowns, now);
    document.getElementById("next-solis-diff").textContent = formatRemaining(nextSolis, now);

    const remainingLabel = document.getElementById("remaining-label");
    if (loop === 2 || loop === 4) {
        remainingLabel.textContent = depDiffElem.textContent;
        document.getElementById("dep-label").textContent = arrTimeElem.textContent;
        document.getElementById("arr-label").textContent = depTimeElem.textContent;
    } else {
        remainingLabel.textContent = arrDiffElem.textContent;
        document.getElementById("dep-label").textContent = depTimeElem.textContent;
        document.getElementById("arr-label").textContent = arrTimeElem.textContent;
    }

    if (window.updateMap) window.updateMap(loop, posInLoop);
}

function hydrateServers(data) {
    const select = document.getElementById("server-select");
    servers = {};
    select.innerHTML = "";

    data.forEach((server) => {
        servers[server.id] = {
            timestamp: Number.parseInt(server.timestamp, 10),
            location: Number.parseInt(server.starting_point, 10),
            description: server.server_description
        };
        const option = document.createElement("option");
        option.value = server.id;
        option.textContent = server.server_description;
        select.appendChild(option);
    });

    const saved = localStorage.getItem("selectedServer");
    const fallbackId = data[0]?.id;
    const selectedId = (saved && servers[saved]) ? saved : fallbackId;

    if (!selectedId) return;

    select.value = selectedId;
    currentServer = servers[selectedId];
    updateServerInfo();
    updateTimer();
}

fetch("get_servers.php")
    .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No server data found");
        }
        hydrateServers(data);
    })
    .catch((err) => {
        console.error("Failed to fetch servers:", err);
        document.getElementById("current-server").textContent = "Current server : unavailable";
        document.getElementById("last-update").textContent = "Last update : fetch failed";
    });

document.getElementById("server-select").addEventListener("change", (e) => {
    const selectedId = e.target.value;
    localStorage.setItem("selectedServer", selectedId);
    currentServer = servers[selectedId];
    updateServerInfo();
    updateTimer();
});

setInterval(() => {
    if (currentServer) updateTimer();
}, 1000);

const toggleBtn = document.getElementById("toggle-map");
const mapWrapper = document.getElementById("map-wrapper");

toggleBtn.addEventListener("click", () => {
    mapWrapper.classList.toggle("show");
    toggleBtn.textContent = mapWrapper.classList.contains("show") ? "Hide Live Map" : "Show Live Map";
    updateTimer();
});
