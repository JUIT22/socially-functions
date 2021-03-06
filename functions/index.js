const functions = require("firebase-functions");
const app = require("express")();

const cors = require('cors');

const FBAuth = require("./util/fbAuth");
const { db } = require("./util/admin");

app.use(cors());

const {
	postOneScream,
	getScream,
	commentOnScream,
	likeScream,
	unlikeScream,
	deleteScream,
	getFriendsScreams,
	getTrendingScreams,
	deleteComment,
} = require("./handlers/screams");
const {
	signup,
	login,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsRead,
	followUser,
	unFollowUser,
	searchUsers,
	getRecommendations,
	getUserHandles,
} = require("./handlers/users");

app.get("/tscreams", getTrendingScreams);
app.get("/fscreams", FBAuth, getFriendsScreams);
app.post("/scream", FBAuth, postOneScream);
app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);
app.delete("/scream/:screamId/comment/:commentId", FBAuth, deleteComment);
app.delete("/scream/:screamId", FBAuth, deleteScream);
app.post("/scream/:screamId/like", FBAuth, likeScream);
app.post("/scream/:screamId/unlike", FBAuth, unlikeScream);

app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/users", getUserHandles);
app.get("/user/:handle", getUserDetails);
app.post("/user/follow", FBAuth, followUser);
app.post("/user/unfollow", FBAuth, unFollowUser);
app.post("/notifications", FBAuth, markNotificationsRead);
app.get("/search", searchUsers);
app.get("/recommend", FBAuth, getRecommendations);


exports.api = functions.region("asia-south1").https.onRequest(app);
exports.createNotificationOnLike = functions
	.region("asia-south1")
	.firestore.document("likes/{id}")
	.onCreate((snapshot) => {
		return db
			.doc(`/screams/${snapshot.data().screamId}`)
			.get()
			.then((doc) => {
				if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: "like",
						read: false,
						screamId: doc.id,
					});
				}
			})
			.catch((err) => console.error(err));
	});

exports.deleteNotificationOnUnLike = functions
	.region("asia-south1")
	.firestore.document("likes/{id}")
	.onDelete((snapshot) => {
		return db
			.doc(`/notifications/${snapshot.id}`)
			.delete()
			.catch((err) => {
				console.error(err);
				return;
			});
	});

exports.createNotificationOnComment = functions
	.region("asia-south1")
	.firestore.document("comments/{id}")
	.onCreate((snapshot) => {
		return db
			.doc(`/screams/${snapshot.data().screamId}`)
			.get()
			.then((doc) => {
				if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
					return db.doc(`/notifications/${snapshot.id}`).set({
						createdAt: new Date().toISOString(),
						recipient: doc.data().userHandle,
						sender: snapshot.data().userHandle,
						type: "comment",
						read: false,
						screamId: doc.id,
					});
				}
			})
			.catch((err) => {
				console.error(err);
				return;
			});
	});

exports.deleteNotificationOnDeleteComment = functions
	.region("asia-south1")
	.firestore.document("comments/{id}")
	.onDelete((snapshot) => {
		return db
			.doc(`/notifications/${snapshot.id}`)
			.delete()
			.catch((err) => {
				console.error(err);
				return;
			});
	});

exports.onUserImageChange = functions
	.region("asia-south1")
	.firestore.document("/users/{userId}")
	.onUpdate((change) => {
		// console.log(change.before.data());
		// console.log(change.after.data());
		if (change.before.data().imageUrl !== change.after.data().imageUrl) {
			console.log("image has changed");
			const batch = db.batch();
			return db
				.collection("screams")
				.where("userHandle", "==", change.before.data().handle)
				.get()
				.then((data) => {
					data.forEach((doc) => {
						const scream = db.doc(`/screams/${doc.id}`);
						batch.update(scream, { userImage: change.after.data().imageUrl });
					});
					return batch.commit();
				});
		} else return true;
	});

exports.onScreamDelete = functions
	.region("asia-south1")
	.firestore.document("/screams/{screamId}")
	.onDelete((snapshot, context) => {
		const screamId = context.params.screamId;
		const batch = db.batch();
		return db
			.collection("comments")
			.where("screamId", "==", screamId)
			.get()
			.then((data) => {
				data.forEach((doc) => {
					batch.delete(db.doc(`/comments/${doc.id}`));
				});
				return db.collection("likes").where("screamId", "==", screamId).get();
			})
			.then((data) => {
				data.forEach((doc) => {
					batch.delete(db.doc(`/likes/${doc.id}`));
				});
				return db.collection("notifications").where("screamId", "==", screamId).get();
			})
			.then((data) => {
				data.forEach((doc) => {
					batch.delete(db.doc(`/notifications/${doc.id}`));
				});
				return batch.commit();
			})
			.catch((err) => console.error(err));
	});
