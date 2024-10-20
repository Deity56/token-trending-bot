const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const path = require('path');
const schedule = require('node-schedule'); // for scheduling the tweets
const http = require('http'); // HTTP server for Socket.io
const socketIo = require('socket.io'); // Socket.io for real-time communication

const client = new TwitterApi({
    appKey: '0yZ0R1Ej9gS3U2VSSOyH3bW8R',
    appSecret: '8u5meSraqLRavwAN0CGnLiLzMBh4B0OhwlbVVutxx5Kf9X4J9l',
    accessToken: '1847737123807645697-xDntjV5QYUDKbjysTuLRneNOYykq6m',
    accessSecret: '52Q6FtFMOnSaxw6itTg8uKpzvXsVNRElpGnfaPju9z8Rn'
});

// Initialize the Express app and Socket.io
const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Initialize Socket.io with the server

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let scheduledJobs = [];

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the bot with custom tweets and schedule
app.post('/start-bot', (req, res) => {
    const { tweets, interval, startTime } = req.body;

    if (!tweets || tweets.length === 0 || !interval || !startTime) {
        return res.status(400).send({ message: 'Invalid input. Please provide all necessary details.' });
    }

    // Clear previous scheduled jobs if any
    scheduledJobs.forEach(job => job.cancel());
    scheduledJobs = [];

    const now = Date.now();

    // Schedule the bot to start at the provided time
    const startJob = schedule.scheduleJob(new Date(startTime), () => {
        let tweetIndex = 0;

        const tweetJob = schedule.scheduleJob(`*/${interval} * * * *`, async () => {
            if (tweetIndex < tweets.length) {
                const tweetText = tweets[tweetIndex];

                try {
                    const tweet = await client.v2.tweet(tweetText);
                    console.log('Tweet sent:', tweet);

                    // Emit tweet to all connected clients
                    io.emit('newTweet', tweetText); // Send the tweet text to the frontend

                } catch (error) {
                    console.error('Error sending tweet:', error);
                }

                tweetIndex++;
            } else {
                // Cancel the job once all tweets are sent
                tweetJob.cancel();
            }
        });

        scheduledJobs.push(tweetJob);
    });

    scheduledJobs.push(startJob);

    res.send({ message: `Bot will start posting tweets at the scheduled time.` });
});

// Stop all scheduled bots
app.post('/stop-bot', (req, res) => {
    scheduledJobs.forEach(job => job.cancel());
    scheduledJobs = [];
    res.send({ message: 'All scheduled bots stopped.' });
});

// Start the server
server.listen(5500, () => {
    console.log('Server running on http://localhost:5500');
});
