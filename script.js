const USERS_KEY = "cloud_users";
const SESSION_KEY = "cloud_session";
const THEME_KEY = "cloud_theme";
const POLICY_KEY = "cloud_policy";

let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
let session = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;

let policy = JSON.parse(localStorage.getItem(POLICY_KEY)) || {
  min: 2,
  max: 8,
  target: 60,
  mode: "balanced"
};

let traffic = 120;
let instances = policy.min;
let cpu = 45;
let alertsOn = true;

const $ = (id) => document.getElementById(id);

function saveData() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
}

function log(message) {
  const entry = document.createElement("div");
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  $("logBox").prepend(entry);
}

function showAuth(view) {
  $("loginCard").classList.toggle("hidden", view !== "login");
  $("signupCard").classList.toggle("hidden", view !== "signup");
}

function signupUser() {
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim().toLowerCase();
  const password = $("signupPassword").value.trim();

  if (!name || !email || !password) {
    alert("Please fill all signup fields.");
    return;
  }

  if (users.some(user => user.email === email)) {
    alert("Email already exists.");
    return;
  }

  users.push({ name, email, password });
  saveData();

  alert("Account created successfully. Please login.");
  $("signupName").value = "";
  $("signupEmail").value = "";
  $("signupPassword").value = "";
  showAuth("login");
}

function loginUser() {
  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value.trim();

  const user = users.find(
    user => user.email === email && user.password === password
  );

  if (!user) {
    alert("Invalid email or password.");
    return;
  }

  session = {
    name: user.name,
    email: user.email
  };

  saveData();
  render();
  log(`User ${user.name} logged in.`);
}

function logoutUser() {
  session = null;
  saveData();
  render();
  log("User logged out.");
}

function toggleTheme() {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";

  const newTheme = isDark ? "light" : "dark";

  if (newTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  localStorage.setItem(THEME_KEY, newTheme);
}

function loadTheme() {
  if (localStorage.getItem(THEME_KEY) === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function savePolicy() {
  const min = Math.max(1, parseInt($("minInput").value) || 2);
  const max = Math.max(min + 1, parseInt($("maxInput").value) || 8);
  const target = Math.min(
    95,
    Math.max(10, parseInt($("targetInput").value) || 60)
  );

  policy = {
    min,
    max,
    target,
    mode: $("modeSelect").value
  };

  instances = Math.min(Math.max(instances, min), max);

  saveData();
  updateDashboard();
  log("Auto scaling policy updated.");
}

function setTraffic(value) {
  traffic = Math.max(20, Math.min(500, value));
  $("trafficSlider").value = traffic;
  updateDashboard();
}

function increaseTraffic(amount) {
  setTraffic(traffic + amount);
  log(`Traffic increased to ${traffic}.`);
}

function decreaseTraffic(amount) {
  setTraffic(traffic - amount);
  log(`Traffic decreased to ${traffic}.`);
}

function scaleUp() {
  if (instances < policy.max) {
    instances++;
    updateDashboard();
    log("Manual scale up performed.");
  } else {
    log("Maximum instance limit reached.");
  }
}

function scaleDown() {
  if (instances > policy.min) {
    instances--;
    updateDashboard();
    log("Manual scale down performed.");
  } else {
    log("Minimum instance limit reached.");
  }
}

function toggleAlerts() {
  alertsOn = !alertsOn;
  $("alertText").textContent = alertsOn ? "Enabled" : "Muted";
  log(`Alerts ${alertsOn ? "enabled" : "muted"}.`);
}

function runHealthCheck() {
  const healthy = Math.random() > 0.12;

  $("healthText").textContent = healthy ? "OK" : "Warning";
  $("healthText").style.color = healthy ? "#16a34a" : "#dc2626";

  log(
    healthy
      ? "Health check passed."
      : "Health check detected a warning."
  );
}

function renderInstances() {
  $("instancesBox").innerHTML = "";

  for (let i = 1; i <= instances; i++) {
    const instance = document.createElement("div");
    instance.className = "instance";
    instance.textContent = `Instance ${i}`;
    $("instancesBox").appendChild(instance);
  }
}

function updateDashboard() {
  cpu = Math.min(
    100,
    Math.max(5, Math.round(traffic / (instances * 2.5)))
  );

  const response = Math.max(
    70,
    Math.round(420 - instances * 35 - (100 - cpu))
  );

  // Automatic scaling decision
  let status = "System stable. No scaling needed.";

  if (cpu > policy.target && instances < policy.max) {
    instances++;
    status = "High load detected. Scaling out automatically.";

    if (alertsOn) {
      $("alertText").textContent = "Scale out triggered";
    }

    log("Auto scale out triggered.");
  } else if (cpu < 30 && instances > policy.min) {
    instances--;
    status = "Low load detected. Scaling in automatically.";

    if (alertsOn) {
      $("alertText").textContent = "Scale in triggered";
    }

    log("Auto scale in triggered.");
  } else if (alertsOn) {
    $("alertText").textContent = "None";
  }

  $("trafficValue").textContent = traffic;
  $("cpuValue").textContent = `${cpu}%`;
  $("instanceValue").textContent = instances;
  $("responseValue").textContent = `${response} ms`;
  $("cpuBar").style.width = `${cpu}%`;
  $("statusBox").textContent = status;

  $("modeText").textContent =
    `Mode: ${policy.mode.charAt(0).toUpperCase()}${policy.mode.slice(1)}`;

  $("minInput").value = policy.min;
  $("maxInput").value = policy.max;
  $("targetInput").value = policy.target;
  $("modeSelect").value = policy.mode;

  $("userPill").textContent = session ? session.name : "Guest";

  renderInstances();
  saveData();
}

function render() {
  if (session) {
    $("authArea").classList.add("hidden");
    $("dashboardArea").classList.remove("hidden");

    $("profileName").textContent = session.name;
    $("profileEmail").textContent = session.email;

    updateDashboard();
  } else {
    $("authArea").classList.remove("hidden");
    $("dashboardArea").classList.add("hidden");
    $("userPill").textContent = "Guest";
    showAuth("login");
  }
}

$("trafficSlider").addEventListener("input", () => {
  traffic = parseInt($("trafficSlider").value);
  updateDashboard();
});

loadTheme();
render();
log("Dashboard initialized.");

setInterval(() => {
  if (!session) return;

  const change = Math.random() > 0.5 ? 15 : -10;
  traffic = Math.max(20, Math.min(500, traffic + change));

  $("trafficSlider").value = traffic;
  updateDashboard();
}, 3000);
