document.addEventListener("DOMContentLoaded", function() {
  const welcomeMessage = document.getElementById("welcomeMsg");
  const mainContent = document.getElementById("mainBody");
  const hasVisited = document.cookie.includes("welcomeShown=true");

  if (!hasVisited) {
    // Show the welcome message
    welcomeMessage.classList.remove("hide");
    welcomeMessage.classList.add("show");

    // Hold the welcome message for a few seconds, then fade it out
    setTimeout(() => {
      welcomeMessage.classList.add("hide"); // Start fade-out transition

      // Delay before showing main content to allow the welcome message to fade out fully
      setTimeout(() => {
        welcomeMessage.classList.add("hidden"); // Hide the welcome message
        mainContent.classList.remove("hidden"); // Make main content visible
        mainContent.classList.add("fade-in"); // Apply fade-in effect to main content
        document.body.style.overflow = "auto"; // Allow scrolling
        document.cookie = "welcomeShown=true; max-age=31536000; path=/"; // Set the cookie
      }, 1000); // Wait 1 second for fade-out to complete
    }, 3000); // Show welcome message for 3 seconds before starting fade-out
  } else {
    mainContent.classList.remove("hidden"); // Show content immediately if visited before
    mainContent.classList.add("fade-in"); // Fade in immediately if previously visited
    document.body.style.overflow = "auto";
  }
});
