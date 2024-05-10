// alias $ do document.querySelector
const $ = (e) => document.querySelector(e);
const socket = io("https:///");

let idKlienta = localStorage.getItem("idKlienta");
if (!idKlienta) {
  idKlienta =
    new Date().getTime() + "_" + Math.floor(Math.random() * 999999999999999999);
  localStorage.setItem("idKlienta", idKlienta);
}

let userName = "";

const Modal = new bootstrap.Modal($("#exampleModal"));
Modal.show();

$("#exampleModal").addEventListener("hidden.bs.modal", () => {
  if (userName == "" || userName == null) Modal.show();
});

$("#login-submit").addEventListener("click", (e) => {
  const name = $("#login-name").value;
  const password = $("#passsword").value;

  socket.emit("login", name, password);
  //console.log(name + " | " + password);
});

socket.on("loginerror", () => {
  console.log("Złe hasło");
  $("#login-error").className += "d-block";
});

socket.on("loginIN", (accont_name) => {
  if($("#login-name").value != accont_name)
    return;
  console.log("Zostałeś zalogowany");
  Modal.hide();
  userName = accont_name;
  socket.emit("witaj", userName, idKlienta); // callaback - start
});

let last_load = "";

socket.on("loadmesseges", (place, messeges) => {
  if($(".sel").innerHTML != place || last_load == place)
    return

  last_load = place;
  console.log("Wiadomości wczytane!", place, messeges);

  messeges.reverse();
  let main = $("main");
  for(let data of messeges) {
    let mess = `<div>
                      <h3>${data.sender} - <span> ${data.data}</h3>
                      <p>${data.messege}</p>
                  </div>`;
    $("main").scrollTo(0, $("main").Height + 100);
    main.innerHTML += mess;
  }

  $("main").scrollTop = $("main").scrollHeight;
});


let selUser = "Wszyscy";

socket.on("connect", () => {
  console.log("Zostałem połączony");
});

socket.on("goscie", (listaGosci) => {
  // callback - koniec
  let nav = $("nav");
  nav.innerHTML = "";
  listaGosci = [{ Klient: "Wszyscy", id: "Wszyscy" }, ...listaGosci];
  for (let klient of listaGosci) {
    // console.log(klient);
    let linia = document.createElement("div");
    linia.id = klient.id;
    linia.addEventListener("click", (e) => {
      klikniecieKlienta(e.target, klient.id);
      $("main").innerHTML = "";
      socket.emit("loadmessegs_server", klient.Klient);
    });
    linia.innerText = klient.Klient;
    nav.append(linia);
    if (selUser == klient.id) klikniecieKlienta(linia, klient.id);
  }
});

function klikniecieKlienta(th, id) {
  document
    .querySelectorAll("nav>.sel")
    .forEach((e) => e.classList.remove("sel"));
  th.classList.add("sel");
  selUser = id;
}

socket.on("wiadomosc", (wiadomosc, nazwaKlienta, opcje, channel = "") => {
  let main = $("main");

  console.log(channel);
  if($(".sel").innerHTML != channel)
    return

  let mess = `<div>
                    <h3>${nazwaKlienta} - <span> ${opcje}</h3>
                    <p>${wiadomosc}</p>
                </div>`;
  $("main").scrollTo(0, $("main").Height + 100);
  main.innerHTML += mess;

  $("main").scrollTop = $("main").scrollHeight;
});

$("#chat").addEventListener("keyup", (e) => {
  if (e.keyCode == 13) {
    socket.emit("wiadomosc", e.target.value, selUser, $(".sel").innerHTML);
    e.target.value = "";
  }
});

/**
 * Licznik odwiedzin
 *
 * @returns void
 */
function akt_licznik() {
  // odczyt odwiedziń z serwera
  fetch("/licznik")
    .then((e) => e.json()) // przemień na json
    .then((dane) => {
      // dane z licznika
      $("h3 > b > span").innerHTML = dane.licznik;
    });
}

akt_licznik(); // akt. licznik na stro
