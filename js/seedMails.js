import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { rawMails } from "./rawMails.js";
import { autoTag } from "./autoTag.js";

export async function seedMails(userId) {
  // 🔥 Check if mails already exist for this user
  const q = query(
    collection(db, "mails"),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log("✅ Mails already seeded for this user");
    return;
  }

  // 🔥 Seed mails for NEW user
  for (const mail of rawMails) {
    const meta = autoTag(mail);

    await addDoc(collection(db, "mails"), {
      subject: mail.subject,
      body: mail.body,
      category: meta.category,
      hasDeadline: meta.hasDeadline,
      userId: userId
    });
  }

  console.log("🔥 Mails seeded for new user:", userId);
}
