const { db } = require("../util/admin");

exports.sendMessage = (req,res) => {
    const msg = {
        sender: req.user.handle,
        recipient: req.body.recipient,
        createdAt: new Date().toISOString(),
        body: req.body.body
    };
    db.collection("messages").add(msg)
    .then((doc) => {
        msg.msgId = doc.id;
        return res.json(msg);
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
};

// exports.getMessages = (req,res) => {
//     let messages = [];
//     db.collection(`messages/${req.params.handle}-${req.user.handle}/messages`)
//     .onSnapshot((data) => {
//         data.doc.forEach((doc) => {
//             messages.push(doc);
//         })
//         return 
//     })
//     .catch((err) => {
//         console.error(err);
//         return res.status(500).json({ error: err.code });
//     })
// }