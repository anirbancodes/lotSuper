import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { fc } from "/js/c.js";
import {
  getDoc,
  doc,
  arrayUnion,
  runTransaction,
  increment,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { fetchDate } from "./time.js";
const app = initializeApp(fc);
const db = getFirestore(app);
const auth = getAuth();

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

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    loadUserData(user.email);
  } else {
    window.location = "/pages/login.html";
  }
});

async function loadUserData(email) {
  const ref = doc(db, "super", email);
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    let data = docSnap.data();
    showUserCredits(data.name, data.credit);
    if (data.active == false) activateSuper(email, data.name);
    const ref2 = doc(db, "super", email, "online", "lotto");
    const docSnap2 = await getDoc(ref2);
    if (docSnap2.exists()) {
      let dealers = docSnap2.data().dealers;
      drawClientList(dealers);
    }
  }
}

function showUserCredits(name, credit) {
  document.getElementById("profile-name").textContent = name;
  document.getElementById("user-credit").textContent = credit;
}

async function drawClientList(data) {
  document.getElementById("dealers").innerHTML = "";

  let emails = [];
  data.forEach(async (i) => {
    let email = i.email;
    document.getElementById("dealers").innerHTML +=
      `<div class="client">
    <div style="display: flex; justify-content: space-between">
      <p>` +
      i.name +
      `</p>
      <p style="display: none;" id="day-sale-` +
      email +
      `">Day Sale: </p>
      <p class="hollow-btn-text" id="showBtn-` +
      email +
      `">Show Day Sale</p>
    </div>
    <p style="margin-top: -15px">` +
      email +
      `</p>
    <div style="display: flex; justify-content: space-around">
      <button class="btn-plum" id="add-` +
      email +
      `"><span style="font-size:13px">Send</span></button>
      <button class="btn-plum" id="subs-` +
      email +
      `"><span style="font-size:13px">Recieve</span></button>
      <button class="btn-details" id="details-` +
      email +
      `"><span style="font-size:13px">Details</span></button>
    </div>
    <input type="number" class="cred-amt"  placeholder="0" id="credAmt-` +
      email +
      `">
  </div>`;
    emails.push(email);
  });
  addDOMfunc(emails);
}

async function addDOMfunc(emails) {
  emails.forEach((u_email) => {
    let addBtn = document.getElementById(`add-${u_email}`);
    addBtn.addEventListener("click", async (e) => {
      const sEmail = auth.currentUser.email;
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      if (amount < 1) {
        alert("Enter min. 1 credit");
        return;
      }
      await addCred(sEmail, u_email, amount);
    });

    let subsBtn = document.getElementById(`subs-${u_email}`);
    subsBtn.addEventListener("click", async (e) => {
      const sEmail = auth.currentUser.email;
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      if (amount < 1) {
        alert("Enter min. 1 credit");
        return;
      }
      await subsCred(sEmail, u_email, amount);
    });

    let detailsBtn = document.getElementById(`details-${u_email}`);
    detailsBtn.addEventListener("click", async (e) => {
      window.location = `./details/index.html?d=${u_email}`;
    });

    let showBtn = document.getElementById(`showBtn-${u_email}`);
    showBtn.addEventListener("click", async (e) => {
      daySale(u_email);
    });
  });
}

async function daySale(mail) {
  let { date } = await fetchDate();
  const directref = doc(db, "dealers", mail, "offline", "lotto", "sale", date);
  const docSnap1 = await getDoc(directref);
  const indirectref = doc(db, "dealers", mail, "agentsale", date);
  const docSnap2 = await getDoc(indirectref);
  let total = 0;
  if (!docSnap1.exists() && !docSnap2.exists()) {
    document.getElementById(`showBtn-${mail}`).style.display = "none";
    document.getElementById(`day-sale-${mail}`).style.display = "";
    document.getElementById(`day-sale-${mail}`).innerHTML = "Today: ₹ 0";
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

    document.getElementById(`showBtn-${mail}`).style.display = "none";
    document.getElementById(`day-sale-${mail}`).style.display = "";
    document.getElementById(`day-sale-${mail}`).innerText = "Today: ₹ " + total;
  }
}

async function addCred(sEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();
    await runTransaction(db, async (transaction) => {
      const balance = (await transaction.get(doc(db, "super", sEmail))).data()
        .credit;
      if (balance < amount) {
        alert("Not enough balance. Add credits");
        return;
      } else {
        const creditsDateDoc = await transaction.get(
          doc(db, "super", sEmail, "credits", date)
        );

        const dealerCreditDate = await transaction.get(
          doc(db, "dealers", u_email, "superCredit", date)
        );

        if (!creditsDateDoc.exists()) {
          transaction.set(doc(db, "super", sEmail, "credits", date), {});
        }
        if (!dealerCreditDate.exists()) {
          transaction.set(doc(db, "dealers", u_email, "superCredit", date), {});
        }
        transaction.update(doc(db, "super", sEmail), {
          credit: increment(-1 * amount),
        });

        transaction.update(doc(db, "dealers", u_email), {
          credit: increment(amount),
        });
        transaction.update(doc(db, "dealers", u_email, "offline", "lotto"), {
          credit: increment(amount),
        });
        transaction.update(doc(db, "dealers", u_email, "superCredit", date), {
          lotto: arrayUnion({
            time: time,
            dg: "d",
            amt: amount,
          }),
        });
        transaction.update(doc(db, "super", sEmail, "credits", date), {
          dealers: arrayUnion({
            time: time,
            amt: -1 * amount,
            email: u_email,
          }),
        });
      }
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "super", sEmail))).data().credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    console.error(e);
    alert("Transaction failed: " + e);
  }
}

async function subsCred(sEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();

    await runTransaction(db, async (transaction) => {
      const agentBalance = (
        await transaction.get(doc(db, "dealers", u_email))
      ).data().credit;
      if (agentBalance < amount) {
        alert("Not enough balance in agent");
        return;
      } else {
        const creditsDateDoc = await transaction.get(
          doc(db, "super", sEmail, "credits", date)
        );
        const dealerCreditDate = await transaction.get(
          doc(db, "dealers", u_email, "superCredit", date)
        );

        if (!creditsDateDoc.exists()) {
          transaction.set(doc(db, "super", sEmail, "credits", date), {});
        }
        if (!dealerCreditDate.exists()) {
          transaction.set(doc(db, "dealers", u_email, "superCredit", date), {});
        }

        transaction.update(doc(db, "super", sEmail), {
          credit: increment(amount),
        });

        transaction.update(doc(db, "dealers", u_email), {
          credit: increment(-1 * amount),
        });
        transaction.update(doc(db, "dealers", u_email, "offline", "lotto"), {
          credit: increment(-1 * amount),
        });
        transaction.update(doc(db, "dealers", u_email, "superCredit", date), {
          lotto: arrayUnion({
            time: time,
            dg: "d",
            amt: -1 * amount,
          }),
        });
        transaction.update(doc(db, "super", sEmail, "credits", date), {
          dealers: arrayUnion({
            time: time,
            amt: amount,
            email: u_email,
          }),
        });
      }
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "super", sEmail))).data().credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Transaction failed: " + e);
  }
}

async function activateSuper(email, name) {
  try {
    await runTransaction(db, async (transaction) => {
      transaction.update(doc(db, "super", email), {
        active: true,
      });
      transaction.set(doc(db, "super", email, "credits", "0"), {});

      transaction.set(doc(db, "super", email, "online", "lotto"), {});

      console.log("Dealer Doc created");
    });
  } catch (e) {
    alert("Activation Failed");
    console.error(e);
  }
}
