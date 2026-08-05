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
                                <th>Niveau</th>
                                <th>Vitesse</th>
                                <th>Direction</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each windProfile as level}
                                <tr>
                                    <td>{level.label}</td>
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
    import { getPointForecastData } from "@windy/fetch";
    import { wind2obj } from "@windy/utils";
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    let lat: number | null = null;
    let lon: number | null = null;
    let status: string = "";
    let currentModel: string = "";
    
    // Structure pour stocker le profil vertical
    let windProfile: Array<{ alt: number, label: string, speed: number, dir: number }> = [];

    const fetchVerticalProfile = async (latitude: number, longitude: number) => {
        status = "Extraction des données du modèle...";
        windProfile = [];
        
        try {
            const model = store.get('product'); // Récupère le modèle actuel (ex: ecmwf)
            currentModel = model;
            const currentTime = store.get('timestamp'); // Temps actuel sur la timeline de Windy
            
            // Appel à l'API interne de Windy pour récupérer toute la colonne d'air
            const forecast = await getPointForecastData(model, { lat: latitude, lon: longitude });
            
            if (!forecast || !forecast.data) {
                status = "Données indisponibles pour ce modèle.";
                return;
            }

            const data = forecast.data;
            // Windy peut nommer son tableau de temps 'ts', 'hours' ou 'time' selon le modèle
            const timeArray = data.ts || data.hours || data.time;
            
            // 1. Trouver l'index de la prévision correspondant à l'heure affichée
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

            // 2. Parcourir dynamiquement les données pour trouver tous les niveaux de vent (wind_u-...)
            const newProfile = [];
            for (const key of Object.keys(data)) {
                if (key.startsWith('wind')) {
                    const level = key.split('-')[1]; // Extrait 'surface', '850h', etc.
                    const u = data[`wind_u-${level}`];
                    const v = data[`wind_v-${level}`];
                    
                    if (u && v && u[closestIndex] !== undefined) {
                        // Extraction et conversion trigonométrique du vecteur vent
                        const obj = wind2obj([u[closestIndex], v[closestIndex]]);
                        
                        // Calcul approximatif de l'altitude pour le tri et l'affichage
                        let alt = 0;
                        let displayLevel = level;
                        
                        if (level === 'surface' || level.includes('10m')) {
                            alt = 0;
                            displayLevel = 'Sol';
                        } else if (level.endsWith('h')) {
                            const pressure = parseInt(level);
                            if (!isNaN(pressure)) {
                                // Formule barométrique standard pour estimer l'altitude en mètres
                                alt = Math.round(44330 * (1 - Math.pow(pressure / 1013.25, 0.1903)));
                                displayLevel = `${pressure}hPa (~${alt}m)`;
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

            // 3. Trier du sol vers le haut et couper tout ce qui est au-dessus de ~10000m
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

    // Écouteur de position de la sonde
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

    // Relance la lecture si l'utilisateur change l'heure ou le modèle
    const onSettingsChange = () => {
        if (lat !== null && lon !== null) {
            fetchVerticalProfile(lat, lon);
        }
    };

    onMount(() => {
        store.on('pickerLocation', onPickerLocation);
        store.on('timestamp', onSettingsChange); // Réagit à la barre de temps
        store.on('product', onSettingsChange);   // Réagit au changement de modèle (ex: GFS)
        
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
        /* Ajoute une barre de défilement élégante si les niveaux sont très nombreux */
        max-height: 400px; 
        overflow-y: auto;
    }

    .profile-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 5px;
        font-size: 0.9em;

        th, td {
            text-align: left;
            padding: 6px 4px;
            border-bottom: 1px solid rgba(41, 128, 185, 0.2);
        }

        th {
            font-size: 0.85em;
            text-transform: uppercase;
            color: #2980b9;
        }

        tr:last-child td {
            border-bottom: none;
        }
    }
</style>