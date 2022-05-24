const optionsLiveTime = {
  method: "GET",
  headers: {
    "X-RapidAPI-Host": "livetime.p.rapidapi.com",
    "X-RapidAPI-Key": "aa4a9e28fdmsh24e8338e2ae0ba7p104b0bjsna4ed2d34bd32",
  },
};

const optionsQcTime1 = {
  method: "GET",
  headers: {
    "X-RapidAPI-Host": "qctime1.p.rapidapi.com",
    "X-RapidAPI-Key": "f61b57f958msh481ee55292f5d4dp1e901cjsnf5e1d31890bd",
  },
};

async function fetchDate() {
  let apiData;
 let date, time;
  await fetch("https://qctime1.p.rapidapi.com/time", optionsQcTime1)
    .then((res) => res.json())
    .then((res) => {
     date = res.date;
      time = res.time + " " + res.ampm;
    })
    .catch(async (err) => {
      await fetch("https://livetime.p.rapidapi.com/time", optionsLiveTime)
        .then((res) => res.json())
        .then((res) => {
          date = res.date;
      time = res.time + " " + res.ampm;
        });
    });
  return { date, time };
}


await fetchDate();
export { fetchDate };
