const API_URL = "http://localhost:3000/api/expenses";

const badgeColors = {
  Food: "success",
  Transport: "primary",
  Bills: "danger",
  Entertainment: "warning",
  Other: "secondary",
};

let expenses = [];

function updateDateTime() {
  const now = new Date();
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  document.getElementById("datetime-text").innerText = now.toLocaleString(
    "en",
    options,
  );
}

function exportCSV() {
  if (expenses.length === 0) {
    alert("No expenses to export.");
    return;
  }

  const headers = ["ID", "Title", "Amount", "Category", "Date"];

  const rows = expenses.map((expense) => [
    expense.id,
    expense.title,
    expense.amount,
    expense.category,
    expense.date,
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(", ")).join("\n");

  // blob: Binary Large Object
  // وهو كائن يمثل بيانات يمكن التعامل معها كملف

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // يعطي هذا الملف رابطًا مؤقتًا
  // وبعدها نستخدم <a> لتنزيله.
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "expenses.csv";
  link.click();

  // حذف الرابط المؤقت
  URL.revokeObjectURL(url);
}

function showSpinner() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.classList.remove("d-none");
}

function hideSpinner() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.classList.add("d-none");
}

function showAlert(message, type = "danger") {
  const alertContainer = document.getElementById("alertContainer");
  if (!alertContainer) return;
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// API functions
async function getExpenses() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function addExpense(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function updateExpense(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

async function deleteExpense(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

function renderTable(list) {
  const tbody = document.getElementById("expensesTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  list.forEach((expense) => {
    const badgeColor = badgeColors[expense.category] || "secondary";
    const amount = (Number(expense.amount) || 0).toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${expense.title}</td>
      <td>${amount}</td>
      <td>
        <span class="badge bg-${badgeColor}">
          ${expense.category}
        </span>
      </td>
      <td>${expense.date}</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" onclick="openEditModal(${expense.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="handleDelete(${expense.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSummary(list) {
  const total = list.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const count = list.length;
  const highest =
    list.length > 0
      ? Math.max(...list.map((expense) => Number(expense.amount)))
      : 0;

  document.getElementById("totalExpenses").innerText = total.toFixed(2);
  document.getElementById("expenseCount").innerText = count;
  document.getElementById("highestExpense").innerText = highest.toFixed(2);
}

function applyFilter() {
  const filter = document.getElementById("categoryFilter");
  const searchInput = document.getElementById("titleSearch");

  const category = filter ? filter.value : "All";
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const filteredList = expenses.filter((expense) => {
    const matchesCategory = category === "All" || expense.category === category;

    const matchesTitle = expense.title.toLowerCase().includes(searchText);

    return matchesCategory && matchesTitle;
  });

  renderTable(filteredList);
  renderSummary(expenses);
}

async function refresh() {
  showSpinner();
  try {
    expenses = await getExpenses();
    applyFilter();
  } catch (error) {
    showAlert("Failed to load expenses: " + error.message, "danger");
  } finally {
    hideSpinner();
  }
}

// button onclick handlers
function openEditModal(id) {
  const expense = expenses.find((item) => item.id == id);
  if (!expense) return;

  document.getElementById("editId").value = expense.id;
  document.getElementById("editTitle").value = expense.title;
  document.getElementById("editAmount").value = expense.amount;
  document.getElementById("editCategory").value = expense.category;
  document.getElementById("editDate").value = expense.date;

  // هات الـ Modal الموجود
  //وإذا ما كان له Instance أنشئ واحد.
  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("editExpenseModal"),
  );
  modal.show();
}

async function handleDelete(id) {
  if (!confirm("Are you sure you want to delete this expense?")) {
    return;
  }

  try {
    await deleteExpense(id);
    await refresh();
  } catch (error) {
    showAlert("Failed to delete expense: " + error.message, "danger");
  }
}

// Event Listeners Setup
document.addEventListener("DOMContentLoaded", () => {
  updateDateTime();

  // Add Expense Form
  const addForm = document.getElementById("addExpenseForm");
  if (addForm) {
    // in message error
    const titleInput = document.getElementById("inputTitle");
    const amountInput = document.getElementById("inputAmount");
    const categoryInput = document.getElementById("inputCategory");
    const dateInput = document.getElementById("inputDate");

    addForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // prevent repeat

      const title = document.getElementById("inputTitle").value.trim();
      const amount = parseFloat(document.getElementById("inputAmount").value);
      const category = document.getElementById("inputCategory").value;
      const date = document.getElementById("inputDate").value;

      // Remove previous errors
      titleInput.classList.remove("is-invalid");
      amountInput.classList.remove("is-invalid");
      categoryInput.classList.remove("is-invalid");
      dateInput.classList.remove("is-invalid");

      if (!title) {
        titleInput.classList.add("is-invalid");
      }

      if (isNaN(amount) || amount <= 0) {
        amountInput.classList.add("is-invalid");
      }

      if (!category) {
        categoryInput.classList.add("is-invalid");
      }

      if (!date) {
        dateInput.classList.add("is-invalid");
        return;
      }

      showSpinner();
      try {
        await addExpense({ title, amount, category, date });
        addForm.reset();
        await refresh();
      } catch (error) {
        showAlert("Failed to add expense: " + error.message, "danger");
      } finally {
        hideSpinner();
      }
    });
  }

  // Edit Expense Form
  const editForm = document.getElementById("editExpenseForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // prevent repeat

      const id = document.getElementById("editId").value;
      const title = document.getElementById("editTitle").value.trim();
      const amount = parseFloat(document.getElementById("editAmount").value);
      const category = document.getElementById("editCategory").value;
      const date = document.getElementById("editDate").value;

      if (!title || isNaN(amount) || !category || !date) {
        return;
      }

      showSpinner();
      try {
        await updateExpense(id, { title, amount, category, date });
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("editExpenseModal"),
        );
        modal.hide();

        await refresh();
      } catch (error) {
        showAlert("Failed to update expense: " + error.message, "danger");
      } finally {
        hideSpinner();
      }
    });
  }

  // Category Filter
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFilter);
  }

  // Search by title
  const titleSearch = document.getElementById("titleSearch");
  if (titleSearch) {
    titleSearch.addEventListener("input", applyFilter);
  }

  refresh();
});
