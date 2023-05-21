const express = require("express");
const app = express();

let { PORT } = require("./config/serverConfig");
PORT = process.env.PORT || "192.168.0.105";

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const Levels = [
  {
    level: "1",
    optionBG: "#0c4b33",
    optionColor: "#f5f5f5",
    questionBG: "#d4edda",
    questionBorder: "#bee5eb",
    questionColor: "#155724",
  },
  {
    level: "2",
    optionBG: "#563d7c",
    optionColor: "#f5f5f5",
    questionBG: "#d5d0df",
    questionBorder: "1px solid #bbadd2",
    questionColor: "#004085",
  },
  {
    level: "3",
    optionBG: "#721c24",
    optionColor: "#f5f5f5",
    questionBG: "#f8d7da",
    questionBorder: "1px solid #d6a7ab",
    questionColor: "#004085",
  },
  {
    level: "4",
    optionBG: "#002752",
    optionColor: "#f5f5f5",
    questionBG: "#cce5ff",
    questionBorder: "1px solid #6badd6",
    questionColor: "#004085",
  },
  {
    level: "5",
    optionBG: "#383d41",
    optionColor: "#f5f5f5",
    questionBG: "#e2e3e5",
    questionBorder: "1px solid #d6d8db",
    questionColor: "#383d41",
  },
  {
    level: "6",
    optionBG: "#820053",
    optionColor: "#f5f5f5",
    questionBG: "#5e003c",
    questionBorder: "1px solid #d6d8db",
    questionColor: "#ffffff",
  },
];

const Timer = {
  secunds: Number,
  minutes: Number,
};

function randomQuestions(size) {
  let num = new Array(size);
  for (let i = 0; i < size; i++) {
    let randomNumber = Math.floor(Math.random() * size);
    let found = false;
    for (let count = 0; count < i; count++) {
      if (num[count] == randomNumber) {
        found = true;
        break;
      } else {
        found = false;
      }
    }
    if (!found) {
      num[i] = randomNumber;
    } else {
      i--;
    }
  }
  return num;
}

const serverSide = {
  players: {},
  rooms: {},
};

function Quiz(subject, allQuestions, sequenceQuestions, players) {
  (this.all = allQuestions),
    (this.sequence = sequenceQuestions),
    (this.current = 0),
    (this.subject = subject),
    (this.level = 1),
    (this.attrStatus = "playing"),
    (this.playerNow = {
      id: players.player2.id,
      name: players.player2.name,
    }),
    //player 1
    (this.player1 = {
      id: players.player1.id,
      name: players.player1.name,
      room: players.player1.room,
      countTotal: 0,
      countIncorrect: 0,
      countCorrect: 0,
      currentScore: 0,
      progress: 50,
    });
  //player 2
  this.player2 = {
    id: players.player2.id,
    name: players.player2.name,
    room: players.player2.room,
    countTotal: 0,
    countIncorrect: 0,
    countCorrect: 0,
    currentScore: 0,
    progress: 50,
  };
  //Methods
  (this.next = () => {
    if (this.current < this.all.length - 1) {
      this.current++;
      return true;
    }
    return false;
  }),
    (this.show = () => {
      return this.all[this.sequence[this.current]];
    }),
    (this.check = (answer) => {
      if (this.all[this.sequence[this.current]].answer == answer) {
        return true;
      } else {
        return false;
      }
    }),
    (this.status = () => {
      if (this.countIncorrect === 4) {
        this.attrStatus = "lost";
      } else if (this.countCorrect === this.level * 6) {
        this.attrStatus = "win";
      }
      return this.attrStatus;
    });
}

function getState(roomId) {
  const data = {
    subject: serverSide.rooms[roomId].play.subject,
    level: Levels[0],
    question: {
      question: serverSide.rooms[roomId].play.show().question,
      option1: serverSide.rooms[roomId].play.show().option1,
      option2: serverSide.rooms[roomId].play.show().option2,
      option3: serverSide.rooms[roomId].play.show().option3,
      option4: serverSide.rooms[roomId].play.show().option4,
    },
    attrStatus: serverSide.rooms[roomId].play.attrStatus,
    player1: serverSide.rooms[roomId].play.player1,
    player2: serverSide.rooms[roomId].play.player2,
    playerNow: serverSide.rooms[roomId].play.playerNow,
  };
  return data;
}

io.on("connection", (socket) => {
  const name = `Player_${socket.id}`;
  serverSide.players[socket.id] = { name };

  socket.on("createRoom", (data) => {
    const roomId = `room_${socket.id}`;
    const player = data.player;
    serverSide.players[socket.id].id = socket.id;
    serverSide.players[socket.id].name = player;
    socket.join(roomId);
    serverSide.rooms[roomId] = {
      player1: serverSide.players[socket.id],
      player2: undefined,
      token: serverSide.players[socket.id].id,
      status: false,
    };
    serverSide.players[socket.id].room = roomId;
    io.to(roomId).emit("createdRoom", roomId);
  });

  socket.on("joinRoom", (data) => {
    const roomId = data.codeInvite;
    const player = data.player;

    // if (roomId != socket.id && !serverSide.rooms[roomId].status) {
    socket.join(roomId);
    serverSide.players[socket.id].id = socket.id;
    serverSide.players[socket.id].name = player;

    serverSide.rooms[roomId].player2 = serverSide.players[socket.id];
    serverSide.rooms[roomId].status = true;
    serverSide.players[socket.id].room = roomId;

    io.to(serverSide.rooms[roomId].player1.id).emit(
      "otherPlayer",
      serverSide.rooms[roomId].player2
    );
    io.to(serverSide.rooms[roomId].player2.id).emit(
      "otherPlayer",
      serverSide.rooms[roomId].player1
    );
    io.to(roomId).emit("joinedRoom", serverSide.rooms[roomId]);
    io.to(serverSide.rooms[roomId].player1.id).emit("btnNewGameDisableTrue");
    // }
  });

  socket.on("openNewGame", (data) => {
    const roomId = serverSide.players[socket.id].room;
    const token = serverSide.rooms[roomId].token;
    const player1 = serverSide.rooms[roomId].player1.id;
    const player = data.playerId;
    if (token == player) {
      io.to(roomId).emit("formNewGame");
      io.to(player1).emit("setDisableTrue");
    }
  });

  socket.on("newGame", (data) => {
    const roomId = serverSide.players[socket.id].room;
    const subject = data.subject;
    const question = data.questions;
    const sequence = randomQuestions(question.length);
    const p1 = serverSide.rooms[roomId].player1;
    const p2 = serverSide.rooms[roomId].player2;
    const players = {
      player1: p1,
      player2: p2,
    };
    const play = new Quiz(subject, question, sequence, players);
    serverSide.rooms[roomId].play = play;
    const GameState = getState(roomId);
    io.to(roomId).emit("startedGame", GameState);
  });

  socket.on("checkAnswer", (response) => {
    const playerClient = response.player;
    const roomId = serverSide.players[playerClient].room;
    const play = serverSide.rooms[roomId].play;
    const playerServer = play.playerNow.id;
    const status = play.attrStatus === "playing";

    if (playerServer == playerClient && status) {
      const player1 = { id: play.player1.id, name: play.player1.name };
      const player2 = { id: play.player2.id, name: play.player2.name };

      let resultState = {
        answer: response.answer,
        correct: Number(play.show().answer),
      };

      if (play.check(response.answer)) {
        resultState.status = true;
        if (playerClient == player1.id) {
          play.player1.countTotal++;
          play.player1.countCorrect++;
          play.player1.currentScore += 50;
          play.player1.progress += 10;
          play.player2.progress -= 10;
        } else {
          play.player2.countTotal++;
          play.player2.countCorrect++;
          play.player2.currentScore += 50;
          play.player2.progress += 10;
          play.player1.progress -= 10;
        }
      } else {
        resultState.status = false;
        if (playerClient == player1.id) {
          play.player1.countTotal++;
          play.player1.countIncorrect++;
          play.player1.progress -= 10;
          play.player2.progress += 10;
        } else {
          play.player2.countTotal++;
          play.player2.countIncorrect++;
          play.player2.progress -= 10;
          play.player1.progress += 10;
        }
      }

      if (play.player1.countIncorrect === 4 || play.player1.progress === 0) {
        play.player1.attrStatus = "lost";
        play.player2.attrStatus = "win";
        play.attrStatus = "endGame";
      } else if (
        play.player1.countCorrect === 6 ||
        play.player1.progress === 100
      ) {
        play.player1.attrStatus = "win";
        play.player2.attrStatus = "lost";
        play.attrStatus = "endGame";
      } else if (
        play.player2.countIncorrect === 4 ||
        play.player2.progress === 0
      ) {
        play.player2.attrStatus = "lost";
        play.player1.attrStatus = "win";
        play.attrStatus = "endGame";
      } else if (
        play.player2.countCorrect === 6 ||
        play.player2.progress === 100
      ) {
        play.player2.attrStatus = "win";
        play.player1.attrStatus = "lost";
        play.attrStatus = "endGame";
      } else if (play.next()) {
        play.playerNow = playerServer == player1.id ? player2 : player1;
        resultState.playerNow = play.playerNow;
        resultState.question = play.show();
        resultState.level = 1;
      }
      resultState.subject = play.subject;
      resultState.player1 = play.player1;
      resultState.player2 = play.player2;
      resultState.gameState = play.attrStatus;
      io.to(roomId).emit("result", resultState);
    }
  });

  socket.on("disconnect", () => {
    console.log(`${serverSide.players[socket.id].name} > disconnected`);
  });
});

app.use(express.static("public"));

/*Rotas*/
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/login.html");
});

app.get("/home", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/home.html");
});

app.get("/home/menu", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/menu.html");
});

app.get("/game", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/game.html");
});

app.get("/home/ranking", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/ranking.html");
});

app.get("/home/multiplayer", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/multiplayer.html");
});

app.get("/home/multiplayer/room", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/game2.html");
});

app.get("/home/multiplayer/room/join", (req, res) => {
  res.sendFile(__dirname + "/public" + "/views/game2.html");
});

server.listen(PORT, function () {
  console.log(`server started on port => ${PORT}`);
});
