let supabase = null;

export async function getSupabase() {
    if (supabase) return supabase;

    try {
        // Fetch keys from serverless function
        const res = await fetch('/api/config');
        const config = await res.json();
        
        // Initialize Supabase Client
        supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
        return supabase;
    } catch (error) {
        console.error("Failed to init Supabase", error);
    }
}