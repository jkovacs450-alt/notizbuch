const SUPABASE_URL = "https://fqnbnnyymjefgyexcqmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbmJubnl5bWplZmd5ZXhjcW1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzA2ODYsImV4cCI6MjA4OTcwNjY4Nn0.reL12rWcb3hc6IDkhAh7zUVq1eDcK4rr4Mqrhpnj86A";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("note-form");
const noteIdInput = document.getElementById("note-id");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const entriesList = document.getElementById("entries-list");
const statusMessage = document.getElementById("status-message");
const refreshBtn = document.getElementById("refresh-btn");
const formTitle = document.getElementById("form-title");
const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

function formatDateTime(dateString) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function resetForm() {
  noteIdInput.value = "";
  form.reset();
  formTitle.textContent = "Neuen Eintrag schreiben";
  saveBtn.textContent = "Eintrag speichern";
  cancelEditBtn.classList.add("hidden");
}

function startEdit(entry) {
  noteIdInput.value = entry.id;
  titleInput.value = entry.title || "";
  contentInput.value = entry.content || "";
  formTitle.textContent = "Eintrag bearbeiten";
  saveBtn.textContent = "Änderungen speichern";
  cancelEditBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderEntries(entries) {
  if (!entries || entries.length === 0) {
    entriesList.innerHTML = `<p class="empty-state">Noch keine Einträge vorhanden 🌷</p>`;
    return;
  }

  entriesList.innerHTML = entries.map(entry => {
    const safeTitle = escapeHtml(entry.title || "Ohne Titel");
    const safeContent = escapeHtml(entry.content || "");
    const formattedTime = formatDateTime(entry.created_at);

    return `
      <article class="entry-card">
        <div class="entry-inner">
          <h3 class="entry-title">${safeTitle}</h3>
          <div class="entry-meta">🕒 ${formattedTime}</div>
          <p class="entry-content">${safeContent}</p>

          <div class="entry-actions">
            <button class="secondary-btn edit-btn" data-id="${entry.id}">Bearbeiten</button>
            <button class="delete-btn delete-btn-action" data-id="${entry.id}">Löschen</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".edit-btn").forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const entry = entries.find(item => item.id === id);
      if (entry) {
        startEdit(entry);
      }
    });
  });

  document.querySelectorAll(".delete-btn-action").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await deleteEntry(id);
    });
  });
}

async function loadEntries() {
  statusMessage.textContent = "Einträge werden geladen...";

  const { data, error } = await client
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    statusMessage.textContent = "Fehler beim Laden der Einträge.";
    return;
  }

  renderEntries(data);
  statusMessage.textContent = "Einträge erfolgreich geladen.";
}

async function createEntry(title, content) {
  const { error } = await client
    .from("notes")
    .insert([
      {
        title: title || "Ohne Titel",
        content: content
      }
    ]);

  if (error) {
    console.error(error);
    statusMessage.textContent = "Fehler beim Speichern.";
    return false;
  }

  statusMessage.textContent = "Eintrag gespeichert ✨";
  return true;
}

async function updateEntry(id, title, content) {
  const { error } = await client
    .from("notes")
    .update({
      title: title || "Ohne Titel",
      content: content
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    statusMessage.textContent = "Fehler beim Aktualisieren.";
    return false;
  }

  statusMessage.textContent = "Eintrag aktualisiert ✨";
  return true;
}

async function deleteEntry(id) {
  const confirmed = confirm("Willst du diesen Eintrag wirklich löschen?");
  if (!confirmed) return;

  statusMessage.textContent = "Eintrag wird gelöscht...";

  const { error } = await client
    .from("notes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    statusMessage.textContent = "Fehler beim Löschen.";
    return;
  }

  if (Number(noteIdInput.value) === id) {
    resetForm();
  }

  statusMessage.textContent = "Eintrag gelöscht.";
  await loadEntries();
}

async function handleSubmit(event) {
  event.preventDefault();

  const id = noteIdInput.value.trim();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!content) {
    statusMessage.textContent = "Bitte schreibe zuerst eine Notiz.";
    return;
  }

  statusMessage.textContent = id
    ? "Eintrag wird aktualisiert..."
    : "Eintrag wird gespeichert...";

  let success = false;

  if (id) {
    success = await updateEntry(Number(id), title, content);
  } else {
    success = await createEntry(title, content);
  }

  if (success) {
    resetForm();
    await loadEntries();
  }
}

form.addEventListener("submit", handleSubmit);
refreshBtn.addEventListener("click", loadEntries);
cancelEditBtn.addEventListener("click", resetForm);

loadEntries();