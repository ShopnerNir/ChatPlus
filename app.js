// ==========================================
// ১. ফায়ারবেস ও ক্লাউডিনারি কনফিগারেশন 
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCFylUIK2wByPd70a4xEg2_8QkqY-MP8WM",
  authDomain: "chatplus-22012026.firebaseapp.com",
  projectId: "chatplus-22012026",
  storageBucket: "chatplus-22012026.firebasestorage.app",
  messagingSenderId: "530474889688",
  appId: "1:530474889688:web:38e1545f1ee796a4bf42ad"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Cloudinary Credentials
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/zx82me8y/upload";
const CLOUDINARY_PRESET = "ChatPlus"; 


let currentUser = null;
let currentChatId = null;
let activeUnsubscribe = null;

// ==========================================
// ক্লাউডিনারি ইমেজ আপলোড মেকানিজম
// ==========================================
async function uploadFile(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url || null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// ফাইল নেম ট্র্যাকার
document.getElementById("edit-my-pic").onchange = (e) => document.getElementById("my-pic-status").innerText = e.target.files[0].name;
document.getElementById("new-user-pic").onchange = (e) => document.getElementById("user-pic-status").innerText = e.target.files[0].name;
document.getElementById("group-pic").onchange = (e) => document.getElementById("group-pic-status").innerText = e.target.files[0].name;

// ==========================================
// অথেন্টিকেশন ও সেশন লোডার
// ==========================================
auth.onAuthStateChanged(user => {
    document.getElementById("splash-screen").classList.remove("active");
    if (user) {
        db.collection("users").doc(user.uid).get().then(doc => {
            if (doc.exists) {
                currentUser = doc.data();
                currentUser.uid = user.uid;
                document.getElementById("my-username").innerText = currentUser.name;
                document.getElementById("my-avatar").src = currentUser.profilePic || "https://via.placeholder.com/40";
                if(currentUser.role === 'admin') document.getElementById("btn-admin-panel").classList.remove("hidden");
                
                document.getElementById("main-dashboard").classList.add("active");
                loadChats();
            }
        });
    } else {
        document.getElementById("login-screen").classList.add("active");
    }
});

document.getElementById("login-form").onsubmit = (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value;
    auth.signInWithEmailAndPassword(`${username}@chatplus.com`, pass).catch(err => alert("লগইন ব্যর্থ!"));
};

// ==========================================
// চ্যাট লিস্ট ও রিয়েলটাইম মেসেজ ইঞ্জিন (ফিক্সড)
// ==========================================
function loadChats() {
    db.collection("chats").onSnapshot(snapshot => {
        const container = document.getElementById("chat-list-container");
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const chat = doc.data();
            chat.id = doc.id;
            
            if (chat.members.includes(currentUser.username)) {
                let name = chat.name || chat.members.find(m => m !== currentUser.username);
                let pic = chat.pic || "https://via.placeholder.com/48";

                const item = document.createElement("div");
                item.className = "chat-item";
                item.innerHTML = `
                    <img src="${pic}">
                    <div class="chat-info">
                        <div class="chat-name-time"><h4>${name}</h4></div>
                        <div class="chat-last-msg"><p>${chat.lastMessage || 'No messages'}</p></div>
                    </div>
                `;
                item.onclick = () => openChatBox(chat, name, pic);
                container.appendChild(item);
            }
        });
    });
}

function openChatBox(chat, name, pic) {
    currentChatId = chat.id;
    document.getElementById("active-chat-info").innerHTML = `<img src="${pic}"><h4>${name}</h4>`;
    document.querySelector(".app-container").classList.add("chat-open");

    if (activeUnsubscribe) activeUnsubscribe();

    activeUnsubscribe = db.collection("messages")
        .where("chatId", "==", currentChatId)
        .orderBy("timestamp", "asc")
        .onSnapshot(snapshot => {
            const box = document.getElementById("message-container");
            box.innerHTML = "";
            snapshot.forEach(doc => {
                const msg = doc.data();
                const div = document.createElement("div");
                div.className = `message ${msg.senderId === currentUser.username ? 'outgoing' : 'incoming'}`;
                
                let body = `<p>${msg.text}</p>`;
                if (msg.mediaUrl) {
                    body = msg.mediaType === 'image' ? `<img src="${msg.mediaUrl}" style="max-width:200px;border-radius:6px;">` : `<video src="${msg.mediaUrl}" controls style="max-width:200px;"></video>`;
                }

                div.innerHTML = `<div class="msg-bubble">${body}</div>`;
                box.appendChild(div);
            });
            box.scrollTop = box.scrollHeight;
        });
}

// ==========================================
// মেসেজ এবং মিডিয়া পাঠানো
// ==========================================
document.getElementById("btn-send").onclick = () => sendMessage();
async function sendMessage() {
    const text = document.getElementById("msg-input").value.trim();
    const file = document.getElementById("media-input").files[0];
    if (!text && !file) return;

    document.getElementById("msg-input").value = "";
    let url = null, type = null;

    if(file) {
        url = await uploadFile(file);
        type = file.type.split('/')[0];
    }

    const payload = {
        chatId: currentChatId,
        senderId: currentUser.username,
        text: text,
        mediaUrl: url,
        mediaType: type,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("messages").add(payload);
    db.collection("chats").doc(currentChatId).update({ lastMessage: text || "Media attachment" });
    document.getElementById("media-input").value = "";
}

// ==========================================
// প্রোফাইল এডিট এবং এডমিন প্যানেল (ফিক্সড)
// ==========================================
document.getElementById("btn-my-profile").onclick = () => document.getElementById("profile-modal").classList.add("active");
document.getElementById("close-profile").onclick = () => document.getElementById("profile-modal").classList.remove("active");

document.getElementById("btn-save-profile").onclick = async () => {
    const file = document.getElementById("edit-my-pic").files[0];
    const pass = document.getElementById("change-my-pass").value;
    
    let newUrl = currentUser.profilePic;
    if(file) {
        alert("প্রোফাইল পিকচার আপলোড হচ্ছে...");
        newUrl = await uploadFile(file);
    }

    const updates = { profilePic: newUrl };
    db.collection("users").doc(currentUser.uid).update(updates).then(() => {
        if(pass) {
            auth.currentUser.updatePassword(pass);
        }
        alert("প্রোফাইল আপডেট হয়েছে!");
        location.reload();
    });
};

document.getElementById("btn-create-user").onclick = async () => {
    const name = document.getElementById("new-user-name").value;
    const username = document.getElementById("new-user-username").value.trim().toLowerCase();
    const pass = document.getElementById("new-user-pass").value;
    const file = document.getElementById("new-user-pic").files[0];

    let picUrl = "https://via.placeholder.com/48";
    if(file) picUrl = await uploadFile(file);

    const secApp = firebase.initializeApp(firebaseConfig, "Secondary");
    secApp.auth().createUserWithEmailAndPassword(`${username}@chatplus.com`, pass).then(cred => {
        db.collection("users").doc(cred.user.uid).set({
            name: name, username: username, role: "user", profilePic: picUrl
        });
        db.collection("chats").add({
            type: "direct", members: [currentUser.username, username], lastMessage: "Chat started"
        });
        alert("ইউজার তৈরি সফল!");
        secApp.delete();
    });
};

document.getElementById("btn-create-group").onclick = async () => {
    const name = document.getElementById("group-name").value;
    const file = document.getElementById("group-pic").files[0];
    const members = document.getElementById("group-members").value.split(",").map(m => m.trim());
    members.push(currentUser.username);

    let picUrl = "https://via.placeholder.com/48";
    if(file) picUrl = await uploadFile(file);

    db.collection("chats").add({
        name: name, pic: picUrl, type: "group", members: members, lastMessage: "Group created"
    }).then(() => alert("গ্রুপ তৈরি সফল!"));
};

// নেভিগেশন কন্ট্রোল
document.getElementById("btn-back-to-list").onclick = () => document.querySelector(".app-container").classList.remove("chat-open");
document.getElementById("btn-admin-panel").onclick = () => document.getElementById("admin-modal").classList.add("active");
document.getElementById("close-admin").onclick = () => document.getElementById("admin-modal").classList.remove("active");
document.getElementById("btn-logout").onclick = () => auth.signOut().then(() => location.reload());

