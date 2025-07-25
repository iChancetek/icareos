const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Deletes a user from Firebase Authentication and their associated data from Firestore.
 * This function can only be called by an authenticated user with an 'admin' role.
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the user is an admin.
  if (context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can delete users.'
    );
  }

  const uid = data.uid;
  if (!uid || typeof uid !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a "uid" argument.'
    );
  }

  try {
    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(uid);

    // Delete user's document from Firestore
    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.delete();
    
    // Optionally, you can also delete all consultations for that user
    const consultationsRef = admin.firestore().collection('consultations');
    const snapshot = await consultationsRef.where('userId', '==', uid).get();
    const batch = admin.firestore().batch();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    return { success: true, message: `Successfully deleted user ${uid}` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while deleting the user.',
      error
    );
  }
});