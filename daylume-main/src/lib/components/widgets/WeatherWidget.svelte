<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    
    interface WeatherData {
        temp: number;
        feelsLike: number;
        condition: string;
        icon: string;
        location: string;
        high: number;
        low: number;
        humidity: number;
        windSpeed: number;
        lastUpdated: string;
    }
    
    let weather: WeatherData | null = null;
    let loading = true;
    let error: string | null = null;
    let showSettings = false;
    let customLocation = '';
    let useAutoLocation = true;
    let savedLocation: { lat: number; lon: number; name: string; auto?: boolean } | null = null;
    
    // Weather condition to icon mapping
    function getWeatherIcon(code: number, isNight: boolean): string {
        if (code === 0) return isNight ? '🌙' : '☀️';
        if (code <= 3) return isNight ? '🌙' : '⛅';
        if (code <= 48) return '🌫️';
        if (code <= 57) return '🌦️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '❄️';
        if (code <= 82) return '🌧️';
        if (code <= 99) return '⛈️';
        return '🌡️';
    }
    
    function getConditionText(code: number): string {
        if (code === 0) return 'Clear';
        if (code <= 3) return 'Partly Cloudy';
        if (code <= 48) return 'Foggy';
        if (code <= 57) return 'Drizzle';
        if (code <= 67) return 'Rainy';
        if (code <= 77) return 'Snowy';
        if (code <= 82) return 'Showers';
        if (code <= 99) return 'Thunderstorm';
        return 'Unknown';
    }
    
    onMount(() => {
        // Load saved location preference
        if (browser) {
            const saved = localStorage.getItem('daylume-weather-location');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    savedLocation = parsed;
                    useAutoLocation = parsed.auto || false;
                } catch (e) {}
            }
        }
        
        fetchWeather();
        
        // Refresh weather every 15 minutes
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    });
    
    async function fetchWeather() {
        loading = true;
        error = null;
        
        try {
            if (useAutoLocation) {
                // Auto-detect location
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const { latitude, longitude } = position.coords;
                            await fetchWeatherData(latitude, longitude);
                            // Reverse geocode to get city name
                            await getCityName(latitude, longitude);
                        },
                        async (err) => {
                            console.warn('Geolocation error:', err.message);
                            // Fallback to saved or default location
                            if (savedLocation && !savedLocation.auto) {
                                await fetchWeatherData(savedLocation.lat, savedLocation.lon);
                            } else {
                                error = 'Enable location access for weather';
                                loading = false;
                            }
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
                    );
                } else {
                    error = 'Location not supported';
                    loading = false;
                }
            } else if (savedLocation) {
                await fetchWeatherData(savedLocation.lat, savedLocation.lon);
            }
        } catch (e) {
            error = 'Unable to load weather';
            loading = false;
        }
    }
    
    async function getCityName(lat: number, lon: number) {
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`
            );
            const data = await response.json();
            if (data.results?.[0]) {
                const city = data.results[0].name || data.results[0].admin1 || 'Your Location';
                if (weather) {
                    weather.location = city;
                    weather = weather; // Trigger reactivity
                }
            }
        } catch (e) {
            // Silently fail, keep "Current Location" as fallback
        }
    }
    
    async function fetchWeatherData(lat: number, lon: number) {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph`
            );
            
            if (!response.ok) throw new Error('Weather API error');
            
            const data = await response.json();
            const weatherCode = data.current.weather_code;
            const hour = new Date().getHours();
            const isNight = hour < 6 || hour > 20;
            
            weather = {
                temp: Math.round(data.current.temperature_2m),
                feelsLike: Math.round(data.current.apparent_temperature),
                condition: getConditionText(weatherCode),
                icon: getWeatherIcon(weatherCode, isNight),
                location: savedLocation?.name || 'Current Location',
                high: Math.round(data.daily.temperature_2m_max[0]),
                low: Math.round(data.daily.temperature_2m_min[0]),
                humidity: Math.round(data.current.relative_humidity_2m),
                windSpeed: Math.round(data.current.wind_speed_10m),
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            loading = false;
        } catch (e) {
            error = 'Unable to load weather';
            loading = false;
        }
    }
    
    async function searchLocation() {
        if (!customLocation.trim()) return;
        
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(customLocation)}&count=1&language=en&format=json`
            );
            const data = await response.json();
            
            if (data.results?.[0]) {
                const result = data.results[0];
                savedLocation = {
                    lat: result.latitude,
                    lon: result.longitude,
                    name: result.name,
                    auto: false
                };
                useAutoLocation = false;
                
                // Save to localStorage
                if (browser) {
                    localStorage.setItem('daylume-weather-location', JSON.stringify(savedLocation));
                }
                
                await fetchWeatherData(result.latitude, result.longitude);
                if (weather) {
                    weather.location = result.name;
                }
                showSettings = false;
                customLocation = '';
            } else {
                error = 'Location not found';
            }
        } catch (e) {
            error = 'Search failed';
        }
    }
    
    function useCurrentLocation() {
        useAutoLocation = true;
        savedLocation = { lat: 0, lon: 0, name: '', auto: true };
        if (browser) {
            localStorage.setItem('daylume-weather-location', JSON.stringify({ auto: true }));
        }
        showSettings = false;
        fetchWeather();
    }
</script>

<div class="h-full flex flex-col relative">
    {#if loading}
        <div class="flex-1 flex items-center justify-center">
            <div class="animate-pulse flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-full bg-white/10"></div>
                <div class="w-16 h-4 rounded bg-white/10"></div>
            </div>
        </div>
    {:else if error && !weather}
        <div class="flex-1 flex flex-col items-center justify-center text-center px-2">
            <span class="text-3xl mb-2">🌡️</span>
            <p class="text-xs text-gray-500 mb-2">{error}</p>
            <button 
                on:click={fetchWeather}
                class="text-xs text-primary hover:underline"
            >
                Retry
            </button>
        </div>
    {:else if weather}
        <div class="flex-1 flex flex-col items-center justify-center text-center">
            <!-- Main weather display -->
            <span class="text-4xl mb-1">{weather.icon}</span>
            <div class="text-3xl font-bold">{weather.temp}°</div>
            <div class="text-xs text-gray-400 mt-1">{weather.condition}</div>
            
            <!-- High/Low -->
            <div class="flex gap-3 mt-2 text-xs">
                <span class="text-blue-400 flex items-center gap-0.5">
                    <span class="text-[10px]">↓</span> {weather.low}°
                </span>
                <span class="text-orange-400 flex items-center gap-0.5">
                    <span class="text-[10px]">↑</span> {weather.high}°
                </span>
            </div>
            
            <!-- Location & Settings -->
            <button 
                on:click={() => showSettings = !showSettings}
                class="mt-2 text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
            >
                <span class="mdi mdi-map-marker text-xs"></span>
                {weather.location}
                <span class="mdi mdi-chevron-{showSettings ? 'up' : 'down'} text-xs"></span>
            </button>
        </div>
        
        <!-- Settings Panel -->
        {#if showSettings}
            <div class="absolute inset-0 bg-[#0a0a12]/95 backdrop-blur-sm rounded-xl p-3 flex flex-col z-10">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-medium text-white">Weather Location</span>
                    <button 
                        on:click={() => showSettings = false}
                        class="text-gray-400 hover:text-white"
                    >
                        <span class="mdi mdi-close text-sm"></span>
                    </button>
                </div>
                
                <!-- Auto Location Button -->
                <button
                    on:click={useCurrentLocation}
                    class="w-full p-2 mb-2 rounded-lg text-xs flex items-center gap-2 transition-colors
                        {useAutoLocation ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
                >
                    <span class="mdi mdi-crosshairs-gps"></span>
                    Use Current Location
                </button>
                
                <!-- Custom Location Search -->
                <div class="flex gap-2">
                    <input
                        type="text"
                        bind:value={customLocation}
                        placeholder="Search city..."
                        class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                        on:keydown={(e) => e.key === 'Enter' && searchLocation()}
                    />
                    <button
                        on:click={searchLocation}
                        class="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs transition-colors"
                    >
                        <span class="mdi mdi-magnify"></span>
                    </button>
                </div>
                
                {#if savedLocation?.name && !savedLocation.auto}
                    <p class="text-[10px] text-gray-500 mt-2">
                        Current: {savedLocation.name}
                    </p>
                {/if}
            </div>
        {/if}
    {/if}
</div>
