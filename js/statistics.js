const API_KEY =
  "c2d62e9d276010bf3f52c8432e8e89fc505d8df3902762ee0460d6d11add19ef";
const CACHE_DURATION = 5 * 60 * 1000;

const LA_LIGA_TEAMS = [
  76, // Real Madrid
  97, // Barcelona
  73, // Atletico Madrid
  7261, // Betis
  162, // Villarreal
  7269, // Osasuna
  7290, // Celta Vigo
  7263, // Girona
  7285, // Mallorca
  7264, // Rayo Vallecano
  7272, // Valencia
  7268, // Espanyol
  7274, // Elche
];

const PLACEHOLDER_PLAYER = "https://via.placeholder.com/100x100?text=Player";
const PLACEHOLDER_TEAM = "https://via.placeholder.com/25x25?text=Team";

let allPlayers = [];
let statistics = {
  topScorers: [],
  yellowCards: [],
  redCards: [],
};
let currentSort = { by: "goals", order: "desc" };
let activeTab = "top-scorers";
let isLoading = false;

const elements = {
  topScorers: document.getElementById("top-scorers-container"),
  yellowCards: document.getElementById("yellow-cards-container"),
  redCards: document.getElementById("red-cards-container"),
  sortSelect: document.getElementById("sort-select"),
  sortIcon: document.getElementById("sort-icon"),
};

const showLoading = (container) => {
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-light" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Loading player statistics...</p>
      </div>
    `;
  }
};

const showError = (container, message) => {
  if (container) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle"></i>
        ${message}
        <button class="btn btn-sm btn-outline-danger ms-2" onclick="fetchAllTeamPlayers()">
          Try Again
        </button>
      </div>
    `;
  }
};

async function fetchTeamPlayers(teamId) {
  try {
    const url = `https://apiv2.allsportsapi.com/football/?&met=Teams&teamId=${teamId}&APIkey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.success === 1 && data.result && data.result[0]?.players) {
      const teamName = data.result[0].team_name;
      const teamLogo = data.result[0].team_logo || PLACEHOLDER_TEAM;

      return data.result[0].players.map((player) => ({
        id: player.player_key,
        name: player.player_name,
        photo: player.player_image || PLACEHOLDER_PLAYER,
        team: teamName,
        teamLogo: teamLogo,
        goals: parseInt(player.player_goals) || 0,
        assists: parseInt(player.player_assists) || 0,
        yellowCards: parseInt(player.player_yellow_cards) || 0,
        redCards: parseInt(player.player_red_cards) || 0,
        appearences: parseInt(player.player_match_played) || 0,
        rating: parseFloat(player.player_rating) || 0,
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

async function fetchAllTeamPlayers() {
  isLoading = true;

  showLoading(elements.topScorers);
  showLoading(elements.yellowCards);
  showLoading(elements.redCards);

  try {
    const cachedData = localStorage.getItem("playerStatsCache");
    const cacheTime = localStorage.getItem("playerStatsCacheTime");

    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      statistics = JSON.parse(cachedData);
      displayActiveTab();
      isLoading = false;
      return;
    }

    const promises = LA_LIGA_TEAMS.map((teamId) => fetchTeamPlayers(teamId));
    const results = await Promise.all(promises);

    allPlayers = results.flat();

    statistics.topScorers = allPlayers
      .filter((p) => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    statistics.yellowCards = allPlayers
      .filter((p) => p.yellowCards > 0)
      .sort((a, b) => b.yellowCards - a.yellowCards)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    statistics.redCards = allPlayers
      .filter((p) => p.redCards > 0)
      .sort((a, b) => b.redCards - a.redCards)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    localStorage.setItem("playerStatsCache", JSON.stringify(statistics));
    localStorage.setItem("playerStatsCacheTime", Date.now());

    displayActiveTab();
  } catch (error) {
    showError(elements.topScorers, error.message);
    showError(elements.yellowCards, error.message);
    showError(elements.redCards, error.message);
  } finally {
    isLoading = false;
  }
}

const displayActiveTab = () => {
  if (activeTab === "top-scorers") {
    displayTopScorers(statistics.topScorers);
  } else if (activeTab === "yellow-cards") {
    displayYellowCards(statistics.yellowCards);
  } else if (activeTab === "red-cards") {
    displayRedCards(statistics.redCards);
  }
};

const displayTopScorers = (players) => {
  const container = elements.topScorers;
  if (!container) return;

  container.innerHTML = "";

  if (!players || players.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-futbol"></i>
        <h4>No Top Scorers Available</h4>
        <p class="text-muted">Try refreshing the page</p>
      </div>
    `;
    return;
  }

  players.slice(0, 20).forEach((player) => {
    const medal =
      player.rank === 1
        ? '<i class="fas fa-medal gold" style="color: #FFD700;"></i>'
        : player.rank === 2
          ? '<i class="fas fa-medal silver" style="color: #C0C0C0;"></i>'
          : player.rank === 3
            ? '<i class="fas fa-medal bronze" style="color: #CD7F32;"></i>'
            : "";

    container.innerHTML += `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div class="player-card">
          <div class="player-image">
            <img src="${player.photo}" 
                 alt="${player.name}"
                 onerror="this.src='${PLACEHOLDER_PLAYER}'">
            <div class="player-rank">${player.rank}</div>
          </div>
          <div class="player-info">
            <h5 class="player-name">
              ${player.name} ${medal}
            </h5>
            <div class="player-team">
              <img src="${player.teamLogo}" 
                   alt="${player.team}"
                   onerror="this.src='${PLACEHOLDER_TEAM}'">
              <span>${player.team}</span>
            </div>
            <div class="player-stats">
              <div class="stat-badge goals">
                <span class="label">Goals</span>
                <span class="value">${player.goals}</span>
              </div>
              <div class="stat-badge assists">
                <span class="label">Assists</span>
                <span class="value">${player.assists}</span>
              </div>
              <div class="stat-badge yellow">
                <span class="label">Yellow</span>
                <span class="value">${player.yellowCards}</span>
              </div>
              <div class="stat-badge red">
                <span class="label">Red</span>
                <span class="value">${player.redCards}</span>
              </div>
            </div>
            ${
              player.rating > 0
                ? `
              <div class="player-rating">
                <small class="text-warning">
                  <i class="fas fa-star"></i> Rating: ${player.rating.toFixed(1)}
                </small>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  });
};

const displayYellowCards = (players) => {
  const container = elements.yellowCards;
  if (!container) return;

  container.innerHTML = "";

  if (!players || players.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-square text-warning"></i>
        <h4>No Yellow Card Data</h4>
        <p class="text-muted">Yellow card statistics not available</p>
      </div>
    `;
    return;
  }

  players.slice(0, 20).forEach((player) => {
    container.innerHTML += `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div class="player-card">
          <div class="player-image">
            <img src="${player.photo}" 
                 alt="${player.name}"
                 onerror="this.src='${PLACEHOLDER_PLAYER}'">
            <div class="player-rank">${player.rank}</div>
          </div>
          <div class="player-info">
            <h5 class="player-name">${player.name}</h5>
            <div class="player-team">
              <img src="${player.teamLogo}" 
                   alt="${player.team}"
                   onerror="this.src='${PLACEHOLDER_TEAM}'">
              <span>${player.team}</span>
            </div>
            <div class="player-stats">
              <div class="stat-badge goals">
                <span class="label">Goals</span>
                <span class="value">${player.goals}</span>
              </div>
              <div class="stat-badge yellow highlight">
                <span class="label">Yellow Cards</span>
                <span class="value">${player.yellowCards}</span>
              </div>
              <div class="stat-badge red">
                <span class="label">Red</span>
                <span class="value">${player.redCards}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
};

const displayRedCards = (players) => {
  const container = elements.redCards;
  if (!container) return;

  container.innerHTML = "";

  if (!players || players.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-square text-danger"></i>
        <h4>No Red Card Data</h4>
        <p class="text-muted">Red card statistics not available</p>
      </div>
    `;
    return;
  }

  players.slice(0, 20).forEach((player) => {
    container.innerHTML += `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div class="player-card">
          <div class="player-image">
            <img src="${player.photo}" 
                 alt="${player.name}"
                 onerror="this.src='${PLACEHOLDER_PLAYER}'">
            <div class="player-rank">${player.rank}</div>
          </div>
          <div class="player-info">
            <h5 class="player-name">${player.name}</h5>
            <div class="player-team">
              <img src="${player.teamLogo}" 
                   alt="${player.team}"
                   onerror="this.src='${PLACEHOLDER_TEAM}'">
              <span>${player.team}</span>
            </div>
            <div class="player-stats">
              <div class="stat-badge goals">
                <span class="label">Goals</span>
                <span class="value">${player.goals}</span>
              </div>
              <div class="stat-badge yellow">
                <span class="label">Yellow</span>
                <span class="value">${player.yellowCards}</span>
              </div>
              <div class="stat-badge red highlight">
                <span class="label">Red Cards</span>
                <span class="value">${player.redCards}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
};

const sortAndDisplayPlayers = () => {
  let sortedPlayers = [];

  switch (currentSort.by) {
    case "goals":
      sortedPlayers = [...statistics.topScorers].sort((a, b) =>
        currentSort.order === "desc" ? b.goals - a.goals : a.goals - b.goals,
      );
      displayTopScorers(sortedPlayers);
      break;
    case "yellow_cards":
      sortedPlayers = [...statistics.yellowCards].sort((a, b) =>
        currentSort.order === "desc"
          ? b.yellowCards - a.yellowCards
          : a.yellowCards - b.yellowCards,
      );
      displayYellowCards(sortedPlayers);
      break;
    case "red_cards":
      sortedPlayers = [...statistics.redCards].sort((a, b) =>
        currentSort.order === "desc"
          ? b.redCards - a.redCards
          : a.redCards - b.redCards,
      );
      displayRedCards(sortedPlayers);
      break;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  fetchAllTeamPlayers();

  if (elements.sortSelect) {
    elements.sortSelect.addEventListener("change", (e) => {
      currentSort.by = e.target.value;
      sortAndDisplayPlayers();
    });
  }

  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      activeTab = e.target.id.replace("-tab", "");
      displayActiveTab();
    });
  });
});

window.fetchAllTeamPlayers = fetchAllTeamPlayers;

setInterval(fetchAllTeamPlayers, CACHE_DURATION);
