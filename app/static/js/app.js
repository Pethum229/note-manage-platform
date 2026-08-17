document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api';

    // State
    let currentNotebooks = [];
    let currentEditId = null;

    // Elements
    const gridEl = document.getElementById('notebooksGrid');
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categoryFilter');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const notebookForm = document.getElementById('notebookForm');
    const btnNewNotebook = document.getElementById('btnNewNotebook');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');

    // Stat Elements
    const statTotal = document.getElementById('statTotal');
    const statCategories = document.getElementById('statCategories');

    // Initialize
    loadStats();
    loadNotebooks();

    // Event Listeners
    btnNewNotebook.addEventListener('click', () => openModal());
    btnCloseModal.addEventListener('click', () => closeModal());
    btnCancelModal.addEventListener('click', () => closeModal());
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadNotebooks, 300);
    });

    categorySelect.addEventListener('change', loadNotebooks);

    notebookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('fieldTitle').value.trim();
        const category = document.getElementById('fieldCategory').value.trim() || 'General';
        const tags = document.getElementById('fieldTags').value.trim();
        const content = document.getElementById('fieldContent').value.trim();

        if (!title || !content) {
            showToast('Please fill in title and content', 'error');
            return;
        }

        const payload = { title, category, tags, content };

        try {
            if (currentEditId) {
                // Update
                const res = await fetch(`${API_BASE}/notebooks/${currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('Notebook updated successfully!');
                    closeModal();
                    loadNotebooks();
                    loadStats();
                } else {
                    showToast('Failed to update notebook', 'error');
                }
            } else {
                // Create
                const res = await fetch(`${API_BASE}/notebooks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('Notebook created successfully!');
                    closeModal();
                    loadNotebooks();
                    loadStats();
                } else {
                    showToast('Failed to create notebook', 'error');
                }
            }
        } catch (err) {
            console.error(err);
            showToast('API Connection Error', 'error');
        }
    });

    // Load Stats
    async function loadStats() {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            if (res.ok) {
                const data = await res.json();
                statTotal.textContent = data.total_notebooks;
                statCategories.textContent = data.categories_count;

                // Update category dropdown if needed
                const existingCats = ['All', ...data.categories];
                const currentVal = categorySelect.value;
                categorySelect.innerHTML = existingCats.map(c => `<option value="${c}">${c}</option>`).join('');
                if (existingCats.includes(currentVal)) {
                    categorySelect.value = currentVal;
                }
            }
        } catch (err) {
            console.error('Failed to load stats', err);
        }
    }

    // Load Notebooks
    async function loadNotebooks() {
        const query = searchInput.value.trim();
        const cat = categorySelect.value;

        let url = `${API_BASE}/notebooks?`;
        if (query) url += `search=${encodeURIComponent(query)}&`;
        if (cat && cat !== 'All') url += `category=${encodeURIComponent(cat)}&`;

        try {
            const res = await fetch(url);
            if (res.ok) {
                currentNotebooks = await res.json();
                renderNotebooks(currentNotebooks);
            }
        } catch (err) {
            console.error('Failed to fetch notebooks', err);
            gridEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Failed to connect to API server</p></div>`;
        }
    }

    // Render Cards
    function renderNotebooks(notebooks) {
        if (!notebooks || notebooks.length === 0) {
            gridEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📓</div>
                    <h3>No notebooks found</h3>
                    <p style="color: var(--text-muted); margin-top: 8px;">Create your first notebook or clear search filters.</p>
                </div>
            `;
            return;
        }

        gridEl.innerHTML = notebooks.map(nb => {
            const dateStr = new Date(nb.updated_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="notebook-card" data-id="${nb.id}">
                    <div class="card-top">
                        <span class="card-category">${escapeHtml(nb.category || 'General')}</span>
                        <h3 class="card-title" title="${escapeHtml(nb.title)}">${escapeHtml(nb.title)}</h3>
                        <p class="card-body-text">${escapeHtml(nb.content)}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-date">${dateStr}</span>
                        <div class="card-actions">
                            <button class="icon-btn" onclick="openViewModal(${nb.id})" title="View Details">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            <button class="icon-btn" onclick="openEditModal(${nb.id})" title="Edit">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button class="icon-btn delete" onclick="deleteNotebook(${nb.id})" title="Delete">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modal Helpers
    function openModal(editId = null) {
        currentEditId = editId;
        if (editId) {
            modalTitle.textContent = 'Edit Notebook';
            const nb = currentNotebooks.find(n => n.id === editId);
            if (nb) {
                document.getElementById('fieldTitle').value = nb.title;
                document.getElementById('fieldCategory').value = nb.category;
                document.getElementById('fieldTags').value = nb.tags || '';
                document.getElementById('fieldContent').value = nb.content;
            }
        } else {
            modalTitle.textContent = 'Create New Notebook';
            notebookForm.reset();
        }
        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        currentEditId = null;
        notebookForm.reset();
    }

    // Global Action Helpers attached to window
    window.openEditModal = (id) => openModal(id);

    window.openViewModal = (id) => {
        const nb = currentNotebooks.find(n => n.id === id);
        if (nb) {
            alert(`Title: ${nb.title}\nCategory: ${nb.category}\nTags: ${nb.tags}\n\nContent:\n${nb.content}`);
        }
    };

    window.deleteNotebook = async (id) => {
        if (!confirm(`Are you sure you want to delete notebook #${id}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/notebooks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast(`Notebook #${id} deleted.`);
                loadNotebooks();
                loadStats();
            } else {
                showToast('Failed to delete notebook', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Connection error', 'error');
        }
    };

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        if (type === 'error') toast.style.borderLeftColor = 'var(--accent-rose)';
        toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
