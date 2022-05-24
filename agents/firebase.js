const firebaseConfig = {
  apiKey: "AIzaSyAVgBu0P69xgUHnZ2Cc4G5IX6gHtb4-MBE",
  authDomain: "qclottery.firebaseapp.com",
  projectId: "qclottery",
  storageBucket: "qclottery.appspot.com",
  messagingSenderId: "650163027647",
  appId: "1:650163027647:web:961de905315b549657500a",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getDoc,
  doc,
  arrayUnion,
  runTransaction,
  increment,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { fetchDate } from "../js/time.js";
const app = initializeApp(firebaseConfig);
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
  const ref = doc(db, "dealers", email);
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    let data = docSnap.data();
    showUserCredits(data.name, data.credit);
    const ref2 = doc(db, "dealers", email, "online", "lotto");
    const docSnap2 = await getDoc(ref2);
    if (docSnap2.exists()) {
      let clients = docSnap2.data().clients;
      drawClientList(clients);
    }
  }
}

function showUserCredits(name, credit) {
  document.getElementById("profile-name").textContent = name;
  document.getElementById("user-credit").textContent = credit;
}

async function drawClientList(data) {
  document.getElementById("clients").innerHTML = "";

  let emails = [];
  data.forEach(async (i) => {
    let email = i.email;
    document.getElementById("clients").innerHTML +=
      `<div class="client">
      <div style="display: flex; justify-content: space-between">
        <p>` +
      i.name +
      `</p>
      <p style="display: none;" id="day-sale-` +
      i.email +
      `">Balance: [?]</p>
      <p class="hollow-btn-text" id="showBtn-` +
      i.email +
      `">Show Balance</p>
      </div>
      <p style="margin-top: -15px">` +
      email +
      `</p>
      <div style="display: flex; justify-content: space-around">
        <button class="btn-submit" id="add-` +
      email +
      `">+</button>
        <button class="btn-submit" id="subs-` +
      email +
      `">-</button>
       
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
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      if (amount <= 0) {
        alert("Enter min. 1 credit");
        return;
      }
      const dealerEmail = auth.currentUser.email;
      await addCred(dealerEmail, u_email, amount);
    });

    let subsBtn = document.getElementById(`subs-${u_email}`);
    subsBtn.addEventListener("click", async (e) => {
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      if (amount <= 0) {
        alert("Enter min. 1 credit");
        return;
      }
      const dealerEmail = auth.currentUser.email;
      await subsCred(dealerEmail, u_email, amount);
    });

    let showBtn = document.getElementById(`showBtn-${u_email}`);
    showBtn.addEventListener("click", async (e) => {
      showBal(u_email);
    });
  });
}

async function showBal(mail) {
  const balDoc = await getDoc(doc(db, "users", mail));
  if (!balDoc.exists()) {
    document.getElementById(`showBtn-${mail}`).style.display = "none";
    document.getElementById(`day-sale-${mail}`).style.display = "";
    document.getElementById(`day-sale-${mail}`).innerText = "Unavailable";
    return;
  }
  const balance = balDoc.data().credit;

  document.getElementById(`showBtn-${mail}`).style.display = "none";
  document.getElementById(`day-sale-${mail}`).style.display = "";
  document.getElementById(`day-sale-${mail}`).innerText = "Balance: " + balance;
}

async function addCred(dealerEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();
    await runTransaction(db, async (transaction) => {
      const balance = (
        await transaction.get(doc(db, "dealers", dealerEmail))
      ).data().credit;
      if (balance < amount) {
        alert("Not enough balance. Add credits");
        return;
      } else {
        const creditsDateDoc = await transaction.get(
          doc(db, "dealers", dealerEmail, "credits", date)
        );

        const clientCreditDate = await transaction.get(
          doc(db, "users", u_email, "credits", date)
        );

        if (!creditsDateDoc.exists()) {
          transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {});
        }
        if (!clientCreditDate.exists()) {
          transaction.set(doc(db, "users", u_email, "credits", date), {});
        }

        transaction.update(doc(db, "dealers", dealerEmail), {
          credit: increment(-1 * amount),
        });

        transaction.update(doc(db, "users", u_email), {
          credit: increment(amount),
        });
        transaction.update(doc(db, "users", u_email, "credits", date), {
          lotto: arrayUnion({
            time: time,
            dg: "d",
            amt: amount,
          }),
        });
        transaction.update(doc(db, "dealers", dealerEmail, "credits", date), {
          clients: arrayUnion({
            time: time,
            amt: amount,
            email: u_email,
          }),
        });
      }
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "dealers", dealerEmail))).data()
      .credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Transaction failed: " + e);
  }
}

async function subsCred(dealerEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();

    await runTransaction(db, async (transaction) => {
      const userbalance = (
        await transaction.get(doc(db, "users", u_email))
      ).data().credit;
      if (userbalance < amount) {
        alert("Not enough balance. Add credits");
        return;
      } else {
        const creditsDateDoc = await transaction.get(
          doc(db, "dealers", dealerEmail, "credits", date)
        );
        const clientCreditDate = await transaction.get(
          doc(db, "users", u_email, "credits", date)
        );

        if (!creditsDateDoc.exists()) {
          transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {});
        }
        if (!clientCreditDate.exists()) {
          transaction.set(doc(db, "users", u_email, "credits", date), {});
        }

        transaction.update(doc(db, "dealers", dealerEmail), {
          credit: increment(amount),
        });

        transaction.update(doc(db, "users", u_email), {
          credit: increment(-1 * amount),
        });
        transaction.update(doc(db, "users", u_email, "credits", date), {
          lotto: arrayUnion({
            time: time,
            dg: "d",
            amt: -1 * amount,
          }),
        });
        transaction.update(doc(db, "dealers", dealerEmail, "credits", date), {
          clients: arrayUnion({
            time: time,
            amt: -1 * amount,
            email: u_email,
          }),
        });
      }
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "dealers", dealerEmail))).data()
      .credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Transaction failed: " + e);
  }
}
