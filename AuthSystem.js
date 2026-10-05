<script type="module">
    import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    // ⭐ Your real Supabase project
    const supabase = createClient(
        "https://pnkwqqapyoxadcpubpwb.supabase.co",
        "sb_publishable_FOGjeeE78yPzd0dIz-18XQ_t2J6MMLz"
    );

    const status = document.getElementById("status");
    const loginBtn = document.getElementById("loginBtn");

    loginBtn.onclick = async () => {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!email || !password) {
            status.textContent = "Enter an email and password.";
            status.style.color = "#ff6b6b";
            return;
        }

        status.textContent = "Logging in...";
        status.style.color = "#00ff88";

        // ⭐ Supabase login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            status.textContent = error.message;
            status.style.color = "#ff6b6b";
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            status.textContent = "Unexpected error: no user returned.";
            status.style.color = "#ff6b6b";
            return;
        }

        window.location.href = "/prosper/dashboard.html";
    };
</script>
