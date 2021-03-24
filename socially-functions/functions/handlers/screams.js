const { db } = require('../util/admin');

exports.getAllScreams = (req,res) => {
    db.collection('screams').orderBy('createdAt','desc').get()
    .then(data =>{
        let screams = [];
        data.forEach((doc) => {
            screams.push({id: doc.id,...doc.data()});
        });
        return res.json(screams);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({error:err.code});
    })
}

exports.postOneScream = (req,res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };
    db.collection('screams').add(newScream)
    .then((doc) => {
        res.json({message: `document ${doc.id} created successfully`});
    })
    .catch((err) => {
        res.status(500).json({error: `something went wrong`});
        console.error(err);
    })
}

