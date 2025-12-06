// Get duel ID from URL
const urlParams = new URLSearchParams(window.location.search);
const duelId = urlParams.get('id') || window.location.pathname.split('/').pop();

let challenge = null;
let userId = null; // TODO: Get from authentication/session

async function loadChallenge() {
    try {
        const response = await fetch(`/duel/${duelId}`);
        if (!response.ok) {
            throw new Error('Failed to load challenge');
        }
        
        const data = await response.json();
        challenge = data.challenge;
        
        if (!challenge) {
            throw new Error('Challenge not found');
        }
        
        displayChallenge(challenge);
    } catch (error) {
        showError(error.message);
    }
}

function displayChallenge(challenge) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('challenge').classList.remove('hidden');
    
    document.getElementById('challenge-title').textContent = challenge.title;
    document.getElementById('challenge-description').textContent = challenge.description;
    document.getElementById('challenge-difficulty').textContent = `Difficulty: ${challenge.difficulty}`;
    document.getElementById('challenge-duration').textContent = `Duration: ~${challenge.estimatedDuration} min`;
    
    if (challenge.starterCode) {
        document.getElementById('solution').value = challenge.starterCode;
    }
    
    if (challenge.testCases && challenge.testCases.length > 0) {
        const testCasesDiv = document.getElementById('test-cases');
        const testCasesList = document.getElementById('test-cases-list');
        testCasesDiv.classList.remove('hidden');
        
        challenge.testCases.forEach((testCase, index) => {
            const testCaseDiv = document.createElement('div');
            testCaseDiv.className = 'test-case';
            testCaseDiv.innerHTML = `
                <strong>Test Case ${index + 1}:</strong><br>
                Input: <code>${testCase.input}</code><br>
                Expected Output: <code>${testCase.expectedOutput}</code>
            `;
            testCasesList.appendChild(testCaseDiv);
        });
    }
    
    if (challenge.hints && challenge.hints.length > 0) {
        const hintsList = document.getElementById('hints-list');
        challenge.hints.forEach((hint) => {
            const li = document.createElement('li');
            li.textContent = hint;
            hintsList.appendChild(li);
        });
        
        document.getElementById('show-hints-btn').addEventListener('click', () => {
            document.getElementById('hints').classList.toggle('hidden');
        });
    } else {
        document.getElementById('show-hints-btn').style.display = 'none';
    }
}

async function submitSolution() {
    const solution = document.getElementById('solution').value.trim();
    
    if (!solution) {
        showError('Please enter a solution');
        return;
    }
    
    // TODO: Get userId from authentication
    if (!userId) {
        userId = prompt('Enter your user ID:');
        if (!userId) {
            showError('User ID is required');
            return;
        }
    }
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const response = await fetch(`/duel/${duelId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                solution: solution,
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit solution');
        }
        
        const data = await response.json();
        showResult(data);
    } catch (error) {
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Solution';
    }
}

function showResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');
    
    if (data.duel.status === 'completed') {
        if (data.duel.winnerId === userId) {
            resultDiv.className = 'result success';
            resultDiv.innerHTML = `
                <h3>🎉 Victory!</h3>
                <p>You won the duel! Your StatCard has been updated.</p>
                <p>Your score: ${data.duel.challengerSubmission?.score || data.duel.defenderSubmission?.score || 'N/A'}</p>
            `;
        } else if (data.duel.winnerId) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = `
                <h3>Defeat</h3>
                <p>You lost the duel. Better luck next time!</p>
                <p>Your score: ${data.duel.challengerSubmission?.score || data.duel.defenderSubmission?.score || 'N/A'}</p>
            `;
        } else {
            resultDiv.className = 'result';
            resultDiv.innerHTML = `
                <h3>Draw</h3>
                <p>The duel ended in a draw!</p>
            `;
        }
    } else {
        resultDiv.className = 'result';
        resultDiv.innerHTML = `
            <h3>Solution Submitted</h3>
            <p>Waiting for opponent to submit...</p>
        `;
    }
    
    document.getElementById('submit-btn').disabled = true;
}

function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('challenge').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

// Initialize
document.getElementById('submit-btn').addEventListener('click', submitSolution);

if (duelId) {
    loadChallenge();
} else {
    showError('Duel ID not found in URL');
}

