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

// গ্লোবাল ভ্যারিয়েবলস
let currentUser = null;
let currentChatId = null;
let currentChatType = null; // 'direct' অথবা 'group'
let unsubscribeMessages = null;

// ==========================================
// ২. পেজ ফ্লো ও লোডিং (Splash Screen)
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
    }, 3000); // ৩ সেকেন্ড পর লোডিং পেজ চলে যাবে
});

// ==========================================
// ৩. ইউজারনেম দিয়ে লগইন প্রসেস
// ==========================================
document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value;
    
    // ইউজারনেমকে ভার্চুয়াল ইমেইলে কনভার্ট করা (১০-১২ জনের জন্য সেরা সলিউশন)
    const email = `${username}@chatplus.com`;

    auth.signInWithEmailAndPassword(email, pass)
    .then(userCredential => {
        document.getElementById("login-screen").classList.remove("active");
        loadUserProfile(userCredential.user.uid);
    })
    .catch(err => alert("ভুল ইউজারনেম অথবা পাসওয়ার্ড!"));
});

// ইউজার ডাটা লোড করা
function loadUserProfile(uid) {
    db.collection("users").doc(uid).get().then(doc => {
        if(doc.exists) {
            currentUser = doc.data();
            currentUser.uid = uid;
            
            document.getElementById("my-username").innerText = currentUser.name;
            if(currentUser.profilePic) {
                document.getElementById("my-avatar").src = currentUser.profilePic;
            }
            
            // যদি এডমিন লগইন করে তবে এডমিন বাটন দেখানো
            if(currentUser.role === 'admin') {
                document.getElementById("btn-admin-panel").classList.remove("hidden");
            }

            // অনলাইন স্ট্যাটাস সেট করা
            db.collection("users").doc(uid).update({ status: "online" });
            
            document.getElementById("main-dashboard").classList.add("active");
            loadChatList();
            autoDeleteOldMessages(); // ৩০ দিনের পুরনো মেসেজ ডিলিট ট্রিগার
        }
    });
}

// ==========================================
// ৪. চ্যাট লিস্ট লোড করা (ডাইনামিক)
// ==========================================
function loadChatList() {
    // ডাইরেক্ট চ্যাট এবং গ্রুপ চ্যাট দুটোই একসাথে রিয়েল-টাইমে নজর রাখা
    db.collection("chats").onSnapshot(snapshot => {
        const container = document.getElementById("chat-list-container");
        container.innerHTML = "";
        
        snapshot.forEach(doc => {
            const chat = doc.data();
            chat.id = doc.id;
            
            // পারমিশন চেক: ইউজার এই চ্যাট দেখার যোগ্য কিনা
            if (currentUser.role === 'admin' || chat.members.includes(currentUser.username)) {
                let chatName = chat.name || "Direct Chat";
                let chatPic = chat.pic || "https://via.placeholder.com/45";
                
                // ডাইরেক্ট চ্যাটের ক্ষেত্রে অন্য ইউজারের নাম ও ছবি দেখানো
                if(chat.type === 'direct') {
                    const otherUser = chat.members.find(m => m !== currentUser.username);
                    chatName = otherUser;
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
// ৫. চ্যাট উইন্ডো ওপেন এবং মেসেজ লোড
// ==========================================
function openChat(chat) {
    currentChatId = chat.id;
    currentChatType = chat.type;
    
    let chatName = chat.name;
    let chatPic = chat.pic || "https://via.placeholder.com/45";
    if(chat.type === 'direct') {
        chatName = chat.members.find(m => m !== currentUser.username);
    }

    // ব্যাকগ্রাউন্ড থিম সেট করা
    const msgContainer = document.getElementById("message-container");
    if(chat.backgroundTheme) {
        msgContainer.style.backgroundImage = `url('${chat.backgroundTheme}')`;
    } else {
        msgContainer.style.backgroundImage = "url('https://w0.peakpx.com/wallpaper/508/606/HD-wallpaper-whatsapp-background-patterns-texture.jpg')";
    }

    document.getElementById("active-chat-info").innerHTML = `
        <img src="${chatPic}">
        <div>
            <h4>${chatName}</h4>
            <span class="status">${chat.type === 'group' ? 'Group' : 'Active'}</span>
        </div>
    `;

    // আগের মেসেজ লিসেনার বন্ধ করা
    if(unsubscribeMessages) unsubscribeMessages();

    // মেসেজ রিয়েল-টাইম লোড করা
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
                    else msgContent = `<a href="${msg.mediaUrl}" target="_blank"><i class="fas fa-file"></i> View Attachment</a><p>${msg.text}</p>`;
                }

                const timeStr = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

                msgDiv.innerHTML = `
                    <div class="msg-bubble" id="msg-${msg.id}">
                        ${msg.senderId !== currentUser.username && chat.type === 'group' ? `<small style="color:var(--primary); font-weight:bold;">${msg.senderId}</small>` : ''}
                        ${msgContent}
                        <span class="msg-time">${timeStr} ${msg.isEdited ? '(Edited)' : ''}</span>
                    </div>
                `;

                // ১০ মিনিটের ভিতর লং প্রেস/রাইট ক্লিকে মেসেজ এডিট লজিক এবং এডমিন ডিলিট পাওয়ার
                msgDiv.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    handleMessageOptions(msg);
                });

                msgContainer.appendChild(msgDiv);
            });
            msgContainer.scrollTop = msgContainer.scrollHeight;
        });
}

// ==========================================
// ৬. মেসেজ পাঠানো এবং মিডিয়া আপলোড (Cloudinary)
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
        if (fileToUpload.size > 50 * 1024 * 1024) { // 50MB Limit
            alert("ফাইল সাইজ ৫০ এমবির বেশি!");
            return;
        }
        // Cloudinary আপলোড
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("upload_preset", CLOUDINARY_PRESET);
        
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        const fileData = await res.json();
        mediaUrl = fileData.secure_url;
        mediaType = fileToUpload.type.split('/')[0];
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

    // ইনপুট রিসেট
    document.getElementById("media-input").value = "";
    document.getElementById("file-input").value = "";
}

// ==========================================
// ৭. মেসেজ এডিট (১০ মিনিট) ও এডমিন ডিলিট অপশন
// ==========================================
function handleMessageOptions(msg) {
    if(msg.isDeletedByAdmin) return;

    const timeDiff = (Date.now() - msg.timestamp.toDate().getTime()) / 1000 / 60; // Minutes

    if(currentUser.role === 'admin') {
        if(confirm("এডমিন হিসেবে এই মেসেজটি ডিলিট করতে চান?")) {
            db.collection("messages").doc(msg.id).update({ isDeletedByAdmin: true });
        }
    } else if (msg.senderId === currentUser.username && timeDiff <= 10) {
        const newText = prompt("আপনার মেসেজটি এডিট করুন:", msg.text);
        if(newText) {
            db.collection("messages").doc(msg.id).update({ text: newText, isEdited: true });
        }
    }
}

// ==========================================
// ৮. এডমিন অ্যাকশন (ইউজার এবং গ্রুপ তৈরি)
// ==========================================
document.getElementById("btn-create-user").onclick = async () => {
    const name = document.getElementById("new-user-name").value;
    const username = document.getElementById("new-user-username").value.trim().toLowerCase();
    const pass = document.getElementById("new-user-pass").value;
    const pic = document.getElementById("new-user-pic").value || "https://via.placeholder.com/45";

    if(!name || !username || !pass) return alert("সব ঘর পূরণ করুন!");

    try {
        // একটি সেকেন্ডারি ফায়ারবেস অ্যাপ দিয়ে ইউজার তৈরি করা (যাতে কারেন্ট এডমিন লগআউট না হয়ে যায়)
        const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(`${username}@chatplus.com`, pass);
        
        await db.collection("users").doc(userCredential.user.uid).set({
            name: name,
            username: username,
            role: "user",
            profilePic: pic,
            status: "offline"
        });

        // অটোমেটিক প্রথম একটি ডাইরেক্ট চ্যাট অবজেক্ট তৈরি করা এডমিনের সাথে
        await db.collection("chats").add({
            type: "direct",
            members: [currentUser.username, username],
            lastMessage: "Chat Started",
            lastMsgTime: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("নতুন মেম্বার সফলভাবে তৈরি হয়েছে!");
        secondaryApp.delete();
    } catch(err) { alert("Error: " + err.message); }
};

document.getElementById("btn-create-group").onclick = () => {
    const gName = document.getElementById("group-name").value;
    const gPic = document.getElementById("group-pic").value;
    const gBg = document.getElementById("group-bg").value;
    const membersList = document.getElementById("group-members").value.split(",").map(m => m.trim());
    
    membersList.push(currentUser.username); // এডমিনকে গ্রুপে যুক্ত করা

    db.collection("chats").add({
        name: gName,
        pic: gPic,
        backgroundTheme: gBg,
        type: "group",
        members: membersList,
        lastMessage: "Group Created",
        lastMsgTime: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert("গ্রুপ সফলভাবে তৈরি হয়েছে!"));
};

// ==========================================
// ৯. ৩০ দিন পর অটো ডিলিট লজিক (Client Trigger)
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

// ==========================================
// ১০. মডাল ওপেন/ক্লোজ এবং লগআউট কন্ট্রোল
// ==========================================
document.getElementById("btn-settings").onclick = () => document.getElementById("settings-modal").classList.add("active");
document.getElementById("close-settings").onclick = () => document.getElementById("settings-modal").classList.remove("active");
document.getElementById("btn-admin-panel").onclick = () => document.getElementById("admin-modal").classList.add("active");
document.getElementById("close-admin").onclick = () => document.getElementById("admin-modal").classList.remove("active");

document.getElementById("save-password").onclick = () => {
    const newPass = document.getElementById("new-pass").value;
    auth.currentUser.updatePassword(newPass)
        .then(() => { alert("পাসওয়ার্ড পরিবর্তন সফল!"); document.getElementById("settings-modal").classList.remove("active"); })
        .catch(err => alert(err.message));
};

document.getElementById("btn-logout").onclick = () => {
    if(currentUser) {
        db.collection("users").doc(currentUser.uid).update({ status: "offline" }).then(() => {
            auth.signOut().then(() => location.reload());
        });
    }
};

