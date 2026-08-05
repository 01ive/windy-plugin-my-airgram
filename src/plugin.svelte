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
        </div>

        <div class="box wind-box">
            {#if windSpeed !== null && windDir !== null}
                <b>Vitesse :</b> {windSpeed} m/s <br>
                <b>Orientation :</b> {windDir}°
            {:else}
                <i style="color: #d35400;">{status}</i>
            {/if}
        </div>
    {:else}
        <div class="box">
            <i>Cliquez sur la carte (Calque Vent) pour placer le repère.</i>
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from "@windy/broadcast";
    import store from "@windy/store";
    import { getLatLonInterpolator } from "@windy/interpolator";
    import { wind2obj } from "@windy/utils";
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    let lat: number | null = null;
    let lon: number | null = null;
    let windSpeed: number | null = null;
    let windDir: number | null = null;
    
    let status: string = "";

    // Méthode "FlyXC" : Extraction à la volée sans jamais mettre l'interpolateur en cache
    const extractData = async (latitude: number, longitude: number) => {
        if (latitude === null || longitude === null) return;
        
        status = "Lecture des données...";

        try {
            // Création d'un interpolateur tout neuf, parfaitement synchronisé avec l'affichage
            const interpolator = await getLatLonInterpolator();
            
            if (!interpolator) {
                status = "Erreur : Interpolateur indisponible.";
                return;
            }

            const data = await interpolator({ lat: latitude, lon: longitude });

            if (data) {
                let speed: number | undefined;
                let direction: number | undefined;

                // Cas 1 : Windy renvoie un tableau de composantes vectorielles [u, v]
                if (Array.isArray(data) && data.length >= 2) {
                    const obj = wind2obj(data);
                    speed = obj.wind;
                    direction = obj.dir;
                } 
                // Cas 2 : Sécurité pour Windy v40+ qui peut renvoyer directement un objet
                else if (typeof data === 'object' && !Array.isArray(data)) {
                    speed = (data as any).wind !== undefined ? (data as any).wind : (data as any).speed;
                    direction = (data as any).dir !== undefined ? (data as any).dir : (data as any).direction;
                }

                if (speed !== undefined && direction !== undefined) {
                    windSpeed = parseFloat(speed.toFixed(1));
                    windDir = Math.round(direction);
                    status = "Terminé.";
                    return; // Succès absolu
                }
            }
            
            // Si les données ne correspondent pas au vent
            windSpeed = null;
            windDir = null;
            status = "⚠️ Sélectionnez le calque 'Vent' pour voir ces données.";

        } catch (error) {
            console.error("Erreur d'extraction :", error);
            status = "Erreur de traitement.";
        }
    };

    // Écouteur principal branché sur la sonde native de Windy
    const onPickerLocation = (location: any) => {
        if (location) {
            lat = location.lat;
            lon = location.lon;
            extractData(lat, lon);
        } else {
            // Se déclenche si l'utilisateur ferme la sonde avec la croix rouge
            lat = null;
            lon = null;
            windSpeed = null;
            windDir = null;
            status = "Cliquez sur la carte.";
        }
    };

    // Rafraîchit les données si l'utilisateur change les réglages de la carte sous la sonde
    const refreshCurrentLocation = () => {
        if (lat !== null && lon !== null) {
            // Léger délai pour s'assurer que les tuiles WebGL ont bien changé
            setTimeout(() => extractData(lat!, lon!), 300);
        }
    };

    onMount(() => {
        // Branchement de tous les événements selon l'architecture FlyXC Sounding
        store.on('pickerLocation', onPickerLocation);
        
        store.on('overlay', refreshCurrentLocation);
        store.on('timestamp', refreshCurrentLocation);
        store.on('level', refreshCurrentLocation);
        bcast.on('redrawFinished', refreshCurrentLocation);
        
        // Sécurité : On vérifie si la sonde était DÉJÀ ouverte avant de lancer le plugin
        const currentLoc = store.get('pickerLocation');
        if (currentLoc) {
            onPickerLocation(currentLoc);
        }
    });

    onDestroy(() => {
        // Nettoyage impératif pour éviter les fuites de mémoire
        store.off('pickerLocation', onPickerLocation);
        store.off('overlay', refreshCurrentLocation);
        store.off('timestamp', refreshCurrentLocation);
        store.off('level', refreshCurrentLocation);
        bcast.off('redrawFinished', refreshCurrentLocation);
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
</style>