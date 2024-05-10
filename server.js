const express = require("express"); // pobieramy klase express do serwera www
const socketio = require("socket.io"); // import biblioteki socketio
// const moment = require('moment');
require("dotenv").config();

const moment = require('moment');

let fs = require("fs");
let http = require("http");
let https = require("https");
let privateKey = fs.readFileSync("key.key", "utf8");
let certificate = fs.readFileSync("key.crt", "utf8");

let credentials = { key: privateKey, cert: certificate };

const app = express(); // pobieram instancje serwera

let serwer = https.createServer(credentials, app);

// zmienna dla licznika odw.
let LicznikOdw = 0;

// definiuje statyczny katalog na pliki, dostępny w sieci
app.use(express.static(__dirname + "/public"));

// otwieramy port 80 dla serwera WWW
serwer.listen(process.env.porthttps, () => {
  console.log("serwer start: https://localhost:" + process.env.porthttps + "/");
});

// dodanie soketów do komunikacji online
const io = socketio(serwer, {
  // zgoda na komunikacje z innych adresów internetoweych cors(GET, POST)
  cors: {
    origin: "*", // adresy dozwolone
    methods: ["GET", "POST"], // metody komunikacji
    credentials: true,
  },
});

let ClientDB = [];

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("ChatDB.db");

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS messeges (sender TEXT, place TEXT, messege TEXT, data TEXT)"
  );
  db.run("CREATE TABLE IF NOT EXISTS users (name TEXT, password TEXT)");

  const stmt = db.prepare(
    "INSERT INTO messeges (sender, place, messege) VALUES (?, ?, ?)"
  );
  for (let i = 0; i < 0; i++) {
    stmt.run("Ipsum " + i, "test", "jakis tekst");
  }
  stmt.finalize();
});

// CID('idsoketu') z ClientDB.filter(e=>e.socketid == 'idsoketu')[0]
const CID = (socketid) => ClientDB.filter((e) => e.socketid == socketid)[0];
const KID = (idKlienta) => ClientDB.filter((e) => e.id == idKlienta)[0];
// function CID1(socketid){
//     return ClientDB.filter(e=>e.socketid == socketid)[0];
// }

function findClientById(socketList, clientId) {
  for (const [socketId, socket] of socketList.entries()) {
    if (socket.data.clientId === clientId) {
      return socket;
    }
  }
  return null; // Zwróć null, jeśli klient o danym id nie został znaleziony
}

function loadmesseges(place) {
  db.all(
    'SELECT * FROM messeges WHERE place = "' + place + '" ORDER BY data DESC LIMIT 50',
    (err, row) => {
      if (err) {
        console.error("Błąd podczas wykonywania zapytania:", err);
        return;
      }

      if (row) {
        io.sockets.emit("loadmesseges", place, row);
      }
    }
  );
}

io.on("connection", (klient) => {
  console.log("Klient nawiązał połączenie", klient.id);

  klient.on("login", (name, password) => {
    console.log("Loguje się " + name);
    db.get(
      'SELECT name, password FROM users WHERE name = "' + name + '"',
      (err, row) => {
        if (err) {
          console.error("Błąd podczas wykonywania zapytania:", err);
          return;
        }

        if (row) {
          if (row.password == password) io.sockets.emit("loginIN", name);
          else io.sockets.emit("loginerror");
        } else {
          const new_accont = db.prepare(
            "INSERT INTO users (name, password) VALUES (?, ?)"
          );
          new_accont.run(name, password);
          new_accont.finalize();
          io.sockets.emit("loginIN", name);
        }
      }
    );
  });

  klient.on("wiadomosc", (wiadomosc, userid, channel) => {
    let client = CID(klient.id);
    if (client) {

      //console.log(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'));

      const current_date = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
      
      if (channel == "Wszyscy") {
        io.sockets.emit("wiadomosc", wiadomosc, client.Klient, current_date, channel);

        const new_messeg = db.prepare(
          "INSERT INTO messeges (sender, place, messege, data) VALUES (?, ?, ?, ?)"
        );
        new_messeg.run(client.Klient, "Wszyscy", wiadomosc, current_date);
        new_messeg.finalize();


      } else {
        let odbiorca = KID(userid);
        if (odbiorca) {
          // const foundSocket = findClientById(io.sockets.sockets, userid);
          // if (foundSocket)
          //    foundSocket.emit("wiadomosc", wiadomosc, client.Klient, current_date, );
          io.sockets.emit("wiadomosc", wiadomosc, client.Klient, current_date, channel);

          const new_messeg = db.prepare(
            "INSERT INTO messeges (sender, place, messege, data) VALUES (?, ?, ?, ?)"
          );
          new_messeg.run(client.Klient, odbiorca.Klient, wiadomosc, current_date);
          new_messeg.finalize();
        }
      }
    }
  });

  klient.on("witaj", (klientNazwa, idKlienta) => {
    console.log("Witaj", klientNazwa, idKlienta);
    if (!idKlienta) return;
    if (!klientNazwa) return;

    let client = KID(idKlienta);
    //   console.log(client);
    if (!client) {
      ClientDB.push({
        Klient: klientNazwa,
        id: idKlienta,
        socketid: klient.id,
      });
    } else {
      client.Klient = klientNazwa;
      client.socketid = klient.id;
    }
    // console.log("Client BD", ClientDB);
    loadmesseges("Wszyscy");
    io.sockets.emit("goscie", ClientDB);
  });

  klient.on("loadmessegs_server", (place) => {
    loadmesseges(place);
  });
});

/**
 * funkcja licznika odwiedzin dostępna pod adresem http://host/licznik
 *
 * @param {Request} - dane które przychodzą
 * @param {Response} - dane wyjściowe
 */
app.get("/licznik", (req, resp) => {
  // odpowiedź serwera z json, w nim liczba odwiedzin od startu serwera
  resp.send({ licznik: ++LicznikOdw });
});
