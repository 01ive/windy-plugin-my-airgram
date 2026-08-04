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

    <!-- Affichage conditionnel des coordonnées si elles sont définies -->
    {#if lat !== null && lon !== null}
        <div class="coordinates">
            Coordonnées GPS : <strong>{lat.toFixed(5)}</strong>, <strong>{lon.toFixed(5)}</strong>
        </div>
    {/if}
</section>

<script lang="ts">
    import bcast from "@windy/broadcast";
    import { map } from "@windy/map"; // Import de l'instance de la carte
    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    const { title } = config;

    // Variables réactives Svelte pour stocker les coordonnées
    let lat: number | null = null;
    let lon: number | null = null;

    // Fonction déclenchée lors d'un clic sur la carte
    const onMapClick = (event: any) => {
        lat = event.latlng.lat;
        lon = event.latlng.lng;
    };

    export const onopen = (params: unknown) => {
        // Optionnel : Gérer l'ouverture depuis le menu contextuel de la carte
        // Si le plugin est ouvert via un clic droit "Ouvrir le plugin", Windy passe les coordonnées dans "params"
        if (params && typeof params === 'object' && 'lat' in params && 'lon' in params) {
            lat = (params as any).lat;
            lon = (params as any).lon;
        }
    };

    onMount(() => {
        // On attache l'écouteur d'événement au montage du composant
        map.on('click', onMapClick);
    });

    onDestroy(() => {
        // Très important : retirer l'écouteur lors de la fermeture/destruction du plugin 
        // pour éviter les fuites de mémoire et les déclenchements multiples
        map.off('click', onMapClick);
    });
</script>

<style lang="less">
    .greeting {
        margin-bottom: 10px;
    }
    
    .coordinates {
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 5px;
        font-size: 0.9em;
    }
</style>