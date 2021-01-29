# Rock Paper Scissors Game
1. Create an account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and follow the documentation to 
set up a new database which will be used to store your game data.

2. Modify the rock-paper-scissors server so that it keeps a record of each game stored in the database. eg. the game result could be structured like this:
    ```
    {
        player_1: 'Mark',
        player_2: 'Fred',
        player_1_guess: 'Rock',
        player_2_guess: 'Paper',
        timestamp: 1611724447821
    }
    ```
    Notes: 

    - there will be many such objects in the database - one for each game that was played.  
    
    - the `timestamp` field is a number representing time when the game was played.  You an generate 
      this number in javascript like this: `Date.now()`
      
    - Tip: After you tell mongodb to store the object, be careful to `await` on the result to ensure the data has been written successfully
      
3. Keep a leaderboard of each player as an object in the database like this:
    ```
    {
        Mark : { win: 5, loss: 2, draw: 3 },
        Fred : { win: 6, loss: 3, draw: 1 },
        Kimiko : { win: 2, loss: 1, draw: 1 }
    }
    ```
    - There will only be one such object in the database which is updated with new values for each player

4. Send the leaderboard to each player after each game, then display it on screen.  Each win counts as 1 points, each loss is -1 point, and each draw is 0 points.  If two players have the same score, the one with fewest games played is ranked higher.

### Example

Here is the console output and input for each of 3 clients:
##### Client 1: Mark chooses Rock
```
What is your name? Mark
Successfully connected to server
(R)ock, (P)aper or (S)cissors? R
You chose rock
Waiting for response
Fred chose paper - You Lose :(
------ Leaderboard ------
Fred: 4 points (7 wins, 3 losses, 1 draws)
Mark: 2 points (5 wins, 3 losses, 3 draws)
Kimiko: 1 points (2 wins, 1 losses, 0 draws)
-------------------------

(R)ock, (P)aper or (S)cissors? 
```

##### Client 2: Fred chooses Paper, then plays again and chooses Scissors
```
What is your name? Fred
Successfully connected to server
(R)ock, (P)aper or (S)cissors? P
You chose paper
Waiting for response
Mark chose rock - You Win :)
------ Leaderboard ------
Fred: 4 points (7 wins, 3 losses, 1 draws)
Mark: 2 points (5 wins, 3 losses, 3 draws)
Kimiko: 1 points (2 wins, 1 losses, 0 draws)
-------------------------

(R)ock, (P)aper or (S)cissors? S
You chose scissors
Waiting for response
Abe chose scissors - Draw
------ Leaderboard ------
Fred: 4 points (7 wins, 3 losses, 2 draws)
Mark: 2 points (5 wins, 3 losses, 3 draws)
Kimiko: 1 points (2 wins, 1 losses, 0 draws)
Abe: 0 points (0 wins, 0 losses, 1 draws)
-------------------------

(R)ock, (P)aper or (S)cissors? 
```

##### Client 3: Abe chooses Scissors
```
What is your name? Abe
Successfully connected to server
(R)ock, (P)aper or (S)cissors? S
You chose scissors
Waiting for response
Fred chose scissors - Draw
------ Leaderboard ------
Fred: 4 points (7 wins, 3 losses, 2 draws)
Mark: 2 points (5 wins, 3 losses, 3 draws)
Kimiko: 1 points (2 wins, 1 losses, 0 draws)
Abe: 0 points (0 wins, 0 losses, 1 draws)
-------------------------

(R)ock, (P)aper or (S)cissors? 
```
