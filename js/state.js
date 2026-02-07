const SUPABASE_URL = 'https://xrppvozyvgdhmrxxeokn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHB2b3p5dmdkaG1yeHhlb2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODc5OTYsImV4cCI6MjA4NDg2Mzk5Nn0.oacUYGSuVPP2yridLqHmCDD96IJBB_otYvHZrDaDzPk';
let supabaseClient = null;
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.warn('Supabase client init failed:', e);
}
let offlineModeActive = false;
let currentUser = null;

let currentCarouselIndex = 0;
const maxCarouselSessions = 5;
let currentDashboardType = 'practice'; // 'practice' or 'match'

let currentTeam = null;
let currentMembership = null;

let teamDrills = [];

let currentSession = null;
let pendingShot = null;
let sessions = [];
let batchPendingLocation = null;
let currentFootFilter = 'all';
let currentHalfFilter = 'all';
let currentAnalyticsType = 'practice';
let currentSessionsFilter = 'all';
let activeTemplate = null;
let currentDrillIndex = 0;
let drillProgress = {};
let drillSettings = {
    distance: 15,
    shotType: 'standing',
    footOption: 'right',
    totalShots: 20
};

let isDragging = false;
let dragMarker = null;
let cloudSavePromise = null;

let previewingTemplate = null;

let customDrills = []; // Store user's custom drills
let viewingPastSession = false; // True when viewing a past session's stats
let editingShot = null; // Track shot being edited in miss details modal
let editingMarker = null; // Track marker for the shot being edited
