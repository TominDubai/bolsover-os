/* ===== Supabase Client + Auth ===== */
const SupabaseClient = (() => {
    const SUPABASE_URL = 'https://ckvprducwuhhnrkbzaoo.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdnByZHVjd3VoaG5ya2J6YW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDEwODgsImV4cCI6MjA4NjExNzA4OH0.FvwuHoVOCUaFUtRVJ1ehwFWhEEk-iUlWwrnx1wamcKs';

    let client = null;

    function init() {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.error('Supabase JS library not loaded');
            return null;
        }
        client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.sb = client;
        return client;
    }

    function getClient() {
        if (!client) init();
        return client;
    }

    async function signIn(email, password) {
        const { data, error } = await getClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function signOut() {
        const { error } = await getClient().auth.signOut();
        if (error) throw error;
    }

    async function getUser() {
        const { data: { user } } = await getClient().auth.getUser();
        return user;
    }

    async function getSession() {
        const { data: { session } } = await getClient().auth.getSession();
        return session;
    }

    function onAuthStateChange(callback) {
        return getClient().auth.onAuthStateChange(callback);
    }

    function from(table) {
        return getClient().from(table);
    }

    return { init, getClient, signIn, signOut, getUser, getSession, onAuthStateChange, from };
})();
