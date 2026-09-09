const API_URL = "https://api.open-meteo.com/v1/forecast";

const STORAGE_KEY = "weatherGPT_offline_forecast";

const locationInput = document.getElementById("locationInput");
const searchBtn = document.getElementById("searchBtn");

const connectionStatus =
    document.getElementById("connectionStatus");

const locationName =
    document.getElementById("locationName");

const currentTemp =
    document.getElementById("currentTemp");

const currentCondition =
    document.getElementById("currentCondition");

const currentHumidity =
    document.getElementById("currentHumidity");

const currentWind =
    document.getElementById("currentWind");

const lastUpdated =
    document.getElementById("lastUpdated");

const hourlyForecast =
    document.getElementById("hourlyForecast");

const dailyForecast =
    document.getElementById("dailyForecast");

const storageStatus =
    document.getElementById("storageStatus");


// --------------------------------------------------
// WEATHER CODE
// --------------------------------------------------

function getWeatherDescription(code) {

    const weatherCodes = {

        0: "☀️ Clear",

        1: "🌤️ Mainly Clear",
        2: "⛅ Partly Cloudy",
        3: "☁️ Cloudy",

        45: "🌫️ Fog",
        48: "🌫️ Fog",

        51: "🌦️ Light Drizzle",
        53: "🌦️ Drizzle",
        55: "🌧️ Heavy Drizzle",

        61: "🌦️ Light Rain",
        63: "🌧️ Rain",
        65: "🌧️ Heavy Rain",

        71: "🌨️ Light Snow",
        73: "❄️ Snow",
        75: "❄️ Heavy Snow",

        80: "🌦️ Rain Showers",
        81: "🌧️ Rain Showers",
        82: "🌧️ Heavy Showers",

        95: "⛈️ Thunderstorm",

        96: "⛈️ Thunderstorm + Hail",
        99: "⛈️ Thunderstorm + Hail"
    };

    return weatherCodes[code] || "🌤️ Unknown";
}


// --------------------------------------------------
// GET LOCATION COORDINATES
// --------------------------------------------------

async function getCoordinates(city) {

    const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to find location");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("Location not found");
    }

    return {
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude,
        name: data.results[0].name,
        country: data.results[0].country
    };
}


// --------------------------------------------------
// FETCH WEATHER
// --------------------------------------------------

async function fetchWeather(city) {

    const location = await getCoordinates(city);

    const url =
        `${API_URL}?latitude=${location.latitude}` +
        `&longitude=${location.longitude}` +
        `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
        `&forecast_days=7` +
        `&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Weather API request failed");
    }

    const data = await response.json();

    return {
        location: location,
        weather: data
    };
}


// --------------------------------------------------
// SAVE TO LOCAL STORAGE
// --------------------------------------------------

function saveWeather(data) {

    const weather = data.weather;

    const now = new Date();

    const record = {

        location: data.location,

        savedAt: now.toISOString(),

        hourly24h: {

            time: weather.hourly.time.slice(0, 24),

            temperature:
                weather.hourly.temperature_2m.slice(0, 24),

            humidity:
                weather.hourly.relative_humidity_2m.slice(0, 24),

            precipitationProbability:
                weather.hourly.precipitation_probability.slice(0, 24),

            weatherCode:
                weather.hourly.weather_code.slice(0, 24),

            wind:
                weather.hourly.wind_speed_10m.slice(0, 24)
        },

        daily7days: {

            time:
                weather.daily.time.slice(0, 7),

            weatherCode:
                weather.daily.weather_code.slice(0, 7),

            maxTemperature:
                weather.daily.temperature_2m_max.slice(0, 7),

            minTemperature:
                weather.daily.temperature_2m_min.slice(0, 7),

            precipitationProbability:
                weather.daily.precipitation_probability_max.slice(0, 7),

            maxWind:
                weather.daily.wind_speed_10m_max.slice(0, 7)
        }
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(record)
    );

    return record;
}


// --------------------------------------------------
// LOAD SAVED WEATHER
// --------------------------------------------------

function loadSavedWeather() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return null;
    }

    try {

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "Saved weather data is corrupted",
            error
        );

        return null;
    }
}


// --------------------------------------------------
// DISPLAY WEATHER
// --------------------------------------------------

function displayWeather(record) {

    const location = record.location;

    locationName.textContent =
        `${location.name}, ${location.country}`;

    const savedDate =
        new Date(record.savedAt);

    lastUpdated.textContent =
        `Last updated: ${savedDate.toLocaleString()}`;


    // Current temperature

    currentTemp.textContent =
        record.hourly24h.temperature[0];

    currentCondition.textContent =
        getWeatherDescription(
            record.hourly24h.weatherCode[0]
        );

    currentHumidity.textContent =
        record.hourly24h.humidity[0];

    currentWind.textContent =
        record.hourly24h.wind[0];


    displayHourlyForecast(record);

    displayDailyForecast(record);


    storageStatus.textContent =
        `Stored ${record.hourly24h.time.length} hourly records and ${record.daily7days.time.length} daily records on this device.`;
}


// --------------------------------------------------
// DISPLAY 24 HOUR FORECAST
// --------------------------------------------------

function displayHourlyForecast(record) {

    hourlyForecast.innerHTML = "";

    const hourly =
        record.hourly24h;

    for (let i = 0; i < hourly.time.length; i++) {

        const date =
            new Date(hourly.time[i]);

        const time =
            date.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            });

        const card =
            document.createElement("div");

        card.className = "hour-card";

        card.innerHTML = `

            <div class="time">
                ${time}
            </div>

            <div class="temperature">
                ${hourly.temperature[i]}°C
            </div>

            <div>
                ${getWeatherDescription(
                    hourly.weatherCode[i]
                )}
            </div>

            <p>
                💧 Humidity:
                ${hourly.humidity[i]}%
            </p>

            <p>
                🌧️ Rain:
                ${hourly.precipitationProbability[i]}%
            </p>

            <p>
                💨 Wind:
                ${hourly.wind[i]} km/h
            </p>
        `;

        hourlyForecast.appendChild(card);
    }
}


// --------------------------------------------------
// DISPLAY 7 DAY FORECAST
// --------------------------------------------------

function displayDailyForecast(record) {

    dailyForecast.innerHTML = "";

    const daily =
        record.daily7days;

    for (let i = 0; i < daily.time.length; i++) {

        const date =
            new Date(daily.time[i]);

        const day =
            date.toLocaleDateString([], {
                weekday: "long"
            });

        const card =
            document.createElement("div");

        card.className = "day-card";

        card.innerHTML = `

            <strong>
                ${day}
            </strong>

            <span>
                ${getWeatherDescription(
                    daily.weatherCode[i]
                )}
            </span>

            <span>
                🌡️ ${daily.maxTemperature[i]}° /
                ${daily.minTemperature[i]}°
            </span>

            <span>
                🌧️ ${daily.precipitationProbability[i]}%
            </span>
        `;

        dailyForecast.appendChild(card);
    }
}


// --------------------------------------------------
// SEARCH
// --------------------------------------------------

async function searchWeather() {

    const city =
        locationInput.value.trim();

    if (!city) {

        alert("Please enter a city.");

        return;
    }


    if (!navigator.onLine) {

        const saved =
            loadSavedWeather();

        if (saved) {

            displayWeather(saved);

            alert(
                "You are offline. Showing the saved forecast."
            );

        } else {

            alert(
                "You are offline and no weather data has been saved yet."
            );
        }

        return;
    }


    searchBtn.disabled = true;

    searchBtn.textContent =
        "Loading...";


    try {

        const data =
            await fetchWeather(city);

        const record =
            saveWeather(data);

        displayWeather(record);

    } catch (error) {

        console.error(error);

        const saved =
            loadSavedWeather();

        if (saved) {

            displayWeather(saved);

            alert(
                "Unable to get fresh weather. Showing saved forecast."
            );

        } else {

            alert(
                "Unable to get weather data."
            );
        }

    } finally {

        searchBtn.disabled = false;

        searchBtn.textContent =
            "Get Weather";
    }
}


// --------------------------------------------------
// ONLINE / OFFLINE STATUS
// --------------------------------------------------

function updateConnectionStatus() {

    if (navigator.onLine) {

        connectionStatus.textContent =
            "🟢 Online";

        connectionStatus.className =
            "status online";

    } else {

        connectionStatus.textContent =
            "🔴 Offline";

        connectionStatus.className =
            "status offline";

        const saved =
            loadSavedWeather();

        if (saved) {
            displayWeather(saved);
        }
    }
}


// --------------------------------------------------
// AUTO REFRESH WHEN INTERNET RETURNS
// --------------------------------------------------

window.addEventListener(
    "online",
    async () => {

        updateConnectionStatus();

        const saved =
            loadSavedWeather();

        if (!saved) {
            return;
        }

        try {

            const city =
                saved.location.name;

            const data =
                await fetchWeather(city);

            const record =
                saveWeather(data);

            displayWeather(record);

        } catch (error) {

            console.error(
                "Automatic weather update failed:",
                error
            );
        }
    }
);


window.addEventListener(
    "offline",
    updateConnectionStatus
);


// --------------------------------------------------
// BUTTON
// --------------------------------------------------

searchBtn.addEventListener(
    "click",
    searchWeather
);


// Enter key

locationInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            searchWeather();
        }
    }
);


// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------

updateConnectionStatus();

const saved =
    loadSavedWeather();

if (saved) {

    displayWeather(saved);

} else {

    storageStatus.textContent =
        "No forecast stored yet.";
}


// --------------------------------------------------
// SERVICE WORKER
// --------------------------------------------------

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("sw.js")
                .then(() => {

                    console.log(
                        "Service Worker registered."
                    );

                })
                .catch((error) => {

                    console.error(
                        "Service Worker registration failed:",
                        error
                    );
                });
        }
    );
}