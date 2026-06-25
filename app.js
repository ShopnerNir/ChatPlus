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

// গ্লোবাল ভেরিয়েবল
let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;

// ==========================================
// ২. ক্লাউডিনারি ফাইল আপলোড ইঞ্জিন (সার্বজনীন)
// ==========================================
async function uploadToCloudinary(file) {
    if (!file) return null;
    if (file.size > 50 * 1024 * 1024) { // ৫০ এমবি লক
        alert("ফাইল সাইজ ৫০ এমবির বেশি হতে পারবে না!");
        return null;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    
    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const data = await res.json();
        return data.secure_url;
    } catch (err) {
        console.error("Cloudinary Error:", err);
        return null;
    }
}

// ইনপুট ফাইলগুলোর নাম দেখানোর লজিক
document.getElementById("new-user-pic").onchange = (e) => document.getElementById("user-pic-status").innerText = e.target.files[0].name;
document.getElementById("group-pic").onchange = (e) => document.getElementById("group-pic-status").innerText = e.target.files[0].name;
document.getElementById("group-bg").onchange = (e) => document.getElementById("group-bg-status").innerText = e.target.files[0].name;

// ==========================================
// ৩. পেজ ফ্লো ও সেশন হ্যান্ডলিং
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        auth.onAuthStateChanged(user => {
            document.getElementById("splash-screen").classList.remove("active");
            if (user) {
                loadUserProfile(user.uid);
            } else {
                document.getElementById("login-screen").classList.add("active");
            }
        });
    }, 3000);
});

document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value;
    const email = `${username}@chatplus.com`;

    auth.signInWithEmailAndPassword(email, pass)
    .then(userCredential => {
        document.getElementById("login-screen").classList.remove("active");
        loadUserProfile(userCredential.user.uid);
    })
    .catch(err => alert("ভুল ইউজারনেম অথবা পাসওয়ার্ড!"));
});

function loadUserProfile(uid) {
    db.collection("users").doc(uid).get().then(doc => {
        if(doc.exists) {
            currentUser = doc.data();
            currentUser.uid = uid;
            
            document.getElementById("my-username").innerText = currentUser.name;
            if(currentUser.profilePic) document.getElementById("my-avatar").src = currentUser.profilePic;
            if(currentUser.role === 'admin') document.getElementById("btn-admin-panel").classList.remove("hidden");

            db.collection("users").doc(uid).update({ status: "online" });
            document.getElementById("main-dashboard").classList.add("active");
            loadChatList();
            autoDeleteOldMessages();
        }
    });
}

// ==========================================
// ৪. চ্যাট লিস্ট ইঞ্জিন
// ==========================================
function loadChatList() {
    db.collection("chats").onSnapshot(snapshot => {
        const container = document.getElementById("chat-list-container");
        container.innerHTML = "";
        
        snapshot.forEach(doc => {
            const chat = doc.data();
            chat.id = doc.id;
            
            if (currentUser.role === 'admin' || chat.members.includes(currentUser.username)) {
                let chatName = chat.name || "Direct Chat";
                let chatPic = chat.pic || "https://via.placeholder.com/45";
                
                if(chat.type === 'direct') {
                    chatName = chat.members.find(m => m !== currentUser.username);
                }

                const item = document.createElement("div");
                item.className = "chat-item";
                item.innerHTML = `
                    <img src="${chatPic}">
                    <div class="chat-info">
                        <div class="chat-name-time">
                            <h4>${chatName}</h4>
                            <span class="time">${chat.lastMsgTime ? new Date(chat.lastMsgTime.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                        </div>
                        <div class="chat-last-msg">
                            <p>${chat.lastMessage || 'No messages yet'}</p>
                        </div>
                    </div>
                `;
                item.onclick = () => openChat(chat);
                container.appendChild(item);
            }
        });
    });
}

// ==========================================
// ৫. চ্যাট উইন্ডো ওপেন এবং মেসেজ স্ট্রিমিং
// ==========================================
function openChat(chat) {
    currentChatId = chat.id;
    let chatName = chat.name;
    let chatPic = chat.pic || "https://via.placeholder.com/45";
    
    if(chat.type === 'direct') {
        chatName = chat.members.find(m => m !== currentUser.username);
    }

    const msgContainer = document.getElementById("message-container");
    msgContainer.style.backgroundImage = chat.backgroundTheme ? `url('${chat.backgroundTheme}')` : "url('https://w0.peakpx.com/wallpaper/508/606/HD-wallpaper-whatsapp-background-patterns-texture.jpg')";

    document.getElementById("active-chat-info").innerHTML = `
        <img src="${chatPic}">
        <div>
            <h4>${chatName}</h4>
            <span class="status">${chat.type === 'group' ? 'Group' : 'Active'}</span>
        </div>
    `;

    document.querySelector(".app-container").classList.add("chat-open"); // মোবাইল ট্রিকস

    if(unsubscribeMessages) unsubscribeMessages();

    unsubscribeMessages = db.collection("messages")
        .where("chatId", "==", currentChatId)
        .orderBy("timestamp", "asc")
        .onSnapshot(snapshot => {
            msgContainer.innerHTML = "";
            snapshot.forEach(doc => {
                const msg = doc.data();
                msg.id = doc.id;
                
                const msgDiv = document.createElement("div");
                msgDiv.className = `message ${msg.senderId === currentUser.username ? 'outgoing' : 'incoming'}`;
                
                let msgContent = `<p>${msg.text}</p>`;
                if(msg.isDeletedByAdmin) {
                    msgContent = `<p class="admin-deleted"><i class="fas fa-ban"></i> This message was deleted by Admin</p>`;
                } else if (msg.mediaUrl) {
                    if(msg.mediaType === 'image') msgContent = `<img src="${msg.mediaUrl}" style="max-width:200px; border-radius:5px;"><p>${msg.text}</p>`;
                    else if(msg.mediaType === 'video') msgContent = `<video src="${msg.mediaUrl}" controls style="max-width:200px;"></video><p>${msg.text}</p>`;
                    else msgContent = `<a href="${msg.mediaUrl}" target="_blank" style="color:var(--primary);"><i class="fas fa-file"></i> View File</a><p>${msg.text}</p>`;
                }

                const timeStr = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

                msgDiv.innerHTML = `
                    <div class="msg-bubble">
                        ${msg.senderId !== currentUser.username && chat.type === 'group' ? `<small style="color:var(--primary); font-weight:bold; display:block; margin-bottom:2px;">@${msg.senderId}</small>` : ''}
                        ${msgContent}
                        <span class="msg-time">${timeStr} ${msg.isEdited ? '(Edited)' : ''}</span>
                    </div>
                `;

                msgDiv.addEventListener("contextmenu", (e) => { e.preventDefault(); handleMessageOptions(msg); });
                msgDiv.addEventListener("touchstart", (e) => { 
                    window.touchTimer = setTimeout(() => handleMessageOptions(msg), 800); 
                });
                msgDiv.addEventListener("touchend", () => clearTimeout(window.touchTimer));

                msgContainer.appendChild(msgDiv);
            });
            msgContainer.scrollTop = msgContainer.scrollHeight;
        });
}

// ==========================================
// ৬. মেসেজ পাঠানো (মিডিয়াসহ)
// ==========================================
document.getElementById("btn-send").onclick = () => sendTrigger();
document.getElementById("msg-input").onkeypress = (e) => { if(e.key === 'Enter') sendTrigger(); };

async function sendTrigger() {
    const text = document.getElementById("msg-input").value.trim();
    const mediaFile = document.getElementById("media-input").files[0];
    const docFile = document.getElementById("file-input").files[0];
    const fileToUpload = mediaFile || docFile;

    if(!text && !fileToUpload) return;
    document.getElementById("msg-input").value = "";

    let mediaUrl = null;
    let mediaType = null;

    if(fileToUpload) {
        mediaUrl = await uploadToCloudinary(fileToUpload);
        mediaType = fileToUpload.type.split('/')[0] || 'file';
    }

    const msgData = {
        chatId: currentChatId,
        senderId: currentUser.username,
        text: text,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        isEdited: false,
        isDeletedByAdmin: false
    };

    db.collection("messages").add(msgData);
    db.collection("chats").doc(currentChatId).update({
        lastMessage: text || "Attachment Sent",
        lastMsgTime: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("media-input").value = "";
    document.getElementById("file-input").value = "";
}

function handleMessageOptions(msg) {
    if(msg.isDeletedByAdmin) return;
    const timeDiff = (Date.now() - msg.timestamp.toDate().getTime()) / 1000 / 60;

    if(currentUser.role === 'admin') {
        if(confirm("এডমিন প্যানেল: এই মেসেজটি ডিলিট করতে চান?")) {
            db.collection("messages").doc(msg.id).update({ isDeletedByAdmin: true });
        }
    } else if (msg.senderId === currentUser.username && timeDiff <= 10) {
        const newText = prompt("মেসেজটি এডিট করুন:", msg.text);
        if(newText) db.collection("messages").doc(msg.id).update({ text: newText, isEdited: true });
    }
}

// ==========================================
// ৭. এডমিন প্যানেল ইঞ্জিন (সরাসরি আপলোড লজিক)
// ==========================================
document.getElementById("btn-create-user").onclick = async () => {
    const name = document.getElementById("new-user-name").value;
    const username = document.getElementById("new-user-username").value.trim().toLowerCase();
    const pass = document.getElementById("new-user-pass").value;
    const picFile = document.getElementById("new-user-pic").files[0];

    if(!name || !username || !pass) return alert("সব ঘর পূরণ করুন!");

    let uploadedPicUrl = "https://via.placeholder.com/45"; // ডিফল্ট

    if(picFile) {
        alert("প্রোফাইল ছবি আপলোড হচ্ছে, দয়া করে অপেক্ষা করুন...");
        uploadedPicUrl = await uploadToCloudinary(picFile);
    }

    try {
        const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryEngine");
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(`${username}@chatplus.com`, pass);
        
        await db.collection("users").doc(userCredential.user.uid).set({
            name: name,
            username: username,
            role: "user",
            profilePic: uploadedPicUrl,
            status: "offline"
        });

        await db.collection("chats").add({
            type: "direct",
            members: [currentUser.username, username],
            lastMessage: "Chat Setup Complete",
            lastMsgTime: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`সফলভাবে ${username} অ্যাকাউন্ট তৈরি হয়েছে!`);
        document.getElementById("admin-modal").classList.remove("active");
        secondaryApp.delete();
    } catch(err) { alert("Error: " + err.message); }
};

document.getElementById("btn-create-group").onclick = async () => {
    const gName = document.getElementById("group-name").value;
    const gPicFile = document.getElementById("group-pic").files[0];
    const gBgFile = document.getElementById("group-bg").files[0];
    const membersList = document.getElementById("group-members").value.split(",").map(m => m.trim());
    
    if(!gName) return alert("গ্রুপের নাম দিন!");
    alert("গ্রুপের মিডিয়া আপলোড হচ্ছে, অপেক্ষা করুন...");

    let gPicUrl = "https://via.placeholder.com/45";
    let gBgUrl = null;

    if(gPicFile) gPicUrl = await uploadToCloudinary(gPicFile);
    if(gBgFile) gBgUrl = await uploadToCloudinary(gBgFile);
    
    membersList.push(currentUser.username); 

    db.collection("chats").add({
        name: gName,
        pic: gPicUrl,
        backgroundTheme: gBgUrl,
        type: "group",
        members: membersList,
        lastMessage: "Welcome To New Group",
        lastMsgTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("গ্রুপ তৈরি সম্পন্ন!");
        document.getElementById("admin-modal").classList.remove("active");
    });
};

// ==========================================
// ৮. উইটিলিটি ও অটো ক্লিনার
// ==========================================
function autoDeleteOldMessages() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    db.collection("messages").where("timestamp", "<", thirtyDaysAgo).get().then(snapshot => {
        let batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        batch.commit();
    });
}

document.getElementById("btn-back-to-list").onclick = () => document.querySelector(".app-container").classList.remove("chat-open");
document.getElementById("btn-settings").onclick = () => document.getElementById("settings-modal").classList.add("active");
document.getElementById("close-settings").onclick = () => document.getElementById("settings-modal").classList.remove("active");
document.getElementById("btn-admin-panel").onclick = () => document.getElementById("admin-modal").classList.add("active");
document.getElementById("close-admin").onclick = () => document.getElementById("admin-modal").classList.remove("active");

document.getElementById("save-password").onclick = () => {
    const newPass = document.getElementById("new-pass").value;
    auth.currentUser.updatePassword(newPass)
        .then(() => { alert("পাসওয়ার্ড সফলভাবে পরিবর্তিত!"); document.getElementById("settings-modal").classList.remove("active"); })
        .catch(err => alert(err.message));
};

document.getElementById("btn-logout").onclick = () => {
    if(currentUser) {
        db.collection("users").doc(currentUser.uid).update({ status: "offline" }).then(() => {
            auth.signOut().then(() => location.reload());
        });
    }
};
