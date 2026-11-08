/* Shared toggleable account sidebar. Include this file on each site page after Supabase's UMD script. */
(() => {
    const script = document.currentScript;
    const basePath = new URL(".", script.src).href;
    const supabaseUrl = "https://pnkwqqapyoaxdcpubpwb.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwbnB3cWFweW9heGRjcHVicHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNDA3MzcsImV4cCI6MjEwNjcxNjczN30.HiM5-OSJUoJ_3AXSkfEmhgWVs8lU5lNNj4FbIai1Bkc";
    const client = window.supabase?.createClient(supabaseUrl, supabaseKey);
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[char]);

    const style = document.createElement("style");
    style.textContent = `
        .prosper-account-toggle{position:fixed;top:18px;left:18px;z-index:1200;width:46px;height:46px;border:1px solid rgba(255,77,77,.65);border-radius:12px;background:#111;color:#ff7070;font-size:23px;cursor:pointer;box-shadow:0 4px 18px #0008}
        .prosper-account-toggle:hover{background:#251010;color:#fff}
        .prosper-account-overlay{position:fixed;inset:0;z-index:1198;background:#0009;opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s}
        .prosper-account-overlay.open{opacity:1;visibility:visible}
        .prosper-account-sidebar{position:fixed;z-index:1199;inset:0 auto 0 0;width:min(330px,88vw);padding:76px 20px 24px;background:#101010;color:#eee;border-right:1px solid #612323;box-shadow:8px 0 30px #0009;transform:translateX(-105%);transition:transform .28s ease;overflow-y:auto;text-align:left}
        .prosper-account-sidebar.open{transform:translateX(0)}
        .prosper-account-sidebar h2{color:#ff6969;margin:0 0 18px;font-size:1.35rem}
        .prosper-account-sidebar .pa-nav{display:grid;gap:7px;margin-bottom:20px}
        .prosper-account-sidebar a,.prosper-account-sidebar button{font:inherit}
        .prosper-account-sidebar .pa-link,.prosper-account-sidebar .pa-action{display:block;width:100%;padding:10px 12px;border:1px solid #333;border-radius:8px;background:#181818;color:#ddd;text-decoration:none;text-align:left;cursor:pointer}
        .prosper-account-sidebar .pa-link:hover,.prosper-account-sidebar .pa-action:hover{border-color:#ff5555;color:#fff;background:#241313}
        .prosper-account-sidebar .pa-account{padding:14px 0;border-top:1px solid #292929}
        .prosper-account-sidebar .pa-account p{margin:5px 0;overflow-wrap:anywhere;font-size:.88rem;color:#bbb}
        .prosper-account-sidebar .pa-avatar{display:block;width:72px;height:72px;object-fit:cover;margin:8px auto;border:2px solid #ff6464;border-radius:10px}
        .prosper-account-sidebar .pa-settings{display:none;padding-top:12px}
        .prosper-account-sidebar .pa-settings.open{display:block}
        .prosper-account-sidebar label{display:block;margin:10px 0 4px;color:#ccc;font-size:.9rem}
        .prosper-account-sidebar input{width:100%;padding:10px;border:1px solid #444;border-radius:7px;background:#1a1a1a;color:#fff}
        .prosper-account-sidebar .pa-status{min-height:1.4em;font-size:.85rem;color:#aaa}
        .prosper-account-sidebar .pa-logout{margin-top:16px;border-color:#873333;color:#ff8a8a}
        @media(prefers-reduced-motion:reduce){.prosper-account-sidebar,.prosper-account-overlay{transition:none}}
    `;
    document.head.appendChild(style);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "prosper-account-toggle";
    toggle.setAttribute("aria-label", "Open account sidebar");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "☰";

    const overlay = document.createElement("div");
    overlay.className = "prosper-account-overlay";

    const sidebar = document.createElement("aside");
    sidebar.className = "prosper-account-sidebar";
    sidebar.setAttribute("aria-label", "Prosper account menu");
    sidebar.innerHTML = `
        <h2 class="pixel">⛏️ Prosper</h2>
        <nav class="pa-nav" aria-label="Account navigation">
            <a class="pa-link" href="${basePath}index.html">🏠 Home</a>
            <a class="pa-link" href="${basePath}modpacks.html">📦 Modpacks</a>
            <a class="pa-link" href="${basePath}schematics.html">🧱 Schematics</a>
            <a class="pa-link" href="${basePath}scanner.html">🔎 Scanner</a>
            <a class="pa-link" href="${basePath}videos.html">📺 Videos</a>
        </nav>
        <section class="pa-account" aria-label="Account information">
            <h3>Account</h3>
            <img class="pa-avatar" alt="Profile picture" hidden>
            <p>Email: <span class="pa-email">Sign in to see account details</span></p>
            <p>Username: <span class="pa-username">—</span></p>
        </section>
        <button type="button" class="pa-action pa-settings-toggle" aria-expanded="false">⚙️ Settings</button>
        <section class="pa-settings" aria-label="Account settings">
            <label for="pa-mc-uuid">Minecraft UUID</label>
            <input id="pa-mc-uuid" autocomplete="off" placeholder="32-character UUID">
            <button type="button" class="pa-action pa-save" style="margin-top:10px">Save profile picture</button>
            <p class="pa-status" role="status" aria-live="polite"></p>
        </section>
        <a class="pa-link pa-login" href="${basePath}login.html">Log in</a>
        <button type="button" class="pa-action pa-logout" hidden>Log out</button>
    `;

    document.body.append(toggle, overlay, sidebar);
    const settingsToggle = sidebar.querySelector(".pa-settings-toggle");
    const settings = sidebar.querySelector(".pa-settings");
    const status = sidebar.querySelector(".pa-status");
    const uuidInput = sidebar.querySelector("#pa-mc-uuid");
    const avatar = sidebar.querySelector(".pa-avatar");
    const loginLink = sidebar.querySelector(".pa-login");
    const logoutButton = sidebar.querySelector(".pa-logout");

    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", () => {
        const opening = !sidebar.classList.contains("open");
        sidebar.classList.toggle("open", opening);
        overlay.classList.toggle("open", opening);
        toggle.setAttribute("aria-expanded", String(opening));
    });
    overlay.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });
    settingsToggle.addEventListener("click", () => {
        const opening = !settings.classList.contains("open");
        settings.classList.toggle("open", opening);
        settingsToggle.setAttribute("aria-expanded", String(opening));
    });
    uuidInput.addEventListener("input", () => {
        const uuid = uuidInput.value.trim().replace(/-/g, "");
        if (/^[0-9a-f]{32}$/i.test(uuid)) {
            avatar.src = `https://crafatar.com/avatars/${encodeURIComponent(uuid)}?size=128&overlay`;
            avatar.hidden = false;
        }
    });

    if (!client) {
        status.textContent = "Account features are unavailable right now.";
        return;
    }

    (async () => {
        const { data: { session } } = await client.auth.getSession();
        if (!session) return;
        loginLink.hidden = true;
        logoutButton.hidden = false;
        sidebar.querySelector(".pa-email").textContent = session.user.email || "—";

        const { data: profile } = await client.from("profiles")
            .select("username, pfp_url, mc_uuid")
            .eq("id", session.user.id)
            .maybeSingle();
        sidebar.querySelector(".pa-username").textContent = profile?.username || "—";
        if (profile?.mc_uuid) uuidInput.value = profile.mc_uuid;
        const pfpUrl = profile?.pfp_url || (profile?.mc_uuid
            ? `https://crafatar.com/avatars/${encodeURIComponent(profile.mc_uuid)}?size=128&overlay`
            : "");
        if (pfpUrl) { avatar.src = pfpUrl; avatar.hidden = false; }
    })().catch(error => console.warn("Could not load sidebar account details:", error));

    sidebar.querySelector(".pa-save").addEventListener("click", async () => {
        status.textContent = "";
        const uuid = uuidInput.value.trim().replace(/-/g, "");
        if (!/^[0-9a-f]{32}$/i.test(uuid)) {
            status.textContent = "Enter a valid 32-character Minecraft UUID.";
            return;
        }
        const { data: { session } } = await client.auth.getSession();
        if (!session) { status.textContent = "Please log in to save settings."; return; }
        const pfpUrl = `https://crafatar.com/avatars/${encodeURIComponent(uuid)}?size=128&overlay`;
        const { error } = await client.from("profiles")
            .upsert({ id: session.user.id, mc_uuid: uuid, pfp_url: pfpUrl }, { onConflict: "id" });
        if (error) { status.textContent = error.message; return; }
        avatar.src = pfpUrl;
        avatar.hidden = false;
        status.textContent = "Profile picture settings saved.";
    });

    logoutButton.addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) { status.textContent = error.message; return; }
        window.location.href = `${basePath}login.html`;
    });
})();
