const { admin, db } = require("../util/admin");

const config = require("../util/config");
const { uuid } = require("uuidv4");

const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require("../util/validators");
const { Queue } = require("../util/Queue");

exports.signup = (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

	const { valid, errors } = validateSignupData(newUser);

	if (!valid) return res.status(400).json(errors);

	const noImg = "no-img.png";
	let token, userId;
	db.doc(`/users/${newUser.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				return res.status(400).json({ handle: "This handle is already taken" });
			} else {
				return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
			}
		})
		.then((data) => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then((idToken) => {
			token = idToken;
			const userCredentials = {
				handle: newUser.handle,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
				userId
			};
			return db.doc(`/users/${newUser.handle}`).set(userCredentials);
		})
		.then(() => {
			return db
				.doc(`util/userHandles`)
				.update({ handles: admin.firestore.FieldValue.arrayUnion(newUser.handle) });
		})
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.login = (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password,
	};

	const { valid, errors } = validateLoginData(user);

	if (!valid) return res.status(400).json(errors);

	firebase
		.auth()
		.signInWithEmailAndPassword(user.email, user.password)
		.then((data) => {
			return data.user.getIdToken();
		})
		.then((token) => {
			return res.json({ token });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.addUserDetails = (req, res) => {
	let userDetails = reduceUserDetails(req.body);

	db.doc(`/users/${req.user.handle}`)
		.update(userDetails)
		.then(() => {
			return res.json({ message: "Details added successfully" });
		})
		.catch((err) => {
			console.log(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getUserDetails = (req, res) => {
	console.log(req.data);
	let userData = {};
	db.doc(`/users/${req.params.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				userData.user = doc.data();
				return db
					.collection("screams")
					.where("userHandle", "==", req.params.handle)
					.orderBy("createdAt", "desc")
					.get();
			} else {
				return res.status(404).json({ errror: "User not found" });
			}
		})
		.then((data) => {
			userData.screams = [];
			data.forEach((doc) => {
				userData.screams.push({
					body: doc.data().body,
					createdAt: doc.data().createdAt,
					userHandle: doc.data().userHandle,
					userImage: doc.data().userImage,
					likeCount: doc.data().likeCount,
					commentCount: doc.data().commentCount,
					screamId: doc.id,
				});
			});
			return res.json(userData);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getAuthenticatedUser = (req, res) => {
	let userData = {};
	db.doc(`/users/${req.user.handle}`)
		.get()
		.then((doc) => {
			console.log(doc.data);
			if (doc.exists) {
				userData.credentials = doc.data();
				return db.collection("likes").where("userHandle", "==", req.user.handle).get();
			}
		})
		.then((data) => {
			userData.likes = [];
			data.forEach((doc) => {
				userData.likes.push(doc.data());
			});
			return db
				.collection("notifications")
				.where("recipient", "==", req.user.handle)
				.orderBy("createdAt", "desc")
				.limit(10)
				.get();
		})
		.then((data) => {
			userData.notifications = [];
			data.forEach((doc) => {
				userData.notifications.push({
					recipient: doc.data().recipient,
					sender: doc.data().sender,
					createdAt: doc.data().createdAt,
					screamId: doc.data().screamId,
					type: doc.data().type,
					read: doc.data().read,
					notificationId: doc.id,
				});
			});
			return res.json(userData);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.uploadImage = (req, res) => {
	console.log(req.data);
	const BusBoy = require("busboy");
	const path = require("path");
	const os = require("os");
	const fs = require("fs");

	const busboy = new BusBoy({ headers: req.headers });

	let imageToBeUploaded = {};
	let imageFileName;
	// String for image token
	let generatedToken = uuid();

	busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
		console.log(fieldname, file, filename, encoding, mimetype);
		if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
			return res.status(400).json({ error: "Wrong file type submitted" });
		}
		// my.image.png => ['my', 'image', 'png']
		const imageExtension = filename.split(".")[filename.split(".").length - 1];
		// 32756238461724837.png
		imageFileName = `${Math.round(Math.random() * 1000000000000).toString()}.${imageExtension}`;
		const filepath = path.join(os.tmpdir(), imageFileName);
		imageToBeUploaded = { filepath, mimetype };
		file.pipe(fs.createWriteStream(filepath));
	});
	busboy.on("finish", () => {
		admin
			.storage()
			.bucket()
			.upload(imageToBeUploaded.filepath, {
				resumable: false,
				metadata: {
					metadata: {
						contentType: imageToBeUploaded.mimetype,
						//Generate token to be appended to imageUrl
						firebaseStorageDownloadTokens: generatedToken,
					},
				},
			})
			.then(() => {
				// Append token to url
				const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
				return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
			})
			.then(() => {
				return res.json({ message: "image uploaded successfully" });
			})
			.catch((err) => {
				console.error(err);
				return res.status(500).json({ error: "something went wrong" });
			});
	});
	busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req, res) => {
	let batch = db.batch();
	req.body.forEach((notificationId) => {
		const notification = db.doc(`/notifications/${notificationId}`);
		batch.update(notification, { read: true });
	});
	batch
		.commit()
		.then(() => {
			return res.json({ message: "Notifications marked read" });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.followUser = (req, res) => {
	let notification = {
		createdAt: new Date().toISOString(),
		read: false,
		recipient: req.body.handle,
		sender: req.user.handle,
		type: "follow",
	};
	let obj = {
		following: {},
	};
	obj["following"][req.body.handle] = req.body.imageUrl;
	db.doc(`users/${req.user.handle}`)
		.set(obj, { merge: true })
		.then(() => {
			console.log("Followed");
			return db.collection("notifications").add(notification);
		})
		.then(() => {
			return res.json({ message: "Success" });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.unFollowUser = (req, res) => {
	let obj = {
		following: {},
	};
	obj["following"][req.body.handle] = admin.firestore.FieldValue.delete();
	db.doc(`users/${req.user.handle}`)
		.set(obj, { merge: true })
		.then(() => {
			console.log("Unfollowed");
			return res.json({ message: "Success" });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.searchUsers = (req, res) => {
	let next =
		req.query.q.substring(0, req.query.q.length - 1) +
		String.fromCharCode(req.query.q.charCodeAt(req.query.q.length - 1) + 1);
	console.log(req.query.q, next);
	db.collection(`users`)
		.where("handle", ">=", req.query.q)
		.where("handle", "<", next)
		.get()
		.then((docs) => {
			let result = [];
			docs.forEach((doc) => {
				result.push(doc.data());
			});
			return res.json(result);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getRecommendations = (req, res) => {
	let users = new Set();
	let queue = new Queue();
	let recommendations = [];
	users.add(req.user.handle);
	db.doc(`users/${req.user.handle}`)
		.get()
		.then((doc) => {
			if (doc.data().following) {
				for (let u in doc.data().following) {
					queue.push(u);
					users.add(u);
				}
			}
			return getRecommendationsUtil(queue, users, recommendations, res);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

const getRecommendationsUtil = (queue, users, recommendations, res) => {
	if (queue.empty()) return res.json(recommendations);
	let user = queue.pop();
	db.doc(`users/${user}`)
		.get()
		.then((doc) => {
			for (let u in doc.data().following) {
				if (!users.has(u)) {
					recommendations.push({ handle: u, imageUrl: doc.data().following[u] });
					queue.push(u);
					users.add(u);
				}
				if (recommendations.length === 5) return res.json(recommendations);
			}
			getRecommendationsUtil(queue, users, recommendations, res);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getUserHandles = (req, res) => {
	db.doc(`util/userHandles`)
		.get()
		.then((doc) => {
			return res.json({ users: doc.data().handles });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};
