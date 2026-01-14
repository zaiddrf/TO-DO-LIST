/* =========================================================
   0) Helpers: اختصارات لجلب العناصر من الصفحة
   =========================================================
   بدل ما كل شوي نكتب:
   document.querySelector(...)
   عملنا دوال قصيرة:

   $  => تجيب "أول عنصر" يطابق الـ selector
   $$ => تجيب "كل العناصر" اللي بتطابق الـ selector (NodeList)
========================================================= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);


/* =========================================================
   1) عناصر الصفحة (DOM)
   =========================================================
   "els" = كائن نجمع فيه كل العناصر المهمة مرة واحدة
   عشان:
   - ما نعيد querySelector كل مرة (أسرع + أوضح)
   - يسهل علينا نقرأ الكود كأنه خارطة للشاشة
========================================================= */
const els = {
  addBtn: $("#addTaskButton"),

  input: $("#myInput"),

  list: $("#todoList"),

  msg: $("#inputVal"),

  /* -------------- مودال التعديل -------------- */
  editModal: $("#editTaskModal"),     
  editInput: $("#editTaskInput"),     
  saveEdit: $("#saveEditButton"),    
  closeEdit: $(".close-btn"),        

  /* -------------- مودال الحذف -------------- */
  delModal: $("#deleteModal"),        
  
  delText: $("#deleteModalText") || $("#deleteModal p"),
  confirmDel: $("#confirmDelete"),    
  cancelDel: $("#cancelDelete"),      

  /* -------------- أزرار الحذف الجماعي -------------- */
  delDone: $("#deletdoneButton"),     // حذف المكتمل
  delAll: $("#deletallButton"),       // حذف الكل

  /* -------------- فلاتر العرض -------------- */
  showAll: $("#showAll"),             // عرض الجميع
  showDone: $("#showDone"),           // عرض المكتمل
  showTodo: $("#showTodo"),           // عرض غير المكتمل
};


/* =========================================================
   2) بيانات التطبيق (localStorage)
   =========================================================
   الفكرة: نحفظ tasks في المتصفح حتى لو سكرت الصفحة ورجعت

   STORAGE_KEY: اسم المفتاح اللي نخزن تحته في localStorage
   tasks: مصفوفة مهام {id, name, done}

   JSON.parse(...) يحول النص المخزن إلى Array/Object
   لو ما في بيانات مخزنة => نبدأ بمصفوفة فاضية []
========================================================= */
const STORAGE_KEY = "tasks";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

/*
  editingId: نخزن فيه id للمهمة اللي بنعدلها الآن
  pendingDelete: نخزن نوع الحذف (single/all/done) و id لو كان حذف مفرد
*/
let editingId = null;
let pendingDelete = { type: null, id: null }; // type: single/all/done

// أول ما يشتغل التطبيق: اعرض القائمة الحالية
render();


/* =========================================================
   3) أحداث الفلاتر (عرض حسب الحالة)
   =========================================================
   كل زر فلترة يستدعي render مع قيمة مختلفة
========================================================= */
els.showAll.addEventListener("click", () => render("all"));
els.showDone.addEventListener("click", () => render("done"));
els.showTodo.addEventListener("click", () => render("todo"));


/* =========================================================
   4) إضافة مهمة جديدة
   =========================================================
   عند الضغط على زر الإضافة:
   1) نقرأ النص ونشيل الفراغات من الأطراف trim()
   2) نتحقق من صحته validateName
   3) نمنع التكرار
   4) نضيف المهمة
   5) نحفظ ونرسم من جديد
========================================================= */
els.addBtn.addEventListener("click", () => {
  // قراءة النص من input
  const name = els.input.value.trim();

  // تحقق من القيود (فارغ؟ أقل من 5؟ يبدأ برقم؟)
  const err = validateName(name);
  if (err) return flash(err); // إذا في خطأ: اعرض رسالة وطلع

  // منع التكرار بدون حساسية لحالة الأحرف:
  // "Task" == "task"
  if (tasks.some(t => t.name.toLowerCase() === name.toLowerCase()))
    return flash("المهمة موجودة مسبقًا.");

  // إضافة مهمة جديدة:
  // id: معرف فريد (UUID)
  // name: الاسم
  // done: هل هي مكتملة؟
  tasks.push({ id: crypto.randomUUID(), name, done: false });

  // تفريغ خانة الإدخال بعد الإضافة
  els.input.value = "";

  // حفظ + إعادة رسم
  persist();
  render();
});


/* =========================================================
   5) مودال التعديل (فتح/إغلاق/حفظ)
   ========================================================= */

/*
  openEdit(id):
  - نخزن id اللي بنعدله
  - نجيب المهمة من tasks
  - نحط اسمها داخل حقل التعديل
  - نفتح المودال
*/
function openEdit(id){
  editingId = id;

  // ابحث عن المهمة بالـ id
  const t = tasks.find(x => x.id === id);

  // لو وجدناها حط اسمها داخل input
  // لو ما وجدناها لأي سبب، خليه فاضي
  els.editInput.value = t ? t.name : "";

  // إظهار المودال 
  els.editModal.style.display = "flex";
}

/*
  closeEdit():
  - بس نخفي المودال ونصفر editingId
*/
function closeEdit(){
  els.editModal.style.display = "none";
  editingId = null;
}

/*
  زر "حفظ التعديل":
  - نقرأ الاسم الجديد
  - نتحقق منه
  - نمنع التكرار (لكن نستثني المهمة الحالية)
  - نحدّث المهمة
  - نحفظ ونرسم ونغلق المودال
*/
els.saveEdit.addEventListener("click", () => {
  const name = els.editInput.value.trim();
  const err = validateName(name);
  if (err) return showInlineEditError(err);

  // منع التكرار مع استثناء المهمة الحالية:
  // أي اسم يطابق اسم مهمة ثانية غير اللي بنعدلها => مرفوض
  if (tasks.some(t => t.id !== editingId && t.name.toLowerCase() === name.toLowerCase()))
    return showInlineEditError("اسم مكرر، اختر اسمًا مختلفًا.");

  // تحديث الاسم فعليًا
  const t = tasks.find(x => x.id === editingId);
  if (t) t.name = name;

  persist();
  render();
  closeEdit();
});

// إغلاق المودال عند الضغط على زر X
els.closeEdit.addEventListener("click", closeEdit);

/*
  إغلاق المودال إذا ضغطت خارج الصندوق (على خلفية المودال)
  ملاحظة: نتحقق أن الهدف هو نفس العنصر editModal نفسه
  عشان ما يغلق إذا ضغطت داخل المحتوى.
*/
window.addEventListener("click", e => {
  if (e.target === els.editModal) closeEdit();
});


/* =========================================================
   6) مودال الحذف (فتح/إغلاق/تأكيد)
   ========================================================= */

/*
  openDeleteModal(type, id):
  - نخزن نوع الحذف
  - نفتح مودال التأكيد
  - نغير النص حسب نوع العملية
*/
function openDeleteModal(type, id=null){
  pendingDelete = { type, id };
  els.delModal.style.display = "flex";

  // رسائل مختلفة حسب الحالة
  const textMap = {
    single: "هل أنت متأكد أنك تريد حذف هذه المهمة؟",
    all: "هل أنت متأكد أنك تريد حذف جميع المهام؟",
    done: "هل أنت متأكد أنك تريد حذف المهام المكتملة؟"
  };

  // نص افتراضي إذا type غير معروف
  els.delText.textContent = textMap[type] || "تأكيد الحذف";
}

/*
  closeDeleteModal():
  - إخفاء المودال
  - تصفير pendingDelete
*/
function closeDeleteModal(){
  els.delModal.style.display = "none";
  pendingDelete = { type: null, id: null };
}

// زر "إلغاء"
els.cancelDel.addEventListener("click", closeDeleteModal);

// إغلاق المودال بالضغط على الخلفية
window.addEventListener("click", e => {
  if (e.target === els.delModal) closeDeleteModal();
});

// أزرار الحذف الجماعي تفتح المودال بأنواع مختلفة
els.delAll.addEventListener("click", () => openDeleteModal("all"));
els.delDone.addEventListener("click", () => openDeleteModal("done"));

/*
  زر "تأكيد الحذف":
  - نقرأ pendingDelete
  - ننفذ الحذف حسب النوع
  - نحفظ + render + نغلق
*/
els.confirmDel.addEventListener("click", () => {
  const { type, id } = pendingDelete;

  // حذف الكل
  if (type === "all") tasks = [];

  // حذف المكتمل فقط
  if (type === "done") tasks = tasks.filter(t => !t.done);

  // حذف مهمة واحدة حسب id
  if (type === "single" && id) tasks = tasks.filter(t => t.id !== id);

  persist();
  render();
  closeDeleteModal();
});


/* =========================================================
   7) بناء القائمة (Render)
   =========================================================
   render(filter):
   - تفريغ القائمة
   - اختيار المهام حسب الفلتر
   - إذا ما في مهام: رسالة "No tasks."
   - إذا في مهام: لكل مهمة
       - نص + checkbox + أزرار edit/delete
       - ربط أحداث لكل عنصر
========================================================= */
function render(filter="all"){
  // تفريغ القائمة قبل إعادة البناء
  els.list.innerHTML = "";

  // visible: المهام اللي رح تظهر حسب الفلتر
  const visible = tasks.filter(t =>
    filter === "done" ? t.done :
    filter === "todo" ? !t.done : true
  );

  // إذا ما في مهام ظاهرة => رسالة واحدة فقط
  if (!visible.length){
    els.list.innerHTML = `<li class="no-tasks-message">No tasks.</li>`;
    updateDeleteButtonsState();
    return;
  }

  // نرسم كل مهمة ونضيفها للقائمة
  visible.forEach(t => {
    const li = document.createElement("li");
    li.className = "task-item";

    // ملاحظة: نستخدم escapeHtml لتجنب إدخال HTML ضار
    li.innerHTML = `
      <span class="task-name ${t.done ? "done" : ""}">${escapeHtml(t.name)}</span>

      <input class="task-checkbox" type="checkbox" ${t.done ? "checked" : ""}>

      <div class="actions">
        <button class="edit-button" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="delete-button" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    /* ---------- حدث checkbox: تحويل المهمة لمكتملة/غير مكتملة ---------- */
    li.querySelector(".task-checkbox").addEventListener("change", (e) => {
      // نحدّث المهمة الأصلية داخل tasks (مش visible)
      const item = tasks.find(x => x.id === t.id);
      if (item) item.done = e.target.checked;

      // حفظ + إعادة render بنفس الفلتر الحالي
      persist();
      render(filter);
    });

    /* ---------- حدث edit ---------- */
    li.querySelector(".edit-button").addEventListener("click", () => openEdit(t.id));

    /* ---------- حدث delete ---------- */
    li.querySelector(".delete-button").addEventListener("click", () => openDeleteModal("single", t.id));

    // أخيرًا: أضف عنصر li للقائمة
    els.list.appendChild(li);
  });

  // تفعيل/تعطيل أزرار الحذف الجماعي حسب الوضع الحالي
  updateDeleteButtonsState();
}


/* =========================================================
   8) وظائف مساعدة (Validation / حفظ / رسائل)
   ========================================================= */

/*
  validateName(name):
  بيرجع نص الخطأ إذا في مشكلة
  وبيرجع "" إذا كل شيء تمام
*/
function validateName(name){
  // ممنوع يكون فاضي
  if (!name) return "المهمة لا يمكن أن تكون فارغة.";

  // أقل من 5 أحرف ممنوع
  if (name.length < 5) return "المهمة لازم تكون 5 أحرف على الأقل.";

  // إذا أول حرف رقم => ممنوع
  if (/^\d/.test(name)) return "المهمة لا يجوز أن تبدأ برقم.";

  // ما في أخطاء
  return "";
}

/*
  persist():
  يحفظ tasks داخل localStorage كنص JSON
*/
function persist(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/*
  updateDeleteButtonsState():
  - زر حذف الكل يتعطل إذا ما في مهام
  - زر حذف المكتمل يتعطل إذا ما في ولا مهمة مكتملة
*/
function updateDeleteButtonsState(){
  els.delAll.disabled = tasks.length === 0;
  els.delDone.disabled = !tasks.some(t => t.done);
}

/*
  flash(text):
  رسالة مؤقتة باللون الأحمر لمدة ثانية
*/
function flash(text){
  els.msg.textContent = text;
  els.msg.style.color = "red";

  // بعد 1 ثانية امسح الرسالة
  setTimeout(() => (els.msg.textContent = ""), 1000);
}

/*
  showInlineEditError(text):
  إذا في عنصر اسمه demo (مكان خطأ داخل مودال التعديل)
  اكتب فيه الخطأ
  وإلا استخدم flash كخطة بديلة
*/
function showInlineEditError(text){
  const demo = $("#demo");
  if (!demo) return flash(text);

  demo.textContent = text;
  demo.style.color = "red";
}


/* =========================================================
   9) حماية بسيطة: منع إدخال HTML داخل اسم المهمة
   =========================================================
   لو المستخدم كتب: <script>...</script>
   بدون escapeHtml ممكن ينفّذ كود داخل الصفحة (XSS)

   هذه الدالة تستبدل الرموز الخاصة بـ HTML entities
========================================================= */
function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]
  ));
}
