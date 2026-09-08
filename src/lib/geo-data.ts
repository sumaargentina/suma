export interface GeoCity {
  name: string;
  lat: number;
  lng: number;
}

export interface GeoState {
  name: string;
  code: string;
  cities: GeoCity[];
  lat: number;
  lng: number;
}

export interface GeoCountry {
  code: string; // ISO 2 (e.g. 'VE', 'AR')
  name: string;
  flag: string;
  phoneCode: string;
  states: GeoState[];
  lat: number;
  lng: number;
}

export const GEO_DATA: GeoCountry[] = [
  {
    code: 'VE',
    name: 'Venezuela',
    flag: '🇻🇪',
    phoneCode: '+58',
    lat: 8.0,
    lng: -66.0,
    states: [
      {
        name: 'Distrito Capital',
        code: 'DC',
        lat: 10.4806,
        lng: -66.9036,
        cities: [
          { name: 'Caracas', lat: 10.4806, lng: -66.9036 },
        ]
      },
      {
        name: 'Miranda',
        code: 'MI',
        lat: 10.35,
        lng: -66.6,
        cities: [
          { name: 'Los Teques', lat: 10.3444, lng: -67.0433 },
          { name: 'Chacao', lat: 10.4958, lng: -66.8533 },
          { name: 'Baruta', lat: 10.4344, lng: -66.8756 },
          { name: 'El Hatillo', lat: 10.4264, lng: -66.8256 },
          { name: 'Guarenas', lat: 10.4636, lng: -66.6186 },
          { name: 'Guatire', lat: 10.4722, lng: -66.5414 },
          { name: 'Petare', lat: 10.4789, lng: -66.8117 },
          { name: 'San Antonio de los Altos', lat: 10.3756, lng: -66.9536 },
          { name: 'Charallave', lat: 10.2444, lng: -66.8617 },
          { name: 'Cúa', lat: 10.1583, lng: -66.8833 },
          { name: 'Ocumare del Tuy', lat: 10.1167, lng: -66.7667 },
          { name: 'Higuerote', lat: 10.4914, lng: -66.1039 },
        ]
      },
      {
        name: 'Monagas',
        code: 'MO',
        lat: 9.75,
        lng: -63.18,
        cities: [
          { name: 'Maturín', lat: 9.7469, lng: -63.1831 },
          { name: 'Punta de Mata', lat: 9.6881, lng: -63.6331 },
          { name: 'Caripe', lat: 10.1747, lng: -63.4939 },
          { name: 'Caripito', lat: 10.1219, lng: -63.0978 },
          { name: 'Temblador', lat: 9.0142, lng: -62.6189 },
          { name: 'Caicara de Maturín', lat: 9.8167, lng: -63.6167 },
          { name: 'Aragua de Maturín', lat: 9.9667, lng: -63.4833 },
          { name: 'Aguasay', lat: 9.3833, lng: -63.7833 },
          { name: 'Barrancas del Orinoco', lat: 8.7056, lng: -62.1889 },
        ]
      },
      {
        name: 'Anzoátegui',
        code: 'AN',
        lat: 10.13,
        lng: -64.68,
        cities: [
          { name: 'Barcelona', lat: 10.1333, lng: -64.6833 },
          { name: 'Puerto La Cruz', lat: 10.2167, lng: -64.6333 },
          { name: 'Lechería', lat: 10.1917, lng: -64.6917 },
          { name: 'Guanta', lat: 10.2333, lng: -64.5833 },
          { name: 'El Tigre', lat: 8.8875, lng: -64.2458 },
          { name: 'Anaco', lat: 9.4289, lng: -64.4728 },
          { name: 'Cantaura', lat: 9.3083, lng: -64.3583 },
          { name: 'Pariaguán', lat: 8.8500, lng: -64.7000 },
          { name: 'Clarines', lat: 9.9417, lng: -65.1708 },
          { name: 'Puerto Píritu', lat: 10.0556, lng: -65.0444 },
        ]
      },
      {
        name: 'Zulia',
        code: 'ZU',
        lat: 10.65,
        lng: -71.63,
        cities: [
          { name: 'Maracaibo', lat: 10.6427, lng: -71.6125 },
          { name: 'San Francisco', lat: 10.5500, lng: -71.6333 },
          { name: 'Cabimas', lat: 10.3833, lng: -71.4333 },
          { name: 'Ciudad Ojeda', lat: 10.2000, lng: -71.3000 },
          { name: 'Machiques', lat: 10.0667, lng: -72.5500 },
          { name: 'Santa Bárbara del Zulia', lat: 8.9833, lng: -71.9000 },
          { name: 'La Villa del Rosario', lat: 10.3167, lng: -72.3167 },
          { name: 'Los Puertos de Altagracia', lat: 10.7000, lng: -71.5167 },
        ]
      },
      {
        name: 'Carabobo',
        code: 'CA',
        lat: 10.18,
        lng: -68.0,
        cities: [
          { name: 'Valencia', lat: 10.1620, lng: -68.0077 },
          { name: 'Puerto Cabello', lat: 10.4667, lng: -68.0167 },
          { name: 'Naguanagua', lat: 10.2500, lng: -68.0167 },
          { name: 'San Diego', lat: 10.2550, lng: -67.9540 },
          { name: 'Guacara', lat: 10.2333, lng: -67.8833 },
          { name: 'Los Guayos', lat: 10.1833, lng: -67.9333 },
          { name: 'Mariara', lat: 10.2964, lng: -67.7128 },
          { name: 'Bejuma', lat: 10.1733, lng: -68.2589 },
          { name: 'Morón', lat: 10.4906, lng: -68.1969 },
        ]
      },
      {
        name: 'Aragua',
        code: 'AR',
        lat: 10.25,
        lng: -67.6,
        cities: [
          { name: 'Maracay', lat: 10.2469, lng: -67.5958 },
          { name: 'Turmero', lat: 10.2286, lng: -67.4744 },
          { name: 'La Victoria', lat: 10.2281, lng: -67.3314 },
          { name: 'Cagua', lat: 10.1864, lng: -67.4589 },
          { name: 'El Limón', lat: 10.3061, lng: -67.6322 },
          { name: 'Villa de Cura', lat: 10.0381, lng: -67.4892 },
          { name: 'Palo Negro', lat: 10.1742, lng: -67.5417 },
          { name: 'Santa Rita', lat: 10.2033, lng: -67.5583 },
          { name: 'Colonia Tovar', lat: 10.4069, lng: -67.2889 },
        ]
      },
      {
        name: 'Lara',
        code: 'LA',
        lat: 10.07,
        lng: -69.32,
        cities: [
          { name: 'Barquisimeto', lat: 10.0678, lng: -69.3478 },
          { name: 'Cabudare', lat: 10.0306, lng: -69.2639 },
          { name: 'Carora', lat: 10.1736, lng: -70.0828 },
          { name: 'El Tocuyo', lat: 9.7869, lng: -69.7944 },
          { name: 'Quíbor', lat: 9.9281, lng: -69.6203 },
          { name: 'Duaca', lat: 10.2947, lng: -69.1628 },
          { name: 'Sanare', lat: 9.7461, lng: -69.6586 },
        ]
      },
      {
        name: 'Bolívar',
        code: 'BO',
        lat: 8.29,
        lng: -62.73,
        cities: [
          { name: 'Ciudad Guayana (Puerto Ordaz)', lat: 8.3533, lng: -62.6517 },
          { name: 'Ciudad Guayana (San Félix)', lat: 8.3667, lng: -62.6667 },
          { name: 'Ciudad Bolívar', lat: 8.1292, lng: -63.5408 },
          { name: 'Upata', lat: 8.0086, lng: -62.3989 },
          { name: 'Caicara del Orinoco', lat: 7.6167, lng: -66.1667 },
          { name: 'Tumeremo', lat: 7.2967, lng: -61.5036 },
          { name: 'Santa Elena de Uairén', lat: 4.6022, lng: -61.1097 },
          { name: 'Guasipati', lat: 7.4667, lng: -61.9000 },
          { name: 'El Callao', lat: 7.3500, lng: -61.8333 },
        ]
      },
      {
        name: 'Táchira',
        code: 'TA',
        lat: 7.77,
        lng: -72.23,
        cities: [
          { name: 'San Cristóbal', lat: 7.7669, lng: -72.2250 },
          { name: 'Táriba', lat: 7.8189, lng: -72.2239 },
          { name: 'Rubio', lat: 7.7056, lng: -72.3556 },
          { name: 'San Antonio del Táchira', lat: 7.8147, lng: -72.4439 },
          { name: 'La Grita', lat: 8.1333, lng: -71.9833 },
          { name: 'Ureña', lat: 7.9197, lng: -72.4456 },
          { name: 'San Juan de Colón', lat: 8.0333, lng: -72.2667 },
          { name: 'Capacho', lat: 7.8000, lng: -72.3167 },
        ]
      },
      {
        name: 'Mérida',
        code: 'ME',
        lat: 8.6,
        lng: -71.14,
        cities: [
          { name: 'Mérida', lat: 8.5983, lng: -71.1450 },
          { name: 'El Vigía', lat: 8.6247, lng: -71.6508 },
          { name: 'Ejido', lat: 8.5475, lng: -71.2408 },
          { name: 'Tovar', lat: 8.3375, lng: -71.7589 },
          { name: 'Lagunillas', lat: 8.5133, lng: -71.3967 },
          { name: 'Bailadores', lat: 8.2333, lng: -71.8167 },
          { name: 'Mucuchíes', lat: 8.7500, lng: -70.9167 },
        ]
      },
      {
        name: 'Falcón',
        code: 'FA',
        lat: 11.41,
        lng: -69.68,
        cities: [
          { name: 'Coro', lat: 11.4045, lng: -69.6738 },
          { name: 'Punto Fijo', lat: 11.6956, lng: -70.1997 },
          { name: 'Tucacas', lat: 10.7917, lng: -68.3208 },
          { name: 'Chichiriviche', lat: 10.9292, lng: -68.2736 },
          { name: 'Dabajuro', lat: 11.0219, lng: -70.6781 },
          { name: 'Churuguara', lat: 10.8089, lng: -69.5375 },
          { name: 'La Vela de Coro', lat: 11.4589, lng: -69.5761 },
        ]
      },
      {
        name: 'Nueva Esparta',
        code: 'NE',
        lat: 10.99,
        lng: -63.85,
        cities: [
          { name: 'Porlamar', lat: 10.9575, lng: -63.8550 },
          { name: 'Pampatar', lat: 10.9989, lng: -63.8014 },
          { name: 'La Asunción', lat: 11.0267, lng: -63.8628 },
          { name: 'Juan Griego', lat: 11.0817, lng: -63.9656 },
          { name: 'Valle del Espíritu Santo', lat: 10.9856, lng: -63.8822 },
          { name: 'Punta de Piedras', lat: 10.9031, lng: -64.1039 },
        ]
      },
      {
        name: 'Sucre',
        code: 'SU',
        lat: 10.45,
        lng: -64.17,
        cities: [
          { name: 'Cumaná', lat: 10.4633, lng: -64.1775 },
          { name: 'Carúpano', lat: 10.6678, lng: -63.2583 },
          { name: 'Güiria', lat: 10.5794, lng: -62.2961 },
          { name: 'Cariaco', lat: 10.4950, lng: -63.5539 },
          { name: 'Araya', lat: 10.5700, lng: -64.2500 },
          { name: 'Río Caribe', lat: 10.7000, lng: -63.1167 },
          { name: 'Casanay', lat: 10.5000, lng: -63.4167 },
        ]
      },
      {
        name: 'Trujillo',
        code: 'TR',
        lat: 9.37,
        lng: -70.43,
        cities: [
          { name: 'Valera', lat: 9.3178, lng: -70.6036 },
          { name: 'Trujillo', lat: 9.3667, lng: -70.4333 },
          { name: 'Boconó', lat: 9.2458, lng: -70.2647 },
          { name: 'Betijoque', lat: 9.3789, lng: -70.7303 },
          { name: 'Sabana de Mendoza', lat: 9.4500, lng: -70.7667 },
          { name: 'Carache', lat: 9.6267, lng: -70.2267 },
        ]
      },
      {
        name: 'Yaracuy',
        code: 'YA',
        lat: 10.34,
        lng: -68.74,
        cities: [
          { name: 'San Felipe', lat: 10.3392, lng: -68.7425 },
          { name: 'Yaritagua', lat: 10.0806, lng: -69.1239 },
          { name: 'Chivacoa', lat: 10.1583, lng: -68.8958 },
          { name: 'Nirgua', lat: 10.1500, lng: -68.5667 },
          { name: 'Cocorote', lat: 10.3200, lng: -68.7750 },
          { name: 'Independencia', lat: 10.3361, lng: -68.7569 },
          { name: 'Aroa', lat: 10.4333, lng: -68.8944 },
        ]
      },
      {
        name: 'Portuguesa',
        code: 'PO',
        lat: 9.05,
        lng: -69.25,
        cities: [
          { name: 'Acarigua', lat: 9.5558, lng: -69.2003 },
          { name: 'Araure', lat: 9.5606, lng: -69.2144 },
          { name: 'Guanare', lat: 9.0439, lng: -69.7428 },
          { name: 'Turén (Villa Bruzual)', lat: 9.3333, lng: -69.1167 },
          { name: 'Ospino', lat: 9.2978, lng: -69.4542 },
          { name: 'Biscucuy', lat: 9.3639, lng: -69.9839 },
        ]
      },
      {
        name: 'Barinas',
        code: 'BA',
        lat: 8.62,
        lng: -70.21,
        cities: [
          { name: 'Barinas', lat: 8.6225, lng: -70.2075 },
          { name: 'Barinitas', lat: 8.7561, lng: -70.4072 },
          { name: 'Socopó', lat: 8.2361, lng: -70.8356 },
          { name: 'Santa Bárbara', lat: 7.8089, lng: -71.1739 },
          { name: 'Pedraza (Ciudad Bolivia)', lat: 8.3756, lng: -70.5739 },
          { name: 'Sabaneta', lat: 8.7611, lng: -69.9328 },
        ]
      },
      {
        name: 'Guárico',
        code: 'GU',
        lat: 9.91,
        lng: -67.35,
        cities: [
          { name: 'San Juan de los Morros', lat: 9.9114, lng: -67.3539 },
          { name: 'Valle de la Pascua', lat: 9.2167, lng: -66.0083 },
          { name: 'Calabozo', lat: 8.9242, lng: -67.4294 },
          { name: 'Zaraza', lat: 9.3500, lng: -65.3244 },
          { name: 'Altagracia de Orituco', lat: 9.8600, lng: -66.3814 },
          { name: 'Tucupido', lat: 9.2789, lng: -65.7706 },
        ]
      },
      {
        name: 'Cojedes',
        code: 'CO',
        lat: 9.66,
        lng: -68.58,
        cities: [
          { name: 'San Carlos', lat: 9.6611, lng: -68.5828 },
          { name: 'Tinaquillo', lat: 9.9189, lng: -68.3047 },
          { name: 'El Baúl', lat: 8.9972, lng: -68.2831 },
          { name: 'El Pao', lat: 9.6389, lng: -68.1306 },
          { name: 'Tinaco', lat: 9.7042, lng: -68.4356 },
        ]
      },
      {
        name: 'Apure',
        code: 'AP',
        lat: 7.89,
        lng: -67.47,
        cities: [
          { name: 'San Fernando de Apure', lat: 7.8878, lng: -67.4725 },
          { name: 'Guasdualito', lat: 7.2417, lng: -70.7325 },
          { name: 'Biruaca', lat: 7.8428, lng: -67.5119 },
          { name: 'Achaguas', lat: 7.7667, lng: -68.2333 },
          { name: 'Elorza', lat: 7.0667, lng: -69.4972 },
        ]
      },
      {
        name: 'La Guaira',
        code: 'LG',
        lat: 10.60,
        lng: -66.93,
        cities: [
          { name: 'La Guaira', lat: 10.6000, lng: -66.9333 },
          { name: 'Maiquetía', lat: 10.5989, lng: -66.9567 },
          { name: 'Catia La Mar', lat: 10.6056, lng: -67.0319 },
          { name: 'Caraballeda', lat: 10.6133, lng: -66.8528 },
          { name: 'Macuto', lat: 10.6083, lng: -66.8972 },
          { name: 'Naiguatá', lat: 10.6189, lng: -66.7389 },
        ]
      },
      {
        name: 'Delta Amacuro',
        code: 'DA',
        lat: 9.06,
        lng: -62.05,
        cities: [
          { name: 'Tucupita', lat: 9.0625, lng: -62.0514 },
          { name: 'Pedernales', lat: 9.9700, lng: -62.2467 },
          { name: 'Sierra Imataca', lat: 8.5833, lng: -61.4167 },
        ]
      },
      {
        name: 'Amazonas',
        code: 'AM',
        lat: 5.66,
        lng: -67.62,
        cities: [
          { name: 'Puerto Ayacucho', lat: 5.6639, lng: -67.6236 },
          { name: 'San Fernando de Atabapo', lat: 4.0489, lng: -67.7014 },
          { name: 'Maroa', lat: 2.7189, lng: -67.5583 },
        ]
      }
    ]
  },
  {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    phoneCode: '+54',
    lat: -34.6037,
    lng: -58.3816,
    states: [
      {
        name: 'Ciudad Autónoma de Buenos Aires',
        code: 'CABA',
        lat: -34.6037,
        lng: -58.3816,
        cities: [
          { name: 'Buenos Aires (CABA)', lat: -34.6037, lng: -58.3816 },
        ]
      },
      {
        name: 'Buenos Aires (Provincia)',
        code: 'BA',
        lat: -34.9214,
        lng: -57.9544,
        cities: [
          { name: 'La Plata', lat: -34.9214, lng: -57.9544 },
          { name: 'Mar del Plata', lat: -38.0055, lng: -57.5560 },
          { name: 'Bahía Blanca', lat: -38.7183, lng: -62.2663 },
          { name: 'Tandil', lat: -37.3217, lng: -59.1332 },
          { name: 'San Isidro', lat: -34.4714, lng: -58.5283 },
          { name: 'Vicente López', lat: -34.5269, lng: -58.4739 },
          { name: 'Quilmes', lat: -34.7203, lng: -58.2546 },
          { name: 'Avellaneda', lat: -34.6611, lng: -58.3653 },
          { name: 'Lomas de Zamora', lat: -34.7600, lng: -58.4000 },
        ]
      },
      {
        name: 'Córdoba',
        code: 'CB',
        lat: -31.4201,
        lng: -64.1888,
        cities: [
          { name: 'Córdoba Capital', lat: -31.4201, lng: -64.1888 },
          { name: 'Villa Carlos Paz', lat: -31.4241, lng: -64.4978 },
          { name: 'Río Cuarto', lat: -33.1307, lng: -64.3499 },
          { name: 'Villa María', lat: -32.4075, lng: -63.2403 },
        ]
      },
      {
        name: 'Santa Fe',
        code: 'SF',
        lat: -32.9468,
        lng: -60.6393,
        cities: [
          { name: 'Rosario', lat: -32.9468, lng: -60.6393 },
          { name: 'Santa Fe Capital', lat: -31.6333, lng: -60.7000 },
          { name: 'Rafaela', lat: -31.2503, lng: -61.4867 },
          { name: 'Venado Tuerto', lat: -33.7456, lng: -61.9688 },
        ]
      },
      {
        name: 'Mendoza',
        code: 'MZ',
        lat: -32.8895,
        lng: -68.8458,
        cities: [
          { name: 'Mendoza Capital', lat: -32.8895, lng: -68.8458 },
          { name: 'San Rafael', lat: -34.6177, lng: -68.3301 },
          { name: 'Godoy Cruz', lat: -32.9247, lng: -68.8378 },
        ]
      }
    ]
  }
];

// Accent-folding and whitespace trimming helper
export function normalizeGeoText(text: string): string {
  if (!text) return '';
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// Helper functions for easy querying
export function getSupportedCountries(): GeoCountry[] {
  return GEO_DATA;
}

export function getCountryByCode(countryCode?: string): GeoCountry | undefined {
  if (!countryCode) return GEO_DATA[0];
  const query = normalizeGeoText(countryCode);
  return (
    GEO_DATA.find(c => normalizeGeoText(c.code) === query || normalizeGeoText(c.name) === query) ||
    (query === 'venezuela' || query === 've' ? GEO_DATA[0] : undefined) ||
    GEO_DATA[0]
  );
}

export function getStatesByCountry(countryCode?: string): GeoState[] {
  const country = getCountryByCode(countryCode);
  return country ? country.states : [];
}

export function getCitiesByState(countryCode?: string, stateName?: string): GeoCity[] {
  const states = getStatesByCountry(countryCode);
  if (!stateName) {
    // Return all cities for the country if state not specified
    return states.flatMap(s => s.cities);
  }
  const query = normalizeGeoText(stateName);
  const foundState = states.find(s => normalizeGeoText(s.name) === query || normalizeGeoText(s.code) === query);
  return foundState ? foundState.cities : [];
}

export function getCoordinates(countryCode?: string, stateName?: string, cityName?: string): { lat: number; lng: number } {
  const country = getCountryByCode(countryCode);
  if (!country) return { lat: 8.0, lng: -66.0 };

  if (!stateName) return { lat: country.lat, lng: country.lng };

  const stateQuery = normalizeGeoText(stateName);
  const state = country.states.find(s => normalizeGeoText(s.name) === stateQuery || normalizeGeoText(s.code) === stateQuery);
  if (!state) return { lat: country.lat, lng: country.lng };

  if (!cityName) return { lat: state.lat, lng: state.lng };

  const cityQuery = normalizeGeoText(cityName);
  const city = state.cities.find(c => normalizeGeoText(c.name) === cityQuery);
  if (!city) return { lat: state.lat, lng: state.lng };

  return { lat: city.lat, lng: city.lng };
}

export function resolveLocation(countryCode?: string, stateName?: string, cityName?: string): { country: string; state: string; city: string; lat: number; lng: number } {
  // If country is explicitly Venezuela or empty, prioritize Venezuelan cities
  const preferredCountry = countryCode || 'VE';

  if (cityName) {
    const cityQuery = normalizeGeoText(cityName);
    // First search in preferred country
    const country = getCountryByCode(preferredCountry);
    if (country) {
      for (const s of country.states) {
        const found = s.cities.find(ci => normalizeGeoText(ci.name) === cityQuery);
        if (found) {
          return { country: country.code, state: s.name, city: found.name, lat: found.lat, lng: found.lng };
        }
      }
    }

    // Then search across other countries
    for (const c of GEO_DATA) {
      for (const s of c.states) {
        const found = s.cities.find(ci => normalizeGeoText(ci.name) === cityQuery);
        if (found) {
          return { country: c.code, state: s.name, city: found.name, lat: found.lat, lng: found.lng };
        }
      }
    }
  }

  // Default to Venezuela -> Monagas -> Maturín
  const cCode = preferredCountry;
  const states = getStatesByCountry(cCode);
  const stateQuery = normalizeGeoText(stateName || '');
  const matchedState = states.find(s => normalizeGeoText(s.name) === stateQuery) || states[0] || { name: 'Monagas', cities: [] };
  const cities = matchedState.cities || [];
  const cityQuery = normalizeGeoText(cityName || '');
  const matchedCity = cities.find(ci => normalizeGeoText(ci.name) === cityQuery) || cities[0] || { name: 'Maturín', lat: 9.7469, lng: -63.1831 };

  return {
    country: cCode,
    state: matchedState.name,
    city: matchedCity.name,
    lat: matchedCity.lat,
    lng: matchedCity.lng,
  };
}
