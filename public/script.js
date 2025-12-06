// Frontend logic: load challenge + submit answer
const API_BASE = window.location.origin;

// Read duel id from URL (e.g. ?duelId=... or /duel/:id)
function getDuelIdFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/duel\/([^\/]+)/);
    if (match) {
        return match[1];
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('duelId');
}

// On load: Fetch /duel/:id JSON and populate the DOM
async function loadDuel() {
    const duelId = getDuelIdFromURL();
    if (!duelId) {
        document.getElementById('duel-info').innerHTML = '<p>No duel ID found in URL</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/duel/${duelId}`);
        const data = await response.json();
        
        if (!data.duel) {
            document.getElementById('duel-info').innerHTML = '<p>Duel not found</p>';
            return;
        }
        
        const { duel, challenge } = data;
        
        document.getElementById('duel-info').innerHTML = `
            <p><strong>Status:</strong> ${duel.status}</p>
            <p><strong>Archetype:</strong> ${duel.archetype}</p>
            <p><strong>Metric:</strong> ${duel.metric}</p>
            <p><strong>Duration:</strong> ${duel.durationMinutes} minutes</p>
        `;
        
        if (challenge) {
            document.getElementById('challenge-title').textContent = challenge.title;
            document.getElementById('challenge-prompt').innerHTML = `<p>${challenge.prompt}</p>`;
            document.getElementById('challenge-section').style.display = 'block';
        }
        
        if (duel.status === 'finished') {
            document.getElementById('answer').disabled = true;
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('result').innerHTML = `
                <h3>Results</h3>
                <p>Challenger Score: ${duel.scores[duel.challengerId] || 'N/A'}</p>
                <p>Opponent Score: ${duel.scores[duel.opponentId] || 'N/A'}</p>
            `;
            document.getElementById('result').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading duel:', error);
        document.getElementById('duel-info').innerHTML = '<p>Error loading duel</p>';
    }
}

// On submit: POST answer to /duel/:id/submit and display result
document.getElementById('submitBtn').addEventListener('click', async () => {
    const duelId = getDuelIdFromURL();
    const answer = document.getElementById('answer').value;
    const userId = prompt('Enter your user ID:');
    
    if (!userId || !answer) {
        alert('User ID and answer are required');
        return;
    }
    
    try {
        document.getElementById('submitBtn').disabled = true;
        const response = await fetch(`${API_BASE}/duel/${duelId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, submission: answer }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('result').innerHTML = `<p>${result.message}</p>`;
            document.getElementById('result').style.display = 'block';
            if (result.score !== undefined) {
                document.getElementById('result').innerHTML += `<p>Your score: ${result.score}</p>`;
            }
            if (result.duel.status === 'finished') {
                setTimeout(loadDuel, 2000);
            }
        } else {
            alert('Error submitting: ' + (result.error || 'Unknown error'));
            document.getElementById('submitBtn').disabled = false;
        }
    } catch (error) {
        console.error('Error submitting:', error);
        alert('Error submitting answer');
        document.getElementById('submitBtn').disabled = false;
    }
});

loadDuel();
