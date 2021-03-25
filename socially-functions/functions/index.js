const functions = require("firebase-functions");
const app = require('express')();

const FBAuth = require('./util/fbAuth');

const {getAllScreams,postOneScream,getScream,commentOnScream,likeScream,unlikeScream} = require('./handlers/screams');
const {signup,login,uploadImage,addUserDetails,getAuthenticatedUser} = require('./handlers/users');

app.get('/screams',getAllScreams);
app.post('/scream',FBAuth, postOneScream);
app.get('/scream/:screamId',getScream);
app.post('/scream/:screamId/comment',FBAuth,commentOnScream);
//app.post('/scream/:screamId/like',FBAuth,likeScream);
//app.post('/scream/:screamId/unlike',FBAuth,unlikeScream);
// TODO delete

app.post('/signup', signup);
app.post('/login',login);
app.post('/user/image',FBAuth,uploadImage);
app.post('/user',FBAuth,addUserDetails);
app.get('/user',FBAuth,getAuthenticatedUser)

exports.api = functions.region('asia-south1').https.onRequest(app);