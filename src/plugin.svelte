<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content" id="plugin-content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
    🦅 { title }
    </div>
    
    <div class="top-bar">
        <select class="model-selector location-selector" on:change={onFavChange}>
            <option value="current">{currentPosition}</option>
            {#if userFavs.length > 0}
                <optgroup label="My Favorites">
                    {#each userFavs as fav, index}
                        <option value={index}>{fav.title || fav.name || 'Favorite ' + (index+1)}</option>
                    {/each}
                </optgroup>
            {/if}
        </select>

        <select class="model-selector" value={currentModel} on:change={changeModel}>
            <option value="ecmwf">ECMWF</option>
            <option value="gfs">GFS</option>
            <option value="icon">ICON</option>
            <option value="iconEu">ICON-EU</option>
            <option value="iconD2">ICON-D2</option>
            <option value="aromeFrance">AROME</option>
            <option value="czeAladin">ALADIN</option>
        </select>
        <button id="toggle-step-btn" on:click={toggleStep} title="Changer l'intervalle">{currentStep}h</button>
        <button id="config-btn" title="Configuration" on:click={openConfig}><span class="gear-icon">⚙️</span></button>
    </div>

    <div id="config-modal">
        <h2>Configuration</h2>
        <div class="config-section">
            <h3>Wind table (km/h)</h3>
            <div class="config-row"><label>Low (<span class="wind-light">Vert</span>)</label><input type="number" id="cfg-wind-light" step="1"></div>
            <div class="config-row"><label>Medium (<span class="wind-mod">Jaune</span>)</label><input type="number" id="cfg-wind-mod" step="1"></div>
            <div class="config-row"><label>Strong (<span class="wind-strong">Orange</span>)</label><input type="number" id="cfg-wind-strong" step="1"></div>
            <div class="config-row"><label>Very strong (<span class="wind-gale">Rouge</span>)</label><input type="number" id="cfg-wind-gale" step="1"></div>
        </div>
        <div class="config-section">
            <h3>Emagram (°C / 100m)</h3>
            <div class="config-row"><label>Threshold green (≥)</label><input type="number" id="cfg-lapse1" step="0.1"></div>
            <div class="config-row"><label>Threshold yellow (≥)</label><input type="number" id="cfg-lapse2" step="0.1"></div>
            <div class="config-row"><label>Threshold orange (≥)</label><input type="number" id="cfg-lapse3" step="0.1"></div>
            <div class="config-row"><label>Threshold red (≥)</label><input type="number" id="cfg-lapse4" step="0.1"></div>
            <div class="config-row"><label>Threshold purple (≥)</label><input type="number" id="cfg-lapse5" step="0.1"></div>
            <div class="config-row"><label>SKEW_FACTOR</label><input type="number" id="cfg-skew" step="0.01"></div>
            <div class="config-row"><label>Particle heating (°C)</label><input type="number" id="cfg-offset" step="0.1"></div>
        </div>
        <div class="config-actions">
            <button class="btn-cancel" id="cfg-cancel" on:click={closeConfig}>Cancel</button>
            <button class="btn-save" id="cfg-save" on:click={saveConfig}>Apply</button>
        </div>
    </div>

    {#if groundElevation != null}
    <div id="alti-temp">
        <span id="altitude"><h3>⛰️ {groundElevation}m</h3></span>
        <span id="temperature"><h3>🌡️ {groundTemperature}°C</h3></span>
    </div>
    {/if}

    <div class="grid-chart-layout">
        <div class="grid-container">
            <table id="wind-grid"></table>
        </div>
        <div class="chart-container" id="chart-section">
            <div class="canvas-wrapper">
                <canvas id="sondageChart"></canvas>
            </div>
        </div>
    </div>
    <div id="status" style="text-align: center; font-size: 12px; color: #7f8c8d;">{@html textStatus}</div>
    <p></p>
    <div id="info"><a href="https://github.com/01ive/windy-plugin-my-airgram">ℹ️</a></div>
</section>

<script lang="ts">
    // Windy modules
    import bcast from "@windy/broadcast";
    import store from "@windy/store";
    import { getMeteogramForecastData, getPointForecastData } from "@windy/fetch";
    import favsModule from "@windy/userFavs";
    import { onDestroy, onMount } from 'svelte';

    // Windy config
    import config from './pluginConfig';

    // mameteo modules and CSS
    import { openConfig, closeConfig, saveConfig } from "../maMeteo/src/config.js"
    import './config.css';  

    import { updateActiveLevels } from '../maMeteo/src/common.js'

    import { selectedHourIndex, setSelectedHourIndex, setCallBackOnClick, renderGrid } from "../maMeteo/src/table.js"
    import './table.css';

    import { drawSounding } from "../maMeteo/src/sounding.js"
    import '../maMeteo/src/sounding.css';

    // Used for global variables access
    import { weather } from '../maMeteo/src/weather.js'

    // Locals modules imports
    import { convertWindyToOpenMeteo } from './convert.js'
   
    // Constants
    // -------------------------------------------------------------------------------------------------
    const { title } = config;

    // Variables
    // -------------------------------------------------------------------------------------------------
    let lat: number | null = null;
    let lon: number | null = null;
    let lastSetTimestamp: number = 0;
    let lastSetPickerLocation: { lat: number; lon: number } | null = null;

    // Svelte variables
    let currentStep = 3;
    let currentPosition: string = "";
    let currentModel: string = "";
    let textStatus: string = "<h2>Click on map or select favorite.</h2>";
    let userFavs: Array<any> = [];
    let groundElevation: number = null; 
    let groundTemperature: number = null; 

    // Timers
    let debounceTimer: any = null;
    
    // Functions
    // -------------------------------------------------------------------------------------------------
    const toggleStep = () => {
        currentStep = currentStep === 3 ? 1 : 3;
        if (lat !== null && lon !== null) fetchWindGrid(lat, lon);
    };

    const changeModel = (event: any) => {
        store.set('product', event.target.value);
        if (lat !== null && lon !== null) fetchWindGrid(lat, lon);
    };

    // Favoris
    const loadFavs = async () => {
        try {
            if (favsModule) {
                // S'adapte à la version de l'API de Windy
                if (typeof favsModule.getAll === 'function') {
                    userFavs = await favsModule.getAll();
                }
            }
        } catch (e) {
            console.error("Erreur lecture favs", e);
        }
    };

    const onFavChange = (event: any) => {
        const val = event.target.value;
        if (val !== 'current') {
            const selectedFav = userFavs[parseInt(val)];
            if (selectedFav && selectedFav.lat !== undefined && selectedFav.lon !== undefined) {
                store.set('mapCoords', { lat: selectedFav.lat, lon: selectedFav.lon, zoom: 12, source: 'globe' });
                store.set('pickerLocation', { lat: selectedFav.lat, lon: selectedFav.lon });

                lat = selectedFav.lat;
                lon = selectedFav.lon;
                const W = (window as any).W;

                requestAnimationFrame(() => {
                    W.map.map.setView([lat, lon], 12, { animate: false });
                });
            }
            currentPosition = userFavs[val].name || userFavs[val].title || 'Favori ' + (parseInt(val)+1);
            event.target.value = 'current'; // Réinitialise visuellement le sélecteur
            fetchWindGrid(selectedFav.lat, selectedFav.lon);
        }
    };

    // Fetch weather data
    const fetchWindGrid = async (latitude: number, longitude: number) => {
        try {
            const model = store.get('product');
            const currentTime = store.get('timestamp'); 

            let modElevation: number = 0;
            
            const [forecast, pointForecast] = await Promise.all([
                getMeteogramForecastData(model, { lat: latitude, lon: longitude, step: currentStep }),
                getPointForecastData(model, { lat: latitude, lon: longitude, step: currentStep })
            ]);
            
            if (!forecast || !forecast.data || !pointForecast || !pointForecast.data) { 
                throw "Can't get forecast data."; 
            }

            modElevation = Math.round(forecast.data.header?.modelElevation || forecast.data.data?.header?.modelElevation || 0);

            // Windy data conversion
            let data = convertWindyToOpenMeteo(forecast, pointForecast);

            weather.elevation = Math.round(forecast.data.header?.elevation);

            // Format usefull daily data
            weather.dailyData = {
                sunrise: [pointForecast.data.celestial.sunriseTs],
                sunset: [pointForecast.data.celestial.sunsetTs]
            }
            weather.weatherData = data.hourly;

            selectPlugginHourFromTime(currentTime);
            updateActiveLevels();    
            renderGrid();
            drawSounding(false);

            setLocalInfo();
            textStatus = `
                        <h3>Model info</h3>
                        ref time: ${forecast.data.header.refTime}<br>
                        update time: ${forecast.data.header.update}<br>
                        elevation: ${forecast.data.header.modelElevation}m
                        `;

        } catch (error) {
            console.error("Erreur d'extraction :", error);
            if (currentStep === 1) {
                console.warn("Repli sur 3h.");
                currentStep = 3;
                fetchWindGrid(latitude, longitude);
            } else {
                textStatus = `<h2><span style="color: #ff0000">${error}</span></h2>`;
            }
        }
    };

    function setLocalInfo() {
        groundElevation = weather.elevation;
        groundTemperature = weather.weatherData.temperature_2m[selectedHourIndex];
    }

    // CallBack when table hour is updated
    const selectHour = () => {
        const index = selectedHourIndex;
        const targetTs = (new Date(weather.weatherData.time[index])).getTime();
        lastSetTimestamp = targetTs;
        store.set('timestamp', targetTs);
        setLocalInfo();
    };

    // Set plugin hour using Windy chronotime
    function selectPlugginHourFromTime(time) {
        if(weather.weatherData) {
            for(let i=0; i<weather.weatherData.time.length; i++) {
                if(time < (new Date(weather.weatherData.time[i])).getTime()) {
                    setSelectedHourIndex(i-1);
                    break;
                }
            }
        } else {
            setSelectedHourIndex(2);
        }
    }

    // Call on Windy events 'timestamp' and 'product'
    const onSettingsChange = () => {
        const currentTs = store.get('timestamp');
        
        if (lastSetTimestamp === currentTs) return;
        lastSetTimestamp = currentTs;

        if (lat !== null && lon !== null) {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                fetchWindGrid(lat, lon);
            }, 250);
        }
    };

    // Call on Windy events 'mapCoords' and 'pickerLocation'
    const updateLocation = () => {
        let newLat = null;
        let newLon = null;
        
        const W = (window as any).W;
        if (W.rootScope.isMobileOrTablet) {
            const coords = store.get('mapCoords');
            if (coords) {
                newLat = coords.lat;
                newLon = coords.lon;
            }
        } else {
            const loc = store.get('pickerLocation');
            if (loc && (!lastSetPickerLocation || lastSetPickerLocation.lat !== loc.lat || lastSetPickerLocation.lon !== loc.lon)) {
                newLat = loc.lat;
                newLon = loc.lon;
                lastSetPickerLocation = loc;
            }
        }

        if (newLat !== null && newLon !== null && (lat !== newLat || lon !== newLon)) {
            lat = newLat;
            lon = newLon;
            
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                fetchWindGrid(lat, lon);
            }, 400);

            currentPosition = `📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
    };

    // Svelte hooks
    onMount(() => {
        if (!document.getElementById('chartjs-script')) {
            const script = document.createElement('script');
            script.id = 'chartjs-script'; script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            document.head.appendChild(script);
        }
        
        loadFavs();
        const model = store.get('product'); 
        currentModel = model;
        currentPosition = "Favorites";
        setCallBackOnClick(selectHour);

        const W = (window as any).W;
        if (W.rootScope.isMobileOrTablet) {
            try { store.on('mapCoords', updateLocation); } catch(e) {}
        } else {
            try { store.on('pickerLocation', updateLocation); } catch(e) {}
        }
        try { store.on('timestamp', onSettingsChange); } catch(e) {}
        try { store.on('product', onSettingsChange); } catch(e) {}

        const coords = store.get('mapCoords');
        currentPosition = `📍 ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
        fetchWindGrid(coords.lat, coords.lon);
    });

    onDestroy(() => { 
        const W = (window as any).W;
        if (W.rootScope.isMobileOrTablet) {
            try { store.off('mapCoords', updateLocation); } catch(e) {}
        } else {
            try { store.off('pickerLocation', updateLocation); } catch(e) {}
        }
        try { store.off('timestamp', onSettingsChange); } catch(e) {}
        try { store.off('product', onSettingsChange); } catch(e) {}
    });
</script>

<style lang="less">    
    .greeting { margin-bottom: 0px; display: inline-block; }
    .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    
    .location-selector { max-width: 140px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }

    .model-selector {
        font-size: 13px;
        cursor: pointer;
        border-radius: 20px;
        background-color: var(--color-gray-dark);
        color: var(--color-text-primary);
        text-align: center;
        transition: all 0.2s;
    }
    .model-selector:hover { background-color: var(--color-orange); }

    optgroup, option {
        background-color: var(--color-gray-dark);
    }

    #config-btn { background: none; border: none; font-size: 20px; cursor: pointer; //transition: transform 0.3s ease; 
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }
    #config-btn:hover { transform: rotate(180deg); }
    .gear-icon:hover { transform: rotate(180deg); }
    .gear-icon {
        display: inline-block;
        transition: transform 0.3s ease;
        transform-origin: center center; /* Force l'axe au centre parfait */
        will-change: transform; /* Prévient les micro-sauts de rendu pixel */
    }
    
    #toggle-step-btn {
        font-size: 13px;
        cursor: pointer;
        border-radius: 20px;
        background-color: var(--color-gray-dark);
        color: var(--color-text-primary);
        transition: all 0.2s;
    }
    #toggle-step-btn:hover { background-color: var(--color-orange); }
    
    #config-modal {
        right: 15px;
        left: auto;
    }

    // .box { margin-top: 10px; padding: 12px; background-color: rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 6px; font-size: 0.95em; line-height: 1.5; }
    // .wind-box { background-color: rgba(41, 128, 185, 0.1); border-color: rgba(41, 128, 185, 0.2); padding: 10px; overflow: hidden; }

    /* LÉGENDE MAMETEO */
    .legend-box { font-size: 11px; display: flex; justify-content: center; gap: 15px; margin-top: 8px; color: #555; padding-bottom: 10px;}
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-color { width: 12px; height: 12px; border: 1px solid #ccc; }

    .grid-chart-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }

    #info {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
        font-size: 20px;
    }

    #alti-temp {
        display: flex;
        justify-content: space-between;
    }

    :global(.chart-container) {
        background-color: unset;
        color: unset;
        text-shadow: unset;
    }

    :root {
        --color-canvas-text: white;
        }
</style>