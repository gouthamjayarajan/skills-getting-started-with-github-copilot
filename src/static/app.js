document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear previous options to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // helper: format a display name from an email (before @)
      function formatName(email) {
        const raw = String(email).split("@")[0] || "";
        const parts = raw.split(/[\.\_\-\s]+/).filter(Boolean);
        return parts
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ") || raw;
      }

      // helper: get initials to show in avatar
      function getInitials(email) {
        const name = formatName(email);
        const segs = name.split(" ").filter(Boolean);
        if (segs.length >= 2) return (segs[0][0] + segs[1][0]).toUpperCase();
        return (name[0] || email[0] || "").toUpperCase();
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Render participants list (nice, bulleted with avatars)
        const participantsHtml =
          Array.isArray(details.participants) && details.participants.length > 0
            ? `<ul class="participants-list">
                ${details.participants
                  .map(
                    (p) =>
                      `<li class="participant-item">
                        <span class="avatar">${getInitials(p)}</span>
                        <span class="participant-name">${formatName(p)}</span>
                        <button class="participant-delete" data-activity="${name}" data-email="${p}" aria-label="Unregister ${formatName(p)}" title="Unregister ${formatName(p)}">
                          <!-- trash icon -->
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                          </svg>
                        </button>
                      </li>`
                  )
                  .join("")}
              </ul>`
            : `<p class="no-participants">No participants yet. Be the first!</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <div class="participants-header">Participants</div>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Wire up delete/unregister buttons for this card
        const deleteButtons = activityCard.querySelectorAll(".participant-delete");
        deleteButtons.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault();

            const activityName = btn.getAttribute("data-activity");
            const email = btn.getAttribute("data-email");

            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
                { method: "POST" }
              );

              const result = await response.json();

              if (response.ok) {
                messageDiv.textContent = result.message;
                messageDiv.className = "success";

                // Refresh the activities to reflect the change
                await fetchActivities();
              } else {
                messageDiv.textContent = result.detail || "Unable to unregister";
                messageDiv.className = "error";
              }

              messageDiv.classList.remove("hidden");
              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 5000);
            } catch (err) {
              messageDiv.textContent = "Failed to unregister. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              console.error("Error unregistering:", err);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list so new participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
