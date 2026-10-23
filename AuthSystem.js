/**
 * ProsperMC - Auth & Supabase Client Helper
 */

const SUPABASE_URL = "https://pnkwqqapyoaxdcpubpwb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBua3dxcWFweW9heGRjcHVicHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNDA3MzcsImV4cCI6MjEwNjcxNjczN30.HiM5-OSJUoJ_3AXSkfEmhgWVs8lU5lNNj4FbIai1Bkc";

// Initialize client if supabase global is available
let client = null;
if (typeof supabase !== "undefined" && supabase.createClient) {
    client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.client = client;
}

const AuthSystem = {
    client,
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,

    getClient() {
        if (!client && typeof supabase !== "undefined" && supabase.createClient) {
            client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.client = client;
            this.client = client;
        }
        return client;
    },

    async getUser() {
        const c = this.getClient();
        if (!c) return null;
        const { data: { user } } = await c.auth.getUser();
        return user;
    },

    async getProfile(userId) {
        const c = this.getClient();
        if (!c || !userId) return null;
        const { data: profile } = await c
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
        return profile;
    },

    async isAdmin() {
        const user = await this.getUser();
        if (!user) return false;
        if (user.user_metadata && user.user_metadata.role === "admin") return true;
        const profile = await this.getProfile(user.id);
        return profile && profile.role === "admin";
    },

    async applyAdminVisibility(uploadTabId = "uploadTab") {
        const tab = document.getElementById(uploadTabId);
        if (!tab) return;
        const admin = await this.isAdmin();
        tab.style.display = admin ? "" : "none";
    },

    async login(email, password) {
        const c = this.getClient();
        if (!c) throw new Error("Supabase client is not loaded.");
        return await c.auth.signInWithPassword({ email, password });
    },

    async logout(redirectTo = "index.html") {
        const c = this.getClient();
        if (c) await c.auth.signOut();
        if (redirectTo) window.location.href = redirectTo;
    }
};

window.AuthSystem = AuthSystem;
