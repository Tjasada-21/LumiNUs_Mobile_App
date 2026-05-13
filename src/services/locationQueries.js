const PSGC_BASE_URL = "https://psgc.gitlab.io/api";

const regionCache = { data: null };
const provinceCache = new Map();
const municipalityCache = new Map();
const barangayCache = new Map();

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

const normalizeOption = (item) => ({
  code: item.code,
  name: item.name,
  oldName: item.oldName || "",
  isCapital: Boolean(item.isCapital),
  isCity: Boolean(item.isCity),
  isMunicipality: Boolean(item.isMunicipality),
  regionCode: item.regionCode || null,
  provinceCode: item.provinceCode || null,
  districtCode: item.districtCode || null,
});

const fetchFromCandidates = async (urls) => {
  let lastError = null;

  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
};

export const getRegions = async () => {
  if (regionCache.data) {
    return regionCache.data;
  }

  const data = await fetchJson(`${PSGC_BASE_URL}/regions.json`);
  const regions = Array.isArray(data) ? data.map(normalizeOption) : [];
  regionCache.data = regions;
  return regions;
};

export const getProvincesByRegion = async (regionCode) => {
  if (!regionCode) return [];

  if (provinceCache.has(regionCode)) {
    return provinceCache.get(regionCode);
  }

  const data = await fetchJson(
    `${PSGC_BASE_URL}/regions/${regionCode}/provinces.json`,
  );
  const provinces = Array.isArray(data) ? data.map(normalizeOption) : [];
  provinceCache.set(regionCode, provinces);
  return provinces;
};

export const getCitiesMunicipalitiesByProvince = async (provinceCode) => {
  if (!provinceCode) return [];

  if (municipalityCache.has(provinceCode)) {
    return municipalityCache.get(provinceCode);
  }

  const data = await fetchJson(
    `${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities.json`,
  );
  const municipalities = Array.isArray(data) ? data.map(normalizeOption) : [];
  municipalityCache.set(provinceCode, municipalities);
  return municipalities;
};

export const getBarangaysByCityMunicipality = async (cityMunicipalityCode) => {
  if (!cityMunicipalityCode) return [];

  if (barangayCache.has(cityMunicipalityCode)) {
    return barangayCache.get(cityMunicipalityCode);
  }

  const data = await fetchFromCandidates([
    `${PSGC_BASE_URL}/cities-municipalities/${cityMunicipalityCode}/barangays.json`,
    `${PSGC_BASE_URL}/municipalities/${cityMunicipalityCode}/barangays.json`,
    `${PSGC_BASE_URL}/cities/${cityMunicipalityCode}/barangays.json`,
  ]);

  const barangays = Array.isArray(data)
    ? data.map((item) => ({
        code: item.code,
        name: item.name,
        oldName: item.oldName || "",
      }))
    : [];

  barangayCache.set(cityMunicipalityCode, barangays);
  return barangays;
};
