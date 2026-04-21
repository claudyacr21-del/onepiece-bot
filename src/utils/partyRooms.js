const activePartyRooms = new Map();

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function now() {
  return Date.now();
}

function makeRoomId(prefix = "room") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupeIds(list = []) {
  const seen = new Set();
  const out = [];

  for (const item of list) {
    const key = String(item || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

function sanitizeCard(card) {
  return {
    instanceId: String(card?.instanceId || ""),
    code: String(card?.code || ""),
    name: String(card?.displayName || card?.name || ""),
    atk: Number(card?.atk || 0),
    hp: Number(card?.hp || 0),
    speed: Number(card?.speed || 0),
    currentPower: Number(card?.currentPower || 0),
    currentTier: String(card?.currentTier || card?.rarity || ""),
    evolutionStage: Number(card?.evolutionStage || 1),
    image: String(card?.image || ""),
    cardRole: String(card?.cardRole || "battle"),
  };
}

function getRoom(hostId) {
  return activePartyRooms.get(String(hostId)) || null;
}

function getRoomById(roomId) {
  for (const room of activePartyRooms.values()) {
    if (String(room.roomId) === String(roomId)) {
      return room;
    }
  }
  return null;
}

function hasActiveRoom(hostId) {
  const room = getRoom(hostId);
  return !!room && ["waiting", "active"].includes(String(room.status || ""));
}

function createBaseRoom(data = {}) {
  const hostId = String(data.hostId || "").trim();
  if (!hostId) {
    throw new Error("hostId is required.");
  }

  if (hasActiveRoom(hostId)) {
    throw new Error("Host already has an active room.");
  }

  const room = {
    roomId: makeRoomId(data.mode || "room"),
    mode: String(data.mode || "raid"),
    hostId,
    hostName: String(data.hostName || "Host"),
    guildId: String(data.guildId || ""),
    channelId: String(data.channelId || ""),
    bossCode: String(data.bossCode || ""),
    bossName: String(data.bossName || "Boss"),
    bossImage: String(data.bossImage || ""),
    islandCode: data.islandCode ? String(data.islandCode) : null,
    bossPhase: Number.isFinite(Number(data.bossPhase)) ? Number(data.bossPhase) : null,
    maxParticipants: Number(data.maxParticipants || 10),
    cardsPerUser: Number(data.cardsPerUser || 1),
    uniqueCardCodesOnly: data.uniqueCardCodesOnly !== false,
    ticketConsumed: Boolean(data.ticketConsumed),
    status: "waiting",
    whitelist: dedupeIds(data.whitelist || []),
    participants: [],
    createdAt: now(),
    startedAt: null,
    finishedAt: null,
    result: null,
  };

  activePartyRooms.set(hostId, room);
  return room;
}

function createRaidRoom(data = {}) {
  return createBaseRoom({
    ...data,
    mode: "raid",
    maxParticipants: 10,
    cardsPerUser: 1,
    uniqueCardCodesOnly: true,
    ticketConsumed: Boolean(data.ticketConsumed),
  });
}

function createQuestPartyRoom(data = {}) {
  return createBaseRoom({
    ...data,
    mode: "quest_party",
    maxParticipants: 4,
    cardsPerUser: 3,
    uniqueCardCodesOnly: true,
    ticketConsumed: false,
  });
}

function deleteRoom(hostId) {
  return activePartyRooms.delete(String(hostId));
}

function listRooms() {
  return [...activePartyRooms.values()].map((room) => clone(room));
}

function addWhitelistUser(hostId, targetUserId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  const targetId = String(targetUserId || "").trim();
  if (!targetId) throw new Error("targetUserId is required.");
  if (room.status !== "waiting") throw new Error("Room is no longer accepting changes.");

  room.whitelist = dedupeIds([...room.whitelist, targetId]);
  return clone(room);
}

function removeWhitelistUser(hostId, targetUserId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  const targetId = String(targetUserId || "").trim();
  if (!targetId) throw new Error("targetUserId is required.");
  if (room.status !== "waiting") throw new Error("Room is no longer accepting changes.");

  room.whitelist = room.whitelist.filter((id) => id !== targetId);
  room.participants = room.participants.filter((p) => p.userId !== targetId);
  return clone(room);
}

function clearWhitelist(hostId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");
  if (room.status !== "waiting") throw new Error("Room is no longer accepting changes.");

  room.whitelist = [];
  room.participants = room.participants.filter((p) => p.userId === room.hostId);
  return clone(room);
}

function getParticipant(room, userId) {
  return (
    ensureArray(room?.participants).find(
      (p) => String(p.userId) === String(userId)
    ) || null
  );
}

function getUsedCardCodes(room, excludeUserId = null) {
  const used = new Set();

  for (const participant of ensureArray(room?.participants)) {
    if (excludeUserId && String(participant.userId) === String(excludeUserId)) {
      continue;
    }

    for (const card of ensureArray(participant.selectedCards)) {
      const code = normalize(card?.code);
      if (code) used.add(code);
    }
  }

  return used;
}

function canUserJoinRoom(room, userId) {
  if (!room) {
    return { ok: false, reason: "Room not found." };
  }

  if (String(room.status) !== "waiting") {
    return { ok: false, reason: "Room is not accepting participants." };
  }

  const uid = String(userId || "").trim();
  if (!uid) {
    return { ok: false, reason: "Invalid user." };
  }

  const isHost = uid === String(room.hostId);
  const isInvited = room.whitelist.includes(uid);

  if (!isHost && !isInvited) {
    return { ok: false, reason: "You are not in the raid team list." };
  }

  const existing = getParticipant(room, uid);
  if (existing) {
    return { ok: false, reason: "You already joined this room." };
  }

  if (ensureArray(room.participants).length >= Number(room.maxParticipants || 0)) {
    return { ok: false, reason: "Room is already full." };
  }

  return { ok: true };
}

function validateSelectedCards(room, selectedCards, opts = {}) {
  if (!room) {
    return { ok: false, reason: "Room not found." };
  }

  const cards = ensureArray(selectedCards).map(sanitizeCard);
  const expectedCount = Number(room.cardsPerUser || 1);

  if (cards.length !== expectedCount) {
    return {
      ok: false,
      reason: `You must select exactly ${expectedCount} battle card(s).`,
    };
  }

  for (const card of cards) {
    if (!card.instanceId || !card.code) {
      return { ok: false, reason: "Selected card is invalid." };
    }

    if (normalize(card.cardRole) !== "battle") {
      return { ok: false, reason: "Only battle cards can join this room." };
    }
  }

  const localCodes = cards.map((c) => normalize(c.code));
  const localInstances = cards.map((c) => String(c.instanceId));

  if (new Set(localCodes).size !== localCodes.length) {
    return {
      ok: false,
      reason: "Duplicate character in your own selection is not allowed.",
    };
  }

  if (new Set(localInstances).size !== localInstances.length) {
    return {
      ok: false,
      reason: "Duplicate card instance in your own selection is not allowed.",
    };
  }

  if (room.uniqueCardCodesOnly) {
    const usedCodes = getUsedCardCodes(room, opts.excludeUserId || null);

    for (const code of localCodes) {
      if (usedCodes.has(code)) {
        return {
          ok: false,
          reason: `Character already used in this room: ${code}`,
        };
      }
    }
  }

  return { ok: true, cards };
}

function addParticipant(hostId, participant) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  const joinCheck = canUserJoinRoom(room, participant?.userId);
  if (!joinCheck.ok) {
    throw new Error(joinCheck.reason);
  }

  const validation = validateSelectedCards(room, participant?.selectedCards || []);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  room.participants.push({
    userId: String(participant.userId),
    username: String(participant.username || `User ${participant.userId}`),
    selectedCards: validation.cards,
    joinedAt: now(),
  });

  return clone(room);
}

function updateParticipant(hostId, participant) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");
  if (String(room.status) !== "waiting") throw new Error("Room is no longer accepting changes.");

  const uid = String(participant?.userId || "").trim();
  const idx = room.participants.findIndex((p) => String(p.userId) === uid);

  if (idx === -1) {
    throw new Error("Participant not found.");
  }

  const validation = validateSelectedCards(room, participant?.selectedCards || [], {
    excludeUserId: uid,
  });
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  room.participants[idx] = {
    ...room.participants[idx],
    username: String(participant.username || room.participants[idx].username || `User ${uid}`),
    selectedCards: validation.cards,
  };

  return clone(room);
}

function removeParticipant(hostId, userId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");
  if (String(room.status) !== "waiting") throw new Error("Room is no longer accepting changes.");

  const uid = String(userId || "").trim();
  if (!uid) throw new Error("userId is required.");
  if (uid === String(room.hostId)) {
    throw new Error("Host cannot be removed from the room.");
  }

  room.participants = room.participants.filter((p) => String(p.userId) !== uid);
  return clone(room);
}

function getMissingUsers(hostId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  const joined = new Set(
    ensureArray(room.participants).map((p) => String(p.userId))
  );

  return room.whitelist.filter((id) => !joined.has(String(id)));
}

function canStartRoom(room) {
  if (!room) {
    return { ok: false, reason: "Room not found." };
  }

  if (String(room.status) !== "waiting") {
    return { ok: false, reason: "Room cannot be started now." };
  }

  const count = ensureArray(room.participants).length;
  const minParticipants = room.mode === "quest_party" ? 2 : 1;

  if (count < minParticipants) {
    return {
      ok: false,
      reason: `Need at least ${minParticipants} participant(s) to start.`,
    };
  }

  for (const participant of ensureArray(room.participants)) {
    const cards = ensureArray(participant.selectedCards);
    if (cards.length !== Number(room.cardsPerUser || 1)) {
      return {
        ok: false,
        reason: `${participant.username} has not submitted the correct number of cards.`,
      };
    }
  }

  return { ok: true };
}

function startRoom(hostId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  const check = canStartRoom(room);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  room.status = "active";
  room.startedAt = now();
  return clone(room);
}

function finishRoom(hostId, result = "win") {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  room.status = "finished";
  room.result = String(result || "finished");
  room.finishedAt = now();

  return clone(room);
}

function cancelRoom(hostId) {
  const room = getRoom(hostId);
  if (!room) throw new Error("Room not found.");

  room.status = "cancelled";
  room.finishedAt = now();
  return clone(room);
}

module.exports = {
  getRoom,
  getRoomById,
  hasActiveRoom,
  createRaidRoom,
  createQuestPartyRoom,
  deleteRoom,
  listRooms,
  addWhitelistUser,
  removeWhitelistUser,
  clearWhitelist,
  getParticipant,
  getUsedCardCodes,
  canUserJoinRoom,
  validateSelectedCards,
  addParticipant,
  updateParticipant,
  removeParticipant,
  getMissingUsers,
  canStartRoom,
  startRoom,
  finishRoom,
  cancelRoom,
};