const API_KEY =
  "ce52afeed1a00a3eb5c75b5655e0f022f1705b985808ebe02c1119bb67b089ef";
const LEAGUE_ID = 302;
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/50x50?text=Team";
const CACHE_DURATION = 5 * 60 * 1000;

let allMatches = [];
let filterTimeout;
let currentFilters = {
  team: "",
  date: "",
};

const elements = {
  container: document.getElementById("matches-container"),
  teamFilter: document.getElementById("team-filter"),
  dateFilter: document.getElementById("date-filter"),
  clearTeamFilter: document.getElementById("clear-team-filter"),
  clearDateFilter: document.getElementById("clear-date-filter"),
  activeFilters: document.getElementById("active-filters"),
  totalMatches: document.getElementById("total-matches"),
  todayMatches: document.getElementById("today-matches"),
  liveMatches: document.getElementById("live-matches-count"),
  finishedMatches: document.getElementById("finished-matches"),
};

const debounce = (func, delay) => {
  return function (...args) {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => func.apply(this, args), delay);
  };
};

const getDateRange = () => {
  const today = new Date();
  const from = today.toISOString().split("T")[0];

  const to = new Date(today.setDate(today.getDate() + 30))
    .toISOString()
    .split("T")[0];

  return { from, to };
};

const isLiveMatch = (match) => {
  const liveValues = ["1", "true", "True", "live", "Live", "LIVE", true, 1];

  return (
    liveValues.includes(match.match_live) ||
    liveValues.includes(match.match_status) ||
    match.event_status?.toLowerCase() === "live" ||
    match.event_live === "1" ||
    match.live === "1"
  );
};

const isFinishedMatch = (match) => {
  const hasResult =
    match.event_final_result?.trim() ||
    (match.event_home_final_result && match.event_away_final_result) ||
    match.final_result?.trim();

  const finishedValues = ["finished", "completed", "FT", "final", "2", "3"];
  const status = (match.match_status || match.event_status || "").toLowerCase();

  return (hasResult && !isLiveMatch(match)) || finishedValues.includes(status);
};

const updateStats = () => {
  const today = new Date().toISOString().split("T")[0];

  const totalMatches = allMatches.length;
  const todayMatches = allMatches.filter((m) => m.event_date === today).length;
  const liveMatches = allMatches.filter((m) => isLiveMatch(m)).length;
  const finishedMatches = allMatches.filter((m) => isFinishedMatch(m)).length;

  elements.totalMatches.textContent = totalMatches;
  elements.todayMatches.textContent = todayMatches;
  elements.liveMatches.textContent = liveMatches;
  elements.finishedMatches.textContent = finishedMatches;
};

const updateActiveFilters = () => {
  const filtersContainer = elements.activeFilters;
  filtersContainer.innerHTML = "";

  if (currentFilters.team) {
    filtersContainer.innerHTML += `
            <div class="filter-badge">
                <i class="fas fa-search"></i>
                Team: ${currentFilters.team}
                <i class="fas fa-times" onclick="clearFilter('team')"></i>
            </div>
        `;
  }

  if (currentFilters.date) {
    filtersContainer.innerHTML += `
            <div class="filter-badge">
                <i class="fas fa-calendar"></i>
                Date: ${new Date(currentFilters.date).toLocaleDateString("en-GB")}
                <i class="fas fa-times" onclick="clearFilter('date')"></i>
            </div>
        `;
  }

  elements.clearTeamFilter.style.display = currentFilters.team
    ? "block"
    : "none";
  elements.clearDateFilter.style.display = currentFilters.date
    ? "block"
    : "none";
};

const filterMatches = () => {
  let filtered = allMatches;

  if (currentFilters.team) {
    filtered = filtered.filter(
      (m) =>
        m.event_home_team?.toLowerCase().includes(currentFilters.team) ||
        m.event_away_team?.toLowerCase().includes(currentFilters.team),
    );
  }

  if (currentFilters.date) {
    filtered = filtered.filter((m) => m.event_date === currentFilters.date);
  }

  displayMatches(filtered);
  updateActiveFilters();
};

const clearFilter = (filterType) => {
  if (filterType === "team") {
    currentFilters.team = "";
    elements.teamFilter.value = "";
  } else if (filterType === "date") {
    currentFilters.date = "";
    elements.dateFilter.value = "";
  }

  filterMatches();
};

const sortMatches = (matches) => {
  const today = new Date().toISOString().split("T")[0];

  return [...matches].sort((a, b) => {
    if (isLiveMatch(a) && !isLiveMatch(b)) return -1;
    if (!isLiveMatch(a) && isLiveMatch(b)) return 1;

    if (a.event_date === today && b.event_date !== today) return -1;
    if (a.event_date !== today && b.event_date === today) return 1;

    if (a.event_date === b.event_date) {
      const timeA = a.event_time || "23:59";
      const timeB = b.event_time || "23:59";
      return timeA.localeCompare(timeB);
    }

    return new Date(a.event_date) - new Date(b.event_date);
  });
};

const getMatchStatus = (match) => {
  if (isLiveMatch(match)) {
    return {
      text: "LIVE",
      class: "match-live",
      statusClass: "text-danger fw-bold live-pulse",
    };
  }

  const hasResult =
    match.event_final_result?.trim() ||
    (match.event_home_final_result && match.event_away_final_result) ||
    match.final_result?.trim();

  if (hasResult) {
    const result =
      match.event_final_result?.trim() ||
      match.final_result?.trim() ||
      `${match.event_home_final_result || "0"} - ${match.event_away_final_result || "0"}`;
    return {
      text: result,
      class: "match-finished",
      statusClass: "",
    };
  }

  return {
    text: "Upcoming",
    class: "match-upcoming",
    statusClass: "text-warning",
  };
};

const displayMatches = (matches) => {
  const container = elements.container;
  container.innerHTML = "";

  if (!matches || matches.length === 0) {
    container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-futbol"></i>
                <h4>No Matches Found</h4>
                <p class="text-muted">No matches match your search criteria</p>
            </div>
        `;
    return;
  }

  matches.forEach((match) => {
    const status = getMatchStatus(match);

    container.innerHTML += `
            <div class="match-card ${status.class}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="team">
                        <img src="${match.home_team_logo || PLACEHOLDER_IMAGE}" 
                             alt="${match.event_home_team}"
                             loading="lazy"
                             onerror="this.src='${PLACEHOLDER_IMAGE}'">
                        <span>${match.event_home_team}</span>
                    </div>

                    <div class="score">
                        <div class="score-text ${status.statusClass}">
                            ${status.text}
                        </div>
                    </div>

                    <div class="team">
                        <span>${match.event_away_team}</span>
                        <img src="${match.away_team_logo || PLACEHOLDER_IMAGE}" 
                             alt="${match.event_away_team}"
                             loading="lazy"
                             onerror="this.src='${PLACEHOLDER_IMAGE}'">
                    </div>
                </div>
                
                <div class="match-info">
                    <div>
                        <i class="fa-regular fa-clock"></i>
                        ${match.event_time || "TBD"}
                    </div>           
                    <div>
                        <i class="fa-regular fa-calendar"></i>
                        ${new Date(match.event_date).toLocaleDateString("en-GB")}
                    </div>
                    ${
                      isLiveMatch(match)
                        ? `
                        <div class="live-indicator">
                            <i class="fa-solid fa-circle text-danger"></i>
                            <span class="text-danger">LIVE</span>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
        `;
  });

  updateStats();
};

async function getLeagueMatches() {
  const container = elements.container;

  container.innerHTML = `
        <div class="spinner-container">
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading matches...</p>
        </div>
    `;

  try {
    const { from, to } = getDateRange();

    const cachedData = localStorage.getItem("matchesCache");
    const cacheTime = localStorage.getItem("matchesCacheTime");

    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      allMatches = JSON.parse(cachedData);
      sortAndDisplayMatches();
      return;
    }

    const res = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Fixtures&from=${from}&to=${to}&leagueId=${LEAGUE_ID}&APIkey=${API_KEY}`,
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    if (data?.success === 1 && data.result) {
      allMatches = data.result;

      localStorage.setItem("matchesCache", JSON.stringify(allMatches));
      localStorage.setItem("matchesCacheTime", Date.now());

      sortAndDisplayMatches();
    } else {
      throw new Error("API returned unsuccessful response");
    }
  } catch (error) {
    const cachedData = localStorage.getItem("matchesCache");
    if (cachedData) {
      allMatches = JSON.parse(cachedData);
      sortAndDisplayMatches();

      container.innerHTML += `
                <div class="alert alert-warning mt-3" role="alert">
                    <i class="fas fa-exclamation-triangle"></i>
                    Showing cached data. Some matches may not be up to date.
                </div>
            `;
    } else {
      container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load matches: ${error.message}
                </div>
            `;
    }
  }
}

function sortAndDisplayMatches() {
  const sortedMatches = sortMatches(allMatches);
  displayMatches(sortedMatches);
}

elements.teamFilter.addEventListener(
  "input",
  debounce((e) => {
    currentFilters.team = e.target.value.toLowerCase().trim();
    filterMatches();
  }, 300),
);

elements.dateFilter.addEventListener("input", (e) => {
  currentFilters.date = e.target.value;
  filterMatches();
});

elements.clearTeamFilter.addEventListener("click", () => clearFilter("team"));
elements.clearDateFilter.addEventListener("click", () => clearFilter("date"));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearFilter("team");
    clearFilter("date");
  }
});

window.clearFilter = clearFilter;
getLeagueMatches();
setInterval(getLeagueMatches, CACHE_DURATION);
