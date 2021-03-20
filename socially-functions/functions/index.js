const functions = require("firebase-functions");
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const {getAllScreams,postOneScream} = require('./handlers/screams');
const {signup,login} = require('./handlers/users');

app.get('/screams',getAllScreams);
app.post('/scream',FBAuth, postOneScream);

app.post('/signup', signup);
app.post('/login',login)

exports.api = functions.region('asia-south1').https.onRequest(app);