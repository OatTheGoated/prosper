<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login – Prosper</title>
    <link rel="stylesheet" href="./style.css?v=21">
</head>

<body>
<div class="site">

    <nav class="navbar">
        <div class="container">
            <h1 class="logo pixel">⛏️ Prosper</h1>
            <ul class="nav-links">
                <li><a href="index.html">Home</a></li>
                <li><a href="modpacks.html">Modpacks</a></li>
                <li><a href="schematics.html">Schematics</a></li>
                <li><a href="videos.html">Videos</a></li>
                <li><a href="dashboard.html">Dashboard</a></li>
            </ul>
        </div>
    </nav>

    <section class="hero" style="margin-top:40px;">
        <h1 class="pixel">Login</h1>

        <div class="auth-box">
            <input id="loginEmail" placeholder="Email" type="email">
            <input id="loginPassword" placeholder="Password" type="password">
            <button class="btn-red" id="loginBtn">Login</button>
        </div>

        <p id="status" class="pixel-small" style="margin-top:20px;"></p>
    </section>

</div>

<!-- ⭐ FIXED LOGIN SCRIPT -->
<script type="module">
    import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    /* ⭐ UPDATED TO YOUR NEW DATABASE */
    const supabase = createClient(
        "https://pnkwqqapyoxadcpubpwb.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBua3dxcWFweW9heGRjcHVicHdiIiwicm9zZSI6ImFub24iLCJpYXQiOjE3OTExNDA3MzcsImV4cCI6MjEwNjcxNjczN30.HiM5-OSJUoJ_3AXSkfEmhgWVs8lU5lNNj4FbIai1Bkc"
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

        // ⭐ REAL Supabase login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            status.textContent = error.message;
            status.style.color = "#ff6b6b";
            return;
        }

        // ⭐ Get user info
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            status.textContent = "Unexpected error: no user returned.";
            status.style.color = "#ff6b6b";
            return;
        }

        // ⭐ Redirect normal users
        window.location.href = "/prosper/dashboard.html";
    };
</script>

</body>
</html>

