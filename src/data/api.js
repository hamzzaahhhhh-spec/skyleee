/**
 * Quran Data API Client — Nava-e-Ayat
 * Wraps api.alquran.cloud with caching + transliteration support.
 */

const BASE_URL = 'https://api.alquran.cloud/v1';
const cache = new Map();

async function fetchCached(url) {
    if (cache.has(url)) return cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const json = await res.json();
    cache.set(url, json.data);
    return json.data;
}

/** Get list of all 114 surahs */
export async function getSurahList() {
    return fetchCached(`${BASE_URL}/surah`);
}

/** Get Arabic text for a surah */
export async function getSurah(id) {
    return fetchCached(`${BASE_URL}/surah/${id}`);
}

/** Get English translation (Sahih International) */
export async function getSurahTranslation(id) {
    return fetchCached(`${BASE_URL}/surah/${id}/en.sahih`);
}

/** Get transliteration */
export async function getSurahTransliteration(id) {
    return fetchCached(`${BASE_URL}/surah/${id}/en.transliteration`);
}

/**
 * Get Arabic + English + Transliteration for a surah
 */
export async function getSurahFull(id) {
    const [arabic, translation, transliteration] = await Promise.allSettled([
        getSurah(id),
        getSurahTranslation(id),
        getSurahTransliteration(id),
    ]);
    return {
        arabic: arabic.status === 'fulfilled' ? arabic.value : null,
        translation: translation.status === 'fulfilled' ? translation.value : null,
        transliteration: transliteration.status === 'fulfilled' ? transliteration.value : null,
    };
}

/** Audio URL (Mishary Rashid Alafasy) */
export function getAudioUrl(surahId) {
    return `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahId}.mp3`;
}

/** Pre-fetch adjacent surahs */
export function prefetchAdjacent(currentId) {
    const ids = [currentId - 1, currentId + 1].filter(id => id >= 1 && id <= 114);
    ids.forEach(id => {
        getSurah(id).catch(() => { });
        getSurahTranslation(id).catch(() => { });
    });
}

/** Search surahs by name/number */
export function searchSurahs(surahs, query) {
    if (!query.trim()) return surahs;
    const q = query.toLowerCase().trim();
    return surahs.filter(s =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        String(s.number).includes(q)
    );
}
