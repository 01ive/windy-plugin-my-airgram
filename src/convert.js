/**
 * Convertit un objet de données Windy en structure OpenMeteo,
 * incluant la température et le point de rosée en surface (2m).
 * @param {Object} windyObj - L'objet de réponse brut de Windy
 * @returns {Object} - L'objet structuré au format OpenMeteo
 */
function convertWindyToOpenMeteo(windyObj, windyPointForecast) {
  const wData = windyObj.data.data;
  const wPtForecast = windyPointForecast.data.data;
  const hours = wData.hours;

  // Initialisation de la structure de base OpenMeteo
  const openMeteo = {
    latitude: 45.1,
    longitude: 2.68,
    timezone: "Europe/Paris",
    hourly: {
      time: [],
      temperature_2m: [],
      dewpoint_2m: [], // Ajout du champ pour le point de rosée en surface
      precipitation: []
    }
  };

  // Liste des niveaux de pression (hPa) à traiter pour l'émagramme
  const pressureLevels = [200, 250, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000];

  // Initialisation des tableaux pour chaque niveau de pression
  pressureLevels.forEach(level => {
    openMeteo.hourly[`temperature_${level}hPa`] = [];
    openMeteo.hourly[`dewpoint_${level}hPa`] = [];
    openMeteo.hourly[`windspeed_${level}hPa`] = [];
    openMeteo.hourly[`winddirection_${level}hPa`] = [];
  });

  // Parcours des données horaires
  for (let i = 0; i < hours.length; i++) {
    // Formatage du timestamp en ISO 8601 (YYYY-MM-DDTHH:mm)
    const date = new Date(hours[i]);
    const isoTime = date.toISOString().substring(0, 16); 
    openMeteo.hourly.time.push(isoTime);

    // Extraction et conversion de la température en surface (Kelvin vers Celsius)
    const tempSurfaceK = wData["temp-surface"][i];
    if (tempSurfaceK != null) {
      openMeteo.hourly.temperature_2m.push(Number((tempSurfaceK - 273.15).toFixed(1)));
    } else {
      openMeteo.hourly.temperature_2m.push(null);
    }

    // Extraction et conversion du point de rosée en surface (Kelvin vers Celsius)
    const dewpointSurfaceK = wData["dewpoint-surface"][i];
    if (dewpointSurfaceK != null) {
      openMeteo.hourly.dewpoint_2m.push(Number((dewpointSurfaceK - 273.15).toFixed(1)));
    } else {
      openMeteo.hourly.dewpoint_2m.push(null);
    }

    // Extraction et conversion pour chaque niveau de pression
    pressureLevels.forEach(level => {
      const tempK = wData[`temp-${level}h`][i];
      const dewK = wData[`dewpoint-${level}h`][i];
      const u = wData[`wind_u-${level}h`][i];
      const v = wData[`wind_v-${level}h`][i];

      // Conversion de la Température (Kelvin vers Celsius)
      if (tempK != null) {
        openMeteo.hourly[`temperature_${level}hPa`].push(Number((tempK - 273.15).toFixed(1)));
      } else {
        openMeteo.hourly[`temperature_${level}hPa`].push(null);
      }

      // Conversion du Point de rosée (Kelvin vers Celsius)
      if (dewK != null) {
        openMeteo.hourly[`dewpoint_${level}hPa`].push(Number((dewK - 273.15).toFixed(1)));
      } else {
        openMeteo.hourly[`dewpoint_${level}hPa`].push(null);
      }

      // Conversion du Vent (Vecteurs U/V vers Vitesse en km/h et Direction en degrés)
      if (u != null && v != null) {
        // Vitesse
        const speedKmh = Math.sqrt(u * u + v * v) * 3.6;
        openMeteo.hourly[`windspeed_${level}hPa`].push(Number(speedKmh.toFixed(1)));

        // Direction
        let dirDegrees = (270 - (Math.atan2(v, u) * 180 / Math.PI)) % 360;
        if (dirDegrees < 0) {
            dirDegrees += 360;
        }
        openMeteo.hourly[`winddirection_${level}hPa`].push(Math.round(dirDegrees));
      } else {
        openMeteo.hourly[`windspeed_${level}hPa`].push(null);
        openMeteo.hourly[`winddirection_${level}hPa`].push(null);
      }
    });

    // Extraction des précipitations
    const precip = wPtForecast.precipAmount[i];
    if (precip != null) {
      openMeteo.hourly.precipitation.push(precip);
    } else {
      openMeteo.hourly.precipitation.push(null);
    }
  }

  return openMeteo;
}

export {
    convertWindyToOpenMeteo
}