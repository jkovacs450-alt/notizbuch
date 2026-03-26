const SUPABASE_URL = "https://aqywsdunjtsizpdfcaqu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeXdzZHVuanRzaXpwZGZjYXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAwMDUsImV4cCI6MjA5MDEwNjAwNX0.tXjcNvMzAzoVDTtTyn2b_f1cU3qcX3cwoR0Cm64T2ec";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Screens
const authScreen = document.getElementById("auth-screen");
const notebookScreen = document.getElementById("notebook-screen");

// Auth
const authNameInput = document.getElementById("auth-name");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");

// Header profile
const headerAvatar = document.getElementById("header-avatar");
const headerName = document.getElementById("header-name");
const headerEmail = document.getElementById("header-email");
const openProfileBtn = document.getElementById("open-profile-btn");

// Profile modal
const profileModal = document.getElementById("profile-modal");
const closeProfileBtn = document.getElementById("close-profile-btn");
const profileNameInput = document.getElementById("profile-name");
const profileBioInput = document.getElementById("profile-bio");
const profileImageInput = document.getElementById("profile-image");
const profilePreviewImage = document.getElementById("profile-preview-image");
const saveProfileBtn = document.getElementById("save-profile-btn");

// Tabs
const tabPublic = document.getElementById("tab-public");
const tabPrivate = document.getElementById("tab-private");

// Note form
const noteForm = document.getElementById("note-form");
const noteIdInput = document.getElementById("note-id");
const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const colorTagInput = document.getElementById("color-tag");
const isFavoriteInput = document.getElementById("is-favorite");
const contentInput = document.getElementById("content");
const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

// Filters
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const colorFilter = document.getElementById("color-filter");
const sortFilter = document.getElementById("sort-filter");
const favoritesOnlyInput = document.getElementById("favorites-only");
const clearFiltersBtn = document.getElementById("clear-filters-btn");

// UI
const editorTitle = document.getElementById("editor-title");
const editorSubtitle = document.getElementById("editor-subtitle");
const visibilityBadge = document.getElementById("visibility-badge");
const listTitle = document.getElementById("list-title");
const resultsInfo = document.getElementById("results-info");
const refreshBtn = document.getElementById("refresh-btn");
const liveStatus = document.getElementById("live-status");
const statusMessage = document.getElementById("status-message");
const statsText = document.getElementById("stats-text");
const notesList = document.getElementById("notes-list");

let currentUser = null;
let currentProfile = null;
let currentTab = "public";
let realtimeChannel = null;
let allNotes = [];

function setStatus(message) {
  statusMessage.textContent = message;
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function defaultAvatar(name = "U") {
  const letter = encodeURIComponent((name || "U").trim().charAt(0).toUpperCase() || "U");
  return `https://placehold.co/120x120?text=${letter}`;
}

function toggleScreens(isLoggedIn) {
  authScreen.classList.toggle("hidden", isLoggedIn);
  notebookScreen.classList.toggle("hidden", !isLoggedIn);
}

function updateTabUI() {
  const isPrivate = currentTab === "private";

  tabPublic.classList.toggle("active", !isPrivate);
  tabPrivate.classList.toggle("active", isPrivate);

  editorTitle.textContent = isPrivate ? "Neue private Notiz" : "Neue öffentliche Notiz";
  editorSubtitle.textContent = isPrivate
    ? "Nur du kannst diese Notizen sehen."
    : "Diese Notizen sind für alle sichtbar.";

  listTitle.textContent = isPrivate ? "Private Notizen" : "Öffentliche Notizen";
  visibilityBadge.textContent = isPrivate ? "Privat" : "Öffentlich";

  if (isPrivate) {
    visibilityBadge.style.background = "#f2ecff";
    visibilityBadge.style.borderColor = "#d8caf7";
  } else {
    visibilityBadge.style.background = "#fff2e6";
    visibilityBadge.style.borderColor = "#efcfb1";
  }
}

function saveDraftLocally() {
  const draft = {
    title: titleInput.value,
    content: contentInput.value,
    category: categoryInput.value,
    color_tag: colorTagInput.value,
    is_favorite: isFavoriteInput.checked,
    tab: currentTab
  };
  localStorage.setItem("cozy-notebook-draft", JSON.stringify(draft));
}

function loadDraftLocally() {
  const raw = localStorage.getItem("cozy-notebook-draft");
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    if (!noteIdInput.value) {
      titleInput.value = draft.title || "";
      contentInput.value = draft.content || "";
      categoryInput.value = draft.category || "allgemein";
      colorTagInput.value = draft.color_tag || "standard";
      isFavoriteInput.checked = Boolean(draft.is_favorite);
    }
  } catch (error) {
    console.error(error);
  }
}

function clearDraftLocally() {
  localStorage.removeItem("cozy-notebook-draft");
}

function resetForm() {
  noteIdInput.value = "";
  noteForm.reset();
  categoryInput.value = "allgemein";
  colorTagInput.value = "standard";
  isFavoriteInput.checked = false;
  saveBtn.textContent = "Eintrag speichern";
  cancelEditBtn.classList.add("hidden");
  clearDraftLocally();
  updateTabUI();
}

function resetFilters() {
  searchInput.value = "";
  categoryFilter.value = "all";
  colorFilter.value = "all";
  sortFilter.value = "updated";
  favoritesOnlyInput.checked = false;
}

function openProfileModal() {
  if (!currentUser) return;
  profileNameInput.value = currentProfile?.display_name || "";
  profileBioInput.value = currentProfile?.bio || "";
  profilePreviewImage.src = currentProfile?.avatar_url || defaultAvatar(currentProfile?.display_name || currentUser.email);
  profileModal.classList.remove("hidden");
}

function closeProfileModal() {
  profileModal.classList.add("hidden");
  profileImageInput.value = "";
}

function applyFilters(notes) {
  let filtered = [...notes];

  const searchTerm = searchInput.value.trim().toLowerCase();
  const categoryValue = categoryFilter.value;
  const colorValue = colorFilter.value;
  const sortValue = sortFilter.value;
  const favoritesOnly = favoritesOnlyInput.checked;

  if (searchTerm) {
    filtered = filtered.filter((note) => {
      const haystack = `${note.title || ""} ${note.content || ""} ${note.display_name || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  if (categoryValue !== "all") {
    filtered = filtered.filter((note) => note.category === categoryValue);
  }

  if (colorValue !== "all") {
    filtered = filtered.filter((note) => note.color_tag === colorValue);
  }

  if (favoritesOnly) {
    filtered = filtered.filter((note) => note.is_favorite === true);
  }

  if (sortValue === "newest") {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortValue === "oldest") {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else {
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  return filtered;
}

function updateStats(notes) {
  const total = notes.length;
  const favorites = notes.filter((note) => note.is_favorite).length;
  statsText.textContent = `${total} Einträge · ${favorites} Favoriten`;
}

function renderNotes() {
  const filtered = applyFilters(allNotes);
  resultsInfo.textContent = `${filtered.length} Einträge`;
  updateStats(filtered);

  if (filtered.length === 0) {
    notesList.innerHTML = `<p class="empty-state">Keine passenden Notizen gefunden 🌷</p>`;
    return;
  }

  notesList.innerHTML = filtered.map((note) => {
    const isOwner = currentUser && note.owner_id === currentUser.id;
    const avatar = note.avatar_url || defaultAvatar(note.display_name || "U");
    const displayName = note.display_name || "Unbekannt";
    const visibility = note.is_private ? "🔒 Privat" : "🌍 Öffentlich";
    const category = note.category || "allgemein";
    const colorTag = note.color_tag || "standard";
    const favorite = note.is_favorite ? `<span class="tag favorite-star">⭐ Favorit</span>` : "";

    return `
      <article class="note-card ${escapeHtml(colorTag)}">
        <div class="note-inner">
          <div class="note-head">
            <div class="note-user">
              <img class="note-avatar" src="${escapeHtml(avatar)}" alt="Profilbild von ${escapeHtml(displayName)}" />
              <div>
                <h3 class="note-title">${escapeHtml(note.title || "Ohne Titel")}</h3>
                <div class="note-meta">
                  von ${escapeHtml(displayName)}<br>
                  Erstellt: ${escapeHtml(formatDateTime(note.created_at))}<br>
                  Aktualisiert: ${escapeHtml(formatDateTime(note.updated_at))}
                </div>
              </div>
            </div>

            <div class="note-tags">
              <span class="tag">${escapeHtml(visibility)}</span>
              <span class="tag">🏷️ ${escapeHtml(category)}</span>
              ${favorite}
            </div>
          </div>

          <p class="note-content">${escapeHtml(note.content || "")}</p>

          ${
            isOwner
              ? `
                <div class="note-actions">
                  <button class="btn btn-secondary edit-btn" data-id="${note.id}">Bearbeiten</button>
                  <button class="btn btn-danger delete-btn" data-id="${note.id}">Löschen</button>
                </div>
              `
              : ""
          }
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const note = allNotes.find((item) => item.id === id);
      if (!note) return;

      noteIdInput.value = note.id;
      titleInput.value = note.title || "";
      categoryInput.value = note.category || "allgemein";
      colorTagInput.value = note.color_tag || "standard";
      isFavoriteInput.checked = Boolean(note.is_favorite);
      contentInput.value = note.content || "";
      saveBtn.textContent = "Änderungen speichern";
      cancelEditBtn.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await deleteNote(id);
    });
  });
}

async function fetchProfile(userId) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

function updateHeaderProfile() {
  const displayName = currentProfile?.display_name || currentUser?.email || "Profil";
  const avatar = currentProfile?.avatar_url || defaultAvatar(displayName);

  headerName.textContent = displayName;
  headerEmail.textContent = currentUser?.email || "";
  headerAvatar.src = avatar;
}

async function getCurrentUser() {
  const { data, error } = await client.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return data.user || null;
}

async function signUp() {
  const name = authNameInput.value.trim();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!email || !password) {
    setAuthStatus("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  setAuthStatus("Registrierung läuft...");

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name || ""
      }
    }
  });

  if (error) {
    console.error(error);
    setAuthStatus(`Registrierung fehlgeschlagen: ${error.message}`);
    return;
  }

  if (data.session) {
    setAuthStatus("Account erstellt und eingeloggt ✨");
  } else {
    setAuthStatus("Account erstellt. Falls nötig, bestätige deine E-Mail.");
  }
}

async function signIn() {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!email || !password) {
    setAuthStatus("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  setAuthStatus("Login läuft...");

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    setAuthStatus(`Login fehlgeschlagen: ${error.message}`);
    return;
  }

  setAuthStatus("Erfolgreich eingeloggt ✨");
}

async function signOut() {
  const { error } = await client.auth.signOut();

  if (error) {
    console.error(error);
    setStatus(`Logout fehlgeschlagen: ${error.message}`);
    return;
  }

  currentUser = null;
  currentProfile = null;
  allNotes = [];
  currentTab = "public";
  toggleScreens(false);
  closeProfileModal();
}

async function uploadAvatar(file, userId) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data } = client.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function saveProfile() {
  if (!currentUser) return;

  setStatus("Profil wird gespeichert...");

  let avatarUrl = currentProfile?.avatar_url || null;
  const selectedFile = profileImageInput.files?.[0];

  try {
    if (selectedFile) {
      avatarUrl = await uploadAvatar(selectedFile, currentUser.id);
    }

    const { error } = await client
      .from("profiles")
      .update({
        display_name: profileNameInput.value.trim() || currentUser.email,
        bio: profileBioInput.value.trim(),
        avatar_url: avatarUrl
      })
      .eq("id", currentUser.id);

    if (error) {
      console.error(error);
      setStatus(`Profil konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    currentProfile = await fetchProfile(currentUser.id);
    updateHeaderProfile();
    closeProfileModal();
    await loadNotes(false);
    setStatus("Profil gespeichert ✨");
  } catch (error) {
    console.error(error);
    setStatus(`Profilbild konnte nicht hochgeladen werden: ${error.message}`);
  }
}

async function loadNotes(showMessage = true) {
  if (!currentUser) return;

  if (showMessage) setStatus("Notizen werden geladen...");

  const { data, error } = await client
    .from("notes_with_profiles")
    .select("*")
    .eq("is_private", currentTab === "private");

  if (error) {
    console.error(error);
    setStatus(`Fehler beim Laden: ${error.message}`);
    return;
  }

  allNotes = data || [];
  renderNotes();

  if (showMessage) setStatus("Notizen erfolgreich geladen.");
}

async function createNote() {
  if (!currentUser) {
    setStatus("Bitte zuerst einloggen.");
    return false;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!content) {
    setStatus("Bitte schreibe zuerst eine Notiz.");
    return false;
  }

  const { error } = await client
    .from("notes")
    .insert([{
      owner_id: currentUser.id,
      title: title || "Ohne Titel",
      content,
      is_private: currentTab === "private",
      category: categoryInput.value,
      color_tag: colorTagInput.value,
      is_favorite: isFavoriteInput.checked
    }]);

  if (error) {
    console.error(error);
    setStatus(`Fehler beim Speichern: ${error.message}`);
    return false;
  }

  setStatus("Notiz gespeichert ✨");
  return true;
}

async function updateNote() {
  if (!currentUser) return false;

  const noteId = Number(noteIdInput.value);
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!content) {
    setStatus("Bitte schreibe zuerst eine Notiz.");
    return false;
  }

  const { error } = await client
    .from("notes")
    .update({
      title: title || "Ohne Titel",
      content,
      category: categoryInput.value,
      color_tag: colorTagInput.value,
      is_favorite: isFavoriteInput.checked,
      is_private: currentTab === "private"
    })
    .eq("id", noteId)
    .eq("owner_id", currentUser.id);

  if (error) {
    console.error(error);
    setStatus(`Fehler beim Aktualisieren: ${error.message}`);
    return false;
  }

  setStatus("Notiz aktualisiert ✨");
  return true;
}

async function deleteNote(id) {
  if (!currentUser) return;

  const confirmed = confirm("Willst du diese Notiz wirklich löschen?");
  if (!confirmed) return;

  const { error } = await client
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("owner_id", currentUser.id);

  if (error) {
    console.error(error);
    setStatus(`Fehler beim Löschen: ${error.message}`);
    return;
  }

  if (Number(noteIdInput.value) === id) {
    resetForm();
  }

  setStatus("Notiz gelöscht.");
}

async function handleNoteSubmit(event) {
  event.preventDefault();

  const isEditing = Boolean(noteIdInput.value.trim());
  const success = isEditing ? await updateNote() : await createNote();

  if (success) {
    resetForm();
  }
}

function setupRealtime() {
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel);
  }

  realtimeChannel = client
    .channel("cozy-notebook-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, async () => {
      await loadNotes(false);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
      if (currentUser) {
        currentProfile = await fetchProfile(currentUser.id);
        updateHeaderProfile();
      }
      await loadNotes(false);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        liveStatus.textContent = "Live-Synchronisierung aktiv ✨";
      } else {
        liveStatus.textContent = `Live-Status: ${status}`;
      }
    });
}

signupBtn.addEventListener("click", signUp);
loginBtn.addEventListener("click", signIn);
logoutBtn.addEventListener("click", signOut);

tabPublic.addEventListener("click", async () => {
  currentTab = "public";
  updateTabUI();
  resetForm();
  await loadNotes(true);
});

tabPrivate.addEventListener("click", async () => {
  currentTab = "private";
  updateTabUI();
  resetForm();
  await loadNotes(true);
});

noteForm.addEventListener("submit", handleNoteSubmit);
cancelEditBtn.addEventListener("click", resetForm);
refreshBtn.addEventListener("click", () => loadNotes(true));

searchInput.addEventListener("input", renderNotes);
categoryFilter.addEventListener("change", renderNotes);
colorFilter.addEventListener("change", renderNotes);
sortFilter.addEventListener("change", renderNotes);
favoritesOnlyInput.addEventListener("change", renderNotes);

clearFiltersBtn.addEventListener("click", () => {
  resetFilters();
  renderNotes();
});

openProfileBtn.addEventListener("click", openProfileModal);
closeProfileBtn.addEventListener("click", closeProfileModal);
saveProfileBtn.addEventListener("click", saveProfile);

profileImageInput.addEventListener("change", () => {
  const file = profileImageInput.files?.[0];
  if (!file) return;
  profilePreviewImage.src = URL.createObjectURL(file);
});

titleInput.addEventListener("input", saveDraftLocally);
contentInput.addEventListener("input", saveDraftLocally);
categoryInput.addEventListener("change", saveDraftLocally);
colorTagInput.addEventListener("change", saveDraftLocally);
isFavoriteInput.addEventListener("change", saveDraftLocally);

client.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user || null;

  if (currentUser) {
    currentProfile = await fetchProfile(currentUser.id);
    toggleScreens(true);
    updateHeaderProfile();
    updateTabUI();
    loadDraftLocally();
    await loadNotes(true);
  } else {
    toggleScreens(false);
  }
});

(async function init() {
  currentUser = await getCurrentUser();

  if (currentUser) {
    currentProfile = await fetchProfile(currentUser.id);
    toggleScreens(true);
    updateHeaderProfile();
    updateTabUI();
    loadDraftLocally();
    setupRealtime();
    await loadNotes(true);
  } else {
    toggleScreens(false);
    setupRealtime();
  }
})();