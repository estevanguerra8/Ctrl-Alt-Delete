(async function () {
  const pathParts = window.location.pathname.split("/");
  // Extract duelId from path like /duel/:id
  let duelId = null;
  const duelIndex = pathParts.indexOf("duel");
  if (duelIndex >= 0 && pathParts.length > duelIndex + 1) {
    duelId = pathParts[duelIndex + 1];
  }

  const titleEl = document.getElementById("challenge-title");
  const promptEl = document.getElementById("challenge-prompt");
  const metaEl = document.getElementById("challenge-meta");
  const timerEl = document.getElementById("timer");
  const answerEl = document.getElementById("answer");
  const submitBtn = document.getElementById("submitBtn");
  const resultEl = document.getElementById("result");

  // Check if duelId is missing
  if (!duelId || duelId.trim() === "") {
    titleEl.textContent = "❌ No Duel ID Found";
    promptEl.textContent = "Please access this page using a duel link from your Series chat.\n\nExample: http://localhost:3000/duel/abc123";
    metaEl.textContent = "";
    timerEl.textContent = "";
    answerEl.disabled = true;
    submitBtn.disabled = true;
    return;
  }

  // Get userId from query param or use opponentId from duel
  const urlParams = new URLSearchParams(window.location.search);
  let userId = urlParams.get("userId");

  try {
    console.log(`[DUEL] Fetching duel ${duelId}...`);
    // Explicitly request JSON, not HTML
    const res = await fetch(`/duel/${duelId}?json=true`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error(`[DUEL] Failed to load:`, errorData);
      titleEl.textContent = "❌ Error Loading Duel";
      promptEl.textContent = `Error: ${errorData.error || "Failed to load duel"}`;
      throw new Error(errorData.error || "Failed to load duel");
    }
    const data = await res.json();
    console.log(`[DUEL] Received data:`, data);
    console.log(`[DUEL] Loaded duel data:`, data);

    const { duel, challenge, time } = data;

    console.log(`[DUEL] Received data:`, { duel, challenge, time });

    if (!challenge) {
      console.error(`[DUEL] No challenge in response:`, data);
      titleEl.textContent = "❌ Challenge Not Found";
      promptEl.textContent = "The challenge could not be loaded. Please try again.";
      throw new Error("Challenge not found in response");
    }

    if (!duel) {
      console.error(`[DUEL] No duel in response:`, data);
      titleEl.textContent = "❌ Duel Not Found";
      promptEl.textContent = "The duel could not be found. Please check the link.";
      throw new Error("Duel not found in response");
    }
    
    // Use opponentId from duel if userId not provided in URL
    if (!userId) {
      userId = duel.opponentId;
      console.log(`[DUEL] Using opponentId from duel: ${userId}`);
    }

    // Render challenge - ensure elements exist
    if (titleEl) {
      titleEl.textContent = challenge.title || "Challenge";
    } else {
      console.error('[DUEL] titleEl not found!');
    }
    
    if (promptEl) {
      promptEl.textContent = challenge.prompt || "No challenge prompt available";
    } else {
      console.error('[DUEL] promptEl not found!');
    }
    
    if (metaEl) {
      metaEl.textContent = `${duel.archetype} / ${duel.metric} • difficulty: ${challenge.difficulty || "medium"}`;
    } else {
      console.error('[DUEL] metaEl not found!');
    }
    
    console.log(`[DUEL] Challenge rendered:`, challenge.title);

    // Timer logic - starts when page loads, stops when user submits
    let timerIntervalId = null;
    let timerStopped = false;
    
    if (time && typeof time.remainingMs === "number" && time.remainingMs > 0) {
      let remaining = time.remainingMs;

      const updateTimer = () => {
        if (timerStopped) {
          return; // Don't update if stopped
        }
        const totalSeconds = Math.floor(remaining / 1000);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        timerEl.textContent = `Time left: ${minutes}:${seconds}`;
      };

      updateTimer();

      timerIntervalId = window.setInterval(() => {
        if (timerStopped) {
          if (timerIntervalId) clearInterval(timerIntervalId);
          return;
        }
        remaining -= 1000;
        window.duelTimerRemaining = remaining; // Track remaining for stop function
        if (remaining <= 0) {
          if (timerIntervalId) clearInterval(timerIntervalId);
          timerEl.textContent = "⏰ Time is up!";
          answerEl.disabled = true;
          submitBtn.disabled = true;
        } else {
          updateTimer();
        }
      }, 1000);
    } else {
      timerEl.textContent = "No time limit";
    }
    
    // Store timer interval ID and remaining time globally so we can stop it on submit
    window.duelTimerInterval = timerIntervalId;
    window.duelTimerRemaining = time && typeof time.remainingMs === "number" ? time.remainingMs : null;
    window.stopDuelTimer = () => {
      timerStopped = true;
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
      }
      // Calculate time used: total time - remaining time
      const totalTimeMs = duel.durationMinutes * 60 * 1000;
      const remaining = window.duelTimerRemaining || 0;
      const usedMs = totalTimeMs - remaining;
      const usedSeconds = Math.floor(usedMs / 1000);
      const minutes = String(Math.floor(usedSeconds / 60)).padStart(2, "0");
      const seconds = String(usedSeconds % 60).padStart(2, "0");
      timerEl.textContent = `⏹️ Stopped at ${minutes}:${seconds}`;
    };

    // Submission handler
    submitBtn.addEventListener("click", async () => {
      if (!duelId) {
        alert("No duel ID found. Please use a valid duel link.");
        return;
      }

      const answer = answerEl.value.trim();
      if (!answer) {
        alert("Please enter an answer before submitting.");
        return;
      }

      // Ensure userId is set
      if (!userId) {
        alert("Error: User ID not found. Please refresh the page.");
        submitBtn.disabled = false;
        answerEl.disabled = false;
        submitBtn.textContent = "Submit";
        return;
      }

      // STOP THE TIMER when user submits
      if (window.stopDuelTimer) {
        window.stopDuelTimer();
      }

      submitBtn.disabled = true;
      answerEl.disabled = true;
      submitBtn.textContent = "Submitting...";

      try {
        console.log(`[DUEL] Submitting answer for duel ${duelId} with userId: ${userId}`);
        const res = await fetch(`/duel/${duelId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, answer }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          console.error(`[DUEL] Submission failed:`, err);
          throw new Error(err.error || "Failed to submit answer");
        }

        const result = await res.json();
        console.log(`[DUEL] Submission successful:`, result);
        
        // Always show simple message - full comparison will be sent via text message only
        let feedbackHtml = `<div style="margin-top: 20px;">`;
        
        // Simple confirmation message (comparison sent via text)
        feedbackHtml += `<div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">`;
        feedbackHtml += `<h2 style="margin: 0 0 20px 0; font-size: 28px;">✅ Good Job on Your Submission!</h2>`;
        feedbackHtml += `<p style="margin: 0; font-size: 18px; line-height: 1.6;">`;
        feedbackHtml += `We will send you a text once both parties complete the challenge with the results!`;
        feedbackHtml += `</p>`;
        feedbackHtml += `</div>`;
        
        feedbackHtml += `</div>`;
        
        resultEl.innerHTML = feedbackHtml;
        resultEl.style.display = "block";
        
        // Show time elapsed if available
        if (result.timeElapsed !== undefined) {
          const minutes = String(Math.floor(result.timeElapsed / 60)).padStart(2, "0");
          const seconds = String(result.timeElapsed % 60).padStart(2, "0");
          timerEl.textContent = `⏹️ Submitted at ${minutes}:${seconds}`;
        }
        
        answerEl.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitted";
      } catch (err) {
        console.error('[DUEL] Submission error:', err);
        alert(`Error: ${err.message || "There was an error submitting your answer. Please try again."}`);
        submitBtn.disabled = false;
        answerEl.disabled = false;
        submitBtn.textContent = "Submit";
      }
    });
  } catch (err) {
    console.error("[DUEL] Error:", err);
    console.error("[DUEL] Error stack:", err.stack);
    if (titleEl) {
      titleEl.textContent = "❌ Failed to load duel";
    }
    if (promptEl) {
      promptEl.textContent = err.message || "An error occurred while loading the challenge. Check the browser console (F12) for details.";
    }
    promptEl.style.color = "#d32f2f";
    metaEl.textContent = "";
    timerEl.textContent = "";
    answerEl.disabled = true;
    submitBtn.disabled = true;
  }
})();
