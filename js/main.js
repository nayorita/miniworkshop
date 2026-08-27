(() => {
  const archive = document.getElementById("archive");
  const archiveGrid = document.getElementById("archive-grid");
  const musicArchive = document.getElementById("music-archive");
  const musicArchiveGrid = document.getElementById("music-archive-grid");
  const video = document.getElementById("bg-video");
  const sharpVideo = document.getElementById("bg-video-sharp");
  const sharpPortal = document.getElementById("video-sharp-portal");

  const overlays = {
    travel: {
      el: archive,
      grid: archiveGrid,
      bodyClass: "is-travel-archive-open",
      triggers: document.querySelectorAll('[data-action="archive"]'),
      items: () => (Array.isArray(window.archiveItems) ? window.archiveItems : []),
    },
    music: {
      el: musicArchive,
      grid: musicArchiveGrid,
      bodyClass: "is-music-archive-open",
      triggers: document.querySelectorAll('[data-action="music-archive"]'),
      items: () => (Array.isArray(window.musicItems) ? window.musicItems : []),
    },
  };

  let openKind = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveArchiveImage(path) {
    if (!path) return "";
    if (path.startsWith("/archive/")) return `public${path}`;
    return path;
  }

  function formatDateLine(item) {
    const date = String(item.date || "").trim();
    const duration = String(item.duration || "")
      .replace(/^\(|\)$/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (date && duration) return `${date} (${duration})`;
    return date || duration;
  }

  function tagsFrom(item) {
    if (Array.isArray(item.tags) && item.tags.length) return item.tags;
    return String(item.location || "")
      .split(/[-,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function ArchiveCard(item) {
    const title = escapeHtml(item.title || "");
    const dateLine = escapeHtml(formatDateLine(item));
    const caption = escapeHtml(item.caption || "");
    const tags = tagsFrom(item)
      .map((tag) => `<li>${escapeHtml(tag)}</li>`)
      .join("");
    const src = escapeHtml(resolveArchiveImage(item.image));
    const id = escapeHtml(item.id || "");
    const shape = "public/ui/closed.svg";

    return `
      <article class="archive-card" data-id="${id}" tabindex="0">
        <img class="archive-card-back" src="${shape}" width="390" height="482" alt="" aria-hidden="true" draggable="false" />
        <div class="archive-card-bg" aria-hidden="true"></div>
        <div class="archive-card-fold" aria-hidden="true"></div>
        <h3 class="archive-card-title">${title}</h3>
        <div class="archive-card-body">
          <p class="archive-card-date">${dateLine}</p>
          <div class="archive-card-photo">
            <img src="${src}" alt="${title}" loading="lazy" />
            <div class="archive-card-fallback">NO IMAGE</div>
          </div>
          ${tags ? `<ul class="archive-card-tags">${tags}</ul>` : ""}
          ${caption ? `<p class="archive-card-caption">${caption}</p>` : ""}
        </div>
      </article>
    `;
  }

  function renderCards(grid, items) {
    if (!grid) return;
    grid.innerHTML = items.map(ArchiveCard).join("");
    grid.querySelectorAll(".archive-card-photo img").forEach((img) => {
      const frame = img.closest(".archive-card-photo");
      const showFallback = () => frame?.classList.add("is-fallback");
      img.addEventListener("error", showFallback);
      if (img.complete && img.naturalWidth === 0) showFallback();
    });
    syncArchiveCopySize(grid);
  }

  function syncArchiveCopySize(grid = archiveGrid) {
    const sample = grid?.querySelector(".archive-card-date");
    if (!sample) return;
    const size = getComputedStyle(sample).fontSize;
    if (!size || size === "0px") return;
    document.documentElement.style.setProperty("--archive-copy-size", size);
  }

  function setExpanded(kind, isOpen) {
    overlays[kind].triggers.forEach((el) => {
      if (el.hasAttribute("aria-expanded")) {
        el.setAttribute("aria-expanded", String(isOpen));
      }
    });
  }

  function hideOverlay(kind, immediate) {
    const overlay = overlays[kind];
    if (!overlay?.el) return;
    overlay.el.classList.remove("is-open");
    document.body.classList.remove(overlay.bodyClass);
    setExpanded(kind, false);
    if (immediate) {
      overlay.el.hidden = true;
      return;
    }
    const onEnd = (event) => {
      if (event.propertyName !== "opacity") return;
      overlay.el.removeEventListener("transitionend", onEnd);
      if (!overlay.el.classList.contains("is-open")) {
        overlay.el.hidden = true;
      }
    };
    overlay.el.addEventListener("transitionend", onEnd);
  }

  function openArchive(kind) {
    const overlay = overlays[kind];
    if (!overlay?.el) return;
    if (openKind && openKind !== kind) hideOverlay(openKind, true);
    overlay.el.hidden = false;
    document.body.classList.add("is-archive-open", overlay.bodyClass);
    document.body.classList.add("is-hud-hover");
    requestAnimationFrame(() => {
      overlay.el.classList.add("is-open");
      requestAnimationFrame(() => syncArchiveCopySize(overlay.grid));
    });
    setExpanded(kind, true);
    openKind = kind;
  }

  function closeArchive() {
    if (!openKind) return;
    const kind = openKind;
    hideOverlay(kind, false);
    document.body.classList.remove("is-archive-open");
    openKind = null;
  }

  function toggleArchive(kind) {
    if (openKind === kind) closeArchive();
    else openArchive(kind);
  }

  Object.keys(overlays).forEach((kind) => {
    overlays[kind].triggers.forEach((el) => {
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleArchive(kind);
      });
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openKind) closeArchive();
  });

  if (video) {
    const markReady = () => {
      video.classList.add("is-ready");
      sharpVideo?.classList.add("is-ready");
    };
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("error", () => {
      video.classList.remove("is-ready");
      sharpVideo?.classList.remove("is-ready");
    });
    if (video.readyState >= 2) markReady();
  }

  if (video && sharpVideo) {
    const syncSharpVideo = () => {
      if (Math.abs(sharpVideo.currentTime - video.currentTime) > 0.05) {
        sharpVideo.currentTime = video.currentTime;
      }
    };
    video.addEventListener("timeupdate", syncSharpVideo);
    sharpVideo.play().catch(() => {});
  }

  // center focus tracker
  function cssPx(name) {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;height:var(${name})`;
    document.body.appendChild(probe);
    const value = probe.getBoundingClientRect().height;
    probe.remove();
    return value;
  }

  const focusTracker = document.getElementById("focus-tracker");
  const focusGrid = document.getElementById("focus-grid");
  const focusCoords = document.getElementById("focus-coords");
  const focusCenter = focusTracker?.querySelector(".focus-center");

  let focusH = cssPx("--focus-h");
  let focusW = focusH * (177 / 176);

  const gridLayout = document.querySelector(".grid-layout");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function createRollingDigit(root) {
    const reel = document.createElement("span");
    reel.className = "digit-reel";
    const copies = 3;
    for (let copy = 0; copy < copies; copy += 1) {
      for (let n = 0; n <= 9; n += 1) {
        const item = document.createElement("span");
        item.textContent = String(n);
        reel.appendChild(item);
      }
    }

    const slot = document.createElement("span");
    slot.className = "digit-slot";
    slot.appendChild(reel);
    root.appendChild(slot);

    let index = 10;

    function apply(immediate) {
      if (immediate || reduceMotion) {
        reel.style.transition = "none";
        reel.style.transform = `translateY(${-index}em)`;
        void reel.offsetHeight;
        if (!reduceMotion) reel.style.transition = "";
        return;
      }
      reel.style.transform = `translateY(${-index}em)`;
    }

    function normalize() {
      if (index >= 10 && index < 20) return;
      index = 10 + (((index % 10) + 10) % 10);
      apply(true);
    }

    reel.addEventListener("transitionend", (event) => {
      if (event.propertyName === "transform") normalize();
    });

    apply(true);

    return {
      set(digit, immediate) {
        const next = ((digit % 10) + 10) % 10;
        const from = ((index % 10) + 10) % 10;
        if (next === from && !immediate) return;

        let delta = next - from;
        if (delta > 5) delta -= 10;
        else if (delta < -5) delta += 10;

        index += delta;
        apply(immediate);
      },
    };
  }

  function createRollingCoordinate(root) {
    const groups = {
      x: root.querySelector('[data-axis="x"]'),
      y: root.querySelector('[data-axis="y"]'),
    };
    const digits = {
      x: [0, 1, 2].map(() => createRollingDigit(groups.x)),
      y: [0, 1, 2].map(() => createRollingDigit(groups.y)),
    };
    let last = { x: null, y: null };

    function split(value) {
      const padded = String(Math.abs(Math.round(value)) % 1000).padStart(3, "0");
      return padded.split("").map(Number);
    }

    return {
      set(x, y, immediate) {
        if (last.x !== x) {
          split(x).forEach((digit, i) => digits.x[i].set(digit, immediate));
          last.x = x;
        }
        if (last.y !== y) {
          split(y).forEach((digit, i) => digits.y[i].set(digit, immediate));
          last.y = y;
        }
      },
    };
  }

  const rollingCoords = focusCoords ? createRollingCoordinate(focusCoords) : null;

  function readFocusCoords() {
    const el = focusCenter || focusTracker;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
  }

  function updateCoordDisplay(immediate) {
    if (!rollingCoords) return;
    const { x, y } = readFocusCoords();
    rollingCoords.set(x, y, immediate);
  }

  function getCenterZoneY() {
    if (!gridLayout) {
      return { top: window.innerHeight * 0.2, bottom: window.innerHeight * 0.8 };
    }
    const rect = gridLayout.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(gridLayout).gap) || 30;
    const rowH = (rect.height - 9 * gap) / 10;
    return {
      top: rect.top + rowH + gap,
      bottom: rect.top + 9 * (rowH + gap),
    };
  }

  function isCenterZone(y) {
    const zone = getCenterZoneY();
    return y >= zone.top && y <= zone.bottom;
  }

  function moveFocus(x, y) {
    if (!focusTracker) return;
    focusTracker.style.left = `${x}px`;
    focusTracker.style.top = `${y}px`;
    focusTracker.style.transform = "translate(-50%, -50%)";

    if (!sharpPortal || !sharpVideo) return;
    const left = x - focusW / 2;
    const top = y - focusH / 2;
    sharpPortal.style.left = `${left}px`;
    sharpPortal.style.top = `${top}px`;
    sharpVideo.style.width = `${window.innerWidth}px`;
    sharpVideo.style.height = `${window.innerHeight}px`;
    sharpVideo.style.left = `${-left}px`;
    sharpVideo.style.top = `${-top}px`;
  }

  function layoutFocusGrid() {
    if (!focusGrid) return;
    const width = focusGrid.clientWidth || window.innerWidth;
    const height = focusGrid.clientHeight || window.innerHeight;
    const rowPitch = Math.min(width, height) / 3;
    const NS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    function addLine(x1, y1, x2, y2) {
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      svg.appendChild(line);
    }

    const rowYs = [];
    for (let y = 0; y <= height + 0.5; y += rowPitch) rowYs.push(y);
    for (let i = 1; i < rowYs.length - 1; i += 1) {
      addLine(0, rowYs[i], width, rowYs[i]);
    }
    for (let i = 0; i <= 4; i += 1) {
      addLine((width * i) / 4, 0, (width * i) / 4, height);
    }

    focusGrid.replaceChildren(svg);
  }

  function setFocusVisible(visible) {
    focusTracker?.classList.toggle("is-hidden", !visible);
    sharpPortal?.classList.toggle("is-hidden", !visible);
  }

  function isHudArea(target) {
    return target.closest(".hud-band, .hud-top-row, .hud-bottom-row, .hud-btn");
  }

  let pendingFocus = null;
  let focusRaf = 0;

  function flushFocus(immediate) {
    focusRaf = 0;
    if (!pendingFocus) return;
    moveFocus(pendingFocus.x, pendingFocus.y);
    updateCoordDisplay(immediate);
  }

  function queueFocus(x, y) {
    pendingFocus = { x, y };
    if (focusRaf) return;
    focusRaf = requestAnimationFrame(() => flushFocus(false));
  }

  document.addEventListener("mousemove", (event) => {
    if (document.body.classList.contains("is-archive-open")) {
      document.body.classList.add("is-hud-hover");
      setFocusVisible(false);
      return;
    }

    const inCenter = isCenterZone(event.clientY);
    const onHud = isHudArea(event.target);

    if (!inCenter || onHud) {
      document.body.classList.add("is-hud-hover");
      setFocusVisible(false);
    } else {
      document.body.classList.remove("is-hud-hover");
      setFocusVisible(true);
      queueFocus(event.clientX, event.clientY);
    }
  });

  window.addEventListener("resize", () => {
    focusH = cssPx("--focus-h");
    focusW = focusH * (177 / 176);
    layoutFocusGrid();
    const x = parseFloat(focusTracker?.style.left || String(window.innerWidth / 2));
    const y = parseFloat(focusTracker?.style.top || String(window.innerHeight / 2));
    if (isCenterZone(y)) {
      setFocusVisible(true);
      moveFocus(x, y);
      updateCoordDisplay(true);
    } else {
      setFocusVisible(false);
    }
  });

  layoutFocusGrid();

  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;
  if (isCenterZone(startY)) {
    setFocusVisible(true);
    moveFocus(startX, startY);
    updateCoordDisplay(true);
  } else {
    setFocusVisible(false);
  }

  renderCards(archiveGrid, overlays.travel.items());
  renderCards(musicArchiveGrid, overlays.music.items());
  const onArchiveResize = () => {
    const grid = openKind ? overlays[openKind].grid : archiveGrid;
    syncArchiveCopySize(grid);
  };
  if (archiveGrid) new ResizeObserver(onArchiveResize).observe(archiveGrid);
  if (musicArchiveGrid) new ResizeObserver(onArchiveResize).observe(musicArchiveGrid);
  window.addEventListener("resize", onArchiveResize);
  initLrMeter();
  initTimecode();

  function initLrMeter() {
    const svg = document.getElementById("lr-meter");
    if (!svg) return;

    const NS = "http://www.w3.org/2000/svg";
    const SRC = "assets/icons/lr-meter.png";
    const PAIRS = 15;
    const START_X = 36;
    const STEP_X = 18;

    const defs = document.createElementNS(NS, "defs");
    svg.appendChild(defs);

    function clipRect(id, x, y, w, h) {
      const clip = document.createElementNS(NS, "clipPath");
      clip.setAttribute("id", id);
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(w));
      rect.setAttribute("height", String(h));
      clip.appendChild(rect);
      defs.appendChild(clip);
    }

    function addImage(clipId, ch, index) {
      const image = document.createElementNS(NS, "image");
      image.setAttribute("href", SRC);
      image.setAttribute("width", "300");
      image.setAttribute("height", "65");
      image.setAttribute("clip-path", `url(#${clipId})`);
      if (ch) {
        image.dataset.ch = ch;
        image.dataset.i = String(index);
      }
      svg.appendChild(image);
      return image;
    }

    clipRect("lr-clip-label", 0, 0, START_X, 65);
    addImage("lr-clip-label");

    const lSegs = [];
    const rSegs = [];

    for (let i = 0; i < PAIRS; i += 1) {
      const x = START_X + i * STEP_X;
      const w = i === PAIRS - 1 ? 300 - x : STEP_X;
      clipRect(`lr-clip-l-${i}`, x, 5, w, 25);
      clipRect(`lr-clip-r-${i}`, x, 35, w, 25);
      lSegs.push(addImage(`lr-clip-l-${i}`, "l", i));
      rSegs.push(addImage(`lr-clip-r-${i}`, "r", i));
    }

    function walk(value) {
      const roll = Math.random();
      let step;
      if (value <= 1) {
        step = roll < 0.65 ? 1 : 0;
      } else if (value >= PAIRS - 1) {
        step = roll < 0.7 ? -1 : roll < 0.85 ? -2 : 0;
      } else if (roll < 0.18) {
        step = -2;
      } else if (roll < 0.4) {
        step = -1;
      } else if (roll < 0.55) {
        step = 0;
      } else if (roll < 0.82) {
        step = 1;
      } else {
        step = 2;
      }
      return Math.max(0, Math.min(PAIRS, value + step));
    }

    function apply(segs, count) {
      segs.forEach((el, i) => {
        el.setAttribute("visibility", i < count ? "visible" : "hidden");
      });
    }

    let levelL = 7;
    let levelR = 4;
    apply(lSegs, levelL);
    apply(rSegs, levelR);

    window.setInterval(() => {
      levelL = walk(levelL);
      levelR = walk(levelR);
      apply(lSegs, levelL);
      apply(rSegs, levelR);
    }, 100);
  }

  function initTimecode() {
    const hoursRoot = document.getElementById("timecode-hours");
    const minutesRoot = document.getElementById("timecode-minutes");
    const secondsRoot = document.getElementById("timecode-seconds");
    if (!hoursRoot || !minutesRoot || !secondsRoot) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startTime = performance.now();
    const hourSlots = [];
    const minuteSlots = [];
    const secondSlots = [];

    function digitSrc(n) {
      return `assets/icons/digits/${n}.svg`;
    }

    function fieldSrc(n) {
      return `assets/icons/digits/digit-field-${n}.svg`;
    }

    function createSlot(parent, initial) {
      const wrap = document.createElement("span");
      wrap.className = "timecode-slot-wrap";
      const field = document.createElement("img");
      field.className = "timecode-field timecode-digit-field";
      field.src = fieldSrc(initial);
      field.width = 65;
      field.height = 93;
      field.alt = "";
      wrap.appendChild(field);

      const slot = document.createElement("span");
      slot.className = "timecode-slot";
      const reel = document.createElement("span");
      reel.className = "timecode-reel";
      for (let n = 0; n <= 9; n += 1) {
        const img = document.createElement("img");
        img.src = digitSrc(n);
        img.width = 38;
        img.height = 66;
        img.alt = "";
        reel.appendChild(img);
      }
      const wrapImg = document.createElement("img");
      wrapImg.src = digitSrc(0);
      wrapImg.width = 38;
      wrapImg.height = 66;
      wrapImg.alt = "";
      reel.appendChild(wrapImg);
      slot.appendChild(reel);
      wrap.appendChild(slot);
      parent.appendChild(wrap);

      let index = initial;
      let digit = initial;

      function apply(immediate) {
        const y = `calc(${-index} * var(--tc-h))`;
        if (immediate || reduceMotion) {
          reel.style.transition = "none";
          reel.style.transform = `translateY(${y})`;
          void reel.offsetHeight;
          if (!reduceMotion) reel.style.transition = "";
          return;
        }
        reel.style.transform = `translateY(${y})`;
      }

      function normalize() {
        if (index < 10) return;
        index = index % 10;
        apply(true);
      }

      reel.addEventListener("transitionend", (event) => {
        if (event.propertyName !== "transform") return;
        normalize();
      });

      apply(true);

      return {
        set(next, immediate) {
          const target = ((next % 10) + 10) % 10;
          field.src = fieldSrc(target);
          if (target === digit && index < 10 && !immediate) return;
          digit = target;
          if (immediate || reduceMotion) {
            index = target;
            apply(true);
            return;
          }
          let delta = target - (index % 10);
          if (delta <= 0) delta += 10;
          index += delta;
          apply(false);
        },
      };
    }

    function formatElapsed(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return {
        h: String(hours).padStart(2, "0"),
        m: String(minutes).padStart(2, "0"),
        s: String(seconds).padStart(2, "0"),
      };
    }

    function applyDigits(slotList, value) {
      value.split("").forEach((char, i) => {
        slotList[i].set(Number(char), false);
      });
    }

    function ensureHourSlots(count) {
      while (hourSlots.length < count) {
        const slot = createSlot(hoursRoot, 0);
        hourSlots.unshift(slot);
        hoursRoot.insertBefore(hoursRoot.lastElementChild, hoursRoot.firstElementChild);
      }
    }

    hourSlots.push(createSlot(hoursRoot, 0), createSlot(hoursRoot, 0));
    minuteSlots.push(createSlot(minutesRoot, 0), createSlot(minutesRoot, 0));
    secondSlots.push(createSlot(secondsRoot, 0), createSlot(secondsRoot, 0));

    let lastStamp = "";

    function tick() {
      const totalSeconds = Math.floor((performance.now() - startTime) / 1000);
      const parts = formatElapsed(totalSeconds);
      const stamp = `${parts.h}:${parts.m}:${parts.s}`;
      if (stamp === lastStamp) return;
      lastStamp = stamp;
      ensureHourSlots(parts.h.length);
      applyDigits(hourSlots, parts.h);
      applyDigits(minuteSlots, parts.m);
      applyDigits(secondSlots, parts.s);
    }

    tick();
    window.setInterval(tick, 100);
  }

  function formatFocusDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value;
    return `${pick("weekday")}/${pick("month")}/${pick("day")}/${pick("year")}`;
  }

  function weatherPhrase(code) {
    const n = Number(code);
    if (n === 0) return "clear";
    if (n === 1) return "mainly clear";
    if (n === 2) return "partly cloudy";
    if (n === 3) return "overcast";
    if (n === 45 || n === 48) return "fog";
    if (n === 51 || n === 53 || n === 55) return "drizzle";
    if (n === 56 || n === 57) return "freezing drizzle";
    if (n === 61 || n === 63 || n === 65) return "rain";
    if (n === 66 || n === 67) return "freezing rain";
    if (n === 71 || n === 73 || n === 75 || n === 77) return "snow";
    if (n === 80 || n === 81 || n === 82) return "a shower";
    if (n === 85 || n === 86) return "snow showers";
    if (n === 95 || n === 96 || n === 99) return "a thunderstorm";
    return "changing";
  }

  function seoulParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const pick = (type) => Number(parts.find((part) => part.type === type)?.value);
    return {
      year: pick("year"),
      month: pick("month"),
      day: pick("day"),
      hour: pick("hour"),
    };
  }

  function seoulDayKey(now = new Date()) {
    const seoul = seoulParts(now);
    const pad = (n) => String(n).padStart(2, "0");
    return `${seoul.year}-${pad(seoul.month)}-${pad(seoul.day)}`;
  }

  function nextSeoulMidnight(now = new Date()) {
    const seoul = seoulParts(now);
    return Date.UTC(seoul.year, seoul.month - 1, seoul.day, 15, 0, 0);
  }

  function nextTenAmSeoul(now = new Date()) {
    const seoul = seoulParts(now);
    let year = seoul.year;
    let month = seoul.month;
    let day = seoul.day;
    if (seoul.hour >= 10) {
      const next = new Date(Date.UTC(year, month - 1, day + 1));
      year = next.getUTCFullYear();
      month = next.getUTCMonth() + 1;
      day = next.getUTCDate();
    }
    return Date.UTC(year, month - 1, day, 1, 0, 0);
  }

  function scheduleFocusMetaRefresh() {
    const now = Date.now();
    const delay = Math.max(
      1000,
      Math.min(nextSeoulMidnight(), nextTenAmSeoul()) - now
    );
    window.setTimeout(() => {
      refreshFocusMeta();
      scheduleFocusMetaRefresh();
    }, delay);
  }

  async function refreshFocusMeta() {
    const dateEl = document.getElementById("focus-date");
    const weatherEl = document.getElementById("focus-weather");
    const dayKey = seoulDayKey();
    if (dateEl) dateEl.textContent = formatFocusDate();

    const cacheKey = "focus-meta-seoul-10am";
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.day === dayKey && cached?.phrase) {
        if (weatherEl) weatherEl.textContent = `Today Weather: ${cached.phrase}`;
        return;
      }
    } catch {
      /* ignore bad cache */
    }

    try {
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=weather_code&daily=weather_code&timezone=Asia/Seoul&forecast_days=1";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const code =
        data?.current?.weather_code ??
        data?.daily?.weather_code?.[0];
      const phrase = weatherPhrase(code);
      if (weatherEl) weatherEl.textContent = `Today Weather: ${phrase}`;
      localStorage.setItem(cacheKey, JSON.stringify({ day: dayKey, phrase }));
    } catch {
      /* keep fallback dash */
    }
  }

  refreshFocusMeta();
  scheduleFocusMetaRefresh();
})();
