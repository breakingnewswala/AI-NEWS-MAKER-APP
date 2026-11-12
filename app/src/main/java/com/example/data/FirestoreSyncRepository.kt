package com.example.data

import android.content.Context
import android.util.Log
import com.example.R
import com.google.firebase.Firebase
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ServerTimestamp
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.snapshots
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

enum class OperationType(val value: String) {
    CREATE("create"),
    UPDATE("update"),
    DELETE("delete"),
    LIST("list"),
    GET("get"),
    WRITE("write"),
}

fun handleFirestoreError(
    exception: Throwable,
    operationType: OperationType,
    path: String?
): String {
    val causes = generateSequence(exception) { it.cause }
    val rootError = causes.firstOrNull { it is FirebaseFirestoreException }
        ?: causes.firstOrNull { it !is CancellationException }
        ?: exception

    val currentUser = Firebase.auth.currentUser
    val providerInfoList = currentUser?.providerData?.map { provider ->
        JSONObject().apply {
            put("providerId", provider.providerId)
            put("email", provider.email)
        }
    } ?: emptyList()

    val authInfoJson = JSONObject().apply {
        put("userId", currentUser?.uid)
        put("email", currentUser?.email)
        put("emailVerified", currentUser?.isEmailVerified)
        put("tenantId", currentUser?.tenantId)
        put("providerInfo", JSONArray(providerInfoList))
    }

    val errorInfoJson = JSONObject().apply {
        put("error", rootError.message ?: rootError.toString())
        put("operationType", operationType.value)
        put("path", path)
        put("authInfo", authInfoJson)
    }

    val jsonString = errorInfoJson.toString()
    Log.e("FirestoreError", "Firestore Error: $jsonString")
    return jsonString
}

@IgnoreExtraProperties
data class FirestoreUserProfile(
    @DocumentId val id: String = "",
    val uid: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "reporter",
    val tier: String = "free",
    val channelName: String = "",
    val avatarUrl: String = "",
    val photoUrl: String = "",
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class FirestoreDraftRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val headline: String = "",
    val summary: String = "",
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class FirestoreNewsPost(
    @DocumentId val id: String = "",
    val title: String = "",
    val summary: String = "",
    val sourceChannel: String = "",
    val sourceUrl: String = "",
    val category: String = "",
    val categoryName: String = "",
    val imageUrl: String = "",
    val breaking: Boolean = false,
    val authorId: String = "",
    val timestamp: Long = 0L
)

fun FirebaseAuth.authStateFlow(): Flow<FirebaseUser?> = callbackFlow {
    val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
        trySend(firebaseAuth.currentUser)
    }
    addAuthStateListener(listener)
    awaitClose { removeAuthStateListener(listener) }
}

class FirestoreSyncRepository(private val db: FirebaseFirestore) {

    constructor(context: Context) : this(
        FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        )
    )

    private val auth: FirebaseAuth = Firebase.auth

    private fun requireUserId(): String {
        return auth.currentUser?.uid
            ?: throw IllegalStateException("User must be signed in with Google before accessing Firestore.")
    }

    suspend fun syncSignedInUserProfile(
        user: FirebaseUser,
        channelName: String = "",
        roleLabel: String = "reporter",
        tierLabel: String = "free"
    ) {
        val uid = requireUserId()
        val email = user.email?.takeIf { it.isNotBlank() } ?: return
        val docRef = db.collection("users").document(uid)
        val payload = hashMapOf<String, Any>(
            "uid" to uid,
            "email" to email,
            "name" to (user.displayName ?: "Google User"),
            "role" to roleLabel,
            "tier" to tierLabel,
            "lastLoginAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        if (channelName.isNotBlank()) {
            payload["channelName"] = channelName
        }
        val photo = user.photoUrl?.toString().orEmpty()
        if (photo.isNotBlank()) {
            payload["photoUrl"] = photo
            payload["avatarUrl"] = photo
        }
        try {
            docRef.set(payload, SetOptions.merge()).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            throw e
        }
    }

    suspend fun saveDraft(
        draftId: String,
        headline: String,
        summary: String
    ) {
        val uid = requireUserId()
        val sanitizedId = draftId.replace(Regex("[^a-zA-Z0-9_\\-]"), "_").take(128).ifBlank {
            "draft_${System.currentTimeMillis()}"
        }
        val docRef = db.collection("users").document(uid).collection("drafts").document(sanitizedId)
        val payload = mapOf(
            "userId" to uid,
            "headline" to headline.take(500),
            "summary" to summary.take(2000),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        try {
            docRef.set(payload, SetOptions.merge()).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            throw e
        }
    }

    fun observeUserDrafts(): Flow<List<FirestoreDraftRecord>> = flow {
        val uid = requireUserId()
        val query = db.collection("users")
            .document(uid)
            .collection("drafts")
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .limit(50)
        val path = "users/$uid/drafts"
        emitAll(
            query.snapshots()
                .map { snapshot -> snapshot.toObjects(FirestoreDraftRecord::class.java) }
                .catch { error ->
                    val firestoreError = generateSequence(error) { it.cause }
                        .filterIsInstance<FirebaseFirestoreException>()
                        .firstOrNull()
                    if (firestoreError == null && error is CancellationException) throw error
                    val exceptionToLog = firestoreError ?: (error as? Exception)
                    if (exceptionToLog != null && auth.currentUser?.uid == uid) {
                        handleFirestoreError(exceptionToLog, OperationType.LIST, path)
                    }
                    throw error
                }
        )
    }

    fun observeNewsPosts(limitCount: Long = 30L): Flow<List<FirestoreNewsPost>> = flow {
        val uid = requireUserId()
        val path = "news_posts"
        val query = db.collection(path)
            .whereEqualTo("authorId", uid)
            .limit(limitCount)
        emitAll(
            query.snapshots()
                .map { snapshot -> snapshot.toObjects(FirestoreNewsPost::class.java) }
                .catch { error ->
                    val firestoreError = generateSequence(error) { it.cause }
                        .filterIsInstance<FirebaseFirestoreException>()
                        .firstOrNull()
                    if (firestoreError == null && error is CancellationException) throw error
                    val exceptionToLog = firestoreError ?: (error as? Exception)
                    if (exceptionToLog != null && auth.currentUser?.uid == uid) {
                        handleFirestoreError(exceptionToLog, OperationType.LIST, path)
                    }
                    throw error
                }
        )
    }
}
