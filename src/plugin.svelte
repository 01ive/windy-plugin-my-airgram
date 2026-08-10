<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content" id="plugin-content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
    { title }
    </div>
    
    <div class="top-bar">
            <!-- {#if lat !== null && lon !== null} -->
                    <select class="model-selector location-selector" on:change={onFavChange}>
                        <option value="current">{currentPosition}</option>
                        {#if userFavs.length > 0}
                            <optgroup label="Mes Favoris">
                                {#each userFavs as fav, index}
                                    <option value={index}>{fav.title || fav.name || 'Favori ' + (index+1)}</option>
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
                    <button id="config-btn" title="Configuration" on:click={openConfig}>⚙️</button>
            <!-- {/if} -->
    </div>

    <!-- MODALE DE CONFIGURATION -->
    {#if showConfig}
        <div id="config-modal">
            <h3>Configuration</h3>
            <div class="config-section">
                <strong>Vents Table (km/h)</strong>
                <div class="config-row"><label>Faible (<span style="color:#2ecc71;">Vert</span>)</label><input type="number" bind:value={tempConfig.windLight} step="1"></div>
                <div class="config-row"><label>Modéré (<span style="color:#f1c40f;">Jaune</span>)</label><input type="number" bind:value={tempConfig.windMod} step="1"></div>
                <div class="config-row"><label>Fort (<span style="color:#e67e22;">Orange</span>)</label><input type="number" bind:value={tempConfig.windStrong} step="1"></div>
                <div class="config-row"><label>Très fort (<span style="color:#e74c3c;">Rouge</span>)</label><input type="number" bind:value={tempConfig.windGale} step="1"></div>
            </div>
            <div class="config-section">
                <strong>Émagramme (°C / 100m)</strong>
                <div class="config-row"><label>Seuil Vert (≥)</label><input type="number" bind:value={tempConfig.lapse1} step="0.1"></div>
                <div class="config-row"><label>Seuil Jaune (≥)</label><input type="number" bind:value={tempConfig.lapse2} step="0.1"></div>
                <div class="config-row"><label>Seuil Orange (≥)</label><input type="number" bind:value={tempConfig.lapse3} step="0.1"></div>
                <div class="config-row"><label>Seuil Rouge (≥)</label><input type="number" bind:value={tempConfig.lapse4} step="0.1"></div>
                <div class="config-row"><label>Seuil Violet (≥)</label><input type="number" bind:value={tempConfig.lapse5} step="0.1"></div>
                <div class="config-row"><label>SKEW_FACTOR</label><input type="number" bind:value={tempConfig.skewFactor} step="0.01"></div>
                <div class="config-row"><label>Surchauffe particule (°C)</label><input type="number" bind:value={tempConfig.parcelOffset} step="0.1"></div>
            </div>
            <div class="config-actions">
                <button class="btn-cancel" on:click={closeConfig}>Annuler</button>
                <button class="btn-save" on:click={saveConfig}>Appliquer</button>
            </div>
        </div>
    {/if}

    {#if lat !== null && lon !== null}
        <div class="box wind-box">
            {#if status === "Profil chargé."}
                
                <!-- TABLE DES VENTS (GRID) -->
                <div class="grid-container">
                    <table class="wind-grid">
                        <thead>
                            <tr>
                                <th class="y-axis" style="z-index: 3;">Heure</th>
                                {#each times as t, j}
                                    <th 
                                        class="hour-header {selectedHourIndex === j ? 'active' : ''}" 
                                        on:click={() => selectHour(j)}
                                    >
                                        {t.label}
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            <!-- LIGNE DES PLAFONDS THERMIQUES -->
                            <tr class="ceiling-row">
                                <th class="y-axis" style="color: #e74c3c;">Plafond (m)</th>
                                {#each times as t, j}
                                    <td class="{selectedHourIndex === j ? 'active-col' : ''}" style="background-color: #fdf2f0;">
                                        {#if thermalCeilings[j] && thermalCeilings[j].hasThermal}
                                            <div style="color: #e74c3c; font-weight: bold; font-size: 13px;">
                                                {thermalCeilings[j].alt}
                                                {#if thermalCeilings[j].isCloud}
                                                    <span style="font-size:10px;" title="Bloqué par les nuages">☁️</span>
                                                {:else}
                                                    <div style="color: #00dbff; font-size: 14px;">⬆</div>
                                                {/if}
                                            </div>
                                        {/if}
                                    </td>
                                {/each}
                            </tr>

                            <!-- GRILLE DES VENTS ET NUAGES -->
                            {#each levels as level, i}
                                <tr style="{level.isSurface ? 'border-bottom: 2px solid #2980b9;' : ''}">
                                    <th class="y-axis" style="{level.isSurface ? 'color: #2980b9; font-weight: bold;' : ''}">
                                        {level.label}
                                    </th>
                                    {#each times as t, j}
                                        <td class="{selectedHourIndex === j ? 'active-col' : ''}"
                                            style="
                                                {thermalCeilings[j]?.hasThermal && thermalCeilings[j]?.topLevelIndex === i ? 'box-shadow: inset 0 -4px 0 #e74c3c;' : ''}
                                                {grid[i][j] && grid[i][j].cloudCover > 0 ? `background-color: rgba(170, 180, 190, ${grid[i][j].cloudCover / 100});` : ''}
                                            ">
                                            {#if grid[i][j]}
                                                <div class="cell-content {grid[i][j].colorClass}">
                                                    <span class="arrow" style="transform: rotate({grid[i][j].dir}deg);">↓</span>
                                                    <span>{grid[i][j].speedKmh}</span>
                                                </div>
                                            {:else}
                                                <span style="color: #999;">-</span>
                                            {/if}
                                        </td>
                                    {/each}
                                </tr>
                            {/each}
                            
                            <!-- LIGNE DES PRÉCIPITATIONS (MAMETEO STYLE) -->
                            <tr>
                                <th class="y-axis">💧 mm</th>
                                {#each times as t, j}
                                    <td class="{selectedHourIndex === j ? 'active-col' : ''}">
                                        {#if precipitations[j] > 0}
                                            <div style="color: #3498db; font-weight: bold; font-size: 12px;">
                                                {precipitations[j]}
                                            </div>
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        </tbody>
                    </table>
                    <!-- LÉGENDE MAMETEO -->
                    <div class="legend-box">
                        <div class="legend-item"><div class="legend-color" style="background: rgba(170, 180, 190, 0.7);"></div> Nuages</div>
                        <div class="legend-item"><div class="legend-color" style="border-top: 4px solid #e74c3c; height: 4px; background: transparent;"></div> Plafond Thermique</div>
                    </div>
                </div>

                <!-- GRAPHIQUE ÉMAGRAMME -->
                <div class="chart-container" style="display: {selectedHourIndex !== null ? 'block' : 'none'}; margin-top: 20px;">
                    <h3 id="chart-title">Profil vertical à {times[selectedHourIndex]?.label || ''}</h3>
                    <div class="canvas-wrapper">
                        <canvas id="sondageChart"></canvas>
                    </div>
                </div>

            {:else}
                <i style="color: #d35400;">{status}</i>
            {/if}
        </div>
    {:else}
        <div class="box">
            <i>Déplacez la carte ou ouvrez le sélecteur pour sonder la masse d'air.</i>
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from "@windy/broadcast";
    import store from "@windy/store";
    import { getMeteogramForecastData, getPointForecastData } from "@windy/fetch";
    import { wind2obj } from "@windy/utils";
    import favsModule from "@windy/userFavs";
    import { onDestroy, onMount, tick } from 'svelte';

    import config from './pluginConfig';
    const { title } = config;

    let appConfig = {
        windLight: 15, windMod: 30, windStrong: 50, windGale: 100,
        lapse1: 0.6, lapse2: 0.8, lapse3: 1.0, lapse4: 1.2, lapse5: 1.4,
        skewFactor: 0.08, parcelOffset: 0.0 
    };
    
    let tempConfig = { ...appConfig };
    let showConfig = false;
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

    const openConfig = () => { tempConfig = { ...appConfig }; showConfig = true; };
    const closeConfig = () => { showConfig = false; };
    const saveConfig = () => {
        appConfig = { ...tempConfig };
        showConfig = false;
        if (hourlyProfiles.length > 0) {
            for (let i = 0; i < grid.length; i++) {
                for (let j = 0; j < grid[i].length; j++) {
                    if (grid[i][j]) {
                        grid[i][j].colorClass = getWindColorClass(grid[i][j].speedKmh);
                    }
                }
            }
            grid = grid; 

            calculateThermals();
            if (selectedHourIndex !== null) drawSondage(selectedHourIndex);
        }
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
    let selectedHourIndex: number | null = null;
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

    const centerTable = () => {
        const container = document.querySelector('.grid-container') as HTMLElement;
        const activeHeader = document.querySelector('.hour-header.active') as HTMLElement;
        if (container && activeHeader) {
            const scrollPos = activeHeader.offsetLeft - (container.clientWidth / 2) + (activeHeader.offsetWidth / 2);
            if (container.scrollTo) {
                container.scrollTo({ left: scrollPos, behavior: 'smooth' });
            } else {
                container.scrollLeft = scrollPos;
            }
        }
    };

    const getWindColorClass = (speedKmh: number) => {
        if (speedKmh < appConfig.windLight) return 'wind-light';
        if (speedKmh < appConfig.windMod) return 'wind-mod';
        if (speedKmh < appConfig.windStrong) return 'wind-strong';
        if (speedKmh < appConfig.windGale) return 'wind-gale';
        return 'wind-hurricane';
    };

    const getDewPoint = (tC: number, rh: number) => {
        if (tC === null || rh === null) return null;
        const a = 17.625; const b = 243.04;
        const alpha = Math.log(rh / 100.0) + ((a * tC) / (b + tC));
        return (b * alpha) / (a - alpha);
    };

    const calculateThermals = () => {
        thermalCeilings = [];
        for (let j = 0; j < times.length; j++) {
            const envData = hourlyProfiles[j];
            if (!envData || envData.length === 0) {
                thermalCeilings.push({ 
                    alt: 0, isCloud: false, hasThermal: false, topLevelIndex: -1,
                    parcelPath: [], cloudZone: null, cloudBaseAlt: 0, ceilingZ: 0, 
                    getEnvAtZForHour: () => null 
                });
                continue;
            }

            const zBase = groundElevation; 

            const getEnvAtZForHour = (z: number) => {
                let l1 = [...envData].reverse().find(d => d.z <= z);
                let l2 = envData.find(d => d.z >= z);
                
                if (!l1 && l2) {
                    const dz = l2.z - z;
                    return { z: z, hpa: l2.hpa + (dz / 8.5), t: l2.t + dz * 0.0098, td: l2.td + dz * 0.002 };
                }
                if (!l2 && l1) return l1;
                if (l1.z === l2.z) return l1;
                
                let ratio = (z - l1.z) / (l2.z - l1.z);
                return { 
                    z: z,
                    hpa: l1.hpa + ratio * (l2.hpa - l1.hpa), 
                    t: l1.t + ratio * (l2.t - l1.t),
                    td: l1.td + ratio * (l2.td - l1.td)
                };
            };

            const envAtGround = getEnvAtZForHour(zBase);
            const tBase = envData[0].surfaceTemp !== undefined ? envData[0].surfaceTemp : envAtGround.t;
            const tdBase = envData[0].surfaceTd !== undefined ? envData[0].surfaceTd : envAtGround.td;
            
            let cloudBaseAlt = zBase + Math.max(0, (tBase - tdBase) * 125);
            let pT = tBase + appConfig.parcelOffset;
            let ceilingZ = zBase;
            let isCloudCapped = false;
            let cloudZone = null;
            let parcelPath = [{ z: zBase, t: pT, hpa: envAtGround.hpa }];
            
            const maxZ = envData[envData.length - 1].z;

            for (let currZ = zBase + 20; currZ <= maxZ; currZ += 20) {
                let isCloud = currZ >= cloudBaseAlt;
                let envAtZ = getEnvAtZForHour(currZ);
                let lapse;
                
                if (isCloud) {
                    const Tk = pT + 273.15;
                    const es = 6.112 * Math.exp((17.67 * pT) / (pT + 243.5));
                    const ws = 0.622 * es / (envAtZ.hpa - es);
                    const L = 2501000 - 2370 * pT;
                    const num = 1 + (L * ws) / (287.05 * Tk);
                    const den = 1 + (0.622 * L * L * ws) / (1004 * 287.05 * Tk * Tk);
                    lapse = -(9.80665 / 1004) * (num / den);
                } else {
                    lapse = -0.0098;
                }
                
                pT += lapse * 20;
                const entrainment = 0.01; 
                pT = pT * (1 - entrainment) + envAtZ.t * entrainment;

                parcelPath.push({ z: currZ, t: pT, hpa: envAtZ.hpa });
                ceilingZ = currZ;
                
                if (pT <= envAtZ.t) break;
            }

            if (ceilingZ > cloudBaseAlt + 20) {
                cloudZone = [cloudBaseAlt, ceilingZ];
            }

            let exactAlt = ceilingZ;
            if (exactAlt > cloudBaseAlt) {
                exactAlt = Math.max(cloudBaseAlt, zBase); 
                isCloudCapped = true;
            }

            let topIdx = levels.findIndex(l => l.alt <= exactAlt);
            if (topIdx === -1) topIdx = levels.length - 1;

            thermalCeilings.push({ 
                alt: Math.round(exactAlt), 
                isCloud: isCloudCapped, 
                hasThermal: ceilingZ > zBase + 50,
                topLevelIndex: topIdx,
                parcelPath, cloudZone, cloudBaseAlt, ceilingZ, getEnvAtZForHour
            });
        }
    };

    const fetchWindGrid = async (latitude: number, longitude: number) => {
        status = "Extraction des données...";
        times = []; levels = []; grid = []; hourlyProfiles = []; thermalCeilings = []; precipitations = [];
        
        try {
            const model = store.get('product'); 
            const currentTime = store.get('timestamp'); 
            
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

            const rawData = forecast.data.data || forecast.data;
            const timeArray = rawData.ts || rawData.hours || rawData.time;

            const rawPointData = pointForecast.data.data || pointForecast.data;
            const pointTimeArray = rawPointData.ts || rawPointData.hours || rawPointData.time;
            const mmArray = rawPointData.precipAmount || [];
            
            let currentIndex = 0;
            if (timeArray && timeArray.length > 0) {
                let minDiff = Infinity;
                timeArray.forEach((time: number, index: number) => {
                    const diff = Math.abs(time - currentTime);
                    if (diff < minDiff) { minDiff = diff; currentIndex = index; }
                });
            }

            const stepsBack = currentStep === 1 ? 6 : 2;
            const stepsForward = currentStep === 1 ? 18 : 6;
            
            const startIndex = Math.max(0, currentIndex - stepsBack);
            const endIndex = Math.min(timeArray.length - 1, currentIndex + stepsForward);
            
            let activeLocalIndex = 0;

            for(let i = startIndex; i <= endIndex; i++) {
                if (i === currentIndex) activeLocalIndex = times.length;
                const d = new Date(timeArray[i]);
                times.push({ label: `${d.getHours()}h`, index: i, timestamp: timeArray[i] });
            }

            const tempLevels = [];
            FIXED_LEVELS.forEach(fl => {
                if (fl.z > groundElevation) {
                    if (rawData[`wind_u-${fl.hpa}h`]) {
                        tempLevels.push({
                            key: `${fl.hpa}h`,
                            alt: fl.z,
                            label: fl.alt,
                            isSurface: false,
                            hpa: fl.hpa
                        });
                    }
                }
            });
            
            tempLevels.push({
                key: 'surface',
                alt: groundElevation,
                label: `${groundElevation}m (Sol)`,
                isSurface: true,
                hpa: Math.round(1013.25 * Math.pow(1 - 2.25577e-5 * groundElevation, 5.25588))
            });

            tempLevels.sort((a, b) => b.alt - a.alt); 
            levels = tempLevels.filter(l => l.alt <= 10000);

            for (let j = 0; j < times.length; j++) {
                const dataIndex = times[j].index;
                const targetTimestamp = times[j].timestamp;
                let envData = []; 
                
                let mmVal = 0;
                if (pointTimeArray && pointTimeArray.length > 0) {
                    const pointDataIndex = pointTimeArray.findIndex((t: number) => t === targetTimestamp);
                    if (pointDataIndex !== -1) {
                        mmVal = mmArray[pointDataIndex] || 0;
                    }
                }
                precipitations.push(mmVal > 0 ? parseFloat(Number(mmVal).toFixed(1)) : 0);
                
                for (let i = 0; i < levels.length; i++) {
                    const l = levels[i];
                    if (!grid[i]) grid[i] = [];
                    
                    let u, v, rhVal;
                    if (l.isSurface) {
                        u = rawData[`wind_u-surface`]?.[dataIndex] || rawData[`wind_u-10m`]?.[dataIndex];
                        v = rawData[`wind_v-surface`]?.[dataIndex] || rawData[`wind_v-10m`]?.[dataIndex];
                        rhVal = rawData[`rh-surface`]?.[dataIndex] || rawData[`rh-2m`]?.[dataIndex];
                        
                        if (u === undefined) {
                            const levelAbove = levels[i-1];
                            if (levelAbove) {
                                u = rawData[`wind_u-${levelAbove.key}`]?.[dataIndex];
                                v = rawData[`wind_v-${levelAbove.key}`]?.[dataIndex];
                            }
                        }
                        if (rhVal === undefined) {
                            const levelAbove = levels[i-1];
                            if (levelAbove) {
                                rhVal = rawData[`rh-${levelAbove.key}`]?.[dataIndex];
                            }
                        }
                    } else {
                        u = rawData[`wind_u-${l.key}`]?.[dataIndex];
                        v = rawData[`wind_v-${l.key}`]?.[dataIndex];
                        rhVal = rawData[`rh-${l.key}`]?.[dataIndex];
                    }

                    if (u !== undefined && v !== undefined) {
                        const obj = wind2obj([u, v]);
                        const speedKmh = Math.round(obj.wind * 3.6);
                        
                        let cloudCover = 0;
                        if (rhVal !== undefined && rhVal >= 80) {
                            cloudCover = (rhVal - 80) * 5;
                            if (cloudCover > 100) cloudCover = 100;
                        }

                        grid[i][j] = { speedKmh, dir: Math.round(obj.dir), colorClass: getWindColorClass(speedKmh), cloudCover };
                    } else { grid[i][j] = null; }
                }

                let surfaceTemp = undefined;
                let surfaceTd = undefined;
                const surfaceTk = rawData[`temp-surface`]?.[dataIndex] || rawData[`temp-2m`]?.[dataIndex];
                const surfaceRh = rawData[`rh-surface`]?.[dataIndex] || rawData[`rh-2m`]?.[dataIndex];
                
                if (surfaceTk !== undefined) {
                    surfaceTemp = surfaceTk - 273.15;
                    surfaceTd = surfaceRh !== undefined ? getDewPoint(surfaceTemp, surfaceRh) : surfaceTemp - 5;
                }

                for (let i = levels.length - 1; i >= 0; i--) {
                    const l = levels[i];
                    
                    if (l.isSurface) {
                        const firstFreeAir = levels[i-1]; 
                        if (firstFreeAir) {
                            const tK = rawData[`temp-${firstFreeAir.key}`]?.[dataIndex];
                            const rh = rawData[`rh-${firstFreeAir.key}`]?.[dataIndex];
                            if (tK !== undefined) {
                                const tC = tK - 273.15;
                                const tdC = rh !== undefined ? getDewPoint(tC, rh) : tC - 5;
                                const dz = firstFreeAir.alt - l.alt;
                                envData.push({
                                    z: l.alt,
                                    hpa: l.hpa,
                                    t: tC + dz * 0.0098, 
                                    td: tdC + dz * 0.002,
                                    surfaceTemp: surfaceTemp, 
                                    surfaceTd: surfaceTd
                                });
                            }
                        }
                    } else {
                        const tK = rawData[`temp-${l.key}`]?.[dataIndex];
                        let rh = rawData[`rh-${l.key}`]?.[dataIndex];
                        if (tK !== undefined) {
                            const tC = tK - 273.15;
                            const tdC = rh !== undefined ? getDewPoint(tC, rh) : tC - 5; 
                            envData.push({ z: l.alt, hpa: l.hpa, t: tC, td: tdC });
                        }
                    }
                }
                
                if (envData.length > 0) {
                    const lowest = envData[0];
                    if (groundElevation < lowest.z) {
                        const dz = lowest.z - groundElevation;
                        envData.unshift({
                            z: groundElevation,
                            hpa: lowest.hpa + (dz / 8.5),
                            t: lowest.t + dz * 0.0098, 
                            td: lowest.td + dz * 0.002,
                            surfaceTemp: surfaceTemp, 
                            surfaceTd: surfaceTd
                        });
                    } else {
                        envData[0].surfaceTemp = surfaceTemp;
                        envData[0].surfaceTd = surfaceTd;
                    }
                }
                hourlyProfiles.push(envData);
            }

            if (levels.length > 0 && times.length > 0) {
                status = "Profil chargé.";
                calculateThermals();
                await selectHour(activeLocalIndex);
                setTimeout(centerTable, 50); 
            } else {
                status = "Aucune donnée trouvée.";
            }

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

    const selectHour = async (index: number) => {
        selectedHourIndex = index;
        await tick();
        drawSondage(index);

        const targetTs = times[index]?.timestamp;
        if (targetTs && store.get('timestamp') !== targetTs) {
            lastSetTimestamp = targetTs;
            store.set('timestamp', targetTs);
        }
    };

    const onSettingsChange = () => {
        const currentTs = store.get('timestamp');
        
        if (lastSetTimestamp === currentTs) return;
        lastSetTimestamp = 0;

        if (lat !== null && lon !== null) {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                fetchWindGrid(lat, lon);
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
                fetchWindGrid(lat, lon);
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

        try { store.on('pickerLocation', updateLocation); } catch(e) {}
        try { store.on('mapCoords', updateLocation); } catch(e) {}
        try { store.on('timestamp', onSettingsChange); } catch(e) {}
        try { store.on('product', onSettingsChange); } catch(e) {}
        
        // updateLocation();
    });

    onDestroy(() => { 
        try { store.off('pickerLocation', updateLocation); } catch(e) {}
        try { store.off('mapCoords', updateLocation); } catch(e) {}
        try { store.off('timestamp', onSettingsChange); } catch(e) {}
        try { store.off('product', onSettingsChange); } catch(e) {}
    });

    const drawSondage = (hourIndex: number) => {
        const ChartLib = (window as any).Chart;
        if (!ChartLib) { setTimeout(() => drawSondage(hourIndex), 200); return; }

        const envData = hourlyProfiles[hourIndex];
        const thermal = thermalCeilings[hourIndex]; 
        if (!envData || envData.length === 0 || !thermal) return;

        const zBase = groundElevation;
        const getEnvAtZ = thermal.getEnvAtZForHour; 

        const zBottom = zBase; 
        const pBottom = getEnvAtZ(zBottom).hpa;
        const skew = appConfig.skewFactor;
        const applySkew = (t: number, hpa: number) => skew === 0 ? t : t + (pBottom - hpa) * skew;

        let displayEnvData = [...envData].filter((d: any) => d.z >= zBase);
        if (displayEnvData.length === 0 || displayEnvData[0].z > zBase) {
            displayEnvData.unshift(getEnvAtZ(zBase));
        }

        const envPoints = displayEnvData.map((d: any) => ({ x: applySkew(d.t, d.hpa), y: d.z }));
        const dewPoints = displayEnvData.map((d: any) => ({ x: applySkew(d.td, d.hpa), y: d.z }));
        const parcelChartPoints = thermal.parcelPath.map((p: any) => ({ x: applySkew(p.t, p.hpa), y: p.z }));

        const ceilingZ = thermal.ceilingZ;
        const cloudBaseAlt = thermal.cloudBaseAlt;
        const cloudZone = thermal.cloudZone;

        const canvas = document.getElementById('sondageChart') as HTMLCanvasElement;
        if (!canvas) return;
        
        if (sondageChartInstance) sondageChartInstance.destroy();
        const ctx = canvas.getContext('2d');

        sondageChartInstance = new ChartLib(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Température (°C)', data: envPoints,
                        borderColor: '#333', borderWidth: 2, tension: 0, pointRadius: 0,
                        segment: {
                            borderColor: (ctx: any) => {
                                if (!ctx.p0 || !ctx.p1) return '#333';
                                const z0 = ctx.p0.parsed.y; const z1 = ctx.p1.parsed.y;
                                const env0 = getEnvAtZ(z0); const env1 = getEnvAtZ(z1);
                                const dz = z1 - z0; const dt = env0.t - env1.t;
                                if (dz <= 0) return '#333';
                                const lapseRate = (dt / dz) * 100;
                                if (lapseRate >= appConfig.lapse5) return '#9b59b6';
                                if (lapseRate >= appConfig.lapse4) return '#e74c3c';
                                if (lapseRate >= appConfig.lapse3) return '#e67e22';
                                if (lapseRate >= appConfig.lapse2) return '#f1c40f';
                                if (lapseRate >= appConfig.lapse1) return '#2ecc71';
                                return '#000000';
                            }
                        }
                    },
                    { label: 'Parcelle', data: parcelChartPoints, borderColor: '#f39c12', borderWidth: 1, tension: 0, pointRadius: 0, borderDash: [5, 2] },
                    { label: 'Pt Rosée (°C)', data: dewPoints, borderColor: '#3498db', borderWidth: 2, tension: 0, pointRadius: 0 }
                ]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', position: 'bottom', grid: { display: false } },
                    y: { 
                        type: 'linear', 
                        position: 'left', 
                        min: zBottom,
                        ticks: { 
                            stepSize: 500, 
                            callback: function(value) {
                                if (value === zBottom) return Math.round(value) + "m";
                                if (value % 500 === 0) return value + "m";
                                return null;
                            } 
                        } 
                    }
                }
            },
            plugins: [{
                id: 'customSkewTPlugin',
                beforeDraw: (chart: any) => {
                    const { ctx, chartArea, scales: { x, y } } = chart;
                    if (!chartArea) return;

                    ctx.save(); ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
                    x.ticks.forEach((tick: any) => {
                        ctx.beginPath();
                        let isFirst = true;
                        const startZ = Math.floor(y.min / 200) * 200;
                        for (let z = startZ; z <= y.max; z += 200) {
                            if (z < y.min) continue;
                            const px = x.getPixelForValue(tick.value + (pBottom - getEnvAtZ(z).hpa) * skew);
                            const py = y.getPixelForValue(z);
                            
                            if (isFirst) {
                                if (z > y.min) {
                                    const pxMin = x.getPixelForValue(tick.value + (pBottom - getEnvAtZ(y.min).hpa) * skew);
                                    const pyMin = y.getPixelForValue(y.min);
                                    ctx.moveTo(pxMin, pyMin);
                                    ctx.lineTo(px, py);
                                } else {
                                    ctx.moveTo(px, py);
                                }
                                isFirst = false;
                            } else {
                                ctx.lineTo(px, py);
                            }
                        }
                        ctx.stroke();
                    });
                    ctx.restore();

                    if (ceilingZ > zBase + 50) {
                        let plafondAlt = Math.min(ceilingZ, cloudBaseAlt);
                        const yPlafond = y.getPixelForValue(plafondAlt);
                        if (yPlafond >= chartArea.top && yPlafond <= chartArea.bottom) {
                            ctx.save(); ctx.beginPath(); ctx.setLineDash([5, 5]);
                            ctx.moveTo(chartArea.left, yPlafond); ctx.lineTo(chartArea.right, yPlafond);
                            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5; ctx.stroke();
                            ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 11px sans-serif';
                            ctx.fillText('Plafond', chartArea.left + 5, yPlafond - 5);
                            ctx.restore();
                        }
                    }

                    if (cloudZone) {
                        const yBottom = y.getPixelForValue(cloudZone[0]);
                        const yTop = y.getPixelForValue(cloudZone[1]);
                        ctx.save(); ctx.fillStyle = 'rgba(170, 180, 190, 0.4)';
                        ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, yBottom - yTop);
                        ctx.fillStyle = '#444'; ctx.font = 'bold 30px sans-serif';
                        ctx.fillText('☁️', (chartArea.right - chartArea.left) / 2, yTop + Math.max(15, (yBottom - yTop)/2));
                        ctx.restore();
                    }
                },
                afterDraw: (chart: any) => {
                    const { ctx, chartArea, scales: { y } } = chart;
                    if (!chartArea) return;
                    ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = 'bold 11px sans-serif';
                    for (let i = 0; i < displayEnvData.length - 1; i++) {
                        const dz = displayEnvData[i+1].z - displayEnvData[i].z;
                        if (dz > 0) {
                            const lapseRate = ((displayEnvData[i].t - displayEnvData[i+1].t) / dz) * 100;
                            let color = '#000';
                            if (lapseRate >= appConfig.lapse5) color = '#9b59b6';
                            else if (lapseRate >= appConfig.lapse4) color = '#e74c3c';
                            else if (lapseRate >= appConfig.lapse3) color = '#e67e22';
                            else if (lapseRate >= appConfig.lapse2) color = '#f1c40f';
                            else if (lapseRate >= appConfig.lapse1) color = '#2ecc71';

                            const pyMid = (y.getPixelForValue(displayEnvData[i].z) + y.getPixelForValue(displayEnvData[i+1].z)) / 2;
                            const text = lapseRate.toFixed(2);
                            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                            ctx.strokeText(text, chartArea.right - 5, pyMid);
                            ctx.fillStyle = color; ctx.fillText(text, chartArea.right - 5, pyMid);
                        }
                    }
                    ctx.restore();
                }
            }]
        });
    };
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

    #config-btn { background: none; border: none; font-size: 20px; cursor: pointer; transition: transform 0.3s ease; }
    #config-btn:hover { transform: rotate(45deg); }
    
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

    #config-modal { position: absolute; top: 50px; left: 15px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 1000; width: 280px; border: 1px solid #ddd; font-size: 13px; }
    #config-modal h3 { margin: 0 0 15px 0; font-size: 15px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .config-section { margin-bottom: 15px; }
    .config-section strong { display: block; margin-bottom: 10px; color: #2980b9; }
    .config-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .config-row label { color: #555; }
    .config-row input { width: 50px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; text-align: center; }
    .config-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
    .config-actions button { padding: 4px 10px; cursor: pointer; border: none; border-radius: 4px; font-weight: bold; }
    .btn-save { background-color: #2980b9; color: white; }
    .btn-cancel { background-color: #eee; color: #333; }

    .box { margin-top: 10px; padding: 12px; background-color: rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 6px; font-size: 0.95em; line-height: 1.5; }
    .wind-box { background-color: rgba(41, 128, 185, 0.1); border-color: rgba(41, 128, 185, 0.2); padding: 10px; overflow: hidden; }
    
    .grid-container { overflow-x: auto; background: white; border-radius: 6px; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); scroll-behavior: smooth; }
    .grid-container::-webkit-scrollbar { height: 8px; }
    .grid-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
    .grid-container::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
    
    .wind-grid { font-variant-numeric: tabular-nums; border-collapse: collapse; text-align: center; table-layout: fixed; width: max-content; margin: 0; }
    .wind-grid th, .wind-grid td { padding: 2px; width: 40px; min-width: 40px; height: 40px; border: 1px solid rgba(0,0,0,0.05); transition: background-color 0.2s;}
    .wind-grid thead th { background-color: #f8f9fa; font-weight: 600; font-size: 12px; position: sticky; top: 0; }
    .y-axis { color: black; text-align: right; padding-right: 10px; white-space: nowrap; background-color: #f8f9fa; position: sticky; left: 0; z-index: 2; font-size: 12px; }
    
    .hour-header { cursor: pointer; color: #2980b9; transition: all 0.2s; }
    .hour-header:hover { background-color: #e8f4f8; }
    .hour-header.active { background-color: #2980b9; color: white; border: 1px solid #333 !important; border-bottom: none !important; }
    td.active-col { border-left: 1px solid #333 !important; border-right: 1px solid #333 !important; background-color: rgba(41, 128, 185, 0.05); }
    
    .cell-content { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-shadow: 0px 0px 2px rgba(255,255,255,0.8); }
    .arrow { display: inline-block; font-size: 16px; }
    
    .wind-light { color: #2ecc71; }
    .wind-mod   { color: #f1c40f; }
    .wind-strong{ color: #e67e22; }
    .wind-gale  { color: #e74c3c; }
    .wind-hurricane { color: #8e44ad; }

    /* LÉGENDE MAMETEO */
    .legend-box { font-size: 11px; display: flex; justify-content: center; gap: 15px; margin-top: 8px; color: #555; padding-bottom: 10px;}
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-color { width: 12px; height: 12px; border: 1px solid #ccc; }

    .chart-container { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    #chart-title { text-align: center; margin-top: 0; font-size: 14px; color: #2c3e50; margin-bottom: 15px; }
    .canvas-wrapper { position: relative; height: 400px; width: 100%; }
</style>