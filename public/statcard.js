/**
 * FIFA StatCard - Interactive UI
 * Handles data loading, animations, and user interactions
 */

// ============================================
// CONFIGURATION & STATE
// ============================================

const CONFIG = {
    API_BASE: '', // Will use relative paths
    ANIMATION_DURATION: 500,
    RATING_SCALE: {
        min: 500,
        max: 3000
    }
};

let state = {
    currentUser: null,
    leaderboard: [],
    selectedFilter: 'all'
};

// ============================================
// TIER SYSTEM
// ============================================

const TIERS = {
    BRONZE: { name: 'BRONZE', min: 0, max: 999, class: 'bronze' },
    SILVER: { name: 'SILVER', min: 1000, max: 1499, class: 'silver' },
    GOLD: { name: 'GOLD', min: 1500, max: 1999, class: 'gold' },
    PLATINUM: { name: 'PLATINUM', min: 2000, max: 2499, class: 'platinum' },
    DIAMOND: { name: 'DIAMOND', min: 2500, max: 2999, class: 'diamond' },
    LEGEND: { name: 'LEGEND', min: 3000, max: Infinity, class: 'legend' }
};

function getTierFromRating(rating) {
    for (const tier of Object.values(TIERS)) {
        if (rating >= tier.min && rating <= tier.max) {
            return tier;
        }
    }
    return TIERS.BRONZE;
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchStatCard(userId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/statcard/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch stat card');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stat card:', error);
        return null;
    }
}

async function fetchLeaderboard(archetype = null) {
    try {
        const url = archetype 
            ? `${CONFIG.API_BASE}/api/leaderboard?archetype=${archetype}`
            : `${CONFIG.API_BASE}/api/leaderboard`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        return await response.json();
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

// ============================================
// HEXAGON CHART CALCULATIONS
// ============================================

function calculateHexagonPoints(stats) {
    // Normalize ratings to 0-1 scale
    const normalize = (rating) => {
        const normalized = (rating - CONFIG.RATING_SCALE.min) / 
                          (CONFIG.RATING_SCALE.max - CONFIG.RATING_SCALE.min);
        return Math.max(0.1, Math.min(1, normalized)); // Clamp between 0.1 and 1
    };

    const order = ['engineering', 'finance', 'creative', 'business_ops', 'product', 'research'];
    const values = order.map(arch => normalize(stats[arch]?.rating || 1000));

    // Calculate hexagon vertices
    const centerX = 100;
    const centerY = 100;
    const maxRadius = 80;
    const angleOffset = -Math.PI / 2; // Start from top

    const points = values.map((value, index) => {
        const angle = angleOffset + (index * Math.PI * 2 / 6);
        const radius = maxRadius * value;
        return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    });

    return points.map(p => `${p.x},${p.y}`).join(' ');
}

function updateStatPoints(stats) {
    const order = ['engineering', 'finance', 'creative', 'business_ops', 'product', 'research'];
    const pointIds = ['point-eng', 'point-fin', 'point-cre', 'point-bus', 'point-pro', 'point-res'];
    
    const normalize = (rating) => {
        const normalized = (rating - CONFIG.RATING_SCALE.min) / 
                          (CONFIG.RATING_SCALE.max - CONFIG.RATING_SCALE.min);
        return Math.max(0.1, Math.min(1, normalized));
    };

    const centerX = 100;
    const centerY = 100;
    const maxRadius = 80;
    const angleOffset = -Math.PI / 2;

    order.forEach((arch, index) => {
        const value = normalize(stats[arch]?.rating || 1000);
        const angle = angleOffset + (index * Math.PI * 2 / 6);
        const radius = maxRadius * value;
        
        const point = document.getElementById(pointIds[index]);
        if (point) {
            point.setAttribute('cx', centerX + radius * Math.cos(angle));
            point.setAttribute('cy', centerY + radius * Math.sin(angle));
        }
    });
}

// ============================================
// UI RENDERING
// ============================================

function renderStatCard(data) {
    if (!data) return;

    state.currentUser = data;
    const tier = getTierFromRating(data.blendedRating);

    // Update tier badge
    const tierBadge = document.getElementById('tier-badge');
    const tierName = document.getElementById('tier-name');
    tierBadge.className = `tier-badge ${tier.class}`;
    tierName.textContent = tier.name;

    // Update overall rating
    const overallRating = document.getElementById('overall-rating');
    animateNumber(overallRating, Math.round(data.blendedRating / 30)); // Scale to FIFA-like rating

    // Update player info
    document.getElementById('player-name').textContent = data.userId.toUpperCase();
    document.getElementById('avatar-initials').textContent = getInitials(data.userId);
    document.getElementById('player-rank').textContent = `#${data.rank}`;

    // Update individual stats
    const statIds = {
        engineering: 'stat-eng',
        finance: 'stat-fin',
        creative: 'stat-cre',
        business_ops: 'stat-bus',
        product: 'stat-pro',
        research: 'stat-res'
    };

    for (const [arch, id] of Object.entries(statIds)) {
        const el = document.getElementById(id);
        if (el && data.stats[arch]) {
            animateNumber(el, Math.round(data.stats[arch].rating / 30));
        }
    }

    // Update hexagon chart
    const polygon = document.getElementById('stats-polygon');
    if (polygon) {
        const points = calculateHexagonPoints(data.stats);
        polygon.setAttribute('points', points);
    }
    updateStatPoints(data.stats);

    // Update footer stats
    document.getElementById('total-duels').textContent = data.totalDuels;
    
    // Calculate overall win rate
    let totalWins = 0, totalGames = 0;
    for (const stat of Object.values(data.stats)) {
        totalWins += stat.wins;
        totalGames += stat.wins + stat.losses + stat.draws;
    }
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    document.getElementById('win-rate').textContent = `${winRate}%`;
}

function renderLeaderboard(entries) {
    state.leaderboard = entries;

    // Update podium (top 3)
    if (entries.length >= 1) updatePodiumSlot(1, entries[0]);
    if (entries.length >= 2) updatePodiumSlot(2, entries[1]);
    if (entries.length >= 3) updatePodiumSlot(3, entries[2]);

    // Render rest of leaderboard
    const rankingsList = document.getElementById('rankings-list');
    rankingsList.innerHTML = '';

    entries.slice(3).forEach((entry, index) => {
        const row = createRankRow(entry, index + 4);
        rankingsList.appendChild(row);
    });
}

function updatePodiumSlot(position, entry) {
    const slot = document.getElementById(`rank-${position}`);
    if (!slot || !entry) return;

    const avatar = slot.querySelector('.podium-avatar span');
    const name = slot.querySelector('.podium-name');
    const rating = slot.querySelector('.podium-rating');

    if (avatar) avatar.textContent = getInitials(entry.userId);
    if (name) name.textContent = truncateName(entry.userId);
    if (rating) animateNumber(rating, entry.blendedRating);
}

function createRankRow(entry, position) {
    const row = document.createElement('div');
    row.className = 'rank-row';
    if (state.currentUser && entry.userId === state.currentUser.userId) {
        row.classList.add('current-user');
    }

    const tier = getTierFromRating(entry.blendedRating);
    const change = getRandomChange(); // In real app, track actual changes

    row.innerHTML = `
        <div class="rank-position">${position}</div>
        <div class="rank-change ${change.class}">${change.icon}</div>
        <div class="rank-user">
            <div class="rank-avatar">
                <span>${getInitials(entry.userId)}</span>
            </div>
            <div class="rank-name">${truncateName(entry.userId)}</div>
            <span class="rank-tier ${tier.class}">${tier.name}</span>
        </div>
        <div class="rank-rating">${entry.blendedRating}</div>
        <div class="rank-duels">${entry.totalDuels} duels</div>
    `;

    row.addEventListener('click', () => showUserCard(entry.userId));
    return row;
}

// ============================================
// MODAL HANDLING
// ============================================

function showUserCard(userId) {
    const modal = document.getElementById('card-modal');
    const expandedCard = document.getElementById('expanded-card');
    
    // Fetch and display user card
    fetchStatCard(userId).then(data => {
        if (data) {
            expandedCard.innerHTML = createExpandedCardHTML(data);
            modal.classList.add('active');
        }
    });
}

function createExpandedCardHTML(data) {
    const tier = getTierFromRating(data.blendedRating);
    
    let statsHTML = '';
    const archLabels = {
        engineering: 'Engineering',
        finance: 'Finance',
        creative: 'Creative',
        business_ops: 'Business Ops',
        product: 'Product',
        research: 'Research'
    };

    for (const [arch, stat] of Object.entries(data.stats)) {
        const total = stat.wins + stat.losses + stat.draws;
        statsHTML += `
            <div class="expanded-stat-row">
                <span class="expanded-stat-name">${archLabels[arch]}</span>
                <div class="expanded-stat-bar">
                    <div class="bar-fill" style="width: ${(stat.rating / 3000) * 100}%"></div>
                </div>
                <span class="expanded-stat-value">${stat.rating}</span>
                <span class="expanded-stat-record">${stat.wins}W-${stat.losses}L-${stat.draws}D</span>
            </div>
        `;
    }

    return `
        <div class="expanded-header">
            <div class="expanded-tier ${tier.class}">${tier.name}</div>
            <div class="expanded-rating">${data.blendedRating}</div>
        </div>
        <div class="expanded-player">
            <div class="expanded-avatar">
                <span>${getInitials(data.userId)}</span>
            </div>
            <div class="expanded-name">${data.userId}</div>
            <div class="expanded-rank">Rank #${data.rank}</div>
        </div>
        <div class="expanded-stats">
            ${statsHTML}
        </div>
        <div class="expanded-footer">
            <div class="expanded-footer-stat">
                <span class="footer-value">${data.totalDuels}</span>
                <span class="footer-label">Total Duels</span>
            </div>
            <div class="expanded-footer-stat">
                <span class="footer-value">${new Date(data.lastUpdated).toLocaleDateString()}</span>
                <span class="footer-label">Last Active</span>
            </div>
        </div>
    `;
}

function closeModal() {
    const modal = document.getElementById('card-modal');
    modal.classList.remove('active');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(/[\s._-]+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function truncateName(name, maxLength = 12) {
    if (!name) return 'Unknown';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
}

function animateNumber(element, targetValue, duration = CONFIG.ANIMATION_DURATION) {
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * eased);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function getRandomChange() {
    const rand = Math.random();
    if (rand < 0.3) return { class: 'up', icon: '▲' };
    if (rand < 0.6) return { class: 'down', icon: '▼' };
    return { class: 'same', icon: '—' };
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventListeners() {
    // Tab filtering
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const filter = tab.dataset.filter;
            state.selectedFilter = filter;
            
            // Re-fetch leaderboard with filter
            const archetype = filter === 'all' ? null : filter;
            fetchLeaderboard(archetype).then(renderLeaderboard);
        });
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    // Card click for modal
    document.getElementById('fifa-card').addEventListener('click', () => {
        if (state.currentUser) {
            showUserCard(state.currentUser.userId);
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Card hover effect (3D tilt)
    const card = document.getElementById('fifa-card');
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    });
}

// ============================================
// DEMO DATA
// ============================================

function loadDemoData() {
    // Demo stat card data
    const demoStatCard = {
        userId: 'john_doe',
        tier: 'GOLD',
        blendedRating: 1847,
        rank: 42,
        stats: {
            engineering: { rating: 2150, wins: 28, losses: 12, draws: 5, winRate: 62.2 },
            finance: { rating: 1680, wins: 15, losses: 18, draws: 7, winRate: 37.5 },
            creative: { rating: 2340, wins: 35, losses: 8, draws: 2, winRate: 77.8 },
            business_ops: { rating: 1720, wins: 20, losses: 15, draws: 5, winRate: 50.0 },
            product: { rating: 1950, wins: 25, losses: 10, draws: 8, winRate: 58.1 },
            research: { rating: 1540, wins: 12, losses: 20, draws: 3, winRate: 34.3 }
        },
        totalDuels: 156,
        lastUpdated: new Date().toISOString()
    };

    // Demo leaderboard data
    const demoLeaderboard = [
        { userId: 'mike_johnson', blendedRating: 2312, rank: 1, tier: 'PLATINUM', totalDuels: 245 },
        { userId: 'alice_brown', blendedRating: 2145, rank: 2, tier: 'PLATINUM', totalDuels: 198 },
        { userId: 'sarah_chen', blendedRating: 2089, rank: 3, tier: 'PLATINUM', totalDuels: 176 },
        { userId: 'david_kim', blendedRating: 1956, rank: 4, tier: 'GOLD', totalDuels: 167 },
        { userId: 'emma_wilson', blendedRating: 1923, rank: 5, tier: 'GOLD', totalDuels: 154 },
        { userId: 'james_taylor', blendedRating: 1887, rank: 6, tier: 'GOLD', totalDuels: 143 },
        { userId: 'john_doe', blendedRating: 1847, rank: 7, tier: 'GOLD', totalDuels: 156 },
        { userId: 'olivia_martinez', blendedRating: 1798, rank: 8, tier: 'GOLD', totalDuels: 132 },
        { userId: 'william_anderson', blendedRating: 1756, rank: 9, tier: 'GOLD', totalDuels: 128 },
        { userId: 'sophia_thomas', blendedRating: 1712, rank: 10, tier: 'GOLD', totalDuels: 119 },
        { userId: 'noah_jackson', blendedRating: 1678, rank: 11, tier: 'GOLD', totalDuels: 108 },
        { userId: 'ava_white', blendedRating: 1645, rank: 12, tier: 'GOLD', totalDuels: 95 },
    ];

    renderStatCard(demoStatCard);
    renderLeaderboard(demoLeaderboard);
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    setupEventListeners();
    
    // Try to load real data, fall back to demo
    try {
        // Get userId from URL or session
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        
        if (userId) {
            const [statCard, leaderboard] = await Promise.all([
                fetchStatCard(userId),
                fetchLeaderboard()
            ]);
            
            if (statCard) {
                renderStatCard(statCard);
            } else {
                loadDemoData();
            }
            
            if (leaderboard && leaderboard.length > 0) {
                renderLeaderboard(leaderboard);
            }
        } else {
            // Load demo data for preview
            loadDemoData();
        }
    } catch (error) {
        console.error('Error initializing:', error);
        loadDemoData();
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

// Export for external use
window.StatCard = {
    fetchStatCard,
    fetchLeaderboard,
    renderStatCard,
    renderLeaderboard,
    showUserCard
};

