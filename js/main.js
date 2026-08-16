(() => {
  const archive = document.getElementById("archive");
  const archiveGrid = document.getElementById("archive-grid");
  const triggers = document.querySelectorAll('[data-action="archive"]');
  const video = document.getElementById("bg-video");
  const sharpVideo = document.getElementById("bg-video-sharp");
  const sharpPortal = document.getElementById("video-sharp-portal");

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

  function ArchiveCard(item) {
    const title = escapeHtml(item.title || "");
    const date = escapeHtml(item.date || "");
    const location = escapeHtml(item.location || "");
    const durationRaw = String(item.duration || "").replace(/^\(|\)$/g, "");
    const duration = escapeHtml(durationRaw ? `(${durationRaw})` : "");
    const src = escapeHtml(resolveArchiveImage(item.image));
    const id = escapeHtml(item.id || "");
    const shape = "public/ui/closed.svg";

    return `
      <article class="archive-card" data-id="${id}" tabindex="0">
        <img class="archive-card-back" src="${shape}" width="390" height="482" alt="" aria-hidden="true" draggable="false" />
        <div class="archive-card-bg" aria-hidden="true"></div>
        <div class="archive-card-fold" aria-hidden="true"></div>
        <h3 class="archive-card-title">${title}</h3>
        <p class="archive-card-duration">${duration}</p>
        <p class="archive-card-date">${date}</p>
        <p class="archive-card-location">${location}</p>
        <div class="archive-card-photo">
          <img src="${src}" alt="${title}" loading="lazy" />
          <div class="archive-card-fallback">NO IMAGE</div>
        </div>
      </article>
    `;
  }

  function renderArchive() {
    const items = Array.isArray(window.archiveItems) ? window.archiveItems : archiveItems;
    archiveGrid.innerHTML = items.map(ArchiveCard).join("");
    archiveGrid.querySelectorAll(".archive-card-photo img").forEach((img) => {
      const frame = img.closest(".archive-card-photo");
      const showFallback = () => frame?.classList.add("is-fallback");
      img.addEventListener("error", showFallback);
      if (img.complete && img.naturalWidth === 0) showFallback();
    });
  }

  function setExpanded(isOpen) {
    triggers.forEach((el) => {
      if (el.hasAttribute("aria-expanded")) {
        el.setAttribute("aria-expanded", String(isOpen));
      }
    });
  }

  function openArchive() {
    archive.hidden = false;
    document.body.classList.add("is-archive-open");
    document.body.classList.add("is-hud-hover");
    requestAnimationFrame(() => {
      archive.classList.add("is-open");
    });
    setExpanded(true);
  }

  function closeArchive() {
    archive.classList.remove("is-open");
    document.body.classList.remove("is-archive-open");
    setExpanded(false);

    const onEnd = (event) => {
      if (event.propertyName !== "opacity") return;
      archive.removeEventListener("transitionend", onEnd);
      if (!archive.classList.contains("is-open")) {
        archive.hidden = true;
      }
    };

    archive.addEventListener("transitionend", onEnd);
  }

  function toggleArchive() {
    if (archive.classList.contains("is-open")) {
      closeArchive();
    } else {
      openArchive();
    }
  }

  triggers.forEach((el) => {
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleArchive();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && archive.classList.contains("is-open")) {
      closeArchive();
    }
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
  const focusTracker = document.getElementById("focus-tracker");
  const focusCoords = document.getElementById("focus-coords");
  const focusCenter = focusTracker?.querySelector(".focus-center");

  const focusH = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--focus-h")
  );
  const focusW = focusH * (177 / 176);

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

  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;
  if (isCenterZone(startY)) {
    setFocusVisible(true);
    moveFocus(startX, startY);
    updateCoordDisplay(true);
  } else {
    setFocusVisible(false);
  }

  renderArchive();
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
    const SRC = (n) => `assets/icons/digits/${n}.svg`;
    const SLOT_H = 19.66;
    const startTime = performance.now();
    const hourSlots = [];
    const minuteSlots = [];
    const secondSlots = [];

    function createSlot(parent, initial) {
      const slot = document.createElement("span");
      slot.className = "timecode-slot";
      const reel = document.createElement("span");
      reel.className = "timecode-reel";
      for (let n = 0; n <= 9; n += 1) {
        const img = document.createElement("img");
        img.src = SRC(n);
        img.width = 38;
        img.height = 66;
        img.alt = "";
        reel.appendChild(img);
      }
      const wrapImg = document.createElement("img");
      wrapImg.src = SRC(0);
      wrapImg.width = 38;
      wrapImg.height = 66;
      wrapImg.alt = "";
      reel.appendChild(wrapImg);
      slot.appendChild(reel);
      parent.appendChild(slot);

      let index = initial;
      let digit = initial;

      function apply(immediate) {
        const y = `${-index * SLOT_H}px`;
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
        if (event.propertyName === "transform") normalize();
      });

      apply(true);

      return {
        set(next, immediate) {
          const target = ((next % 10) + 10) % 10;
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
})();
