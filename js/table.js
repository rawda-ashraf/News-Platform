const API_KEY =
  "ce52afeed1a00a3eb5c75b5655e0f022f1705b985808ebe02c1119bb67b089ef";
const LEAGUE_ID = 302;
const CACHE_DURATION = 5 * 60 * 1000;
const PLACEHOLDER_LOGO = "https://via.placeholder.com/30x30?text=Team";

let leagueTable = [];
let lastUpdated = null;

const elements = {
  container: document.getElementById("table-container"),
  lastUpdated: document.getElementById("last-updated"),
};

const formatDate = (date) => {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPositionClass = (rank) => {
  if (rank <= 4) return "champions-league-row";
  if (rank <= 6) return "europa-league-row";
  if (rank === 7) return "conference-league-row";
  if (rank >= 18) return "relegation-row";
  return "";
};

const calculateGoalDifference = (goalsFor, goalsAgainst) => {
  return goalsFor - goalsAgainst;
};

const getGdClass = (gd) => {
  if (gd > 0) return "gd-positive";
  if (gd < 0) return "gd-negative";
  return "";
};

const isWomenTeam = (teamName) => {
  if (!teamName) return false;

  const womenPatterns = [
    " W$",
    " Women$",
    " Femenina$",
    "Womens",
    " Femenino$",
    "Liga F",
    "Feminina",
  ];

  return womenPatterns.some((pattern) =>
    new RegExp(pattern, "i").test(teamName),
  );
};

const filterMenTeams = (standings) => {
  if (!standings || !Array.isArray(standings)) return [];

  const menTeams = standings.filter((team) => !isWomenTeam(team.standing_team));

  return menTeams;
};

const processTableData = (data) => {
  if (!data || !data.result) {
    return [];
  }

  let standings = [];
  if (data.result.total && Array.isArray(data.result.total)) {
    standings = data.result.total;
  } else if (Array.isArray(data.result)) {
    standings = data.result;
  } else {
    return [];
  }

  const menStandings = filterMenTeams(standings);

  return menStandings
    .map((team) => {
      const rank = parseInt(team.standing_place) || 0;
      const goalsFor = parseInt(team.standing_F) || 0;
      const goalsAgainst = parseInt(team.standing_A) || 0;
      const goalDifference = calculateGoalDifference(goalsFor, goalsAgainst);

      return {
        rank: rank,
        logo: team.team_logo || PLACEHOLDER_LOGO,
        name: team.standing_team || "Unknown Team",
        played: parseInt(team.standing_P) || 0,
        wins: parseInt(team.standing_W) || 0,
        draws: parseInt(team.standing_D) || 0,
        losses: parseInt(team.standing_L) || 0,
        goalsFor: goalsFor,
        goalsAgainst: goalsAgainst,
        goalDifference: goalDifference,
        points: parseInt(team.standing_PTS) || 0,
        positionClass: getPositionClass(rank),
        form: team.standing_LP || null,
      };
    })
    .sort((a, b) => a.rank - b.rank);
};

const displayLeagueTable = (tableData) => {
  if (!tableData || tableData.length === 0) {
    elements.container.innerHTML = `
      <div class="no-data">
        <i class="fas fa-table"></i>
        <h4>No Table Data Available</h4>
        <p class="text-muted">Unable to load league table at this time</p>
        <button class="btn btn-outline-light mt-3" onclick="getLeagueTable()">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    `;
    return;
  }

  let tableHtml = `
    <div class="league-header mb-3">
    </div>
    <table class="league-table">
      <thead>
        <tr>
          <th></th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
  `;

  tableData.forEach((team) => {
    const gdClass = getGdClass(team.goalDifference);
    const gdSign = team.goalDifference > 0 ? "+" : "";

    tableHtml += `
      <tr class="${team.positionClass}">
        <td class="rank ${team.rank <= 3 ? "rank-" + team.rank : ""}">${team.rank}</td>
        <td>
          <div class="team-info">
            <img src="${team.logo}"
                 alt="${team.name}"
                 loading="lazy"
                 onerror="this.src='${PLACEHOLDER_LOGO}'">
            <span class="team-name">${team.name}</span>
          </div>
        </td>
        <td class="stat-number">${team.played}</td>
        <td class="stat-number">${team.wins}</td>
        <td class="stat-number">${team.draws}</td>
        <td class="stat-number">${team.losses}</td>
        <td class="stat-number">${team.goalsFor}</td>
        <td class="stat-number">${team.goalsAgainst}</td>
        <td class="stat-number ${gdClass}">${gdSign}${team.goalDifference}</td>
        <td class="points"><strong>${team.points}</strong></td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  tableHtml += `
    <div class="legend-box mt-4">
      <div class="row">
        <div class="col-md-3 col-6">
          <span class="legend-color champions-league"></span> Champions League
        </div>
        <div class="col-md-3 col-6">
          <span class="legend-color europa-league"></span> Europa League
        </div>
        <div class="col-md-3 col-6">
          <span class="legend-color conference-league"></span> Conference League
        </div>
        <div class="col-md-3 col-6">
          <span class="legend-color relegation"></span> Relegation
        </div>
      </div>
    </div>
  `;

  elements.container.innerHTML = tableHtml;
};

async function getLeagueTable() {
  elements.container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">Loading La Liga standings...</p>
    </div>
  `;

  try {
    const cachedData = localStorage.getItem("leagueTableCache");
    const cacheTime = localStorage.getItem("leagueTableCacheTime");

    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      leagueTable = JSON.parse(cachedData);
      displayLeagueTable(leagueTable);
      elements.lastUpdated.textContent = `Last updated: ${formatDate(parseInt(cacheTime))}`;
      return;
    }

    const url = `https://apiv2.allsportsapi.com/football/?met=Standings&leagueId=${LEAGUE_ID}&APIkey=${API_KEY}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    if (data?.success === 1) {
      leagueTable = processTableData(data);

      if (leagueTable.length > 0) {
        localStorage.setItem("leagueTableCache", JSON.stringify(leagueTable));
        localStorage.setItem("leagueTableCacheTime", Date.now());

        displayLeagueTable(leagueTable);
        elements.lastUpdated.textContent = `Last updated: ${formatDate(Date.now())}`;
      } else {
        throw new Error("No teams found in the response");
      }
    } else {
      throw new Error("API returned unsuccessful response");
    }
  } catch (error) {
    const cachedData = localStorage.getItem("leagueTableCache");
    if (cachedData) {
      leagueTable = JSON.parse(cachedData);
      displayLeagueTable(leagueTable);
      elements.lastUpdated.textContent = `Last updated: ${formatDate(parseInt(localStorage.getItem("leagueTableCacheTime")))} (cached)`;

      elements.container.innerHTML += `
        <div class="alert alert-warning mt-3" role="alert">
          <i class="fas fa-exclamation-triangle"></i>
          Showing cached data. Live data unavailable: ${error.message}
          <button class="btn btn-sm btn-outline-warning ms-2" onclick="getLeagueTable()">
            <i class="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      `;
    } else {
      elements.container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <i class="fas fa-exclamation-circle"></i>
          Failed to load La Liga table: ${error.message}
          <button class="btn btn-sm btn-outline-danger ms-2" onclick="getLeagueTable()">
            <i class="fas fa-sync-alt"></i> Try Again
          </button>
        </div>
      `;
    }
  }
}

window.debugLeagueData = async function () {
  const url = `https://apiv2.allsportsapi.com/football/?met=Standings&leagueId=${LEAGUE_ID}&APIkey=${API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data?.success === 1 && data.result) {
      let standings = data.result.total || data.result || [];

      const womenTeams = standings.filter((t) => isWomenTeam(t.standing_team));
      const menTeams = standings.filter((t) => !isWomenTeam(t.standing_team));

      alert(
        `Debug complete.\nMen: ${menTeams.length} teams\nWomen: ${womenTeams.length} teams`,
      );
    }
  } catch (e) {
    alert("Debug error: " + e.message);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  getLeagueTable();
});

setInterval(getLeagueTable, CACHE_DURATION);

window.getLeagueTable = getLeagueTable;
