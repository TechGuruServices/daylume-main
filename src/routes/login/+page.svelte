<script lang="ts">
    import { supabase, isSupabaseConfigured } from "$lib/supabase";
    import { goto } from "$app/navigation";
    import { userStore } from "$lib/user";

    let email = "";
    let password = "";
    let loading = false;
    let isSignUp = false;
    let error = "";
    let message = "";

    async function handleAuth() {
        loading = true;
        error = "";
        message = "";

        // Check if Supabase is configured
        if (!isSupabaseConfigured) {
            error = "Cloud authentication is not configured. Please use local mode.";
            loading = false;
            return;
        }

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp(
                    {
                        email,
                        password,
                        options: {
                            data: {
                                name: email.split("@")[0], // Default name
                                avatar: "👤",
                            },
                        },
                    },
                );
                if (signUpError) throw signUpError;
                message = "Check your email for the confirmation link!";
            } else {
                const { data, error: signInError } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                if (signInError) throw signInError;

                // Update local user store with profile data
                if (data.user) {
                    // Fetch profile
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", data.user.id)
                        .single();

                    if (profile) {
                        userStore.set({
                            name: profile.name,
                            email: profile.email,
                            avatar: profile.avatar,
                            bio: profile.bio,
                            joinDate: profile.join_date,
                            plan: "free",
                        });
                    }
                    goto("/");
                }
            }
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
</script>

<div
    class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
>
    <!-- Background Orbs -->
    <div
        class="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none"
    >
        <div
            class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow"
        ></div>
        <div
            class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[120px] animate-pulse-slow"
            style="animation-delay: 2s;"
        ></div>
    </div>

    <div
        class="w-full max-w-md glass-panel rounded-3xl p-8 relative z-10 animate-fade-in"
    >
        <div class="text-center mb-8">
            <h1 class="text-3xl font-heading font-bold mb-2 text-white">
                {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p class="text-gray-400">
                {isSignUp
                    ? "Join Daylume to sync your data"
                    : "Sign in to access your planner"}
            </p>
        </div>

        {#if error}
            <div
                class="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-sm text-center"
            >
                {error}
            </div>
        {/if}

        {#if message}
            <div
                class="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl mb-4 text-sm text-center"
            >
                {message}
            </div>
        {/if}

        <form on:submit|preventDefault={handleAuth} class="space-y-4">
            <div>
                <label
                    for="email"
                    class="block text-sm font-medium text-gray-300 mb-1"
                    >Email</label
                >
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    required
                    placeholder="you@example.com"
                    class="glass-input w-full"
                />
            </div>
            <div>
                <label
                    for="password"
                    class="block text-sm font-medium text-gray-300 mb-1"
                    >Password</label
                >
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    required
                    placeholder="••••••••"
                    class="glass-input w-full"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                class="btn btn-primary w-full py-3 text-lg font-medium mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {#if loading}
                    <span class="mdi mdi-loading mdi-spin mr-2"></span>
                {/if}
                {isSignUp ? "Sign Up" : "Sign In"}
            </button>
        </form>

        <div class="mt-6 text-center">
            <button
                class="text-sm text-gray-400 hover:text-white transition-colors"
                on:click={() => {
                    isSignUp = !isSignUp;
                    error = "";
                    message = "";
                }}
            >
                {isSignUp
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
            </button>
        </div>
    </div>
</div>
