/*************************************************
 * Firebase CRUD Demo (Realtime Database)
 *************************************************/

/* ================================
   1. Import Firebase modules
================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase,
    ref,
    push,
    set,
    get,
    update,
    remove,
    child
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ================================
   Firebase configuration
================================ */
const firebaseConfig = {
};
// later

/* ================================
   Initialize Firebase
================================ */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================================
   Helper: Log output
================================ */
const log = document.getElementById("log");

function writeLog(message) {
    log.textContent += message + "\n";
    log.scrollTop = log.scrollHeight;
}

/* ================================
   CREATE student
================================ */
document.getElementById("btn-create").addEventListener("click", function (e) {
    e.preventDefault();
 
    const name = document.getElementById("create-name").value; // Complete the code
    const age = document.getElementById("create-age").value; // Complete the code
 
    // Validation of data
    if (!name || !age) {
        writeLog("❌ Name and age are required.");
        return;
    }
 
    const studentsRef = ref(db, "students");
    const newStudentRef = push(studentsRef);
 
    set(newStudentRef, {
        name : name, // Complete the code
        age : Number(age) // Complete the code
    })
    .then(() => {
        writeLog(`✅ Student created with ID: ${newStudentRef.key}`);
    })
    .catch((error) => {
        writeLog("❌ Error creating student: " + error.message);
    });
});


/* ================================
   READ all students
================================ */
document.getElementById("btn-read-all").addEventListener("click", function (e) {
    e.preventDefault();
 
    get(ref(db, "students"))
        .then((snapshot) => {
            if (!snapshot.exists()) {
                writeLog("ℹ️ No students found.");
                return;
            }

            let content = "";
            writeLog("📚 All Students:");
            snapshot.forEach((childSnap) => {
                const id = childSnap.key;
                const data = childSnap.val();
 
                writeLog(`ID: ${id}`);
                writeLog(`Name: ${data.name}`); // modify this
                writeLog(`Age: ${data.age}`); // modify this
                writeLog("-------------------");
 
                content = `${content}<tr id='${id}' style='font-size: 12px;'>
                            <td>ID:${id}<br />
                            Name: ${data.name}&nbsp;&nbsp; 
                            Age: ${data.age}</td>
                            </tr>`;
            });
            document.getElementById("student-list").getElementsByTagName("tbody")[0].innerHTML = content;
        })
        .catch((error) => {
            writeLog("❌ Error reading students: " + error.message);
        });
});         


/* ================================
   UPDATE student
================================ */
document.getElementById("btn-update").addEventListener("click", function (e) {
    e.preventDefault();
 
   // Start writing your answers here, for the 3 elements that are required.
   let id = document.getElementById("update-id").value;
   let name = document.getElementById("update-name").value;
   let age = document.getElementById("update-age").value;
 
    if (!id) {
        writeLog("❌ Student ID is required.");
        return;
    }
 
    const updatedData = {};
    if (name) updatedData.name = name;
    if (age) updatedData.age = Number(age);
 
    if (Object.keys(updatedData).length === 0) {
        writeLog("❌ Nothing to update.");
        return;
    }
 
    update(ref(db, `students/${id}`), updatedData)
        .then(() => {
            writeLog(`✏️ Student ${id} updated successfully.`);
        })
        .catch((error) => {
            writeLog("❌ Error updating student: " + error.message);
        });
});


/* ================================
   9. DELETE student
================================ */
document.getElementById("btn-delete").addEventListener("click", function (e) {
    e.preventDefault();

    const id = document.getElementById("delete-id").value; // Complete the code

    if (!id) {
        writeLog("❌ Student ID is required.");
        return;
    }

    remove(ref(db, `students/${id}`))
        .then(() => {
            writeLog(`🗑️ Student ${id} deleted.`);
        })
        .catch((error) => {
            writeLog("❌ Error deleting student: " + error.message);
        });
});