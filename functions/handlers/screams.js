const { admin, db } = require("../util/admin");
const Filter = require("bad-words");

exports.getAllScreams = (req, res) => {
	db.collection("screams")
		.orderBy("createdAt", "desc")
		.get()
		.then((data) => {
			let screams = [];
			data.forEach((doc) => {
				screams.push({ screamId: doc.id, ...doc.data() });
			});
			return res.json(screams);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.postOneScream = (req, res) => {
	const newScream = {
		body: new Filter().clean(req.body.body),
		userHandle: req.user.handle,
		userImage: req.user.imageUrl,
		createdAt: new Date().toISOString(),
		likeCount: 0,
		commentCount: 0,
	};
	db.collection("screams")
		.add(newScream)
		.then((doc) => {
			const resScream = newScream;
			resScream.screamId = doc.id;
			res.json(resScream);
		})
		.catch((err) => {
			res.status(500).json({ error: `something went wrong` });
			console.error(err);
		});
};

exports.commentOnScream = (req, res) => {
	if (req.body.body.trim() === "") return res.status(400).json({ comment: "Must not be empty" });

	const newComment = {
		body: req.body.body,
		createdAt: new Date().toISOString(),
		screamId: req.params.screamId,
		userHandle: req.user.handle,
		userImage: req.user.imageUrl,
	};
	console.log(newComment);

	db.doc(`/screams/${req.params.screamId}`)
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return res.status(404).json({ error: "Scream not found" });
			}
			return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
		})
		.then(() => {
			return db.collection("comments").add(newComment);
		})
		.then(() => {
			res.json(newComment);
		})
		.catch((err) => {
			console.log(err);
			res.status(500).json({ error: "Something went wrong" });
		});
};

exports.getScream = (req, res) => {
	let screamData = {};
	db.doc(`/screams/${req.params.screamId}`)
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return res.status(404).json({ error: "Scream not found" });
			}
			screamData = doc.data();
			screamData.screamId = doc.id;
			return db
				.collection("comments")
				.orderBy("createdAt", "desc")
				.where("screamId", "==", req.params.screamId)
				.get();
		})
		.then((data) => {
			screamData.comments = [];
			data.forEach((doc) => {
				screamData.comments.push({ commentId: doc.id, ...doc.data() });
			});
			return res.json(screamData);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};
exports.likeScream = (req, res) => {
	const likeDocument = db
		.collection("likes")
		.where("userHandle", "==", req.user.handle)
		.where("screamId", "==", req.params.screamId)
		.limit(1);

	const screamDocument = db.doc(`/screams/${req.params.screamId}`);

	let screamData;

	screamDocument
		.get()
		.then((doc) => {
			if (doc.exists) {
				screamData = doc.data();
				screamData.screamId = doc.id;
				return likeDocument.get();
			} else {
				return res.status(404).json({ error: "Scream not found" });
			}
		})
		.then((data) => {
			if (data.empty) {
				return db
					.collection("likes")
					.add({
						screamId: req.params.screamId,
						userHandle: req.user.handle,
					})
					.then(() => {
						screamData.likeCount++;
						return screamDocument.update({ likeCount: screamData.likeCount });
					})
					.then(() => {
						return res.json(screamData);
					});
			} else {
				return res.status(400).json({ error: "Scream already liked" });
			}
		})
		.catch((err) => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};

exports.unlikeScream = (req, res) => {
	const likeDocument = db
		.collection("likes")
		.where("userHandle", "==", req.user.handle)
		.where("screamId", "==", req.params.screamId)
		.limit(1);

	const screamDocument = db.doc(`/screams/${req.params.screamId}`);

	let screamData;

	screamDocument
		.get()
		.then((doc) => {
			if (doc.exists) {
				screamData = doc.data();
				screamData.screamId = doc.id;
				return likeDocument.get();
			} else {
				return res.status(404).json({ error: "Scream not found" });
			}
		})
		.then((data) => {
			if (data.empty) {
				return res.status(400).json({ error: "Scream not liked" });
			} else {
				return db
					.doc(`/likes/${data.docs[0].id}`)
					.delete()
					.then(() => {
						screamData.likeCount--;
						return screamDocument.update({ likeCount: screamData.likeCount });
					})
					.then(() => {
						res.json(screamData);
					});
			}
		})
		.catch((err) => {
			console.error(err);
			res.status(500).json({ error: err.code });
		});
};

exports.deleteScream = (req, res) => {
	const document = db.doc(`/screams/${req.params.screamId}`);
	document
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return res.status(404).json({ error: "Scream not found" });
			}
			if (doc.data().userHandle !== req.user.handle) {
				return res.status(403).json({ error: "Unauthorized" });
			} else {
				return document.delete();
			}
		})
		.then(() => {
			res.json({ message: "Scream deleted successfully" });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.deleteComment = (req, res) => {
	const document = db.doc(`/comments/${req.params.commentId}`);
	document
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return res.status(404).json({ error: "Comment not found" });
			}
			if (doc.data().userHandle !== req.user.handle) {
				return res.status(403).json({ error: "Unauthorized" });
			} else {
				return document.delete();
			}
		})
		.then(() => {
			return db
				.doc(`screams/${req.params.screamId}`)
				.update("commentCount", admin.firestore.FieldValue.increment(-1));
		})
		.then(() => {
			res.json({ message: "Comment deleted successfully" });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getFriendsScreams = (req, res) => {
	db.doc(`users/${req.user.handle}`)
		.get()
		.then((doc) => {
			let promises = [];
			Object.entries(doc.data().following).forEach(([handle, imageUrl]) => {
				promises.push(db.collection("screams").where("userHandle", "==", handle).get());
			});
			promises.push(db.collection("screams").where("userHandle", "==", req.user.handle).get());
			return Promise.all(promises);
		})
		.then((values) => {
			let screams = [];
			values.forEach((data) => {
				data.forEach((doc) => {
					screams.push({ screamId: doc.id, ...doc.data() });
				});
			});
			screams.sort((a, b) => {
				if (a.createdAt < b.createdAt) return 1;
				return -1;
			});
			return res.json(screams);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getTrendingScreams = (req, res) => {
	let currentTime = new Date().getTime();
	db.collection("screams")
		.orderBy("createdAt", "desc")
		.limit(20)
		.get()
		.then((docs) => {
			let screams = [];
			docs.forEach((doc) => {
				screams.push({ screamId: doc.id, ...doc.data() });
			});
			for (let i = 0; i < screams.length; i++) {
				let screamTime = new Date(screams[i].createdAt).getTime();
				screams[i].trend = (screams[i].likeCount + screams[i].commentCount) / (currentTime - screamTime);
			}
			screams.sort((a, b) => b.trend - a.trend);
			return res.json(screams);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};
