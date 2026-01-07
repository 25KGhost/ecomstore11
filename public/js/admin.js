import { getSupabase } from './supabase-client.js';

let sb;

// Initialize & Check Auth
async function initAdmin() {
    sb = await getSupabase();
    
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
        showDashboard();
    } else {
        document.getElementById('login-view').classList.remove('hidden');
    }
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else showDashboard();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.reload();
});

function showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    loadProducts(); // Load initial data
}

// --- TAB SWITCHING ---
window.showSection = (section) => {
    ['products', 'categories', 'orders'].forEach(id => {
        document.getElementById(`section-${id}`).classList.add('hidden');
    });
    document.getElementById(`section-${section}`).classList.remove('hidden');
    
    if (section === 'products') loadProducts();
    if (section === 'categories') loadCategories();
    if (section === 'orders') loadOrders();
};

// --- PRODUCTS LOGIC ---
async function loadProducts() {
    const { data } = await sb.from('products').select('*').order('created_at', { ascending: false });
    const list = document.getElementById('admin-products-list');
    list.innerHTML = data.map(p => `
        <div class="card" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${p.name}</strong> (${p.price} DZD) <br> <small>${p.active ? 'Active' : 'Inactive'}</small>
            </div>
            <div>
                <button class="btn" onclick="editProduct(${p.id})">Edit</button>
                <button class="btn" style="background:red" onclick="deleteProduct(${p.id})">X</button>
            </div>
        </div>
    `).join('');
    
    // Populate Category Select in Form
    const { data: cats } = await sb.from('categories').select('*');
    const sel = document.getElementById('p-category');
    sel.innerHTML = '<option value="">Select Category</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

window.editProduct = async (id) => {
    const { data } = await sb.from('products').select('*').eq('id', id).single();
    document.getElementById('p-id').value = data.id;
    document.getElementById('p-name').value = data.name;
    document.getElementById('p-price').value = data.price;
    document.getElementById('p-desc').value = data.description;
    document.getElementById('p-image').value = data.image_url;
    document.getElementById('p-category').value = data.category_id;
};

window.deleteProduct = async (id) => {
    if(confirm('Delete?')) {
        await sb.from('products').delete().eq('id', id);
        loadProducts();
    }
};

window.resetProductForm = () => {
    document.getElementById('product-form').reset();
    document.getElementById('p-id').value = '';
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value;
    
    // Simple slug generator
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

    const payload = {
        name,
        price: document.getElementById('p-price').value,
        description: document.getElementById('p-desc').value,
        image_url: document.getElementById('p-image').value,
        category_id: document.getElementById('p-category').value || null,
        slug: id ? undefined : slug // Only set slug on create
    };
    if (!id && !payload.slug) delete payload.slug; 

    if (id) await sb.from('products').update(payload).eq('id', id);
    else await sb.from('products').insert([payload]);

    resetProductForm();
    loadProducts();
});

// --- CATEGORIES LOGIC ---
async function loadCategories() {
    const { data } = await sb.from('categories').select('*');
    document.getElementById('admin-cat-list').innerHTML = data.map(c => `<li>${c.name} <button onclick="deleteCat(${c.id})">x</button></li>`).join('');
}

document.getElementById('cat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    await sb.from('categories').insert([{ name }]);
    document.getElementById('cat-name').value = '';
    loadCategories();
});

window.deleteCat = async (id) => {
    if(confirm('Delete?')) { 
        await sb.from('categories').delete().eq('id', id);
        loadCategories();
    }
}

// --- ORDERS LOGIC ---
async function loadOrders() {
    const { data } = await sb.from('orders').select('*, products(name)').order('created_at', { ascending: false });
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = data.map(o => `
        <tr>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
            <td>${o.customer_name}<br>${o.phone}</td>
            <td>${o.products?.name} (x${o.quantity})</td>
            <td class="status-${o.status}">${o.status}</td>
            <td>
                <button onclick="updateOrderStatus(${o.id}, 'contacted')">Contacted</button>
                <button onclick="updateOrderStatus(${o.id}, 'delivered')">Delivered</button>
            </td>
        </tr>
    `).join('');
}

window.updateOrderStatus = async (id, status) => {
    await sb.from('orders').update({ status }).eq('id', id);
    loadOrders();
};

initAdmin();