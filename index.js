var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var db = require("./database.js")

// constant value to check for winner.
// example : rock - wins against scissor and loses against paper
const winCondition = {
    'rock': { win: 'scissor', lose: 'paper' },
    'scissor': { win: 'paper', lose: 'rock' },
    'paper': { win: 'rock', lose: 'scissor' }
}

let gameId = 0;
let players = []

io.on('connection', (socket) => {
    console.log('a user connected');
    console.log(socket.id)
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    let eventName = 'game input';
    socket.on(eventName, (msg, ackFn) => {
        let choice = msg.slice(msg.lastIndexOf(' ') + 1)
        players.push([socket.id, msg, choice])
        if (players.length == 2) {
            checkGameStatus(players)
            db.storeData(players, gameId).then(db.getLeaderBoard(players, io, eventName)).then(db.checkPlayerList(players)).then(players = [])
            console.log("game id = " + gameId)
            gameId++
        }
    });
});

// function to determine the winner of the game, and to push that value in the respective players sub-array.
function checkGameStatus(players) {
    let winMessage = "You Win :)"
    let lossMessage = "You Lose :("
    if (players[0][2] == players[1][2]) {
        players[0].push('Draw')
        players[1].push('Draw')
    }
    else {
        players[0].push(winCondition[players[0][2]]['lose'] == players[1][2] ? lossMessage : winMessage)
        players[1].push(winCondition[players[1][2]]['lose'] == players[0][2] ? lossMessage : winMessage)
    }
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});
