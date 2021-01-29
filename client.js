const io = require("socket.io-client");
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const gameInput = { 'R': 'rock', 'P': 'paper', 'S': 'scissor' }
let choice = undefined

// write your code here
rl.question("What is your name?\n ", (name) => {
    const socket = io('http://127.0.0.1:3000')
    socket.on('connect', () => message(socket, name, 'Successfully connected to server'))
    socket.on('disconnect', () => console.log('Connection lost...'))
    socket.on('game input', (incoming) => message(socket, name, incoming))

})
function message(socket, name, displayMessage) {
    console.log(displayMessage)
    rl.question("(R)ock, (P)aper, (S)cissors?\n", (msg) => {
        msg = msg.toUpperCase()
        if (!gameInput.hasOwnProperty(msg)) {
            message(socket, name, "Please make a valid choice...")
        }
        else {
            choice = gameInput[msg]
            socket.emit("game input", name + " chose " + choice)
            console.log('You chose ' + choice + '\nWaiting for response');
        }
    })
}




