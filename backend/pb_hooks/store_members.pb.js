/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  const storeId = e.record.get("store");
  const store = $app.findRecordById("stores", storeId);

  let settings = store.get("settings");
  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch {
      settings = {};
    }
  }
  if (!settings || typeof settings !== "object") {
    settings = {};
  }
  if (settings.member_invite_mode !== "email") {
    throw new BadRequestError("Store is not in email invite mode");
  }

  const email = (e.record.get("email") || "").toLowerCase().trim();
  e.record.set("email", email);

  if (!e.record.get("token")) {
    e.record.set("token", $security.randomString(48));
  }

  if (!e.record.get("status")) {
    e.record.set("status", "pending");
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  e.record.set("expires", expires.toISOString().slice(0, 10) + " 00:00:00.000Z");

  if (e.auth) {
    e.record.set("invited_by", e.auth.id);
  }

  const pending = $app.findRecordsByFilter(
    "store_invites",
    'store = {:storeId} && email = {:email} && status = "pending"',
    "",
    1,
    0,
    { storeId: storeId, email: email }
  );
  if (pending.length > 0) {
    throw new BadRequestError("A pending invite already exists for this email");
  }

  e.next();
}, "store_invites");

onRecordAfterCreateSuccess((e) => {
  const token = e.record.get("token");
  const email = e.record.get("email");

  let appUrl = "http://localhost:3000";
  try {
    appUrl = ($os.getenv("APP_URL") || appUrl).replace(/\/$/, "");
  } catch {
    // use default
  }

  const inviteLink = appUrl + "/invite/" + token;

  try {
    const meta = $app.settings().meta;
    if (meta.senderAddress) {
      const message = new MailerMessage({
        from: {
          address: meta.senderAddress,
          name: meta.senderName || "zKCNT POS",
        },
        to: [{ address: email }],
        subject: "Team invite",
        html:
          '<p>You have been invited to join a store on zKCNT POS.</p><p><a href="' +
          inviteLink +
          '">Accept invitation</a></p><p>Or copy this link: ' +
          inviteLink +
          "</p>",
      });
      $app.newMailClient().send(message);
    }
  } catch (err) {
    console.warn("Failed to send invite email:", err);
  }

  e.next();
}, "store_invites");

routerAdd(
  "POST",
  "/api/members/add-by-email",
  (e) => {
    const auth = e.auth;
    if (!auth) {
      throw new UnauthorizedError("Authentication required");
    }

    const body = new DynamicModel({
      storeId: "",
      email: "",
      role: "",
    });
    e.bindBody(body);

    const storeId = body.storeId;
    const email = (body.email || "").toLowerCase().trim();
    const role = body.role;

    if (!storeId || !email || !role) {
      throw new BadRequestError("storeId, email, and role are required");
    }

    if (role !== "manager" && role !== "cashier") {
      throw new BadRequestError("Invalid role");
    }

    const authId = auth.id || auth.get("id");

    const managers = $app.findRecordsByFilter(
      "store_members",
      'store = {:storeId} && user = {:userId} && (role = "owner" || role = "manager")',
      "",
      1,
      0,
      { storeId: storeId, userId: authId }
    );
    if (managers.length === 0) {
      throw new ForbiddenError("Only store owners or managers can add members");
    }

    const store = $app.findRecordById("stores", storeId);
    let settings = store.get("settings");
    if (typeof settings === "string") {
      try {
        settings = JSON.parse(settings);
      } catch {
        settings = {};
      }
    }
    if (!settings || typeof settings !== "object") {
      settings = {};
    }
    if (settings.member_invite_mode === "email") {
      throw new BadRequestError("Store is not in direct add mode");
    }

    let user = null;
    try {
      user = $app.findAuthRecordByEmail("users", email);
    } catch {
      user = null;
    }
    if (!user) {
      throw new BadRequestError("User not registered");
    }

    const existing = $app.findRecordsByFilter(
      "store_members",
      'store = {:storeId} && user = {:userId}',
      "",
      1,
      0,
      { storeId: storeId, userId: user.id }
    );
    if (existing.length > 0) {
      throw new BadRequestError("User is already a member of this store");
    }

    const collection = $app.findCollectionByNameOrId("store_members");
    const member = new Record(collection);
    member.set("store", storeId);
    member.set("user", user.id);
    member.set("role", role);
    member.set("is_active", true);
    $app.save(member);

    return e.json(200, {
      member: {
        id: member.id,
        store: member.get("store"),
        user: member.get("user"),
        role: member.get("role"),
        is_active: member.get("is_active"),
      },
    });
  },
  $apis.requireAuth()
);

routerAdd("GET", "/api/invites/{token}", (e) => {
  const token = e.request.pathValue("token");

  const invites = $app.findRecordsByFilter(
    "store_invites",
    "token = {:token}",
    "",
    1,
    0,
    { token: token }
  );
  if (invites.length === 0) {
    throw new NotFoundError("Invite not found");
  }

  const invite = invites[0];

  if (invite.get("status") === "pending") {
    const expires = invite.get("expires");
    if (expires && new Date(expires) < new Date()) {
      invite.set("status", "expired");
      $app.save(invite);
    }
  }

  const store = $app.findRecordById("stores", invite.get("store"));

  return e.json(200, {
    storeName: store.get("name"),
    email: invite.get("email"),
    role: invite.get("role"),
    status: invite.get("status"),
    expires: invite.get("expires"),
  });
});

routerAdd(
  "POST",
  "/api/invites/accept",
  (e) => {
    const auth = e.auth;
    if (!auth) {
      throw new UnauthorizedError("Authentication required");
    }

    const body = new DynamicModel({
      token: "",
    });
    e.bindBody(body);

    const token = body.token;
    if (!token) {
      throw new BadRequestError("token is required");
    }

    const invites = $app.findRecordsByFilter(
      "store_invites",
      "token = {:token}",
      "",
      1,
      0,
      { token: token }
    );
    if (invites.length === 0) {
      throw new NotFoundError("Invite not found");
    }

    const invite = invites[0];

    if (invite.get("status") !== "pending") {
      throw new BadRequestError("Invite is no longer valid");
    }

    const expires = invite.get("expires");
    if (expires && new Date(expires) < new Date()) {
      invite.set("status", "expired");
      $app.save(invite);
      throw new BadRequestError("Invite has expired");
    }

    const inviteEmail = (invite.get("email") || "").toLowerCase().trim();
    const authEmail = String(auth.email || auth.get("email") || "")
      .toLowerCase()
      .trim();

    if (inviteEmail !== authEmail) {
      throw new ForbiddenError("Signed-in email does not match the invite");
    }

    const storeId = invite.get("store");
    const role = invite.get("role");
    const authId = auth.id || auth.get("id");

    const existing = $app.findRecordsByFilter(
      "store_members",
      'store = {:storeId} && user = {:userId}',
      "",
      1,
      0,
      { storeId: storeId, userId: authId }
    );
    if (existing.length > 0) {
      throw new BadRequestError("User is already a member of this store");
    }

    const collection = $app.findCollectionByNameOrId("store_members");
    const member = new Record(collection);
    member.set("store", storeId);
    member.set("user", authId);
    member.set("role", role);
    member.set("is_active", true);
    $app.save(member);

    invite.set("status", "accepted");
    $app.save(invite);

    return e.json(200, { success: true, storeId: storeId });
  },
  $apis.requireAuth()
);
