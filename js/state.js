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
let currentDashboardType = 'match'; // 'practice' or 'match'

let currentTeam = null;
let currentMembership = null;

let teamDrills = [];

let currentSession = null;
let pendingShot = null;
let sessions = [];
let batchPendingLocation = null;
let currentFootFilter = 'all';
let currentHalfFilter = 'all';
let currentAnalyticsType = 'match';
let currentSessionsFilter = 'match';
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let calendarSelectedDate = null; // 'YYYY-MM-DD' string or null
let calendarViewMode = 'monthly'; // 'monthly' or 'weekly'
let calendarWeekStart = null;     // Date object for Monday of current week view
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

let currentSkillsetFilter = 'all';
let expandedDrillId = null; // Track which drill row is expanded (selected but not yet started)
let customDrills = []; // Store user's custom drills
let trainingLogs = []; // Training/gym/recovery session logs
let viewingPastSession = false; // True when viewing a past session's stats
let editingShot = null; // Track shot being edited in miss details modal
let editingMarker = null; // Track marker for the shot being edited

// Session checkbox state for Stats breakdown table
let uncheckedSessionIds = new Set();
let lastFilteredAllShots = [];
let lastSessionRows = [];
let lastTableMeta = {};

// Session checkbox state for coach player data modal
let pdUncheckedSessionIds = new Set();
let lastPdFilteredAllShots = [];
let lastPdSessionRows = [];
let lastPdTableMeta = {};
