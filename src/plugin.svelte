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
    
    <div class="greeting">Hello <b>Olive</b> !</div>

    {#if lat !== null && lon !== null}
        <div class="box">
            📍 <b>GPS :</b> {lat.toFixed(4)}, {lon.toFixed(4)}
            <br>
            <small style="color: gray;">Modèle : {currentModel.toUpperCase()}</small>
        </div>

        <div class="box wind-box">
            {#if status === "Profil chargé."}
                <div class="grid-container">
                    <table class="wind-grid">
                        <thead>
                            <tr>
                                <th class="y-axis" style="z-index: 3;">Heure</th>
                                {#each times as t}
                                    <th class="hour-header">{t.label}</th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each levels as level, i}
                                <tr style="{level.isSurface ? 'border-bottom: 2px solid #2980b9;' : ''}">
                                    <th class="y-axis" style="{level.isSurface ? 'color: #2980b9; font-weight: bold;' : ''}">
                                        {level.label}
                                    </th>
                                    {#each times as t, j}
                                        <td>
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
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    let lat: number | null = null;
    let lon: number | null = null;
    let status: string = "";
    let currentModel: string = "";
    
    // Variables pour structurer la grille 2D
    let times: Array<{ label: string, index: number }> = [];
    let levels: Array<{ key: string, alt: number, label: string, isSurface: boolean }> = [];
    let grid: Array<Array<{ speedKmh: number, dir: number, colorClass: string } | null>> = [];

    // Fonction de classification des vents selon vos seuils (en km/h)
    const getWindColorClass = (speedKmh: number) => {
        if (speedKmh < 15) return 'wind-light';
        if (speedKmh < 30) return 'wind-mod';
        if (speedKmh < 50) return 'wind-strong';
        if (speedKmh < 100) return 'wind-gale';
        return 'wind-hurricane';
    };

    const fetchWindGrid = async (latitude: number, longitude: number) => {
        status = "Extraction des données...";
        times = [];
        levels = [];
        grid = [];
        
        try {
            const model = store.get('product'); 
            currentModel = model;
            const currentTime = store.get('timestamp'); 
            
            // Requête du météogramme avec step 3 pour aérer la table (ou 1 si vous préférez heure par heure)
            const forecast = await getMeteogramForecastData(model, { lat: latitude, lon: longitude, step: 3 });
            
            if (!forecast || !forecast.data) {
                status = "Données indisponibles pour ce modèle.";
                return;
            }

            const rawData = forecast.data.data || forecast.data;
            const timeArray = rawData.ts || rawData.hours || rawData.time;
            
            // 1. Trouver l'index de départ (heure actuelle)
            let startIndex = 0;
            if (timeArray && timeArray.length > 0) {
                let minDiff = Infinity;
                timeArray.forEach((time: number, index: number) => {
                    const diff = Math.abs(time - currentTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        startIndex = index;
                    }
                });
            }

            // 2. Générer les colonnes de temps (limité à 24 pas pour ne pas surcharger la mémoire)
            const stepsToShow = Math.min(24, timeArray.length - startIndex);
            for(let i = 0; i < stepsToShow; i++) {
                const d = new Date(timeArray[startIndex + i]);
                times.push({
                    label: `${d.getHours()}h`,
                    index: startIndex + i
                });
            }

            // 3. Extraire et classer les altitudes (lignes)
            const tempLevels = [];
            for (const key of Object.keys(rawData)) {
                if (key.startsWith('wind_u-')) {
                    const level = key.split('-')[1]; 
                    let alt = 0;
                    let displayLevel = level.endsWith('h') ? `${level}Pa` : level;
                    let isSurface = false;
                    
                    const gh = rawData[`gh-${level}`];
                    if (gh && gh[startIndex] !== undefined) {
                        alt = Math.round(gh[startIndex]);
                    } else {
                        if (level === 'surface' || level.includes('10m')) {
                            alt = Math.round(forecast.data.header?.modelElevation || 0);
                            displayLevel = `${alt}m (Sol)`;
                            isSurface = true;
                        } else if (level.endsWith('h')) {
                            const pressure = parseInt(level);
                            if (!isNaN(pressure)) {
                                alt = Math.round(44330 * (1 - Math.pow(pressure / 1013.25, 0.1903)));
                                displayLevel = `${alt}m`;
                            }
                        }
                    }

                    if (!isSurface && displayLevel !== 'Sol') {
                        displayLevel = `${alt}m`;
                    }

                    tempLevels.push({ key: level, alt, label: displayLevel, isSurface });
                }
            }

            // Tri décroissant pour avoir les hautes altitudes en haut de la table
            tempLevels.sort((a, b) => b.alt - a.alt);
            levels = tempLevels.filter(l => l.alt <= 11000);

            // 4. Remplir la matrice de données
            for (let i = 0; i < levels.length; i++) {
                const rowData = [];
                const uArray = rawData[`wind_u-${levels[i].key}`];
                const vArray = rawData[`wind_v-${levels[i].key}`];
                
                for (let j = 0; j < times.length; j++) {
                    const dataIndex = times[j].index;
                    
                    if (uArray && vArray && uArray[dataIndex] !== undefined && vArray[dataIndex] !== undefined) {
                        const obj = wind2obj([uArray[dataIndex], vArray[dataIndex]]);
                        
                        // Conversion stricte m/s -> km/h
                        const speedKmh = Math.round(obj.wind * 3.6);
                        
                        rowData.push({
                            speedKmh: speedKmh,
                            dir: Math.round(obj.dir),
                            colorClass: getWindColorClass(speedKmh)
                        });
                    } else {
                        rowData.push(null);
                    }
                }
                grid.push(rowData);
            }

            if (levels.length > 0 && times.length > 0) {
                status = "Profil chargé.";
            } else {
                status = "Aucune donnée de vent trouvée.";
            }

        } catch (error) {
            console.error("Erreur d'extraction Grid Windy :", error);
            status = "Erreur lors du sondage.";
        }
    };

    const onPickerLocation = (location: any) => {
        if (location) {
            lat = location.lat;
            lon = location.lon;
            fetchWindGrid(lat, lon);
        } else {
            lat = null;
            lon = null;
            times = [];
            levels = [];
            grid = [];
            status = "Cliquez sur la carte.";
        }
    };

    const onSettingsChange = () => {
        if (lat !== null && lon !== null) {
            fetchWindGrid(lat, lon);
        }
    };

    onMount(() => {
        store.on('pickerLocation', onPickerLocation);
        store.on('timestamp', onSettingsChange); 
        store.on('product', onSettingsChange);   
        
        const currentLoc = store.get('pickerLocation');
        if (currentLoc) {
            onPickerLocation(currentLoc);
        }
    });

    onDestroy(() => {
        store.off('pickerLocation', onPickerLocation);
        store.off('timestamp', onSettingsChange);
        store.off('product', onSettingsChange);
    });
</script>

<style lang="less">
    .greeting {
        margin-bottom: 10px;
    }
    
    .box {
        margin-top: 10px;
        padding: 12px;
        background-color: rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 6px;
        font-size: 0.95em;
        line-height: 1.5;
    }

    .wind-box {
        background-color: rgba(41, 128, 185, 0.1);
        border-color: rgba(41, 128, 185, 0.2);
        padding: 0;
        overflow: hidden;
    }
    
    /* Styles importés exactement de maMeteo */
    .grid-container {
        overflow-x: auto;
        background: white;
        border-radius: 6px;
        width: 100%;
    }
    
    .grid-container::-webkit-scrollbar { height: 8px; }
    .grid-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
    .grid-container::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
    
    .wind-grid { 
        font-variant-numeric: tabular-nums; 
        border-collapse: collapse; 
        text-align: center; 
        table-layout: fixed; 
        width: max-content; 
        margin: 0; 
    }
    
    .wind-grid th, .wind-grid td { 
        padding: 2px; 
        width: 40px; 
        min-width: 40px; 
        height: 40px;
        border: 1px solid rgba(0,0,0,0.05); 
    }
    
    .wind-grid thead th { 
        background-color: #f8f9fa; 
        font-weight: 600; 
        font-size: 12px; 
        position: sticky; 
        top: 0;
    }

    .y-axis { 
        text-align: right; 
        padding-right: 10px; 
        white-space: nowrap; 
        background-color: #f8f9fa; 
        position: sticky; 
        left: 0; 
        z-index: 2; 
        font-size: 12px;
    }

    .hour-header { 
        color: #2980b9; 
    }

    .cell-content { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        font-size: 11px; 
        font-weight: bold; 
        text-shadow: 0px 0px 2px rgba(255,255,255,0.8); 
    }
    
    .arrow { 
        display: inline-block; 
        font-size: 16px; 
    }
    
    /* Code couleur exact de maMeteo */
    .wind-light { color: #2ecc71; }
    .wind-mod   { color: #f1c40f; }
    .wind-strong{ color: #e67e22; }
    .wind-gale  { color: #e74c3c; }
    .wind-hurricane { color: #8e44ad; }
</style>