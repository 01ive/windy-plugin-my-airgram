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
        <h3>Configuration</h3>
        <div class="config-section">
            <strong>Vents Table (km/h)</strong>
            <div class="config-row"><label>Faible (<span class="wind-light">Vert</span>)</label><input type="number" id="cfg-wind-light" step="1"></div>
            <div class="config-row"><label>Modéré (<span class="wind-mod">Jaune</span>)</label><input type="number" id="cfg-wind-mod" step="1"></div>
            <div class="config-row"><label>Fort (<span class="wind-strong">Orange</span>)</label><input type="number" id="cfg-wind-strong" step="1"></div>
            <div class="config-row"><label>Très fort (<span class="wind-gale">Rouge</span>)</label><input type="number" id="cfg-wind-gale" step="1"></div>
        </div>
        <div class="config-section">
            <strong>Émagramme (°C / 100m)</strong>
            <div class="config-row"><label>Seuil Vert (≥)</label><input type="number" id="cfg-lapse1" step="0.1"></div>
            <div class="config-row"><label>Seuil Jaune (≥)</label><input type="number" id="cfg-lapse2" step="0.1"></div>
            <div class="config-row"><label>Seuil Orange (≥)</label><input type="number" id="cfg-lapse3" step="0.1"></div>
            <div class="config-row"><label>Seuil Rouge (≥)</label><input type="number" id="cfg-lapse4" step="0.1"></div>
            <div class="config-row"><label>Seuil Violet (≥)</label><input type="number" id="cfg-lapse5" step="0.1"></div>
            <div class="config-row"><label>SKEW_FACTOR</label><input type="number" id="cfg-skew" step="0.01"></div>
            <div class="config-row"><label>Surchauffe particule (°C)</label><input type="number" id="cfg-offset" step="0.1"></div>
        </div>
        <div class="config-actions">
            <button class="btn-cancel" id="cfg-cancel" on:click={closeConfig}>Annuler</button>
            <button class="btn-save" id="cfg-save" on:click={saveConfig}>Appliquer</button>
        </div>
    </div>

    <div class="grid-chart-layout">
        <div class="grid-container">
            <table id="wind-grid"></table>
        </div>
        <div class="chart-container" id="chart-section">
            <h3 id="chart-title">Profil vertical</h3>
            <div class="canvas-wrapper">
                <canvas id="sondageChart"></canvas>
            </div>
            <!-- Nouvelle zone pour les infos du modèle -->
            <div id="model-info" style="text-align: center; font-size: 11px; color: #7f8c8d; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;"></div>
        </div>
    </div>
</section>

<script lang="ts">
    // Windy modules
    import bcast from "@windy/broadcast";
    import store from "@windy/store";
    import { getMeteogramForecastData, getPointForecastData } from "@windy/fetch";
    import { wind2obj } from "@windy/utils";
    import favsModule from "@windy/userFavs";
    import { onDestroy, onMount, tick } from 'svelte';

    // Windy config
    import config from './pluginConfig';

    // mameteo modules and CSS
    import { lapseRateColor, appConfig, openConfig, closeConfig, saveConfig } from "../../../mameteo/src/config.js"
    import '../../../mameteo/src/config.css';

    import { common, updateActiveLevels } from '../../../mameteo/src/common.js'

    import { LEVELS, windGrid, selectedHourIndex, setSelectedHourIndex, setCallBackOnClick, renderGrid, getWindColorClass } from "../../../mameteo/src/table.js"
    import '../../../mameteo/src/table.css';

    import { drawSounding } from "../../../mameteo/src/sounding.js"
    import '../../../mameteo/src/sounding.css';

    // Used for global variables access
    import { weather } from '../../../mameteo/src/weather.js'

    // Locals modules imports
    import { convertWindyToOpenMeteo } from './convert.js'
   
    const { title } = config;
    
    let currentStep = 3;
    let currentPosition: string = "";

    const FIXED_LEVELS = [
        { alt: "11800m", hpa: 200, z: 11800 },
        { alt: "10500m", hpa: 250, z: 10500 },
        { alt: "9000m",  hpa: 300, z: 9000 },
        { alt: "7000m",  hpa: 400, z: 7000 },
        { alt: "5500m",  hpa: 500, z: 5500 },
        { alt: "4000m",  hpa: 600, z: 4000 },
        { alt: "3000m",  hpa: 700, z: 3000 },
        { alt: "2000m",  hpa: 800, z: 2000 },
        { alt: "1500m",  hpa: 850, z: 1500 },
        { alt: "1000m",  hpa: 900, z: 1000 },
        { alt: "500m",   hpa: 950, z: 500 }
    ];

    const toggleStep = () => {
        currentStep = currentStep === 3 ? 1 : 3;
        if (lat !== null && lon !== null) fetchWindGrid(lat, lon);
    };

    const changeModel = (event: any) => {
        store.set('product', event.target.value);
        if (lat !== null && lon !== null) fetchWindGrid(lat, lon);
    };

    let lat: number | null = null;
    let lon: number | null = null;
    let status: string = "";
    let currentModel: string = "";
    let groundElevation: number = 0; 
    let modElevation: number = 0;
    
    let times: Array<{ label: string, index: number, timestamp: number }> = [];
    let levels: Array<{ key: string, alt: number, label: string, isSurface: boolean, hpa: number }> = [];
    let grid: Array<Array<{ speedKmh: number, dir: number, colorClass: string, cloudCover: number } | null>> = [];
    let precipitations: Array<number> = []; 
    
    let hourlyProfiles: Array<any> = []; 
    let thermalCeilings: Array<any> = [];
    let sondageChartInstance: any = null;

    // GESTION DES FAVORIS
    let userFavs: Array<any> = [];

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
                store.set('pickerLocation', { lat: selectedFav.lat, lon: selectedFav.lon });
                store.set('mapCoords', { lat: selectedFav.lat, lon: selectedFav.lon, zoom: 12, source: 'globe' });
                
                // Centre physiquement la carte sur le nouveau point
                const W = (window as any).W;
                const pluginWindows = document.querySelector(`#plugin-content`) as HTMLDivElement;
                if (W && W.map.map) {
                    if (typeof W.map.map.panTo === 'function') {
                        W.map.map.setZoom(12);
                        if (W.rootScope.isMobileOrTablet && pluginWindows) {
                            const pickerDot = document.querySelector(`#picker-dot`) as HTMLDivElement;
                            const mapLatHeight = W.map.map.getBounds().getSouth() - W.map.map.getBounds().getNorth();
                            const ratioLat = (mapLatHeight / W.map.map.getSize().y);
                            const newLat = selectedFav.lat + ((W.map.map.getSize().y / 2) - (pickerDot.offsetTop + (pickerDot.offsetHeight / 2))) * ratioLat;
                            W.map.map.panTo({ lng: selectedFav.lon, lat: newLat });
                        } else {
                            W.map.map.panTo([selectedFav.lat, selectedFav.lon]);
                        }
                    }
                }
            }
            currentPosition = userFavs[val].name || userFavs[val].title || 'Favori ' + (parseInt(val)+1);
            event.target.value = 'current'; // Réinitialise visuellement le sélecteur
        }
    };

    const fetchWindGrid = async (latitude: number, longitude: number) => {
        status = "Data extraction...";
        times = []; levels = []; grid = []; hourlyProfiles = []; thermalCeilings = []; precipitations = [];
        
        try {
            const model = store.get('product');
            
            const [forecast, pointForecast] = await Promise.all([
                getMeteogramForecastData(model, { lat: latitude, lon: longitude, step: currentStep }),
                getPointForecastData(model, { lat: latitude, lon: longitude, step: currentStep })
            ]);
            
            if (!forecast || !forecast.data || !pointForecast || !pointForecast.data) { 
                status = "Données indisponibles."; 
                return; 
            }

            modElevation = Math.round(forecast.data.header?.modelElevation || forecast.data.data?.header?.modelElevation || 0);
            groundElevation = Math.round(forecast.data.header?.elevation || modElevation);

            // Windy data conversion
            let data = convertWindyToOpenMeteo(forecast);

            weather.elevation = groundElevation;

            // Format usefull daily data
            weather.dailyData = {
                sunrise: [pointForecast.data.celestial.sunriseTs],
                sunset: [pointForecast.data.celestial.sunsetTs]
            }
            weather.weatherData = data.hourly;

            // document.getElementById('location-altitude').innerText = `\n${Math.round(weather.elevation)}m`;
            // modelSelect.value = weather.model;
            updateActiveLevels();    
            renderGrid();
            drawSounding(false);

        } catch (error) {
            console.error("Erreur d'extraction :", error);
            if (currentStep === 1) {
                console.warn("Repli sur 3h.");
                currentStep = 3;
                fetchWindGrid(latitude, longitude);
            } else {
                status = "Erreur lors du sondage.";
            }
        }
    };

    let debounceTimer: any = null;
    let lastSetTimestamp: number = 0;

    const selectHour = () => {
        const index = selectedHourIndex;
        const targetTs = (new Date(weather.weatherData.time[index])).getTime();
        lastSetTimestamp = targetTs;
        store.set('timestamp', targetTs);
    };

    function selectPlugginHourFromTime(time) {
        if(weather.weatherData) {
            for(let i=0; i<weather.weatherData.time.length; i++) {
                if(time <= (new Date(weather.weatherData.time[i])).getTime()) {
                    setSelectedHourIndex(i-1);
                    break;
                }
            }
        } else {
            setSelectedHourIndex(2);
        }
    }

    const onSettingsChange = () => {
        const currentTs = store.get('timestamp');
        
        if (lastSetTimestamp === currentTs) return;
        lastSetTimestamp = currentTs;

        if (lat !== null && lon !== null) {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                const currentTime = store.get('timestamp'); 
                fetchWindGrid(lat, lon);
                selectPlugginHourFromTime(currentTime);
            }, 250);
        }
    };

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
            if (loc) {
                newLat = loc.lat;
                newLon = loc.lon;
            }
        }

        if (newLat !== null && newLon !== null && (lat !== newLat || lon !== newLon)) {
            lat = newLat;
            lon = newLon;
            
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                const currentTime = store.get('timestamp'); 
                fetchWindGrid(lat, lon);
                selectPlugginHourFromTime(currentTime);
            }, 400); 
        }

        currentPosition = `📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    };

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

        try { store.on('pickerLocation', updateLocation); } catch(e) {}
        try { store.on('mapCoords', updateLocation); } catch(e) {}
        try { store.on('timestamp', onSettingsChange); } catch(e) {}
        try { store.on('product', onSettingsChange); } catch(e) {}
    });

    onDestroy(() => { 
        try { store.off('pickerLocation', updateLocation); } catch(e) {}
        try { store.off('mapCoords', updateLocation); } catch(e) {}
        try { store.off('timestamp', onSettingsChange); } catch(e) {}
        try { store.off('product', onSettingsChange); } catch(e) {}
    });
</script>

<style lang="less">    
    .greeting { margin-bottom: 0px; display: inline-block; }
    .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    
    .location-selector { max-width: 140px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }

    .model-selector {
        padding: 4px 8px;
        font-size: 13px;
        cursor: pointer;
        border: 1px solid #ccc;
        border-radius: 6px;
        background-color: #fff;
        color: #2980b9;
        font-weight: bold;
        transition: all 0.2s;
    }
    .model-selector:hover { background-color: #e8f4f8; border-color: #2980b9; }

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
        padding: 4px 8px;
        font-size: 13px;
        cursor: pointer;
        border: 1px solid #ccc;
        border-radius: 6px;
        background-color: #fff;
        color: #2980b9;
        font-weight: bold;
        transition: all 0.2s;
    }
    #toggle-step-btn:hover { background-color: #e8f4f8; border-color: #2980b9; }
    
    #config-modal {
        right: 15px;
        left: auto;
    }

    .box { margin-top: 10px; padding: 12px; background-color: rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 6px; font-size: 0.95em; line-height: 1.5; }
    .wind-box { background-color: rgba(41, 128, 185, 0.1); border-color: rgba(41, 128, 185, 0.2); padding: 10px; overflow: hidden; }

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
</style>