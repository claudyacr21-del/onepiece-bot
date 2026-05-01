const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 900;
const HEIGHT = 980;
const ROW_HEIGHT = 94;
const ROW_GAP = 10;
const START_Y = 210;
const LEFT = 42;
const RIGHT = WIDTH - 42;

const imageCache = new Map();

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function fetchBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function loadRemoteImage(url) {
  if (!url) return null;

  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  try {
    const buffer = await fetchBuffer(url);
    const image = await loadImage(buffer);
    imageCache.set(url, image);
    return image;
  } catch (_) {
    imageCache.set(url, null);
    return null;
  }
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#35113F");
  gradient.addColorStop(1, "#200826");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 18; i++) {
    roundRect(ctx, 16 + i * 48, 18 + (i % 4) * 8, 28, 6, 3);
    ctx.fill();
  }
}

async function drawAvatar(ctx, avatarUrl) {
  const x = WIDTH - 140;
  const y = 42;
  const size = 84;

  roundRect(ctx, x, y, size, size, 16);
  ctx.save();
  ctx.clip();

  const avatar = await loadRemoteImage(avatarUrl);
  if (avatar) {
    ctx.drawImage(avatar, x, y, size, size);
  } else {
    ctx.fillStyle = "#2f2f2f";
    ctx.fillRect(x, y, size, size);
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, 16);
  ctx.stroke();
}

function drawHeader(ctx, data) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Sans";
  ctx.fillText(`${data.username}'s Fragment Storage!`, LEFT, 70);

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.font = "20px Sans";
  ctx.fillText("Fragments are used to upgrade cards and boost cards.", LEFT, 106);

  if (data.searchQuery) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Sans";
    ctx.fillText("Search:", LEFT, 150);

    ctx.fillStyle = "#f7d77a";
    ctx.font = "bold 18px Sans";
    ctx.fillText(data.searchQuery, LEFT + 84, 150);
  }

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "18px Sans";
  ctx.fillText(`Fragment storage capacity: ${data.storageText}`, LEFT, HEIGHT - 76);
  ctx.fillText(`Visibility Mode: ${data.visibilityText}`, LEFT, HEIGHT - 48);

  ctx.textAlign = "right";
  ctx.fillText(`Page ${data.page}/${data.totalPages} • ${data.totalEntries} fragment entries`, RIGHT, HEIGHT - 48);
  ctx.textAlign = "left";
}

function drawDivider(ctx, y) {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT, y);
  ctx.lineTo(RIGHT, y);
  ctx.stroke();
}

function drawPlaceholderThumb(ctx, x, y, size, rarity) {
  const colors = {
    C: "#95a5a6",
    B: "#27ae60",
    A: "#3498db",
    S: "#9b59b6",
    SS: "#e67e22",
    UR: "#f1c40f",
  };

  ctx.fillStyle = colors[String(rarity || "C").toUpperCase()] || "#7f8c8d";
  roundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.font = "bold 22px Sans";
  ctx.textAlign = "center";
  ctx.fillText(String(rarity || "C").toUpperCase(), x + size / 2, y + size / 2 + 8);
  ctx.textAlign = "left";
}

async function drawFragmentRow(ctx, fragment, index) {
  const y = START_Y + index * (ROW_HEIGHT + ROW_GAP);
  const rowX = LEFT;
  const rowW = RIGHT - LEFT;
  const thumbSize = 64;
  const thumbX = rowX + 16;
  const thumbY = y + 15;

  ctx.fillStyle = "rgba(255,255,255,0.045)";
  roundRect(ctx, rowX, y, rowW, ROW_HEIGHT, 16);
  ctx.fill();

  const image = await loadRemoteImage(fragment.image);

  if (image) {
    ctx.save();
    roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 10);
    ctx.clip();
    ctx.drawImage(image, thumbX, thumbY, thumbSize, thumbSize);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 10);
    ctx.stroke();
  } else {
    drawPlaceholderThumb(ctx, thumbX, thumbY, thumbSize, fragment.rarity);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Sans";

  const nameText = String(fragment.name || "Unknown Fragment");
  ctx.fillText(nameText, thumbX + thumbSize + 18, y + 39);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "18px Sans";
  ctx.fillText(
    `Amount: ${Number(fragment.amount || 0).toLocaleString("en-US")} • Rarity: ${String(fragment.rarity || "C").toUpperCase()}`,
    thumbX + thumbSize + 18,
    y + 68
  );

  drawDivider(ctx, y + ROW_HEIGHT + 5);
}

function drawEmptyState(ctx) {
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "bold 28px Sans";
  ctx.textAlign = "center";
  ctx.fillText("No fragments found.", WIDTH / 2, HEIGHT / 2 - 10);

  ctx.font = "20px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("Try another search keyword.", WIDTH / 2, HEIGHT / 2 + 28);
  ctx.textAlign = "left";
}

async function renderFinvPage(data) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx);
  drawHeader(ctx, data);
  await drawAvatar(ctx, data.avatarUrl);

  if (!Array.isArray(data.fragments) || !data.fragments.length) {
    drawEmptyState(ctx);
  } else {
    for (let i = 0; i < data.fragments.length; i++) {
      await drawFragmentRow(ctx, data.fragments[i], i);
    }
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  renderFinvPage,
};