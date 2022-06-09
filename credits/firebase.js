import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
  getDoc,
  doc,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { fc } from "/js/c.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
const app = initializeApp(fc);
const db = getFirestore(app);
const auth = getAuth();
import { fetchDate } from "../js/time.js";
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    //showUserEmail(user.email);
    loadUserData(user.email);
  } else {
    window.location = "/pages/login.html";
  }
});

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", (e) => {
  signOut(auth)
    .then(() => {
      //logout
    })
    .catch((error) => {
      alert(error);
    });
});

async function loadUserData(email) {
  const ref = doc(db, "super", email);
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    let data = docSnap.data();
    showUserCredits(data.name, data.credit);
    let { date } = await fetchDate();
    historyTable(email, date);
  }
}

function showUserCredits(name, credit) {
  document.getElementById("profile-name").textContent += name;
  document.getElementById("user-credit").textContent = credit;
}
async function historyTable(email, date, AC) {
  // if (!date) {
  //   let now = new Date();
  //   date = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  // }
  document.getElementById("credits-list").innerHTML = "";
  document.getElementById("comment-text").innerText = "";
  const ref = doc(db, "super", email, "credits", date);
  if (!AC) AC = "dealers";
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    const credits = docSnap.data()[AC];
    if (!credits) {
      document.getElementById(
        "comment-text"
      ).innerText = `No ${AC} credits transfer today`;
      return;
    }
    credits.forEach((i) => {
      document.getElementById("credits-list").innerHTML +=
        `<div class="client m-b-5">
      <div class="p-1-5">
        <p>` +
        i.email +
        `</p>
        <div class="card-inner">
          <p style="color: orangered">` +
        i.amt +
        `</p>
          <p>` +
        i.time +
        `</p>
        </div>
      </div>
    </div>`;
    });
  } else {
    document.getElementById("comment-text").innerText =
      "No credits transfer today";
  }
}
const showBtn = document.getElementById("showBtn");
showBtn.addEventListener("click", () => {
  let date = document.getElementById("date").value;
  let AC = document.getElementById("agent-client").value;
  if (date) {
    let i1 = date.indexOf("-"),
      i2 = date.lastIndexOf("-");
    date =
      date.substring(0, i1 + 1) +
      (Number(date.substring(i1 + 1, i2)) / 10) * 10 +
      "-" +
      (Number(date.substring(i2 + 1, i2 + 3)) / 10) * 10;
  } else if (!date) {
    let now = new Date();
    let date1 =
      now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
    date = date1;
  }

  historyTable(auth.currentUser.email, date, AC);
});
