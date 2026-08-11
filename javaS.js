import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, setDoc, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// معلومات مشروعك اللي أخذناها من فايربيس
const firebaseConfig = {
  apiKey: "AIzaSyBhghEvB81eErE7cLyXvcBcpiL14zoIPrg",
  authDomain: "hadiyah-project.firebaseapp.com",
  projectId: "hadiyah-project",
  storageBucket: "hadiyah-project.firebasestorage.app",
  messagingSenderId: "841307706139",
  appId: "1:841307706139:web:fedae23233e77d946c39be",
  measurementId: "G-J7H0QGT52Z"
};
// 3. تشغيل الخدمات بالترتيب الصحيح (هذا الترتيب يحمي قائمة الأسماء من الاختفاء)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


let calendar; // تعريف عام ليكون متاحاً في كل الدوال


// توحيد البريد لتنجح مطابقة الدعوات
function normalizeEmail(email) {
    return (email || "").trim().toLowerCase();
}

// تحويل البريد إلى مفتاح صالح داخل responses
function emailResponseKey(email) {
    return normalizeEmail(email).replace(/\./g, "_");
}

// دمج نتائج الاستعلامات ومنع تكرار الحجوزات
function mergeBookingSnapshots(...snapshots) {
    const uniqueDocs = new Map();

    snapshots.forEach(snapshot => {
        snapshot?.forEach(docSnap => {
            uniqueDocs.set(docSnap.id, docSnap);
        });
    });

    return Array.from(uniqueDocs.values());
}

// جلب الدعوات باستخدام UID والبريد
async function getInvitationBookingDocs(user) {
    if (!user) return [];

    const userEmail = normalizeEmail(user.email);

    const results = await Promise.allSettled([
        getDocs(
            query(
                collection(db, "bookings"),
                where("invitedGuestIds", "array-contains", user.uid)
            )
        ),

        getDocs(
            query(
                collection(db, "bookings"),
                where("invitedGuestsEmails", "array-contains", userEmail)
            )
        )
    ]);

    const snapshots = results
        .filter(result => result.status === "fulfilled")
        .map(result => result.value);

    if (snapshots.length === 0) {
        throw results[0]?.reason || new Error("تعذر جلب الدعوات");
    }

    results
        .filter(result => result.status === "rejected")
        .forEach(result => {
            console.warn("فشل أحد استعلامات الدعوات:", result.reason);
        });

    return mergeBookingSnapshots(...snapshots);
}







function getResponseKey(email) {
    return (email || "").trim().replace(/\./g, "_");
}

function getBookingDisplayTime(data) {
    const startTime = data.startTime || data.time || "غير محدد";
    const endTime = data.endTime || "";

    return endTime
        ? `من ${startTime} إلى ${endTime}`
        : startTime;
}

function fillGuestsList(listElement, guests) {
    if (!listElement) return;

    const safeGuests = Array.isArray(guests) ? guests : [];

    listElement.innerHTML = safeGuests.length > 0
        ? safeGuests
            .map(guest => `
                <li>${guest.name || guest.email || "موظف"}</li>
            `)
            .join("")
        : "<li>لا يوجد مدعوون</li>";
}

/*
 تعرض أسماء المدعوين داخل مودال تقويم الصفحة الرئيسية.
 إذا لم يكن عنصر detailGuestsList موجودًا في HTML،
 يتم إنشاؤه آليًا داخل المودال.
*/
function fillHomeCalendarGuests(guests) {
    let guestsList = document.getElementById("detailGuestsList");

    if (!guestsList) {
        const bookingModal = document.getElementById(
            "bookingDetailsModal"
        );

        if (!bookingModal) return;

        const modalContent =
            bookingModal.querySelector(".modal-content") ||
            bookingModal.firstElementChild ||
            bookingModal;

        let guestsSection = document.getElementById(
            "home-calendar-guests-section"
        );

        if (!guestsSection) {
            guestsSection = document.createElement("div");
            guestsSection.id = "home-calendar-guests-section";
            guestsSection.className = "modal-guests-section";

            guestsSection.innerHTML = `
                <p><strong>المدعوون:</strong></p>
                <ul id="detailGuestsList"></ul>
            `;

            modalContent.appendChild(guestsSection);
        }

        guestsList = document.getElementById(
            "detailGuestsList"
        );
    }

    fillGuestsList(guestsList, guests);
}









/* ================================================================
  وظائف واجهة المستخدم (UI Functions)
   ================================================================
*/


// التمرير لأعلى الصفحة عند التحميل
window.onload = function() {
    
    window.scrollTo(0, 0);
};





// ===== UI Functions =====
//حق الصفحه الرئيسيه


// فتح وإغلاق القائمة الجانبية (Sidebar)
function toggleMenu() {
  var sidebar = document.getElementById("sidebar");

  if (sidebar.style.left === "0px") {
    sidebar.style.left = "-251px";
  } else {
    sidebar.style.left = "0px";
  }
}


function closeMenu() {
 var sidebar = document.getElementById("sidebar");
    sidebar.style.left = "-251px";
}



document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        sidebar.addEventListener("mouseleave", () => {
            closeMenu();
        });
    }
});


// تغيير الصورة المعروضة (قاعة الاجتماعات / ورشة العمل)

function changeImage(imagePath) {
  const img = document.getElementById("display-img");
  if (img) img.src = imagePath;
}
// صور ورشة العمل
const imagesGroups = {
  meeting: ["m1.jpeg", "m2.jpeg", "m3.jpeg"],
  workshop: ["WSH1.jpeg", "WSH2.jpeg", "WSH3.jpeg", "WSH4.jpeg"]
};

let currentIndex = 0;
let slideshowInterval = null;

window.startSlideshow = function (type) {
  const img = document.getElementById("display-img");
  const images = imagesGroups[type];

  if (!img || !images) {
    console.log("في مشكلة: الصورة أو المجموعة غير موجودة");
    return;
  }

  clearInterval(slideshowInterval);

  currentIndex = 0;
  img.src = images[currentIndex];

  slideshowInterval = setInterval(function () {
    currentIndex = (currentIndex + 1) % images.length;
    img.src = images[currentIndex];
  },2000);
};

window.stopSlideshow = function () {
  clearInterval(slideshowInterval);
  slideshowInterval = null;
  currentIndex = 0;

  const img = document.getElementById("display-img");
  if (img) img.src = "mp.jpeg";
};



function showToast(message) {
    // التأكد من وجود حاوية الإشعارات
    let container = document.getElementById("notification-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "notification-container";
        document.body.appendChild(container);
    }

    // إنشاء عنصر الإشعار
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.innerText = message;

    // إضافة الإشعار للحاوية
    container.appendChild(toast);

    // إزالة الإشعار تلقائياً بعد 3 ثواني
    setTimeout(() => {
        toast.remove();
    }, 3000);
}












// التحكم في النوافذ المنبثقة (Modals)
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}





// إغلاق النافذة عند الضغط على الطبقة المغبشة
window.onclick = function(event) {
    if (event.target == document.getElementById('overlay')) {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        document.getElementById('overlay').classList.remove('active');
    }
}








/* ================================================================
 نظام الهوية وتوثيق المستخدم (Authentication)
   ================================================================
*/

// تحديث بيانات المستخدم في السايد بار (الاسم، القسم)
async function updateSidebarUserInfo(user) {
    

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();

            document.getElementById('display-user-name').innerText = userData.name || "مستخدم جديد";
          
            document.getElementById('display-user-dept').innerText = userData.department || "بدون قسم";
            
            console.log("تم تحديث معلومات السايد بار بنجاح ✅");
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات السايد بار:", error);
    }
}







// ===== Authentication Functions =====
// تسجيل حساب جديد وحفظه في Firestore
async function register() {
  
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value;
    const department = document.getElementById('regDepartment').value; 

    if (!department) {
        showToast("يرجى اختيار القسم التابع له.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

       
        // ---  : حفظ بيانات المستخدم في Firestore ---
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            uid: user.uid,
            department: department 
        });
       
        
        console.log("User registered:", user);

        closeModal('registerModal');

    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;

        showToast("خطأ في التسجيل: " + errorMessage);
    }
}








// تسجيل الدخول
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;


         window.location.href = "home.html"; 

    } catch (error) {
        showToast("خطأ في تسجيل الدخول: " + error.message);
    }
}
async function logout() {
    try {
        await signOut(auth);
       
        window.location.href = "home.html"; 
    } catch (error) {
        console.error("خطأ في تسجيل الخروج:", error.message);
    }
}



// مراقب حالة المستخدم (Logged in / Logged out)
onAuthStateChanged(auth, async (user) => { 
    const authOptions = document.getElementById('authButtons'); 
    const userOptions = document.getElementById('user-options'); 
    const sidebarInfo = document.getElementById('user-sidebar-info');
    

    if (user) {
        if (authOptions) authOptions.style.display = 'none';
        if (userOptions) userOptions.style.display = 'block';
        if (sidebarInfo) sidebarInfo.style.display = 'block';
       

        // تحديث البيانات (مرة واحدة فقط)
        await updateSidebarUserInfo(user);

        // تشغيل الدوال الأساسية
        loadAllUsers();
        loadUserInvitations(user.email); 
        displayEmployeesByDept();
        initCalendar();
        initHomeCalendar(); 
        updateUserStats();
        loadUserBookings();


    } else {
        if (authOptions) authOptions.style.display = 'flex';
        if (userOptions) userOptions.style.display = 'none';
        if (sidebarInfo) sidebarInfo.style.display = 'block';
        showGuestInfo(); 
        initHomeCalendar();
    }

    // بعد تحميل الصفحة بـ 300 مللي ثانية (وقت كافٍ للمتصفح لإنهاء الـ Autofill)
window.addEventListener('load', () => {
    setTimeout(() => {
        const searchInput = document.getElementById('search-users-field-xyz');
        if (searchInput && searchInput.value !== "") {
            searchInput.value = ""; // مسح أي قيمة حقنها المتصفح
            filterUsersList();     // إعادة عرض القائمة كاملة
        }
    }, 300);
});
});


//غرض بيانات المستخدم في السايدبار
function showGuestInfo() {
    document.getElementById('display-user-name').innerText = "زائر";
    document.getElementById('display-user-dept').innerText = "";
    
}









/* ================================================================
  جلب قائمة الموظفين لغرض الدعوات في صفحة الحجز
   ================================================================
*/
async function loadAllUsers() {
    const mainContainer = document.getElementById("invitee-list");

    if (!mainContainer) return;

    try {
        const querySnapshot = await getDocs(collection(db, "users"));

        mainContainer.innerHTML = "";

        const groups = {};

        querySnapshot.forEach(docSnap => {
            const userData = docSnap.data();

            const employeeUid = userData.uid || docSnap.id;
            const employeeEmail = normalizeEmail(userData.email);

            if (employeeUid === auth.currentUser?.uid) return;

            const department = userData.department || "بدون قسم";

            if (!groups[department]) {
                groups[department] = [];
            }

            groups[department].push({
                id: docSnap.id,
                uid: employeeUid,
                name: userData.name || "موظف",
                email: employeeEmail
            });
        });

        Object.keys(groups).forEach(departmentName => {
            const section = document.createElement("div");

            section.className = "dept-section-group";

            section.innerHTML = `
                <h4 class="dept-name-header">${departmentName}</h4>
            `;

            groups[departmentName].forEach(employee => {
                const userRow = document.createElement("div");

                userRow.className = "user-row";

                userRow.innerHTML = `
                    <input
                        type="checkbox"
                        class="invitee-checkbox"
                        id="u-${employee.id}"
                        value="${employee.email}"
                        data-name="${employee.name}"
                        data-uid="${employee.uid}"
                    >

                    <label for="u-${employee.id}">
                        ${employee.name}
                    </label>
                `;

                section.appendChild(userRow);
            });

            mainContainer.appendChild(section);
        });

    } catch (error) {
        console.error("خطأ في تحميل الموظفين:", error);

        mainContainer.innerHTML = `
            <p class="error-msg">
                تعذر تحميل الموظفين: ${error.code || error.message}
            </p>
        `;
    }
}

/*
//تقسيم الموظفين حسب الاقسام في صفحه الحجوزات
function filterUsersList() {
    const filter = document.getElementById('userSearchInput').value.toLowerCase();
    const sections = document.querySelectorAll('.dept-section-group');

    sections.forEach(section => {
        const deptName = section.querySelector('.dept-name-header').innerText.toLowerCase();
        const userRows = section.querySelectorAll('.user-row');
        
        const isDeptMatch = deptName.includes(filter);
        
        let hasVisibleUsers = false;

        userRows.forEach(row => {
            const userName = row.innerText.toLowerCase();
            
            if (userName.includes(filter) || isDeptMatch) {
                row.style.display = "flex";
                hasVisibleUsers = true;
            } else {
                row.style.display = "none";
            }
        });

        // إظهار القسم بالكامل إذا تطابق البحث مع العنوان أو مع أي موظف بداخله
        if (isDeptMatch || hasVisibleUsers) {
            section.style.display = "block";
        } else {
            section.style.display = "none";
        }
    });
}
*/

/*
function filterUsersList() {
    const filter = document.getElementById('userSearchInput').value.toLowerCase();
    const sections = document.querySelectorAll('.dept-section-group');

    sections.forEach(section => {
        const deptName = section.querySelector('.dept-name-header').innerText.toLowerCase();
        const userRows = section.querySelectorAll('.user-row');
        
        let hasVisibleUsers = false;

        userRows.forEach(row => {
            const userName = row.innerText.toLowerCase();
            
            // تحقق: هل الموظف يطابق البحث، أو هل القسم يطابق البحث؟
            if (userName.includes(filter) || deptName.includes(filter)) {
                row.style.display = "flex";
                hasVisibleUsers = true; // وجدنا موظفاً مطابقاً
            } else {
                row.style.display = "none";
            }
        });

        // إظهار القسم إذا كان هناك موظف مطابق، أو إذا كان اسم القسم نفسه مطابقاً
        if (hasVisibleUsers || deptName.includes(filter)) {
            section.style.display = "block";
        } else {
            section.style.display = "none";
        }
    });
}
    */
   function filterUsersList() {
    const searchInput =
        document.getElementById("userSearchInput");

    if (!searchInput) return;

    const filter =
        searchInput.value.toLowerCase().trim();

    const sections =
        document.querySelectorAll(".dept-section-group");

    sections.forEach(section => {
        const header =
            section.querySelector(".dept-name-header");

        if (!header) return;

        const departmentName =
            header.innerText.toLowerCase();

        const userRows =
            section.querySelectorAll(".user-row");

        const departmentMatches =
            departmentName.includes(filter);

        let hasVisibleEmployee = false;

        userRows.forEach(row => {
            const employeeName =
                row.innerText.toLowerCase();

            const isVisible =
                employeeName.includes(filter) ||
                departmentMatches;

            row.style.display =
                isVisible ? "flex" : "none";

            if (isVisible) {
                hasVisibleEmployee = true;
            }
        });

        section.style.display =
            hasVisibleEmployee ||
            departmentMatches
                ? "block"
                : "none";
    });
}





// ===== Time Format Helpers =====
// تحويل الوقت من 24 ساعة إلى 12 ساعة
function t12(time24) {
    if (!time24) return "";
    let [h, m] = time24.split(':');
    let p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${p}`;
}


// تحويل الوقت من 12 ساعة إلى 24 ساعة
function t24(time12) {
    if (!time12) return "00:00";
    // نفصل الوقت عن (AM/PM)
    let [time, modifier] = time12.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }

    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }

    // padStart تضمن أن الساعة 9 تصبح 09 ليفهمها التقويم
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}







/* ================================================================
    إدارة الحجوزات والدعوات (Booking & Invitations)
   ================================================================
*/
/*
async function reserveRoom(roomName) {
    let dateElement, timeElement;
    let topicInput, agendaInput;

    if (roomName == 'غرفة الاجتماعات') {
        dateElement = document.getElementById('date-input-meetingRoom');
        timeElement = document.getElementById('time-input-meetingRoom');
        topicInput = document.getElementById('Meeting-topic-meetingRoom#id');
        agendaInput = document.getElementById('Meeting-agenda-meetingRoom#id');

    } else if (roomName === 'ورشة العمل') {
        dateElement = document.getElementById('date-input-workShop');
        timeElement = document.getElementById('time-input-workShop');
        topicInput = document.getElementById('Meeting-topic-workShop#id');
        agendaInput = document.getElementById('Meeting-agenda-workShop#id');
    }

    if (!dateElement || !timeElement) {
        console.error("عناصر الإدخال غير موجودة في الصفحة");
        return;
    }

    const date = dateElement.value;
    const time = timeElement.value;
    const user = auth.currentUser;

    if (!user) {
        alert("سجل دخولك أولاً");
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.invitee-checkbox:checked');
    const invitedGuests = Array.from(selectedCheckboxes).map(cb => ({
        name: cb.getAttribute('data-name'),
        email: cb.value
    }));





    if (date && time) {
        try {

            const q = query(
                collection(db, "bookings"),
                where("roomType", "==", roomName),
                where("date", "==", date),
                where("time", "==", t12(time))
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert("عفواً، هذا الموعد محجوز مسبقاً لهذه الغرفة. الرجاء اختيار وقت آخر.");
                return;
            }





            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            let creatorName = "مستخدم غير معروف";

            if (userSnap.exists()) {
                creatorName = userSnap.data().name || "مستخدم غير معروف";
            }
            await addDoc(collection(db, "bookings"), {
                name: creatorName,
                userId: user.uid,
                email: user.email,
                date: date,
                time: t12(time),
                roomType: roomName,
                meetingTopic: topicInput ? topicInput.value : "",
                meetingAgenda: agendaInput ? agendaInput.value : "",
                invitedGuests: invitedGuests,
                invitedGuestsEmails: invitedGuests.map(g => g.email),
                createdAt: new Date()
            });

           

         window.location.href = "home.html"; 


            // تفريغ الحقول بعد النجاح
            dateElement.value = "";
            timeElement.value = "";
            // تفريغ الحقول الجديدة
            if (topicInput) topicInput.value = "";
            if (agendaInput) agendaInput.value = "";

            selectedCheckboxes.forEach(cb => cb.checked = false);
        } catch (error) {
            console.error("Error checking or writing:", error);
            alert("حدث خطأ، تأكدي من إعدادات Firestore.");
        }
    } else {
        alert("أكمل البيانات");
    }
}



*/
async function reserveRoom(roomName) {
    const isMeeting =
        roomName === "غرفة الاجتماعات";

    const dateInput = document.getElementById(
        isMeeting
            ? "date-input-meetingRoom"
            : "date-input-workShop"
    );

    const startInput = document.getElementById(
        isMeeting
            ? "startTime-input-meetingRoom"
            : "startTime-input-workShop"
    );

    const endInput = document.getElementById(
        isMeeting
            ? "endTime-input-meetingRoom"
            : "endTime-input-workShop"
    );

    const topicInput = document.getElementById(
        isMeeting
            ? "Meeting-topic-meetingRoom#id"
            : "Meeting-topic-workShop#id"
    );

    const agendaInput = document.getElementById(
        isMeeting
            ? "Meeting-agenda-meetingRoom#id"
            : "Meeting-agenda-workShop#id"
    );

    if (!dateInput || !startInput || !endInput) {
        showToast("تعذر العثور على حقول الحجز.");
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        showToast("يرجى تسجيل الدخول أولاً.");
        return;
    }

    const date = dateInput.value;
    const start = startInput.value;
    const end = endInput.value;

    if (!date || !start || !end) {
        showToast(
            "يرجى إدخال التاريخ ووقت البدء ووقت الانتهاء."
        );
        return;
    }

    if (end <= start) {
        showToast(
            "وقت الانتهاء يجب أن يكون بعد وقت البدء."
        );
        return;
    }

    const selectedCheckboxes =
        document.querySelectorAll(
            ".invitee-checkbox:checked"
        );

    const invitedGuests =
        Array.from(selectedCheckboxes)
            .map(checkbox => ({
                name:
                    checkbox.getAttribute("data-name") ||
                    "موظف",

                email:
                    (checkbox.value || "").trim()
            }))
            .filter(guest => guest.email);

    try {
        const userRef = doc(
            db,
            "users",
            user.uid
        );

        const userSnap =
            await getDoc(userRef);

        const creatorName = userSnap.exists()
            ? userSnap.data().name || "مستخدم"
            : "مستخدم";

        const bookingData = {
            name: creatorName,
            userId: user.uid,
            email: user.email,

            date: date,

            startTime: t12(start),
            endTime: t12(end),

            // نحتفظ بـ time لأن بقية أكوادك تستخدمه
            time: t12(start),

            roomType: roomName,

            meetingTopic:
                topicInput?.value.trim() ||
                "بدون موضوع",

            meetingAgenda:
                agendaInput?.value.trim() ||
                "لا توجد أجندة",

            invitedGuests: invitedGuests,

            invitedGuestsEmails:
                invitedGuests.map(
                    guest => guest.email
                ),

            responses: {},

            createdAt: new Date()
        };

        await addDoc(
            collection(db, "bookings"),
            bookingData
        );

        console.log(
            "تم حفظ الحجز والمدعوين:",
            bookingData
        );

        showToast(
            invitedGuests.length > 0
                ? `تم الحجز وإرسال ${invitedGuests.length} دعوة بنجاح.`
                : "تم الحجز بنجاح بدون مدعوين."
        );

        dateInput.value = "";
        startInput.value = "";
        endInput.value = "";

        if (topicInput) topicInput.value = "";
        if (agendaInput) agendaInput.value = "";

        selectedCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        window.location.href = "home.html";

    } catch (error) {
        console.error(
            "خطأ في حفظ الحجز:",
            error
        );

        showToast(
            `تعذر حفظ الحجز: ${
                error.code || error.message
            }`
        );
    }
}














/* ================================================================
   كالندر الصفحه الرئيسية
   ================================================================
*/
/*
async function fetchAllBookingsForCalendar() {
    const allEvents = [];
    try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const time24 = t24(data.time); 
            const cleanDate = data.date.trim(); 

            allEvents.push({
                title: data.roomType,
                start: `${cleanDate}T${time24}`,
                allDay: false,
                backgroundColor: data.roomType === 'غرفة الاجتماعات' ? '#03074a' : '#54c0de',
                extendedProps: {
                    creatorName: data.name || "غير معروف",
                    topic: data.meetingTopic || "لا يوجد موضوع",
                    agenda: data.meetingAgenda || "لا توجد أجندة",
                    date: data.date,
                    time: data.time,
                    guests: data.invitedGuests || [],
                    // إضافة حقل الردود هنا ليتم استخدامه في العرض
                    responses: data.responses || {} 
                }
            });
        });
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
    return allEvents;
}
*/

async function fetchAllBookingsForCalendar() {
    const allEvents = [];
    try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // استخدام الحقول الجديدة المفترض تخزينها
            const start24 = data.startTime ? t24(data.startTime) : t24(data.time); 
            const end24 = data.endTime ? t24(data.endTime) : ""; 
            const cleanDate = data.date.trim(); 

            allEvents.push({
                title: data.roomType,
                start: `${cleanDate}T${start24}`,
                end: end24 ? `${cleanDate}T${end24}` : null, // إضافة وقت الانتهاء للتقويم
                allDay: false,
                backgroundColor: data.roomType === 'غرفة الاجتماعات' ? '#03074a' : '#54c0de',
                extendedProps: {
                    creatorName: data.name || "غير معروف",
                    topic: data.meetingTopic || "لا يوجد موضوع",
                    agenda: data.meetingAgenda || "لا توجد أجندة",
                    date: data.date,
                    startTime: data.startTime || data.time, // حفظ الوقت الجديد
                    endTime: data.endTime || "غير محدد",     // حفظ الوقت الجديد
                    guests: data.invitedGuests || [],
                    responses: data.responses || {} 
                }
            });
        });
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
    return allEvents;
}



function initHomeCalendar() {
    const calendarEl = document.getElementById('home-calendar-display');
    if (!calendarEl) return;

    const homeCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ar',
        handleWindowResize: true, 
        expandRows: true,
        buttonText: {
            today: 'اليوم',
            month: 'شهر',
            week: 'أسبوع',
            listWeek: 'يومي'
        },
        headerToolbar: {
            right: 'prev,next today',
            center: 'title',
            left: 'dayGridMonth,timeGridWeek,listWeek'
        },


        
       // داخل دالة initHomeCalendar -> eventClick:
eventClick: function(info) {
    const details =
        info.event.extendedProps || {};

    const nameElement =
        document.getElementById(
            "detailName"
        );

    const roomElement =
        document.getElementById(
            "detailRoomType"
        );

    const topicElement =
        document.getElementById(
            "detailTopic"
        );

    const agendaElement =
        document.getElementById(
            "detailAgenda"
        );

    const dateElement =
        document.getElementById(
            "detailDate"
        );

    const timeElement =
        document.getElementById(
            "detailTime"
        );

    if (nameElement) {
        nameElement.innerText =
            details.creatorName ||
            "غير معروف";
    }

    if (roomElement) {
        roomElement.innerText =
            info.event.title ||
            "--";
    }

    if (topicElement) {
        topicElement.innerText =
            details.topic ||
            "لا يوجد موضوع";
    }

    if (agendaElement) {
        agendaElement.innerText =
            details.agenda ||
            "لا توجد أجندة";
    }

    if (dateElement) {
        dateElement.innerText =
            details.date ||
            "--";
    }

    if (timeElement) {
        timeElement.innerText =
            details.endTime
                ? `من ${details.startTime} إلى ${details.endTime}`
                : details.startTime ||
                  details.time ||
                  "--";
    }

    // إضافة أسماء المدعوين
    fillHomeCalendarGuests(
        details.guests || []
    );

    openModal(
        "bookingDetailsModal"
    );
},
        events: async function(info, successCallback, failureCallback) {
            try {
                const events = await fetchAllBookingsForCalendar();
                successCallback(events);
            } catch (error) {
                failureCallback(error);
            }
        }
    });

    homeCalendar.render();

    // تحديث حجم التقويم لضمان العرض الصحيح
    setTimeout(() => {
        homeCalendar.updateSize();
    }, 200);
}












/* ================================================================
   كالندر صفحة الدعوات
   ================================================================
*/
function initCalendar() {
    const calendarEl = document.getElementById('calendar-element');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ar',
        allDaySlot: false,
        headerToolbar: { right: 'prev,next today', center: 'title', left: 'dayGridMonth,timeGridWeek' },
        
        // تفعيل الضغط على الموعد
        eventClick: function(info) {
            showBookingDetails(info.event);
        },

        events: async function (info, successCallback, failureCallback) {
            try {
                const events = await fetchAcceptedBookings();
                successCallback(events);
            } catch (error) {
                failureCallback(error);
            }
        }
    });

    calendar.render();
    window.calendar = calendar;

    setTimeout(() => {
        calendar.updateSize();
    }, 100);
}

function showBookingDetails(event) {
    const props =
        event.extendedProps || {};

    const modal =
        document.getElementById(
            "invitationModalCalender"
        );

    if (!modal) return;

    const dateElement =
        document.getElementById("modaldate");

    const timeElement =
        document.getElementById("modaltime");

    const userElement =
        document.getElementById("modalUser");

    const topicElement =
        document.getElementById("modalTopic");

    const agendaElement =
        document.getElementById("modalAgenda");

    const roomElement =
        document.getElementById("modalRoom");

    if (dateElement) {
        dateElement.innerText =
            props.date || "--";
    }

    if (timeElement) {
        timeElement.innerText =
            props.time ||
            props.startTime ||
            "--";
    }

    if (userElement) {
        userElement.innerText =
            props.userName ||
            "غير معروف";
    }

    if (topicElement) {
        topicElement.innerText =
            props.topic ||
            "لا يوجد موضوع";
    }

    if (agendaElement) {
        agendaElement.innerText =
            props.agenda ||
            "لا توجد أجندة";
    }

    if (roomElement) {
        roomElement.innerText =
            props.roomName ||
            event.title ||
            "--";
    }

    const guestsList =
        document.getElementById(
            "modalGuestsList"
        );

    fillGuestsList(
        guestsList,
        props.guests
    );

    openModal(
        "invitationModalCalender"
    );
}





















/* ================================================================
تجيب الدعوات اللي المستخدم قبلها وتحولها لأحداث تظهر داخل التقويم.
   ================================================================
*/

async function fetchAcceptedBookings() {
    const currentUser =
        auth.currentUser;

    if (!currentUser) return [];

    const acceptedEvents = [];

    try {
        const invitationsQuery = query(
            collection(db, "bookings"),

            where(
                "invitedGuestsEmails",
                "array-contains",
                currentUser.email
            )
        );

        const querySnapshot =
            await getDocs(invitationsQuery);

        const userEmailKey =
            getResponseKey(
                currentUser.email
            );

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();

            const responseStatus =
                data.responses?.[userEmailKey];

            if (
                responseStatus !== "accepted"
            ) {
                return;
            }

            const startTime =
                data.startTime ||
                data.time ||
                "12:00 AM";

            const endTime =
                data.endTime || "";

            if (!data.date) return;

            acceptedEvents.push({
                id: docSnap.id,

                title:
                    data.roomType ||
                    "موعد",

                start:
                    `${data.date}T${t24(startTime)}`,

                end: endTime
                    ? `${data.date}T${t24(endTime)}`
                    : null,

                backgroundColor: "#28a745",

                allDay: false,

                extendedProps: {
                    userName:
                        data.name ||
                        "غير معروف",

                    roomName:
                        data.roomType ||
                        "--",

                    topic:
                        data.meetingTopic ||
                        "لا يوجد موضوع",

                    agenda:
                        data.meetingAgenda ||
                        "لا توجد أجندة",

                    date:
                        data.date,

                    startTime:
                        startTime,

                    endTime:
                        endTime ||
                        "غير محدد",

                    time:
                        getBookingDisplayTime(data),

                    guests:
                        data.invitedGuests ||
                        []
                }
            });
        });

        return acceptedEvents;

    } catch (error) {
        console.error(
            "خطأ في جلب المواعيد المقبولة:",
            error
        );

        return [];
    }
}












/* ================================================================
الدعوات اللي توصل للمستخدم ويستعرضها ويقبل او يرفض 
   ================================================================
*/
async function loadUserInvitations(email) {
    const listContainer =
        document.getElementById(
            "invitations-list-container"
        );

    if (!listContainer || !email) return;

    listContainer.innerHTML = `
        <p class="loading-text">
            جاري تحميل الدعوات...
        </p>
    `;

    try {
        const invitationsQuery = query(
            collection(db, "bookings"),

            where(
                "invitedGuestsEmails",
                "array-contains",
                email
            )
        );

        const querySnapshot =
            await getDocs(invitationsQuery);

        const userEmailKey =
            getResponseKey(email);

        /*
         قائمة الدعوات في هذه الصفحة تعرض
         الدعوات التي لم يتم الرد عليها فقط.
        */
        const pendingInvitations =
            querySnapshot.docs.filter(docSnap => {
                const data = docSnap.data();

                const currentStatus =
                    data.responses?.[userEmailKey] ||
                    "pending";

                return currentStatus === "pending";
            });

        listContainer.innerHTML = "";

        if (pendingInvitations.length === 0) {
            listContainer.innerHTML = `
                <p class="loading-text">
                    لا توجد دعوات جديدة حالياً.
                </p>
            `;

            return;
        }

        pendingInvitations.forEach(docSnap => {
            const data = docSnap.data();

            const invitationCard =
                document.createElement("div");

            invitationCard.id =
                `inv-${docSnap.id}`;

            invitationCard.className =
                "invitation-card-item";

            invitationCard.innerHTML = `
                <div class="inv-info">

                    <p>
                        <strong>القاعة:</strong>
                        ${data.roomType || "--"}
                    </p>

                    <p>
                        <strong>الداعي:</strong>
                        ${data.name || "غير معروف"}
                    </p>

                    <p>
                        <strong>الموضوع:</strong>
                        ${
                            data.meetingTopic ||
                            "بدون موضوع"
                        }
                    </p>

                    <p>
                        <strong>التاريخ:</strong>
                        ${data.date || "--"}
                    </p>

                    <p>
                        <strong>الوقت:</strong>
                        ${getBookingDisplayTime(data)}
                    </p>

                </div>

                <button
                    type="button"
                    class="btn-view"
                    onclick="showInvDetails('${docSnap.id}')"
                >
                    عرض التفاصيل
                </button>
            `;

            listContainer.appendChild(
                invitationCard
            );
        });

    } catch (error) {
        console.error(
            "خطأ في تحميل الدعوات:",
            error
        );

        listContainer.innerHTML = `
            <p class="loading-text">
                تعذر تحميل الدعوات.
            </p>
        `;
    }
}


window.showInvDetails =
async function(bookingId) {
    try {
        const currentUser =
            auth.currentUser;

        if (!currentUser) {
            showToast("يرجى تسجيل الدخول.");
            return;
        }

        const bookingRef = doc(
            db,
            "bookings",
            bookingId
        );

        const bookingSnap =
            await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
            showToast("الدعوة غير موجودة.");
            return;
        }

        const data = bookingSnap.data();

        const detailsBody =
            document.getElementById(
                "inv-details-body"
            );

        const actionsContainer =
            document.getElementById(
                "inv-modal-actions"
            );

        if (
            !detailsBody ||
            !actionsContainer
        ) {
            console.error(
                "عناصر مودال الدعوة غير موجودة."
            );
            return;
        }

        const guests =
            Array.isArray(data.invitedGuests)
                ? data.invitedGuests
                : [];

        const guestsHtml =
            guests.length > 0
                ? guests
                    .map(guest => `
                        <li>
                            ${
                                guest.name ||
                                guest.email ||
                                "موظف"
                            }
                        </li>
                    `)
                    .join("")
                : "<li>لا يوجد مدعوون</li>";

        const userEmailKey =
            getResponseKey(
                currentUser.email
            );

        const currentStatus =
            data.responses?.[userEmailKey] ||
            "pending";

        detailsBody.innerHTML = `
            <p>
                <strong>الداعي:</strong>
                ${
                    data.name ||
                    data.email ||
                    "غير معروف"
                }
            </p>

            <p>
                <strong>القاعة:</strong>
                ${data.roomType || "--"}
            </p>

            <p>
                <strong>الموضوع:</strong>
                ${
                    data.meetingTopic ||
                    "لا يوجد"
                }
            </p>

            <p>
                <strong>الأجندة:</strong>
                ${
                    data.meetingAgenda ||
                    "لا توجد"
                }
            </p>

            <p>
                <strong>التاريخ:</strong>
                ${data.date || "--"}
            </p>

            <p>
                <strong>الوقت:</strong>
                ${getBookingDisplayTime(data)}
            </p>

            <hr>

            <p>
                <strong>قائمة المدعوين:</strong>
            </p>

            <ul
                style="
                    list-style: disc;
                    padding-right: 20px;
                "
            >
                ${guestsHtml}
            </ul>
        `;

        if (currentStatus === "pending") {
            actionsContainer.innerHTML = `
                <button
                    type="button"
                    class="btn-accept"
                    onclick="
                        respond(
                            '${bookingId}',
                            'accepted'
                        );
                        closeModal(
                            'invitationDetailsModal'
                        );
                    "
                >
                    قبول الدعوة
                </button>

                <button
                    type="button"
                    class="btn-reject"
                    onclick="
                        respond(
                            '${bookingId}',
                            'rejected'
                        );
                        closeModal(
                            'invitationDetailsModal'
                        );
                    "
                >
                    رفض
                </button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <span class="${
                    currentStatus === "accepted"
                        ? "status-accepted"
                        : "status-rejected"
                }">
                    ${
                        currentStatus === "accepted"
                            ? "تم قبول الدعوة"
                            : "تم رفض الدعوة"
                    }
                </span>
            `;
        }

        openModal(
            "invitationDetailsModal"
        );

    } catch (error) {
        console.error(
            "خطأ في فتح الدعوة:",
            error
        );

        showToast("تعذر فتح تفاصيل الدعوة.");
    }
};









//الرد او الرفض
window.respond =
async function(bookingId, status) {
    const currentUser =
        auth.currentUser;

    if (!currentUser) {
        showToast("يرجى تسجيل الدخول.");
        return;
    }

    if (
        status !== "accepted" &&
        status !== "rejected"
    ) {
        console.error(
            "حالة الرد غير صحيحة:",
            status
        );
        return;
    }

    try {
        const bookingRef = doc(
            db,
            "bookings",
            bookingId
        );

        const userEmailKey =
            getResponseKey(
                currentUser.email
            );

        await updateDoc(bookingRef, {
            [`responses.${userEmailKey}`]:
                status
        });

        if (window.calendar) {
            window.calendar.refetchEvents();
        }

        await loadUserInvitations(
            currentUser.email
        );

        showToast(
            status === "accepted"
                ? "تم قبول الدعوة."
                : "تم رفض الدعوة."
        );

    } catch (error) {
        console.error(
            "خطأ في تحديث الرد:",
            error
        );

        showToast(
            `فشل تحديث الدعوة: ${
                error.code ||
                error.message
            }`
        );
    }
};








/* ================================================================
التبديل في صفحه الدعوات بين الكالندر و الدعوات و صفحه حاله الدعوات
   ================================================================
*/
window.showContent = function(type) {
    const views = {
        'calendar': document.getElementById('calendar-view'),
        'invite': document.getElementById('invite-view'),
        'status': document.getElementById('status-view')
    };

    Object.values(views).forEach(view => {
        if (view) {
            view.classList.add('hidden');
        }
    });

    // 3. إظهار القسم الذي ضغطت عليه فقط
    const activeView = views[type];
    if (activeView) {
        activeView.classList.remove('hidden');

        // تنفيذ أوامر خاصة بكل قسم عند فتحه
        if (type === 'calendar' && window.calendar) {
            setTimeout(() => { window.calendar.updateSize(); }, 50);
        } else if (type === 'status') {
            loadMyBookingsStatus(); // استدعاء دالة جلب البيانات
        }
    }
};





//صفحه استعلام حاله الطلب المرسل
async function loadMyBookingsStatus() {
    const user =
        auth.currentUser;

    const container =
        document.getElementById(
            "my-bookings-status-list"
        );

    if (!user || !container) return;

    container.innerHTML = `
        <p style="text-align:center;">
            جاري تحميل البيانات...
        </p>
    `;

    try {
        const bookingsQuery = query(
            collection(db, "bookings"),

            where(
                "userId",
                "==",
                user.uid
            )
        );

        const querySnapshot =
            await getDocs(bookingsQuery);

        if (querySnapshot.empty) {
            container.innerHTML = `
                <p style="text-align:center;">
                    لا توجد حجوزات مرسلة من قبلك.
                </p>
            `;

            return;
        }

        container.innerHTML = "";

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();

            const responses =
                data.responses || {};

            const guests =
                Array.isArray(data.invitedGuests)
                    ? data.invitedGuests
                    : [];

            const card =
                document.createElement("div");

            card.className =
                "invitation-card-item";

            let guestsList = "";

            if (guests.length === 0) {
                guestsList = `
                    <p>
                        لا يوجد مدعوون لهذا الحجز.
                    </p>
                `;
            }

            guests.forEach(guest => {
                const emailKey =
                    getResponseKey(
                        guest.email
                    );

                const responseStatus =
                    responses[emailKey] ||
                    "pending";

                let statusText =
                    "لم يتم الرد";

                let statusClass =
                    "status-waiting";

                if (
                    responseStatus ===
                    "accepted"
                ) {
                    statusText = "قبول";
                    statusClass =
                        "status-accepted";
                }

                if (
                    responseStatus ===
                    "rejected"
                ) {
                    statusText = "رفض";
                    statusClass =
                        "status-rejected";
                }

                guestsList += `
                    <div class="guest-status-line">

                        <span>
                            ${
                                guest.name ||
                                guest.email ||
                                "موظف"
                            }
                        </span>

                        <span class="${statusClass}">
                            ${statusText}
                        </span>

                    </div>
                `;
            });

            card.innerHTML = `
                <div class="inv-info">

                    <h3>
                        القاعة:
                        ${
                            data.roomType ||
                            "--"
                        }
                    </h3>

                    <p>
                        <strong>
                            موضوع الاجتماع:
                        </strong>

                        ${
                            data.meetingTopic ||
                            "--"
                        }
                    </p>

                    <p>
                        التاريخ:
                        ${data.date || "--"}

                        |

                        الوقت:
                        ${
                            getBookingDisplayTime(
                                data
                            )
                        }
                    </p>

                    <hr>

                    <p>
                        <strong>
                            حالة المدعوين:
                        </strong>
                    </p>

                    ${guestsList}

                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error(
            "خطأ في جلب حالة الحجوزات:",
            error
        );

        container.innerHTML = `
            <p>
                خطأ في جلب البيانات.
            </p>
        `;
    }
}







/* ================================================================
صفحة الموظفين 
   ================================================================
*/

// دالة لجلب الموظفين وتوزيعهم على الأقسام في الشاشة
async function displayEmployeesByDept() {
    const adminContainer = document.getElementById('Administration-container');
    const techContainer = document.getElementById('Technicians-container');
    const hrContainer = document.getElementById('Hr-container');

    if (!adminContainer && !techContainer && !hrContainer) return;

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        
        adminContainer.innerHTML = "";
        techContainer.innerHTML = "";
        hrContainer.innerHTML = "";

        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const employeeName = userData.name || "موظف بدون اسم";
            const employeeEmail = userData.email || "لا يوجد بريد"; 
            const dept = userData.department;

            // 1. هنا قمت بتعريف المتغير باسم employeeCard
            const employeeCard = document.createElement('div');
            employeeCard.className = 'employee-name-card';

            employeeCard.innerHTML = `
               <div class="emp-info">
            <div class="emp-name">${employeeName}</div>
            <div class="emp-email">${employeeEmail}</div>
        </div>
            `;

            if (dept === 'الإدارة') {
                adminContainer.appendChild(employeeCard);

            } else if (dept === 'قسم تقنية المعلومات') {
                techContainer.appendChild(employeeCard);
            } else if (dept === 'الموارد البشرية') {
                hrContainer.appendChild(employeeCard);
            }
            else if (dept === 'قسم التسويق') {
                hrContainer.appendChild(employeeCard);
            }
            else if (dept === 'قسم الإدارة المالية ') {
                hrContainer.appendChild(employeeCard);
            }
            else if (dept === 'قسم الإعلام') {
                hrContainer.appendChild(employeeCard);
            }
            else if (dept === 'قسم المشتريات ') {
                hrContainer.appendChild(employeeCard);
            }
            else if (dept === 'مجلس الادارة') {
                hrContainer.appendChild(employeeCard);
            }

        });

    } catch (error) {
        console.error("خطأ في تحميل الموظفين حسب القسم:", error);
    }
}


function filterEmployees() {
    const term = document.getElementById('Employees-Page-search').value.toLowerCase().trim();
    const boxes = document.querySelectorAll('.dept-box');
    
    boxes.forEach(box => {
        const deptTitle = box.querySelector('h3').innerText.toLowerCase();
        const cards = box.querySelectorAll('.employee-name-card');
        
        let sectionVisible = false;

        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            const isMatch = text.includes(term) || deptTitle.includes(term);
            card.style.display = isMatch ? "block" : "none";
            if (isMatch) sectionVisible = true;
        });

        box.style.display = (sectionVisible || deptTitle.includes(term)) ? "block" : "none";
    });
}












/* ================================================================
الصفحة الرئيسيه 
   ================================================================
*/
const tabs = document.querySelectorAll('.sub-title-account-btt');
const contents = document.querySelectorAll('.account-content');

tabs.forEach(tab => {
    tab.addEventListener('click', function() {

        contents.forEach(content => {
            content.style.display = 'none';
        });

        const targetId = this.getAttribute('data-target');
        
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.style.display = 'block';

            if (targetId === 'section-invites') {
                loadAllReceivedInvitations(); 
            }
        }
        
        tabs.forEach(t => t.classList.remove('active-tab'));
        this.classList.add('active-tab');
    });
});




// دالة تأثير العداد (تزيد الرقم تدريجياً)
function animateCounter(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let startValue = 0;
    let duration = 1000; 
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = Math.min((timestamp - startTime) / duration, 1);
        el.innerText = Math.floor(progress * targetValue);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}


//صفحة معلوماتي
async function updateUserStats() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            document.getElementById('acc-display-name').innerText = userData.name || "غير مسجل";
            document.getElementById('acc-display-email').innerText = userData.email || user.email;
            document.getElementById('acc-display-dept').innerText = userData.department || "غير محدد";
        }

        // 2. جلب عدد الحجوزات كما فعلنا سابقاً
        const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const totalBookings = querySnapshot.size;

        // تشغيل العداد الرقمي
        animateCounter('bookings-count', totalBookings);

    } catch (error) {
        console.error("خطأ في جلب بيانات المستخدم:", error);
    }
}






//[gf hgp[,.hj hgwhfri]]
async function loadUserBookings() {
    const user = auth.currentUser;
    const container = document.getElementById('bookings-list-container');
    
    if (!user || !container) return;

    try {
        const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = "<p class='no-data'>لا توجد حجوزات سابقة حالياً.</p>";
            return;
        }

        let htmlContent = "";

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // --- حل مشكلة الوقت هنا ---
            // نفترض أن بياناتك تحتوي على حقول مثل startTime و endTime
            // أو حقل نصي واحد اسمه time أو bookingTime
            const timeDisplay = (data.startTime && data.endTime) 
                ? `من ${data.startTime} إلى ${data.endTime}` 
                : (data.time || data.bookingTime || "غير محدد");

            const guests = data.invitedGuests ? 
                data.invitedGuests.map(g => g.name).join(', ') : 'لا يوجد مدعوين';

            htmlContent += `
                <div class="booking-card">
                    <div class="booking-header">
                        <strong>الموضوع: ${data.meetingTopic || 'بدون موضوع'}</strong>
                        <span>${data.date || ''}</span>
                    </div>
                    <div class="booking-body">
                        <p><strong>الأجندة:</strong> ${data.meetingAgenda || 'لا توجد أجندة'}</p>
                         <p><strong>القاعة:</strong> ${data.roomType || '--'}</p>
                        <p><strong>الوقت:</strong> ${timeDisplay}</p>
                        
                        <p><strong>المدعوون:</strong> ${guests}</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = htmlContent;

    } catch (error) {
        console.error("Error loading bookings:", error);
        container.innerHTML = "<p>حدث خطأ أثناء تحميل البيانات.</p>";
    }
}




//الدعوات الواصله
async function loadAllReceivedInvitations() {
    const currentUser = auth.currentUser;

    const container = document.getElementById(
        "all-invitations-status-list"
    );

    if (!currentUser || !container) return;

    container.innerHTML = `
        <p class="no-invites-msg">
            جاري تحميل الدعوات...
        </p>
    `;

    try {
        const currentUserEmail =
            normalizeEmail(currentUser.email);

        const currentUserEmailKey =
            emailResponseKey(currentUserEmail);

        const bookingDocuments =
            await getInvitationBookingDocs(currentUser);

        if (bookingDocuments.length === 0) {
            container.innerHTML = `
                <p class="no-invites-msg">
                    لا توجد دعوات مستلمة حالياً.
                </p>
            `;

            return;
        }

        container.innerHTML = "";

        bookingDocuments.forEach(docSnap => {
            const bookingData = docSnap.data();

            const responseStatus =
                bookingData.responsesByUid?.[currentUser.uid] ||
                bookingData.responses?.[currentUserEmailKey] ||
                "pending";

            let statusText = "بانتظار الرد";
            let statusClass = "status-pending";

            if (responseStatus === "accepted") {
                statusText = "تم القبول";
                statusClass = "status-accepted";
            }

            if (responseStatus === "rejected") {
                statusText = "تم الرفض";
                statusClass = "status-rejected";
            }

            const startTime =
                bookingData.startTime ||
                bookingData.time ||
                "--";

            const endTime =
                bookingData.endTime ||
                "";

            const displayedTime = endTime
                ? `من ${startTime} إلى ${endTime}`
                : startTime;

            const invitationCard =
                document.createElement("div");

            invitationCard.className =
                "booking-card invitation-card";

            invitationCard.innerHTML = `
                <div class="booking-header">

                    <strong class="meeting-topic">
                        الموضوع:
                        ${bookingData.meetingTopic || "بدون موضوع"}
                    </strong>

                    <span class="meeting-date">
                        ${bookingData.date || ""}
                    </span>

                </div>

                <div class="booking-body">

                    <p>
                        <strong>الداعي:</strong>
                        ${bookingData.name || "غير معروف"}
                    </p>

                    <p>
                        <strong>القاعة:</strong>
                        ${bookingData.roomType || "--"}
                    </p>

                    <p>
                        <strong>الأجندة:</strong>
                        ${bookingData.meetingAgenda || "لا توجد أجندة"}
                    </p>

                    <p>
                        <strong>الوقت:</strong>
                        ${displayedTime}
                    </p>

                    <p>
                        <strong>ردك:</strong>

                        <span class="${statusClass}">
                            ${statusText}
                        </span>
                    </p>

                </div>
            `;

            container.appendChild(invitationCard);
        });

    } catch (error) {
        console.error(
            "خطأ في جلب الدعوات المستلمة:",
            error
        );

        container.innerHTML = `
            <p class="error-msg">
                تعذر تحميل الدعوات:
                ${error.code || error.message}
            </p>
        `;
    }
}













Object.assign(window, {
    toggleMenu,
    openModal,
    closeModal,
    register,
    login,
    logout,
    changeImage,
    reserveRoom,
    filterUsersList,
    loadAllUsers,
    updateSidebarUserInfo,
    loadUserInvitations,
    fetchAcceptedBookings,
    displayEmployeesByDept,
    filterEmployees,
    respond,
    showContent,
    initHomeCalendar,
    fetchAllBookingsForCalendar,
    showInvDetails,
    showBookingDetails,
    loadUserBookings,
    loadAllReceivedInvitations
});