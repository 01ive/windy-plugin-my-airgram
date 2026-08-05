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
                <div class="table-container">
                    <table class="profile-table">
                        <thead>
                            <tr>
                                <th>Altitude (Niveau)</th>
                                <th>Vitesse</th>
                                <th>Direction</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each windProfile as level}
                                <tr>
                                    <td>
                                        <strong>{level.alt}m</strong> 
                                        <span class="pressure-label">({level.label})</span>
                                    </td>
                                    <td><strong>{level.speed}</strong> m/s</td>
                                    <td>{level.dir}°</td>
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
    
    // 1. Nouvel import de la bonne méthode
    import { getMeteogramForecastData } from "@windy/fetch";
    import { wind2obj } from "@windy/utils";
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    let lat: number | null = null;
    let lon: number | null = null;
    let status: string = "";
    let currentModel: string = "";
    
    let windProfile: Array<{ alt: number, label: string, speed: number, dir: number }> = [];

    const fetchVerticalProfile = async (latitude: number, longitude: number) => {
        status = "Extraction des données du modèle...";
        windProfile = [];
        
        try {
            const model = store.get('product'); 
            currentModel = model;
            const currentTime = store.get('timestamp'); 
            
            // 2. Appel de la méthode getMeteogramForecastData avec step: 1 pour la meilleure résolution
            const forecast = await getMeteogramForecastData(model, { lat: latitude, lon: longitude, step: 1 });
            
            if (!forecast || !forecast.data) {
                status = "Données indisponibles pour ce modèle.";
                return;
            }

            // Gestion de la structure de l'objet de réponse (souvent imbriqué dans data.data)
            const rawData = forecast.data.data || forecast.data;
            const timeArray = rawData.ts || rawData.hours || rawData.time;
            
            let closestIndex = 0;
            if (timeArray && timeArray.length > 0) {
                let minDiff = Infinity;
                timeArray.forEach((time: number, index: number) => {
                    const diff = Math.abs(time - currentTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestIndex = index;
                    }
                });
            }

            const newProfile = [];
            
            // 3. Parcours optimisé en ciblant uniquement la composante U pour identifier les niveaux
            for (const key of Object.keys(rawData)) {
                if (key.startsWith('wind_u-')) {
                    const level = key.split('-')[1]; 
                    const u = rawData[`wind_u-${level}`];
                    const v = rawData[`wind_v-${level}`];
                    
                    if (u && v && u[closestIndex] !== undefined && v[closestIndex] !== undefined) {
                        const obj = wind2obj([u[closestIndex], v[closestIndex]]);
                        
                        let alt = 0;
                        let displayLevel = level.endsWith('h') ? `${level}Pa` : level;
                        
                        // 4. Extraction de l'altitude réelle (Geopotential Height) pour une précision maximale
                        const gh = rawData[`gh-${level}`];
                        if (gh && gh[closestIndex] !== undefined) {
                            alt = Math.round(gh[closestIndex]);
                        } else {
                            // Fallback barométrique ou altitude du sol
                            if (level === 'surface' || level.includes('10m')) {
                                alt = Math.round(forecast.data.header?.modelElevation || 0);
                                displayLevel = 'Sol';
                            } else if (level.endsWith('h')) {
                                const pressure = parseInt(level);
                                if (!isNaN(pressure)) {
                                    alt = Math.round(44330 * (1 - Math.pow(pressure / 1013.25, 0.1903)));
                                }
                            }
                        }

                        newProfile.push({
                            alt: alt,
                            label: displayLevel,
                            speed: parseFloat(obj.wind.toFixed(1)),
                            dir: Math.round(obj.dir)
                        });
                    }
                }
            }

            newProfile.sort((a, b) => a.alt - b.alt);
            windProfile = newProfile.filter(p => p.alt <= 11000);

            if (windProfile.length > 0) {
                status = "Profil chargé.";
            } else {
                status = "Aucun profil de vent trouvé.";
            }

        } catch (error) {
            console.error("Erreur d'extraction du profil Windy :", error);
            status = "Erreur lors du sondage.";
        }
    };

    const onPickerLocation = (location: any) => {
        if (location) {
            lat = location.lat;
            lon = location.lon;
            fetchVerticalProfile(lat, lon);
        } else {
            lat = null;
            lon = null;
            windProfile = [];
            status = "Cliquez sur la carte.";
        }
    };

    const onSettingsChange = () => {
        if (lat !== null && lon !== null) {
            fetchVerticalProfile(lat, lon);
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
    }
    
    .table-container {
        max-height: 400px; 
        overflow-y: auto;
        border-top: 1px solid rgba(0,0,0,0.1);
        border-bottom: 1px solid rgba(0,0,0,0.1);
    }

    .profile-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 5px;
        font-size: 0.9em;

        th, td {
            text-align: left;
            padding: 6px 4px;
            border-bottom: 1px solid rgba(41, 128, 185, 0.15);
        }

        th {
            font-size: 0.85em;
            text-transform: uppercase;
            color: #2980b9;
            position: sticky;
            top: 0;
            background-color: #ebf5fb;
        }

        tr:last-child td {
            border-bottom: none;
        }

        .pressure-label {
            font-size: 0.8em;
            color: gray;
            font-weight: normal;
            margin-left: 4px;
        }
    }
</style>