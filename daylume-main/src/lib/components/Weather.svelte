<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";

    let temperature: number | null = null;
    let weatherCode: number | null = null;
    let loading = true;
    let error = "";
    let locationName = "";
    let lastUpdate = "";

    const weatherIcons: Record<number, string> = {
        0: "mdi-weather-sunny", // Clear sky
        1: "mdi-weather-partly-cloudy", // Mainly clear
        2: "mdi-weather-partly-cloudy", // Partly cloudy
        3: "mdi-weather-cloudy", // Overcast
        45: "mdi-weather-fog", // Fog
        48: "mdi-weather-fog", // Depositing rime fog
        51: "mdi-weather-rainy", // Drizzle: Light
        53: "mdi-weather-rainy", // Drizzle: Moderate
        55: "mdi-weather-pouring", // Drizzle: Dense
        61: "mdi-weather-rainy", // Rain: Slight
        63: "mdi-weather-pouring", // Rain: Moderate
        65: "mdi-weather-pouring", // Rain: Heavy
        71: "mdi-weather-snowy", // Snow: Slight
        73: "mdi-weather-snowy", // Snow: Moderate
        75: "mdi-weather-snowy-heavy", // Snow: Heavy
        95: "mdi-weather-lightning", // Thunderstorm: Slight or moderate
        96: "mdi-weather-lightning-rainy", // Thunderstorm with slight hail
        99: "mdi-weather-lightning-rainy", // Thunderstorm with heavy hail
    };

    onMount(() => {
        // Check for cached weather
        if (browser) {
            const cached = localStorage.getItem('daylume-weather-cache');
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    // Use cache if less than 15 minutes old
                    if (Date.now() - data.timestamp < 15 * 60 * 1000) {
                        temperature = data.temperature;
                        weatherCode = data.weatherCode;
                        locationName = data.location || '';
                        loading = false;
                    }
                } catch (e) {}
            }
        }
        
        fetchWeather();
        
        // Refresh every 15 minutes
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    });
    
    async function fetchWeather() {
        // Check saved location preference
        let lat: number | null = null;
        let lon: number | null = null;
        
        if (browser) {
            const savedLocation = localStorage.getItem('daylume-weather-location');
            if (savedLocation) {
                try {
                    const parsed = JSON.parse(savedLocation);
                    if (!parsed.auto && parsed.lat && parsed.lon) {
                        lat = parsed.lat;
                        lon = parsed.lon;
                        locationName = parsed.name || '';
                    }
                } catch (e) {}
            }
        }
        
        if (lat && lon) {
            await getWeatherData(lat, lon);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    await getWeatherData(latitude, longitude);
                    await getCityName(latitude, longitude);
                },
                () => {
                    if (!temperature) {
                        error = "Location access denied";
                        loading = false;
                    }
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        } else {
            error = "Geolocation not supported";
            loading = false;
        }
    }
    
    async function getWeatherData(lat: number, lon: number) {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph`,
            );
            const data = await response.json();
            temperature = Math.round(data.current_weather.temperature);
            weatherCode = data.current_weather.weathercode;
            lastUpdate = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Cache the result
            if (browser) {
                localStorage.setItem('daylume-weather-cache', JSON.stringify({
                    temperature,
                    weatherCode,
                    location: locationName,
                    timestamp: Date.now()
                }));
            }
            
            loading = false;
        } catch (e) {
            if (!temperature) {
                error = "Failed to load weather";
                loading = false;
            }
        }
    }
    
    async function getCityName(lat: number, lon: number) {
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`
            );
            const data = await response.json();
            if (data.results?.[0]) {
                locationName = data.results[0].name || data.results[0].admin1 || '';
            }
        } catch (e) {}
    }

    $: icon =
        weatherCode !== null
            ? weatherIcons[weatherCode] || "mdi-weather-cloudy"
            : "mdi-weather-cloudy";
</script>

<div class="flex items-center gap-3">
    {#if loading}
        <div class="animate-pulse flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-white/20"></div>
            <div class="w-12 h-6 rounded bg-white/20"></div>
        </div>
    {:else if error && !temperature}
        <div class="flex items-center gap-2 text-white/60" title={error}>
            <span class="mdi mdi-weather-cloudy-alert text-2xl"></span>
            <span class="text-sm hidden sm:inline">--°</span>
        </div>
    {:else}
        <div class="flex items-center gap-3 animate-fade-in">
            <span class="mdi {icon} text-3xl text-yellow-300 drop-shadow-lg"></span>
            <div class="flex flex-col">
                <span class="text-2xl font-bold leading-none">{temperature}°</span>
                <span class="text-[10px] text-white/60 uppercase tracking-wider font-medium">
                    {locationName || 'Current'}
                </span>
            </div>
        </div>
    {/if}
</div>
