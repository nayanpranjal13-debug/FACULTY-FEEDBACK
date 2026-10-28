// Faculty Feedback Portal - beginner-friendly JavaScript demo
const COURSES = [
  { id: "CSE111", code: "CSE111", name: "Orientation To Computing", faculty: "Dr. Atul Malhotra" },
  { id: "MTH165", code: "MT165", name: "Engineering Mathematics", faculty: "Dr. Pradeep Kumar" },
  { id: "MEC136", code: "MEC136", name: "Engineering Drawing With Autocad", faculty: "Dr. Jaspreet Singh" },
  { id: "CSE326", code: "CSE326", name: "Internet Programming", faculty: "Khusi Sharma" }
];

const FEEDBACK_KEY = "facultyPortalFeedback";
const SESSION_KEY = "facultyPortalSession";

function getFeedback() {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || []; }
  catch (error) { return []; }
}
function saveFeedback(items) {
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items));
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch (error) { return null; }
}
function currentStudent() {
  const session = getSession();
  return session && session.role === "student" ? session.username : "12345";
}
function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function overallRating(item) {
  return average([item.ratings.teaching, item.ratings.clarity, item.ratings.punctuality, item.ratings.content, item.ratings.overall]);
}
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function showWelcome() {
  const welcome = document.getElementById("welcomeText");
  if (welcome) {
    const session = getSession();
    welcome.textContent = session ? `Welcome, ${session.username}` : "Welcome, 12345";
  }
}
function requireRole(role) {
  const session = getSession();
  if (!session || session.role !== role) {
    // For ease of classroom testing, send visitors to the login page.
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// Login page
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const passwordGroup = document.getElementById("passwordGroup");
  const usernameLabel = document.getElementById("usernameLabel");
  const usernameInput = document.getElementById("username");

  function updateRoleUI() {
    const role = document.querySelector('input[name="role"]:checked').value;
    const isStudent = role === "student";
    // Toggle password field
    if (passwordGroup) passwordGroup.classList.toggle("hidden", isStudent);
    // Switch label and placeholder
    if (usernameLabel) usernameLabel.textContent = isStudent ? "Registration Number" : "UID";
    if (usernameInput) {
      usernameInput.placeholder = isStudent ? "Enter Registration Number" : "Enter UID";
      usernameInput.inputMode = isStudent ? "text" : "numeric";
    }
    // Clear the field when switching roles
    if (usernameInput) usernameInput.value = "";
  }

  // Strip non-numeric characters from UID input when faculty is selected
  usernameInput.addEventListener("input", () => {
    const role = document.querySelector('input[name="role"]:checked').value;
    if (role === "faculty") {
      usernameInput.value = usernameInput.value.replace(/\D/g, "");
    }
  });

  document.querySelectorAll('input[name="role"]').forEach(radio =>
    radio.addEventListener("change", updateRoleUI)
  );
  updateRoleUI(); // apply correct state on page load

  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.querySelector('input[name="role"]:checked').value;
    const error = document.getElementById("loginError");
    let valid = false;

    if (role === "student" && username.length > 0) valid = true;
    if (role === "faculty" && /^\d+$/.test(username) && password.length > 0) valid = true;

    if (!valid) {
      error.textContent = role === "student"
        ? "Please enter your registration number."
        : role === "faculty" && !/^\d+$/.test(username)
          ? "UID must contain numbers only."
          : "Please enter your UID and password.";
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username, role }));
    window.location.href = role === "faculty" ? "admin.html" : "feedback.html";
  });
}

// Logout buttons
document.querySelectorAll("[data-logout]").forEach(button => {
  button.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });
});

// Student course page and feedback form
const courseList = document.getElementById("courseList");
if (courseList) {
  if (!requireRole("student")) {
    // Redirect is handled by requireRole.
  } else {
    showWelcome();
    renderCourses();
  }
}
function renderCourses() {
  const items = getFeedback().filter(item => item.studentId === currentStudent());
  courseList.innerHTML = COURSES.map(course => {
    const submitted = items.some(item => item.courseId === course.id);
    return `<article class="course-card">
      <div>
        <span class="course-code">${course.code}</span>
        <h3>${escapeHTML(course.name)}</h3>
        <p>${escapeHTML(course.faculty)}</p>
      </div>
      <div class="course-action">
        <span class="status ${submitted ? "status-done" : "status-pending"}">${submitted ? "Feedback Submitted" : "Pending"}</span>
        <button class="button ${submitted ? "button-light" : "button-primary"} course-button" data-course="${course.id}" ${submitted ? "disabled" : ""}>${submitted ? "Completed" : "Give Feedback"}</button>
      </div>
    </article>`;
  }).join("");
  courseList.querySelectorAll("[data-course]").forEach(button => {
    button.addEventListener("click", () => openFeedback(button.dataset.course));
  });
}
const feedbackSection = document.getElementById("feedbackSection");
const feedbackForm = document.getElementById("feedbackForm");
const successPanel = document.getElementById("successPanel");
let selectedRatings = { teaching: 0, clarity: 0, punctuality: 0, content: 0, overall: 0 };

function createStarControls() {
  document.querySelectorAll(".stars").forEach(group => {
    const category = group.dataset.rating;
    group.innerHTML = [1, 2, 3, 4, 5].map(number =>
      `<button type="button" class="star" data-value="${number}" aria-label="${number} out of 5 stars" aria-pressed="false">★</button>`
    ).join("");
    group.querySelectorAll(".star").forEach(star => {
      star.addEventListener("click", () => {
        selectedRatings[category] = Number(star.dataset.value);
        updateStars(group, category);
        updateRatingHint();
      });
    });
  });
}
function updateStars(group, category) {
  group.querySelectorAll(".star").forEach(star => {
    const selected = Number(star.dataset.value) <= selectedRatings[category];
    star.classList.toggle("selected", selected);
    star.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}
function updateRatingHint() {
  const hint = document.getElementById("ratingHint");
  if (!hint) return;
  const count = Object.values(selectedRatings).filter(value => value > 0).length;
  hint.textContent = count === 5 ? "All ratings selected." : `Please rate all five categories (${count}/5 selected).`;
}
function openFeedback(courseId) {
  const course = COURSES.find(item => item.id === courseId);
  if (!course) return;
  document.getElementById("courseId").value = course.id;
  document.getElementById("selectedCourseText").textContent = `${course.code} - ${course.name} · Faculty: ${course.faculty}`;
  selectedRatings = { teaching: 0, clarity: 0, punctuality: 0, content: 0, overall: 0 };
  document.querySelectorAll(".stars").forEach(group => updateStars(group, group.dataset.rating));
  document.getElementById("comments").value = "";
  document.getElementById("feedbackError").textContent = "";
  courseList.classList.add("hidden");
  feedbackSection.classList.remove("hidden");
  feedbackSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
if (feedbackForm) {
  createStarControls();
  const closeFeedback = document.getElementById("closeFeedback");
  if (closeFeedback) closeFeedback.addEventListener("click", () => {
    feedbackSection.classList.add("hidden");
    courseList.classList.remove("hidden");
  });
}
if (feedbackForm) {
  feedbackForm.addEventListener("submit", event => {
    event.preventDefault();
    const error = document.getElementById("feedbackError");
    if (Object.values(selectedRatings).some(value => value === 0)) {
      error.textContent = "Please select a rating for each of the five categories.";
      return;
    }
    const courseId = document.getElementById("courseId").value;
    const existing = getFeedback();
    if (existing.some(item => item.courseId === courseId && item.studentId === currentStudent())) {
      error.textContent = "You have already submitted feedback for this course.";
      return;
    }
    const course = COURSES.find(item => item.id === courseId);
    existing.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      studentId: currentStudent(),
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      faculty: course.faculty,
      ratings: { ...selectedRatings },
      comments: document.getElementById("comments").value.trim(),
      date: new Date().toISOString()
    });
    saveFeedback(existing);
    feedbackSection.classList.add("hidden");
    courseList.classList.add("hidden");
    successPanel.classList.remove("hidden");
  });
}

// Student feedback history
const historyTable = document.getElementById("historyTable");
if (historyTable) {
  if (requireRole("student")) {
    showWelcome();
    const items = getFeedback().filter(item => item.studentId === currentStudent()).sort((a, b) => b.date.localeCompare(a.date));
    historyTable.innerHTML = items.map((item, index) => `<tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHTML(item.courseCode)}</strong><br>${escapeHTML(item.courseName)}</td>
      <td>${escapeHTML(item.faculty)}</td>
      <td class="rating-number">${overallRating(item).toFixed(1)} / 5</td>
      <td>${formatDate(item.date)}</td>
      <td>${item.comments ? escapeHTML(item.comments) : '<span class="muted-text">No comment</span>'}</td>
    </tr>`).join("");
    document.getElementById("emptyHistory").classList.toggle("hidden", items.length > 0);
  }
}

// Admin overview
const adminCourses = document.getElementById("adminCourses");
if (adminCourses) {
  if (requireRole("faculty")) {
    showWelcome();
    renderAdmin();

    // Section switching: Dashboard / Courses & Faculty / View Feedback
    const adminNavLinks = document.querySelectorAll("[data-admin-nav]");
    const adminCoursesSection = document.getElementById("courses");
    const adminFeedbackSection = document.getElementById("feedback");

    function showAdminSection(target) {
      adminNavLinks.forEach(l => l.classList.remove("active"));
      const active = document.querySelector(`[data-admin-nav="${target}"]`);
      if (active) active.classList.add("active");

      adminCoursesSection.classList.toggle("hidden", target !== "courses");
      adminFeedbackSection.classList.toggle("hidden", target !== "feedback");
    }

    adminNavLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        showAdminSection(link.dataset.adminNav);
      });
    });

    // Default: show dashboard (stats only)
    showAdminSection("dashboard");
  }
}
function renderAdmin() {
  const feedback = getFeedback();
  document.getElementById("totalCourses").textContent = COURSES.length;
  document.getElementById("totalFeedback").textContent = feedback.length;
  document.getElementById("averageRating").textContent = feedback.length
    ? `${average(feedback.map(overallRating)).toFixed(1)} / 5`
    : "—";
  adminCourses.innerHTML = COURSES.map(course => `<tr>
    <td><strong>${course.code}</strong></td><td>${escapeHTML(course.name)}</td><td>${escapeHTML(course.faculty)}</td>
  </tr>`).join("");
  const feedbackBody = document.getElementById("adminFeedback");
  feedbackBody.innerHTML = feedback.slice().sort((a, b) => b.date.localeCompare(a.date)).map(item => `<tr>
    <td><strong>${escapeHTML(item.courseCode)}</strong><br>${escapeHTML(item.courseName)}</td>
    <td>${escapeHTML(item.faculty)}</td>
    <td class="rating-number">${overallRating(item).toFixed(1)} / 5</td>
    <td>${item.comments ? escapeHTML(item.comments) : '<span class="muted-text">No comment</span>'}</td>
    <td>${formatDate(item.date)}</td>
  </tr>`).join("");
  document.getElementById("adminEmpty").classList.toggle("hidden", feedback.length > 0);
}
