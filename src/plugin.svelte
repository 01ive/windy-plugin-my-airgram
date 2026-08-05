<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
    { title }
    </div>
    
    <div class="top-bar">
        <span style="display: flex; align-items: center; gap: 10px;">
            <button id="config-btn" title="Configuration" on:click={openConfig}>⚙️</button>
            <div class="greeting">Hello <b>Olive</b> !</div>
        </span>
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
        <div class="box">
            📍 <b>GPS :</b> {lat.toFixed(4)}, {lon.toFixed(4)}
            <br>
            <small style="color: gray;">Modèle : {currentModel.toUpperCase()}</small>
        </div>

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

                            <!-- GRILLE DES VENTS -->
                            {#each levels as level, i}
                                <tr style="{level.isSurface ? 'border-bottom: 2px solid #2980b9;' : ''}">
                                    <th class="y-axis" style="{level.isSurface ? 'color: #2980b9; font-weight: bold;' : ''}">
                                        {level.label}
                                    </th>
                                    {#each times as t, j}
                                        <td class="{selectedHourIndex === j ? 'active-col' : ''}">
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
                        </tbody>
                    </table>
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
            <i>Ouvrez le sélecteur météo (Picker) pour sonder la masse d'air.</i>
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from "@windy/broadcast";
    import store from "@windy/store";
    import { getMeteogramForecastData } from "@windy/fetch";
    import { wind2obj } from "@windy/utils";
    import { onDestroy, onMount, tick } from 'svelte';

    import config from './pluginConfig';
    const { title } = config;

    // --- GESTION DE LA CONFIGURATION ---
    let appConfig = {
        windLight: 15, windMod: 30, windStrong: 50, windGale: 100,
        lapse1: 0.6, lapse2: 0.8, lapse3: 1.0, lapse4: 1.2, lapse5: 1.4,
        skewFactor: 0.08, parcelOffset: 0.0
    };
    
    let tempConfig = { ...appConfig };
    let showConfig = false;

    const openConfig = () => { tempConfig = { ...appConfig }; showConfig = true; };
    const closeConfig = () => { showConfig = false; };
    const saveConfig = () => {
        appConfig = { ...tempConfig };
        showConfig = false;
        // On recalcule tout si les données sont déjà là
        if (hourlyProfiles.length > 0) {
            calculateThermals();
            if (selectedHourIndex !== null) drawSondage(selectedHourIndex);
        }
    };

    let lat: number | null = null;
    let lon: number | null = null;
    let status: string = "";
    let currentModel: string = "";
    
    // Structure de la grille 2D
    let times: Array<{ label: string, index: number }> = [];
    let levels: Array<{ key: string, alt: number, label: string, isSurface: boolean, hpa: number }> = [];
    let grid: Array<Array<{ speedKmh: number, dir: number, colorClass: string } | null>> = [];
    
    // Données Thermodynamiques
    let hourlyProfiles: Array<any> = []; 
    let thermalCeilings: Array<{ alt: number, isCloud: boolean, hasThermal: boolean }> = [];
    let selectedHourIndex: number | null = null;
    let sondageChartInstance: any = null;

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

    // --- MOTEUR THERMODYNAMIQUE ---
    const calculateThermals = () => {
        thermalCeilings = [];
        for (let j = 0; j < times.length; j++) {
            const envData = hourlyProfiles[j];
            if (!envData || envData.length === 0) {
                thermalCeilings.push({ alt: 0, isCloud: false, hasThermal: false });
                continue;
            }

            const zBase = envData[0].z;
            const tBase = envData[0].t;
            const tdBase = envData[0].td;
            let cloudBaseAlt = zBase + Math.max(0, (tBase - tdBase) * 125);
            let pT = tBase + appConfig.parcelOffset;
            let exactAlt = zBase;
            let isCloudCapped = false;

            const getEnvAtZForHour = (z: number) => {
                let l1 = [...envData].reverse().find(d => d.z <= z);
                let l2 = envData.find(d => d.z >= z);
                if (!l1) return l2 || envData[0];
                if (!l2) return l1;
                if (l1.z === l2.z) return l1;
                let ratio = (z - l1.z) / (l2.z - l1.z);
                return { hpa: l1.hpa + ratio * (l2.hpa - l1.hpa), t: l1.t + ratio * (l2.t - l1.t) };
            };

            const maxZ = envData[envData.length - 1].z;

            // Ascension avec entraînement
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

                exactAlt = currZ;
                if (pT <= envAtZ.t) break;
            }

            if (exactAlt > cloudBaseAlt) {
                exactAlt = Math.max(cloudBaseAlt, zBase); 
                isCloudCapped = true;
            }

            thermalCeilings.push({ 
                alt: Math.round(exactAlt), 
                isCloud: isCloudCapped, 
                hasThermal: exactAlt > zBase + 50 
            });
        }
    };

    const fetchWindGrid = async (latitude: number, longitude: number) => {
        status = "Extraction des données...";
        times = []; levels = []; grid = []; hourlyProfiles = []; thermalCeilings = [];
        
        try {
            const model = store.get('product'); 
            currentModel = model;
            const currentTime = store.get('timestamp'); 
            
            const forecast = await getMeteogramForecastData(model, { lat: latitude, lon: longitude, step: 3 });
            
            if (!forecast || !forecast.data) { status = "Données indisponibles."; return; }

            const rawData = forecast.data.data || forecast.data;
            const timeArray = rawData.ts || rawData.hours || rawData.time;
            
            let startIndex = 0;
            if (timeArray && timeArray.length > 0) {
                let minDiff = Infinity;
                timeArray.forEach((time: number, index: number) => {
                    const diff = Math.abs(time - currentTime);
                    if (diff < minDiff) { minDiff = diff; startIndex = index; }
                });
            }

            const stepsToShow = Math.min(24, timeArray.length - startIndex);
            for(let i = 0; i < stepsToShow; i++) {
                const d = new Date(timeArray[startIndex + i]);
                times.push({ label: `${d.getHours()}h`, index: startIndex + i });
            }

            const tempLevels = [];
            for (const key of Object.keys(rawData)) {
                if (key.startsWith('temp-')) {
                    const level = key.split('-')[1]; 
                    let alt = 0; let displayLevel = level.endsWith('h') ? `${level}Pa` : level;
                    let isSurface = false; let hpa = 1013;
                    
                    const gh = rawData[`gh-${level}`];
                    if (gh && gh[startIndex] !== undefined) {
                        alt = Math.round(gh[startIndex]);
                        if (level.endsWith('h')) hpa = parseInt(level);
                    } else {
                        if (level === 'surface' || level.includes('10m') || level.includes('2m')) {
                            alt = Math.round(forecast.data.header?.modelElevation || 0);
                            displayLevel = `${alt}m (Sol)`; isSurface = true;
                            hpa = Math.round(1013.25 * Math.pow(1 - 2.25577e-5 * alt, 5.25588));
                        } else if (level.endsWith('h')) {
                            hpa = parseInt(level);
                            if (!isNaN(hpa)) alt = Math.round(44330 * (1 - Math.pow(hpa / 1013.25, 0.1903)));
                            displayLevel = `${alt}m`;
                        }
                    }
                    if (!isSurface && displayLevel !== 'Sol') displayLevel = `${alt}m`;
                    tempLevels.push({ key: level, alt, label: displayLevel, isSurface, hpa });
                }
            }

            tempLevels.sort((a, b) => b.alt - a.alt); 
            levels = tempLevels.filter(l => l.alt <= 10000);

            for (let j = 0; j < times.length; j++) {
                const dataIndex = times[j].index;
                let envData = []; 
                
                for (let i = levels.length - 1; i >= 0; i--) {
                    const l = levels[i];
                    if (!grid[i]) grid[i] = [];
                    
                    const u = rawData[`wind_u-${l.key}`]?.[dataIndex];
                    const v = rawData[`wind_v-${l.key}`]?.[dataIndex];
                    if (u !== undefined && v !== undefined) {
                        const obj = wind2obj([u, v]);
                        const speedKmh = Math.round(obj.wind * 3.6);
                        grid[i][j] = { speedKmh, dir: Math.round(obj.dir), colorClass: getWindColorClass(speedKmh) };
                    } else { grid[i][j] = null; }

                    const tK = rawData[`temp-${l.key}`]?.[dataIndex];
                    let rh = rawData[`rh-${l.key}`]?.[dataIndex];
                    
                    if (tK !== undefined) {
                        const tC = tK - 273.15;
                        const tdC = rh !== undefined ? getDewPoint(tC, rh) : tC - 5; 
                        envData.push({ z: l.alt, hpa: l.hpa, t: tC, td: tdC });
                    }
                }
                hourlyProfiles.push(envData);
            }

            if (levels.length > 0 && times.length > 0) {
                status = "Profil chargé.";
                calculateThermals();
                selectHour(0);
            } else {
                status = "Aucune donnée trouvée.";
            }

        } catch (error) {
            console.error("Erreur d'extraction :", error);
            status = "Erreur lors du sondage.";
        }
    };

    // --- LOGIQUE DU GRAPHIQUE ÉMAGRAMME ---
    const selectHour = async (index: number) => {
        selectedHourIndex = index;
        await tick();
        drawSondage(index);
    };

    const drawSondage = (hourIndex: number) => {
        const ChartLib = (window as any).Chart;
        if (!ChartLib) { setTimeout(() => drawSondage(hourIndex), 200); return; }

        const envData = hourlyProfiles[hourIndex];
        if (!envData || envData.length === 0) return;

        const getEnvAtZ = (z: number) => {
            let l1 = [...envData].reverse().find(d => d.z <= z);
            let l2 = envData.find(d => d.z >= z);
            if (!l1) return l2 || envData[0];
            if (!l2) return l1;
            if (l1.z === l2.z) return l1;
            let ratio = (z - l1.z) / (l2.z - l1.z);
            return {
                z: z, hpa: l1.hpa + ratio * (l2.hpa - l1.hpa),
                t: l1.t + ratio * (l2.t - l1.t), td: l1.td + ratio * (l2.td - l1.td)
            };
        };

        const zBase = envData[0].z;
        const tBase = envData[0].t;
        const tdBase = envData[0].td;
        let cloudBaseAlt = zBase + Math.max(0, (tBase - tdBase) * 125);
        let cloudZone = null;
        let parcelPath = [];
        let ceilingZ = zBase;

        let pT = tBase + appConfig.parcelOffset;
        let maxZ = envData[envData.length - 1].z;
        parcelPath.push({ z: zBase, t: pT, hpa: envData[0].hpa });

        for (let currZ = zBase + 20; currZ <= maxZ; currZ += 20) {
            let isCloud = currZ >= cloudBaseAlt;
            let envAtZ = getEnvAtZ(currZ);
            let lapse;
            
            if (isCloud) {
                const Tk = pT + 273.15;
                const es = 6.112 * Math.exp((17.67 * pT) / (pT + 243.5));
                const ws = 0.622 * es / (envAtZ.hpa - es);
                const L = 2501000 - 2370 * pT;
                const num = 1 + (L * ws) / (287.05 * Tk);
                const den = 1 + (0.622 * L * L * ws) / (1004 * 287.05 * Tk * Tk);
                lapse = -(9.80665 / 1004) * (num / den);
            } else { lapse = -0.0098; }
            
            pT += lapse * 20;
            const entrainment = 0.01; 
            pT = pT * (1 - entrainment) + envAtZ.t * entrainment;

            parcelPath.push({ z: currZ, t: pT, hpa: envAtZ.hpa });
            ceilingZ = currZ; 
            
            if (pT <= envAtZ.t) break;
        }

        if (ceilingZ > cloudBaseAlt + 20) cloudZone = [cloudBaseAlt, ceilingZ];

        const zBottom = Math.floor(zBase / 500) * 500;
        const pBottom = getEnvAtZ(zBottom).hpa;
        const skew = appConfig.skewFactor;
        const applySkew = (t: number, hpa: number) => skew === 0 ? t : t + (pBottom - hpa) * skew;

        const envPoints = envData.map((d: any) => ({ x: applySkew(d.t, d.hpa), y: d.z }));
        const dewPoints = envData.map((d: any) => ({ x: applySkew(d.td, d.hpa), y: d.z }));
        const parcelChartPoints = parcelPath.map(p => ({ x: applySkew(p.t, p.hpa), y: p.z }));

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
                    y: { type: 'linear', position: 'left', min: zBottom, ticks: { stepSize: 500, callback: (v:any) => v + "m" } }
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
                        for (let z = y.min; z <= y.max; z += 200) {
                            const px = x.getPixelForValue(tick.value + (pBottom - getEnvAtZ(z).hpa) * skew);
                            const py = y.getPixelForValue(z);
                            z === y.min ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
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
                    for (let i = 0; i < envData.length - 1; i++) {
                        const dz = envData[i+1].z - envData[i].z;
                        if (dz > 0) {
                            const lapseRate = ((envData[i].t - envData[i+1].t) / dz) * 100;
                            let color = '#000';
                            if (lapseRate >= appConfig.lapse5) color = '#9b59b6';
                            else if (lapseRate >= appConfig.lapse4) color = '#e74c3c';
                            else if (lapseRate >= appConfig.lapse3) color = '#e67e22';
                            else if (lapseRate >= appConfig.lapse2) color = '#f1c40f';
                            else if (lapseRate >= appConfig.lapse1) color = '#2ecc71';

                            const pyMid = (y.getPixelForValue(envData[i].z) + y.getPixelForValue(envData[i+1].z)) / 2;
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

    const onPickerLocation = (location: any) => {
        if (location) { lat = location.lat; lon = location.lon; fetchWindGrid(lat, lon); }
        else { lat = null; lon = null; times = []; levels = []; grid = []; hourlyProfiles = []; status = "Cliquez sur la carte."; }
    };

    onMount(() => {
        if (!document.getElementById('chartjs-script')) {
            const script = document.createElement('script');
            script.id = 'chartjs-script'; script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            document.head.appendChild(script);
        }
        store.on('pickerLocation', onPickerLocation);
        store.on('timestamp', () => { if(lat) fetchWindGrid(lat, lon); }); 
        store.on('product', () => { if(lat) fetchWindGrid(lat, lon); });   
        
        const currentLoc = store.get('pickerLocation');
        if (currentLoc) onPickerLocation(currentLoc);
    });

    onDestroy(() => { store.off('pickerLocation', onPickerLocation); });
</script>

<style lang="less">
    .greeting { margin-bottom: 0px; display: inline-block; }
    .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    #config-btn { background: none; border: none; font-size: 20px; cursor: pointer; transition: transform 0.3s ease; }
    #config-btn:hover { transform: rotate(45deg); }

    /* MODALE DE CONFIG */
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
    
    /* TABLE GRID */
    .grid-container { overflow-x: auto; background: white; border-radius: 6px; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .wind-grid { font-variant-numeric: tabular-nums; border-collapse: collapse; text-align: center; table-layout: fixed; width: max-content; margin: 0; }
    .wind-grid th, .wind-grid td { padding: 2px; width: 40px; min-width: 40px; height: 40px; border: 1px solid rgba(0,0,0,0.05); transition: background-color 0.2s;}
    .wind-grid thead th { background-color: #f8f9fa; font-weight: 600; font-size: 12px; position: sticky; top: 0; }
    .y-axis { text-align: right; padding-right: 10px; white-space: nowrap; background-color: #f8f9fa; position: sticky; left: 0; z-index: 2; font-size: 12px; }
    
    .hour-header { cursor: pointer; color: #2980b9; transition: all 0.2s; }
    .hour-header:hover { background-color: #e8f4f8; }
    .hour-header.active { background-color: #2980b9; color: white; border: 1px solid #333 !important; }
    td.active-col { border-left: 1px solid #333 !important; border-right: 1px solid #333 !important; background-color: rgba(41, 128, 185, 0.05); }
    
    .cell-content { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-shadow: 0px 0px 2px rgba(255,255,255,0.8); }
    .arrow { display: inline-block; font-size: 16px; }
    
    .wind-light { color: #2ecc71; }
    .wind-mod   { color: #f1c40f; }
    .wind-strong{ color: #e67e22; }
    .wind-gale  { color: #e74c3c; }
    .wind-hurricane { color: #8e44ad; }

    /* GRAPHIQUE ÉMAGRAMME */
    .chart-container { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    #chart-title { text-align: center; margin-top: 0; font-size: 14px; color: #2c3e50; margin-bottom: 15px; }
    .canvas-wrapper { position: relative; height: 400px; width: 100%; }
</style>