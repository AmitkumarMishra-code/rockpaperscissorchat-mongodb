const MongoClient = require('mongodb').MongoClient;
// Connection URL
const uri = "mongodb+srv://admin:5vrnzrAI7X1AH349@cluster0.xgn5n.mongodb.net/rpschat-project?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// function to check if player is present in database
async function checkPlayerList(players) {
    [playerOne, playerTwo] = getPlayerNames(players)
    findPlayer(playerOne)
    await findPlayer(playerTwo)
}

// function to check if player is already in database or not, and accordingly either update, or insert the player and then update.
async function findPlayer(player) {
    client.connect(async (err) => {
        if (err) {
            console.error(err)
        }
        const db = client.db('rpschat-project')
        const leaderBoard = db.collection('leaderBoard')

        await leaderBoard.find({}).toArray((err, docs) => {
            if (err) {
                console.error(err)
            }

            // leaderboard collection has objects for each player.
            /* the structure is {
                Amit: {win: 0, loss: 0, draw: 0},
                Yash: {win: 0, loss: 0, draw: 0}
            }*/
            if (!docs[0].hasOwnProperty(player[0])) {
                addPlayer(player)                   // if player is not present, then add player
            }
            updatePlayer(player)                    // update the player according to game result
        })

        //function to add the player to the database, and initialize with 0 values
        async function addPlayer(player) {
            await leaderBoard.updateOne({}, { $set: { [player[0]]: { win: 0, loss: 0, draw: 0 } } }, (err => console.log("Failed to add player"), result => console.log("Successfully added in leaderboard")))
        }

        // function to update player result
        async function updatePlayer(player) {
            let updateProperty = player[0] + '.' + player[1]        // making a string to reference the property we want to update
            return await leaderBoard.updateOne({}, { $inc: { [updateProperty]: 1 } }, (err => console.log("Failed to update"), result => {
                console.log("Successfully updated leaderboard")
            }))
        }
    })
}

// function to get values for displaying leaderboard
async function getLeaderBoard(players, io, eventName) {
    let currentPlayers = getPlayerNames(players)            // getting the names and game status of players
    await client.connect(async (err) => {
        if (err) {
            console.error(err)
        }
        const db = client.db('rpschat-project')
        const leaderBoard = db.collection('leaderBoard')
        let currentLeaderBoard = []
        await leaderBoard.find({}).toArray((err, docs) => {
            if (err) {
                console.error(err)
            }
            for (let keys in docs[0]) {                       // iterating over the returned object, and filling details in an array
                if (keys !== "_id") {
                    currentLeaderBoard.push([keys, docs[0][keys].win - docs[0][keys].loss, docs[0][keys].win, docs[0][keys].loss, docs[0][keys].draw])
                }
            }

            // updating current game result in the value received from database
            // database update takes time, so the value that I receive is the un-updated value,
            // hence I have to add the current game results in our array to reflect latest scores
            updateCurrentGameScoresLocally(currentPlayers, currentLeaderBoard)

            // sorting the leaderboard to display in descending order
            currentLeaderBoard.sort((a, b) => {
                if (b[1] > a[1]) {
                    return 1
                }
                else if (b[1] < a[1]) {
                    return -1
                }
                else {
                    return (a[2] + a[3] + a[4]) - (b[2] + b[3] + b[4])      // if 2 players have same score, sorting based on total games played
                }
            })

            // sending scores to players
            sendScoresToPlayers(currentLeaderBoard, players, eventName, io)
        })
    })
}

// function to send game result, and updated leaderboard to players.
function sendScoresToPlayers(currentLeaderBoard, players, eventName, io) {
    let result = getResultString(currentLeaderBoard)
    io.to(players[0][0]).emit(eventName, players[1][1] + ". " + players[0][3] + "\n" + result)
    io.to(players[1][0]).emit(eventName, players[0][1] + ". " + players[1][3] + "\n" + result)
}

// making the leaderboard string to be sent to players.
function getResultString(currentLeaderBoard) {
    let result = "------ Leaderboard ------\n"
    currentLeaderBoard.forEach(player => result += player[0] + ": " + player[1] + " points (" + player[2] + " wins, " + player[3] + " losses, " + player[4] + " draws)\n")
    result += "-------------------------\n\n"
    return result
}

// function to update our retrieved score to reflect current game scores as well
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

/* function to store game log for each game.
    example object : {
        id: 0,
        player1: Amit,
        player2: Yash,
        player1_choice: rock,
        player2_choice: paper,
        timestamp: 1611724447821
    }
*/
async function storeData(players, gameId) {
    [playerOne, playerTwo] = getPlayerNames(players)
    return await client.connect(async (err) => {
        if (err) {
            console.error(err)
        }
        const db = client.db('rpschat-project')
        const gameLog = db.collection('gameLog')
        return await gameLog.insertOne({
            id: gameId,
            player1: playerOne[0],
            player2: playerTwo[0],
            player1_choice: players[0][2],
            player2_choice: players[1][2],
            timestamp: Date.now()
        }, (error => console.log("Failed to update gamelog"), result => console.log("Successfully updated the gamelog")))
    })
}

// function to retrieve player name, and that players game result and store it in an array
function getPlayerNames(players) {
    let playerOne = players[0][1].slice(0, players[0][1].indexOf(' '))
    let playerTwo = players[1][1].slice(0, players[1][1].indexOf(' '))
    let playerOneStatus = players[0][3] == 'Draw' ? "draw" : players[0][3].includes('Win') ? "win" : "loss"
    let playerTwoStatus = players[1][3] == 'Draw' ? "draw" : players[1][3].includes('Win') ? "win" : "loss"

    return [[playerOne, playerOneStatus], [playerTwo, playerTwoStatus]]
}

module.exports = { storeData, checkPlayerList, getLeaderBoard, getPlayerNames };