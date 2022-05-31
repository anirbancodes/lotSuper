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
// import { fetchDate  } from "/js/time.js";
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    //showUserEmail(user.email);
    const params = new URL(document.location).searchParams;
    const dEmail = params.get("d");
    // const year = params.get("year");
    document.getElementById("dealer-name").innerHTML = dEmail;
    saleBody(dEmail);
  } else {
    window.location = "/pages/login.html";
  }
});

async function saleBody(email, date) {
  if (!date) {
    let now = new Date();
    let date1 =
      now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
    date = date1;
  }
  document.getElementById("dayTotSale").innerHTML = "-";
  const directref = doc(db, "dealers", email, "offline", "lotto", "sale", date);
  const docSnap1 = await getDoc(directref);

  const indirectref = doc(db, "dealers", email, "agentsale", date);
  const docSnap2 = await getDoc(indirectref);
  let total = 0;
  if (!docSnap1.exists() && !docSnap2.exists()) {
    document.getElementById("dayTotSale").innerHTML = "No sale on " + date;
  } else {
    if (docSnap1.exists()) {
      const saleD = docSnap1.data();
      let keys = Object.keys(saleD);
      keys.forEach((dtime) => {
        total += saleD[dtime];
      });
    }
    if (docSnap2.exists()) {
      const saleI = docSnap2.data();
      total += saleI.sale;
    }

    /* document.getElementById(
        "sale-tbody"
      ).innerHTML = `<li class="table-header">
            <div class="col">Match</div>
            <div class="col">Sale</div>
          </li>`;
      let totsale = 0;
      let keys = Object.keys(sale);
      keys.forEach((dtime) => {
        totsale += sale[dtime];
        document.getElementById("sale-tbody").innerHTML +=
          `<li class="table-row">
      <div class="col" data-label="Job Id">` +
          dtime +
          `</div>
      <div class="col" data-label="Customer Name" >` +
          sale[dtime] +
          `</div>
    </li>`;
      }); */
    document.getElementById("dayTotSale").innerHTML = total;
  }
}
const showBtn = document.getElementById("showBtn");
showBtn.addEventListener("click", () => {
  let date = document.getElementById("date").value;
  let i1 = date.indexOf("-"),
    i2 = date.lastIndexOf("-");
  date =
    date.substring(0, i1 + 1) +
    (Number(date.substring(i1 + 1, i2)) / 10) * 10 +
    "-" +
    (Number(date.substring(i2 + 1, i2 + 3)) / 10) * 10;
  const params = new URL(document.location).searchParams;
  const dEmail = params.get("d");
  saleBody(dEmail, date);
});
