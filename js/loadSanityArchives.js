(() => {
  const PROJECT_ID = "ehskm5vk";
  const DATASET = "production";
  const API_VERSION = "2026-09-12";

  const IMAGE_PROJECTION = `{crop,hotspot,asset->{_id,url}}`;
  const GALLERY_PROJECTION = `{_type,crop,hotspot,asset->{_id,url},images[]${IMAGE_PROJECTION}}`;
  const DETAIL_RATIO = 455 / 245;

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
    thumbnail${IMAGE_PROJECTION},
    gallery[]${GALLERY_PROJECTION}
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
    thumbnail${IMAGE_PROJECTION},
    gallery[]${GALLERY_PROJECTION}
  }`;

  const ASSET_REF = /^image-([a-f0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/i;

  function sanityImageUrl(image, ratio) {
    if (!image) return "";
    const ref = image.asset?._id || image.asset?._ref || "";
    const match = ref.match(ASSET_REF);
    const base = image.asset?.url || "";
    if (!match) return base;
    const width = Number(match[2]);
    const height = Number(match[3]);
    const url = new URL(
      base ||
        `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${match[1]}-${width}x${height}.${match[4]}`
    );
    const crop = image.crop;
    const hasCrop =
      crop && (crop.left || crop.top || crop.right || crop.bottom);
    if (hasCrop) {
      const x = Math.round(width * (crop.left || 0));
      const y = Math.round(height * (crop.top || 0));
      const w = Math.max(1, Math.round(width * (1 - (crop.left || 0) - (crop.right || 0))));
      const h = Math.max(1, Math.round(height * (1 - (crop.top || 0) - (crop.bottom || 0))));
      url.searchParams.set("rect", `${x},${y},${w},${h}`);
    } else if (image.hotspot && typeof image.hotspot.x === "number") {
      url.searchParams.set("fp-x", String(image.hotspot.x));
      url.searchParams.set("fp-y", String(image.hotspot.y));
    }
    if (ratio) {
      url.searchParams.set("w", "720");
      url.searchParams.set("h", String(Math.round(720 / ratio)));
      url.searchParams.set("fit", "crop");
      if (url.searchParams.has("fp-x")) url.searchParams.set("crop", "focalpoint");
    }
    url.searchParams.set("auto", "format");
    return url.toString();
  }

  function galleryUrls(gallery) {
    return (Array.isArray(gallery) ? gallery : [])
      .map((entry) => {
        if (entry?._type !== "photoStrip") return sanityImageUrl(entry);
        const parts = (Array.isArray(entry.images) ? entry.images : []).slice(0, 3);
        const ratio = DETAIL_RATIO / Math.max(parts.length, 1);
        const urls = parts.map((image) => sanityImageUrl(image, ratio)).filter(Boolean);
        return urls.length > 1 ? urls : urls[0] || "";
      })
      .filter((slide) => (Array.isArray(slide) ? slide.length : slide));
  }

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
    const thumb = sanityImageUrl(doc.thumbnail);
    const images = galleryUrls(doc.gallery);

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
    const thumb = sanityImageUrl(doc.thumbnail);
    const images = galleryUrls(doc.gallery);
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
