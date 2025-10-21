function updateNavbar() {
  const navLinks = document.querySelector('.nav-links');
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (isAdmin) {
    navLinks.innerHTML = `
      <li><a href="./admin.html" class="active">Dashboard</a></li>
      <li><a href="./admin.html#view-items">Items</a></li>
      <li><a href="./admin.html#view-users">Users</a></li>
      <li><a href="#" id="logoutBtn">Logout</a></li>
    `;
  } else if (isLoggedIn) {
    navLinks.innerHTML = `
      <li><a href="./home.html" class="active">Home</a></li>
      <li><a href="./lost.html">Lost Items</a></li>
      <li><a href="./found.html">Found Items</a></li>
      <li><a href="#" id="logoutBtn">Logout</a></li>
    `;
  } else {
    navLinks.innerHTML = `
      <li><a href="./home.html">Home</a></li>
      <li><a href="./lost.html">Lost Items</a></li>
      <li><a href="./found.html">Found Items</a></li>
      <li><a href="./login.html" class="active">Login</a></li>
    `;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("isAdmin");
      window.location.href = "login.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", updateNavbar);
