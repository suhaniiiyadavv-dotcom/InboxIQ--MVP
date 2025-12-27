// inbox.js
import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { autoTag } from "./autoTag.js";
import { rawMails } from "./rawMails.js";
 import { seedMails } from "./seedMails.js"; // RUN ONLY ONCE IF NEEDED

const mailList = document.getElementById("mailList");
const previewBox = document.getElementById("previewBox");
const deadlineBox = document.getElementById("autoDeadlines");

let allMails = [];

/* ================= DATE EXTRACTOR ================= */
function extractDate(text) {
  const regex = /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i;
  const match = text.match(regex);
  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const monthMap = {
    jan: "01", feb: "02", mar: "03", apr: "04",
    may: "05", jun: "06", jul: "07", aug: "08",
    sep: "09", sept: "09", oct: "10", nov: "11", dec: "12"
  };

  const month = monthMap[match[2].toLowerCase()];
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
}

/* ================= AUTH FLOW ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await seedMails(user.uid);

  /* -------- LOAD MAILS FROM FIRESTORE -------- */
  const mailQuery = query(
    collection(db, "mails"),
    where("userId", "==", user.uid)
  );

  const snap = await getDocs(mailQuery);
  allMails = [];
  snap.forEach(d => allMails.push(d.data()));

  renderMails(allMails);

  /* -------- AUTO DEADLINE EXTRACTION -------- */
  for (const mail of allMails) {
    if (!mail.hasDeadline) continue;

    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    const extractedDate = extractDate(text);
    if (!extractedDate) continue;

    const existing = await getDocs(
      query(
        collection(db, "users", user.uid, "deadlines"),
        where("title", "==", mail.subject),
        where("date", "==", extractedDate),
        where("source", "==", "auto")
      )
    );

    if (existing.empty) {
      await addDoc(
        collection(db, "users", user.uid, "deadlines"),
        {
          title: mail.subject,
          date: extractedDate,
          category: mail.category,
          source: "auto"
        }
      );
    }
  }

  showDeadlines(user.uid);
});

/* ================= RENDER INBOX ================= */
function renderMails(list) {
  mailList.innerHTML = "";

  if (!list || list.length === 0) {
    mailList.innerHTML = "<p>No mails found</p>";
    return;
  }

  list.forEach(m => {
    const div = document.createElement("div");
    div.className = "card";
    if (m.hasDeadline) div.classList.add("deadline");

    div.innerHTML = `
      <h4>${m.subject}</h4>
      <small>${m.category}</small>
    `;

    div.onclick = () => showPreview(m);
    mailList.appendChild(div);
  });
}

/* ================= PREVIEW ================= */
function showPreview(mail) {
  previewBox.innerHTML = `
    <h3>${mail.subject}</h3>
    <p><b>Category:</b> ${mail.category}</p>
    <p>${mail.body}</p>
  `;
}

/* ================= DEADLINES ================= */
async function showDeadlines(uid) {
  deadlineBox.innerHTML = "<p>Loading deadlines...</p>";

  const snap = await getDocs(
    query(
      collection(db, "users", uid, "deadlines"),
      where("source", "==", "auto")
    )
  );

  if (snap.empty) {
    deadlineBox.innerHTML = "<p>No deadlines yet</p>";
    return;
  }

  deadlineBox.innerHTML = "";
  snap.forEach(d => {
    const x = d.data();
    deadlineBox.innerHTML += `
      <div class="card deadline">
        <b>${x.title}</b><br>
        ${x.date}
      </div>
    `;
  });
}

/* ================= FILTER (HTML CALL) ================= */
window.filter = function (cat) {
  renderMails(
    cat === "All"
      ? allMails
      : allMails.filter(m => m.category === cat)
  );
};
