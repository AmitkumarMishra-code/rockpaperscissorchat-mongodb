var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const winCondition = {
    'rock': { win: 'scissor', lose: 'paper' },
    'scissor': { win: 'paper', lose: 'rock' },
    'paper': { win: 'rock', lose: 'scissor' }
}

const MongoClient = require('mongodb').MongoClient;
// Connection URL
const uri = "mongodb+srv://admin:5vrnzrAI7X1AH349@cluster0.xgn5n.mongodb.net/rpschat-project?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const assert = require('assert');

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
            storeData(players).then(getLeaderBoard(eventName, players)).then(checkPlayerList(players)).then(players = [])
            console.log("game id = " + gameId)
            gameId++
        }
    });
});

async function getLeaderBoard(eventName, players) {
    let currentPlayers = getPlayerNames(players)
    await client.connect(async (err) => {
        // assert.strictEqual(null, err)
        const db = client.db('rpschat-project')
        const leaderBoard = db.collection('leaderBoard')
        let currentLeaderBoard = []
        await leaderBoard.find({}).toArray((err, docs) => {
            for (let keys in docs[0]) {
                if (keys !== "_id") {
                    currentLeaderBoard.push([keys, docs[0][keys].win - docs[0][keys].loss, docs[0][keys].win, docs[0][keys].loss, docs[0][keys].draw])
                }
            }

            updateCurrentGameScoresLocally(currentPlayers, currentLeaderBoard)

            currentLeaderBoard.sort((a, b) => {
                if (b[1] > a[1]) {
                    return 1
                }
                else if (b[1] < a[1]) {
                    return -1
                }
                else {
                    return (a[2] + a[3] + a[4]) - (b[2] + b[3] + b[4])
                }
            })
            sendScoresToPlayers(currentLeaderBoard, players, eventName);
        })
    })
}

function sendScoresToPlayers(currentLeaderBoard, players, eventName) {
    let result = getResultString(currentLeaderBoard)
    io.to(players[0][0]).emit(eventName, players[1][1] + ". " + players[0][3] + "\n" + result)
    io.to(players[1][0]).emit(eventName, players[0][1] + ". " + players[1][3] + "\n" + result)
}

function getResultString(currentLeaderBoard) {
    let result = "------ Leaderboard ------\n"
    currentLeaderBoard.forEach(player => result += player[0] + ": " + player[1] + " points (" + player[2] + " wins, " + player[3] + " losses, " + player[4] + " draws)\n")
    result += "-------------------------\n\n"
    return result
}

function updateCurrentGameScoresLocally(currentPlayers, currentLeaderBoard) {
    currentPlayers.forEach(player => {
        if (!currentLeaderBoard.some(entry => entry.includes(player[0]))) {
            currentLeaderBoard.push([player[0], 0, 0, 0, 0])
        }
    })
    currentPlayers.forEach(player => {
        currentLeaderBoard.forEach(entry => {
            if (player[0] === entry[0]) {
                if (player[1] === "win") {
                    entry[1]++;
                    entry[2]++;
                }
                else if (player[1] === "loss") {
                    entry[1]--;
                    entry[3]++;
                }
                else {
                    entry[4]++;
                }
            }
        })
    })
}

async function checkPlayerList(players) {
    [playerOne, playerTwo] = getPlayerNames(players)
    findPlayer(playerOne)
    await findPlayer(playerTwo)
}

async function findPlayer(player) {
    client.connect(async (err) => {
        assert.strictEqual(null, err)
        const db = client.db('rpschat-project')
        const leaderBoard = db.collection('leaderBoard')

        await leaderBoard.find({}).toArray((err, docs) => {
            if (!docs[0].hasOwnProperty(player[0])) {
                addPlayer(player)
            }
            updatePlayer(player)
        })

        async function addPlayer(player) {
            await leaderBoard.updateOne({}, { $set: { [player[0]]: { win: 0, loss: 0, draw: 0 } } }, (err => console.log("Failed to add player"), result => console.log("Successfully added in leaderboard")))
        }

        async function updatePlayer(player) {
            let updateProperty = player[0] + '.' + player[1]
            return await leaderBoard.updateOne({}, { $inc: { [updateProperty]: 1 } }, (err => console.log("Failed to update"), result => {
                console.log("Successfully updated leaderboard")
            }))
        }
    })
}

function checkGameStatus(players) {
    if (players[0][2] == players[1][2]) {
        players[0].push('Draw')
        players[1].push('Draw')
    }
    else {
        players[0].push(winCondition[players[0][2]]['lose'] == players[1][2] ? "You Lose :(" : "You Win :)")
        players[1].push(winCondition[players[1][2]]['lose'] == players[0][2] ? "You Lose :(" : "You Win :)")
    }
}

async function storeData(players) {
    [playerOne, playerTwo] = getPlayerNames(players)
    return await client.connect(async (err) => {
        const db = client.db('rpschat-project')
        const gameLog = db.collection('gameLog')
        return await gameLog.insertOne({
            id: gameId,
            player1: playerOne[0],
            player2: playerTwo[0],
            player1_choice: players[0][2],
            player2_choice: players[1][2],
            timestamp: Date.now()
        }, (err => console.log("Failed to update gamelog"), result => console.log("Successfully updated the gamelog")))
    })
}

function getPlayerNames(players) {
    let playerOne = players[0][1].slice(0, players[0][1].indexOf(' '))
    let playerTwo = players[1][1].slice(0, players[1][1].indexOf(' '))
    let playerOneStatus = players[0][3] == 'Draw' ? "draw" : players[0][3].includes('Win') ? "win" : "loss"
    let playerTwoStatus = players[1][3] == 'Draw' ? "draw" : players[1][3].includes('Win') ? "win" : "loss"

    return [[playerOne, playerOneStatus], [playerTwo, playerTwoStatus]]
}

http.listen(3000, () => {
    console.log('listening on *:3000');
});