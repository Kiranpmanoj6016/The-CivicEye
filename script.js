// Import the necessary Firebase services from your configuration file
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// Initialize Firebase Storage
const storage = getStorage();

export async function submitIssue(photoFile, description, tags, lat, lng, userID, onProgressCallback) {
  if (!photoFile || !description) {
    alert("Please fill all fields and attach a photo.");
    return;
  }

  try {
    // Create a unique file name to avoid conflicts
    const fileName = `issues/${userID}_${new Date().getTime()}_${photoFile.name}`;
    const storageRef = ref(storage, fileName);

    // Use uploadBytesResumable to track the upload progress
    const uploadTask = uploadBytesResumable(storageRef, photoFile);

    // Monitor the upload state and report progress
    uploadTask.on('state_changed',
      (snapshot) => {
        // Calculate progress percentage
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // Call the provided callback function with the current progress
        if (onProgressCallback) {
          onProgressCallback(progress);
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Image upload failed", error);
        alert("Image upload failed: " + error.message);
        if (onProgressCallback) {
          onProgressCallback(0); // Reset progress on error
        }
      },
      async () => {
        // Handle successful uploads on completion
        try {
          // Get the download URL of the uploaded image
          const photoURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Add the issue details to Firestore
          await addDoc(collection(db, "issues"), {
            userID, description, photoURL, tags, status: "Pending", timestamp: serverTimestamp(),
            location: { latitude: lat, longitude: lng }
          });

          // Report completion
          if (onProgressCallback) {
            onProgressCallback(100);
          }
        } catch (error) {
          console.error("Error submitting issue to Firestore:", error);
          alert("Error submitting issue details: " + error.message);
        }
      }
    );
  } catch (error) {
    console.error("Error with submission process:", error);
    alert("An unexpected error occurred: " + error.message);
  }
}

// --- HELPER FUNCTION to calculate distance between two lat/lng points ---
export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
}

// --- NEW: Admin Function to create Authorized User in Database with department ---
export async function createAuthorizedUserInDB(name, email, department) {
    try {
        await addDoc(collection(db, "users"), {
            name: name,
            email: email,
            role: "Authorized User",
            department: department, // NEW: Add the department here
            createdAt: serverTimestamp()
        });
        alert(`User profile for ${name} created successfully.\n\nIMPORTANT: For the demo, you must now go to the Firebase Authentication console and manually create a user with the email '${email}' and any password.`);
    } catch (error) {
        alert("Error creating user profile: " + error.message);
    }
}

// --- NEW: Admin Function to fetch all Authorized Users ---
export async function fetchAuthorizedUsers() {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "Authorized User"));
    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() });
    });
    return users;
}

// --- ISSUE SUBMISSION (using imgbb for photos) ---
export async function submitIssue(photoFile, description, tags, lat, lng, userID) {
  if (!photoFile || !description) { alert("Please fill all fields and attach a photo."); return; }
  const imgbbApiKey = '58fb22547f9637cb02d893e3c86baf1b';
  const formData = new FormData();
  formData.append('image', photoFile);
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, { method: 'POST', body: formData });
    const result = await response.json();
    if (!result.success) { throw new Error(`Image upload failed: ${result.error.message}`); }
    const photoURL = result.data.url;
    await addDoc(collection(db, "issues"), {
      userID, description, photoURL, tags, status: "Pending", timestamp: serverTimestamp(),
      location: { latitude: lat, longitude: lng }
    });
    alert("Issue submitted successfully!");
  } catch (error) { alert("Error submitting issue: " + error.message); }
}

// --- DATA FETCHING (with NEW department-specific functions) ---
export async function fetchAllIssues() {
  const snapshot = await getDocs(collection(db, "issues"));
  const issues = [];
  snapshot.forEach(doc => { issues.push({ id: doc.id, ...doc.data() }); });
  return issues;
}

export async function fetchCitizenIssues(userID) {
    if (!userID) return [];
    const q = query(collection(db, "issues"), where("userID", "==", userID));
    const querySnapshot = await getDocs(q);
    const issues = [];
    querySnapshot.forEach((doc) => { issues.push({ id: doc.id, ...doc.data() }); });
    return issues;
}

export async function fetchDepartmentIssues(departmentTag) {
  if (!departmentTag) return [];
  const q = query(collection(db, "issues"), where("tags", "array-contains", departmentTag));
  const querySnapshot = await getDocs(q);
  const issues = [];
  querySnapshot.forEach((doc) => { issues.push({ id: doc.id, ...doc.data() }); });
  return issues;
}

// --- STATUS UPDATE & DELETE ---
export async function updateIssueStatus(issueID, newStatus, adminId) {
  try {
    await updateDoc(doc(db, "issues", issueID), { 
        status: newStatus,
        lastUpdatedBy: adminId
    });
  } catch (error) { alert("Error updating status: " + error.message); }
}
export async function deleteIssue(issueID) {
  try {
    await deleteDoc(doc(db, "issues", issueID));
    alert("Issue successfully deleted.");
  } catch (error) { alert("Error deleting issue: " + error.message); }
}

// --- AUTHENTICATION ---
export function logout() {
  signOut(auth).then(() => { window.location.href = "index.html"; });
}


