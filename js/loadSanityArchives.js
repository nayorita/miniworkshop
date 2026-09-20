(() => {
  const PROJECT_ID = "ehskm5vk";
  const DATASET = "production";
  const API_VERSION = "2026-09-12";

  const MUSIC_QUERY = `*[_type == "musicArchive" && defined(slug.current)] | order(order asc, date desc) {
    _id,
    title,
    detailTitle,
    "slug": slug.current,
    date,
    contentType,
    city,
    venue,
    cardDescription,
    order,
    performanceName,
    performanceDate,
    performancePlace,
    description,
    "thumbnailUrl": thumbnail.asset->url,
    "galleryUrls": gallery[].asset->url
  }`;

  const TRAVEL_QUERY = `*[_type == "travelArchive" && defined(slug.current)] | order(order asc, startDate desc) {
    _id,
    title,
    detailTitle,
    "slug": slug.current,
    startDate,
    endDate,
    dateLabel,
    duration,
    cities,
    cardDescription,
    order,
    tripName,
    tripDate,
    tripRoute,
    description,
    "thumbnailUrl": thumbnail.asset->url,
    "galleryUrls": gallery[].asset->url
  }`;

  function formatDotDate(value) {
    return String(value || "").replace(/-/g, ".").slice(0, 10);
  }

  function shortDate(value) {
    const date = formatDotDate(value);
    return date.length >= 10 ? date.slice(2) : date;
  }

  function travelDateLabel(doc) {
    if (doc.dateLabel) return String(doc.dateLabel).trim();
    const start = formatDotDate(doc.startDate);
    const end = formatDotDate(doc.endDate);
    if (start && end) {
      const sameYear = start.slice(0, 4) === end.slice(0, 4);
      return `${start} ~ ${sameYear ? end.slice(5) : end}`;
    }
    return start;
  }

  function mapMusic(doc) {
    const city = String(doc.city || "").trim();
    const venue = String(doc.venue || "").trim();
    const tags = [city, venue].filter(Boolean).map((tag) => tag.toUpperCase());
    const date = formatDotDate(doc.date);
    const thumb = doc.thumbnailUrl || "";
    const images = (Array.isArray(doc.galleryUrls) ? doc.galleryUrls : []).filter(Boolean);

    return {
      id: doc.slug || doc._id,
      title: doc.title || "",
      duration: doc.contentType || "",
      date,
      location: city.toUpperCase(),
      tags,
      caption: doc.cardDescription || doc.performanceName || "",
      image: thumb,
      detail: {
        title: doc.detailTitle || doc.title || "",
        rows: [
          { label: "공연명", value: doc.performanceName || "" },
          { label: "공연 일시", value: doc.performanceDate || date },
          { label: "공연 장소", value: doc.performancePlace || venue },
        ],
        body: doc.description || "",
        tags: [...tags, shortDate(doc.date)].filter(Boolean),
        images: images.length ? images : [thumb].filter(Boolean),
      },
    };
  }

  function mapTravel(doc) {
    const tags = (Array.isArray(doc.cities) ? doc.cities : [])
      .map((city) => String(city || "").trim())
      .filter(Boolean);
    const date = travelDateLabel(doc);
    const thumb = doc.thumbnailUrl || "";
    const images = (Array.isArray(doc.galleryUrls) ? doc.galleryUrls : []).filter(Boolean);
    const route = tags.join("-");

    return {
      id: doc.slug || doc._id,
      title: doc.title || "",
      duration: doc.duration || "",
      date,
      location: route,
      tags,
      caption: doc.cardDescription || "",
      image: thumb,
      detail: {
        title: doc.detailTitle || doc.title || "",
        rows: [
          { label: "여행명", value: doc.tripName || doc.title || "" },
          { label: "여행 기간", value: doc.tripDate || date },
          { label: "경로", value: doc.tripRoute || route },
        ],
        body: doc.description || "",
        tags,
        images: images.length ? images : [thumb].filter(Boolean),
      },
    };
  }

  async function querySanity(groq) {
    const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sanity ${res.status}`);
    const json = await res.json();
    return json.result || [];
  }

  const PAGES_QUERY = `{
    "travel": *[_id == "travelArchivePage"][0]{titleEn,titleKr,bodyEn,bodyKr},
    "music": *[_id == "musicArchivePage"][0]{titleEn,titleKr,bodyEn,bodyKr}
  }`;

  window.loadMusicArchive = async () => (await querySanity(MUSIC_QUERY)).map(mapMusic);
  window.loadTravelArchive = async () => (await querySanity(TRAVEL_QUERY)).map(mapTravel);
  window.loadArchivePages = async () => {
    const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(PAGES_QUERY)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sanity ${res.status}`);
    const json = await res.json();
    return json.result || {};
  };
})();
