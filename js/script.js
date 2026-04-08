let news1 = [];
const NEWS_API_KEY = "3eaccad16d6a52566547e176e52be09f";

async function getNews(country = "us", category, containerId) {
  try {
    let res = await fetch(
      `https://gnews.io/api/v4/top-headlines?country=${country}&category=${category}&max=3&apikey=${NEWS_API_KEY}`,
    );
    let data = await res.json();

    const container = document.getElementById(containerId);
    container.innerHTML = "";

    data.articles.forEach((article) => {
      const card = document.createElement("div");
      card.className = "col-12 col-md-6 col-lg-4";
      card.innerHTML = `
                <div class="card h-100">
                    <img class="card-img-top" src="${article.image || "https://via.placeholder.com/400x200?text=No+Image"}" alt="News Image" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
                    <h5 class="card-title p-3">${article.title || "No title available"}</h5>
                    <p class="card-text p-3">${article.description || "No description available"}</p>
                </div>
            `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(
      `An error occurred while fetching the ${category} news: `,
      error,
    );
    const container = document.getElementById(containerId);
    container.innerHTML = `<p class="text-center text-danger">Failed to load ${category} news</p>`;
  }
}

getNews("us", "sports", "sports-news-container");
getNews("us", "technology", "tech-news-container");
getNews("us", "health", "health-news-container");

const WEATHER_API_KEY = "b81db6160e14eb856d1050a6119b1a53";

async function getWeather(lat, lon) {
  try {
    let res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`,
    );
    let data = await res.json();

    document.getElementById("WMain").textContent = data.weather[0].main;
    document.getElementById("city").textContent = data.name;
    document.getElementById("temp").textContent =
      Math.round(data.main.temp) + "°C";

    let icon = data.weather[0].icon;
    document.getElementById("weather-icon").src =
      `https://openweathermap.org/img/wn/${icon}@2x.png`;
  } catch (error) {
    console.error("Error fetching weather:", error);
    document.getElementById("city").textContent = "Weather unavailable";
  }
}

navigator.geolocation.getCurrentPosition(
  (position) => {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;
    getWeather(lat, lon);
  },
  (error) => {
    console.error("Error getting location:", error);
    getWeather(30.0444, 31.2357);
  },
);

const EXCHANGE_API_KEY = "8f86657b2fb21978ceeb9a10";

async function getRates() {
  try {
    let res = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/EGP`,
    );
    let data = await res.json();

    let usd = 1 / data.conversion_rates.USD;
    let sar = 1 / data.conversion_rates.SAR;

    document.getElementById("usdRate").textContent =
      `1 USD = ${usd.toFixed(2)} EGP`;
    document.getElementById("sarRate").textContent =
      `1 SAR = ${sar.toFixed(2)} EGP`;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    document.getElementById("usdRate").textContent = "Failed to load rates";
    document.getElementById("sarRate").textContent = "Failed to load rates";
  }
}

getRates();

const fromSelect = document.getElementById("from");
const toSelect = document.getElementById("to");

async function loadCurrencies() {
  try {
    let res = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`,
    );
    let data = await res.json();

    let currencies = data.conversion_rates;

    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    Object.keys(currencies).forEach((currency) => {
      let option1 = document.createElement("option");
      option1.value = currency;
      option1.textContent = currency;

      let option2 = document.createElement("option");
      option2.value = currency;
      option2.textContent = currency;

      fromSelect.appendChild(option1);
      toSelect.appendChild(option2);
    });

    fromSelect.value = "USD";
    toSelect.value = "EGP";
  } catch (error) {
    console.error("Error loading currencies:", error);
  }
}

loadCurrencies();

async function convert() {
  try {
    let amount = document.getElementById("amount").value;
    let from = fromSelect.value;
    let to = toSelect.value;

    if (!amount || amount <= 0) {
      document.getElementById("result").textContent =
        "Please enter a valid amount";
      return;
    }

    let res = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${from}`,
    );
    let data = await res.json();

    let rate = data.conversion_rates[to];
    let result = amount * rate;

    document.getElementById("result").textContent =
      `${amount} ${from} = ${result.toFixed(2)} ${to}`;
  } catch (error) {
    console.error("Error converting currency:", error);
    document.getElementById("result").textContent = "Conversion failed";
  }
}

window.convert = convert;

const FOOTBALL_API_KEY =
  "ce52afeed1a00a3eb5c75b5655e0f022f1705b985808ebe02c1119bb67b089ef";
const LEAGUE_NAME = "La Liga";

async function getLiveMatches() {
  try {
    const liveContainer = document.getElementById("live-matches");
    liveContainer.innerHTML = `<p class="text-center">Loading live matches...</p>`;

    const res = await fetch(
      `https://apiv2.allsportsapi.com/football/?met=Livescore&APIkey=${FOOTBALL_API_KEY}`,
    );
    const data = await res.json();

    liveContainer.innerHTML = "";

    const laLigaLive =
      data.result?.filter((match) => match.league_name === LEAGUE_NAME) || [];

    if (laLigaLive.length === 0) {
      liveContainer.innerHTML = `<p class="text-center">No live matches currently</p>`;
      return;
    }

    laLigaLive.forEach((match) => {
      const matchDiv = document.createElement("div");
      matchDiv.className = "match";

      matchDiv.innerHTML = `
                <div class="team">
                    <img src="${match.home_team_logo || "https://via.placeholder.com/40?text=Team"}" alt="${match.event_home_team}" onerror="this.src='https://via.placeholder.com/40?text=Team'">
                    <span>${match.event_home_team}</span>
                </div>

                <div class="score">
                    ${match.event_final_result || "vs"}
                    ${match.match_live === "1" ? '<span class="live-badge">LIVE</span>' : ""}
                    ${match.match_time ? `<small>(${match.match_time}')</small>` : ""}
                </div>

                <div class="team">
                    <span>${match.event_away_team}</span>
                    <img src="${match.away_team_logo || "https://via.placeholder.com/40?text=Team"}" alt="${match.event_away_team}" onerror="this.src='https://via.placeholder.com/40?text=Team'">
                </div>
            `;

      liveContainer.appendChild(matchDiv);
    });
  } catch (error) {
    console.error("Error fetching live matches: ", error);
    const liveContainer = document.getElementById("live-matches");
    liveContainer.innerHTML = `<p class="text-center text-danger">Failed to load live matches</p>`;
  }
}

getLiveMatches();
setInterval(getLiveMatches, 30000);
setInterval(getRates, 5 * 60 * 1000);



