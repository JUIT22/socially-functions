const functions = require("firebase-functions");
const admin = require('firebase-admin');
const firebase = require('firebase')
const app = require('express')();

const config = {
    apiKey: "AIzaSyBfiChOSRUmtiJB-YU57yxMxVv067XmsU0",
    authDomain: "juit-socially.firebaseapp.com",
    projectId: "juit-socially",
    storageBucket: "juit-socially.appspot.com",
    messagingSenderId: "625307113396",
    appId: "1:625307113396:web:f04f0fa4f0da66642a04e1",
    measurementId: "G-L0WZGQ5L35"
};

firebase.initializeApp(config);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

app.get('/screams',(req,res) => {
    admin.firestore.collection('screams').orderBy('createdAt','desc').get()
    .then(data =>{
        let screams = [];
        data.forEach((doc) => {
            screams.push({id: doc.id,...doc.data()});
        });
        return res.json(screams);
    })
    .catch(err => console.error(err))
})

app.scream('/scream',(req,res) => {
    const newscream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString
    };
    admin.firestore.collection('screams').add(newscream)
    .then((doc) => {
        res.json({message: `document ${doc.id} created successfully`});
    })
    .catch((err) => {
        res.status(500).json({error: `something went wrong`});
        console.error(err);
    })
})

app.scream('/signup', (req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
    // TODO: validate data
    firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password)
    .then(data => {
        return res.status(201).json({message: `user ${}`})
    })

})
exports.api = functions.region('asia-south1').https.onRequest(app);