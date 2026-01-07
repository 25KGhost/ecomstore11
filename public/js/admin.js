import { getSupabase, getCloudinaryConfig } from './supabase-client.js';

let sb;
let uploadedImages = []; 
let mainImageIndex = 0; 

async function initAdmin() {
    // 1. Initialize Supabase (this also fetches the config from server)
    sb = await getSupabase();
    
    // 2. Check Auth
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
        showDashboard();
        // 3. Initialize Cloudinary ONLY after config is loaded
        initCloudinary();
    } else {
        document.getElementById('login-view').classList.remove('hidden');
    }
}

function initCloudinary() {
    const config = getCloudinaryConfig();
    
    if (!config || !config.cloudName || !config.preset) {
        console.error("Cloudinary config missing. Check Vercel Env Vars.");
        return;
    }

    const myWidget = cloudinary.createUploadWidget({
        cloudName: config.cloudName, 
        uploadPreset: config.preset,
        sources: ['local', 'url', 'camera'],
        multiple: true,
        maxFiles: 6
    }, (error, result) => { 
        if (!error && result && result.event === "success") { 
            addImageToState(result.info.secure_url);
        }
    });

    document.getElementById("upload_widget").addEventListener("click", () => myWidget.open(), false);
}
function addImageToState(url) {
    if (uploadedImages.length >= 6) return;
    uploadedImages.push(url);
    renderImages();
}

function renderImages() {
    const container = document.getElementById('uploaded-images-container');
    container.innerHTML = uploadedImages.map((url, idx) => `
        <div class="img-thumb ${idx === mainImageIndex ? 'selected' : ''}" onclick="setMainImage(${idx})">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
            <span onclick="removeImage(${idx}, event)" style="position:absolute; top:0; right:0; background:red; color:white; font-size:10px; padding:2px; cursor:pointer;">X</span>
        </div>
    `).join('');
}

window.setMainImage = (idx) => {
    mainImageIndex = idx;
    renderImages();
};

window.removeImage = (idx, e) => {
    e.stopPropagation();
    uploadedImages.splice(idx, 1);
    if(mainImageIndex >= uploadedImages.length) mainImageIndex = 0;
    renderImages();
};

// --- AUTH & DASHBOARD LOGIC ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ 
        email: document.getElementById('email').value, 
        password: document.getElementById('password').value 
    });
    if (error) alert(error.message);
    else showDashboard();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.reload();
});

function showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    loadProducts();
}

window.showSection = (section) => {
    ['products', 'categories', 'orders'].forEach(id => document.getElementById(`section-${id}`).classList.add('hidden'));
    document.getElementById(`section-${section}`).classList.remove('hidden');
    if (section === 'products') loadProducts();
    if (section === 'categories') loadCategories();
    if (section === 'orders') loadOrders();
};

// --- PRODUCT LOGIC ---
async function loadProducts() {
    const { data } = await sb.from('products').select('*').order('created_at', { ascending: false });
    const list = document.getElementById('admin-products-list');
    list.innerHTML = data.map(p => `
        <div class="card" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:10px; align-items:center;">
                <img src="${p.image_url}" style="width:50px; height:50px; object-fit:cover;">
                <div>
                    <strong>${p.name}</strong> (${p.price} DZD) <br> 
                    Stock: ${p.stock} | <small style="color:${p.active ? 'green' : 'red'}">${p.active ? 'Active' : 'Draft/Inactive'}</small>
                </div>
            </div>
            <div>
                <button class="btn" onclick="editProduct(${p.id})">Edit</button>
                <button class="btn" style="background:red" onclick="deleteProduct(${p.id})">X</button>
            </div>
        </div>
    `).join('');
    
    // Populate Categories
    const { data: cats } = await sb.from('categories').select('*');
    const sel = document.getElementById('p-category');
    sel.innerHTML = '<option value="">Select Category</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

window.resetProductForm = () => {
    document.getElementById('product-form').reset();
    document.getElementById('p-id').value = '';
    uploadedImages = [];
    mainImageIndex = 0;
    renderImages();
};

window.editProduct = async (id) => {
    const { data } = await sb.from('products').select('*').eq('id', id).single();
    document.getElementById('p-id').value = data.id;
    document.getElementById('p-name').value = data.name;
    document.getElementById('p-price').value = data.price;
    document.getElementById('p-desc').value = data.description;
    document.getElementById('p-stock').value = data.stock;
    document.getElementById('p-category').value = data.category_id;
    
    document.getElementById('p-sizes').value = data.sizes ? data.sizes.join(',') : '';
    document.getElementById('p-colors').value = data.colors ? data.colors.join(',') : '';

    uploadedImages = data.gallery || [];
    if(data.image_url && !uploadedImages.includes(data.image_url)) {
        uploadedImages.unshift(data.image_url);
    }
    mainImageIndex = uploadedImages.indexOf(data.image_url);
    if(mainImageIndex === -1) mainImageIndex = 0;
    renderImages();
};

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(uploadedImages.length === 0) { alert('Please upload at least one image'); return; }

    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value;
    const stock = parseInt(document.getElementById('p-stock').value);
    
    const sizes = document.getElementById('p-sizes').value.split(',').map(s=>s.trim()).filter(s=>s);
    const colors = document.getElementById('p-colors').value.split(',').map(s=>s.trim()).filter(s=>s);

    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

    const payload = {
        name,
        price: document.getElementById('p-price').value,
        description: document.getElementById('p-desc').value,
        stock: stock,
        category_id: document.getElementById('p-category').value || null,
        image_url: uploadedImages[mainImageIndex],
        gallery: uploadedImages,
        sizes: sizes,
        colors: colors,
        active: stock > 0
    };

    if (!id) payload.slug = slug;

    if (id) await sb.from('products').update(payload).eq('id', id);
    else await sb.from('products').insert([payload]);

    resetProductForm();
    loadProducts();
});

window.deleteProduct = async (id) => {
    if(confirm('Delete?')) {
        await sb.from('products').delete().eq('id', id);
        loadProducts();
    }
};

// --- CATEGORIES & ORDERS LOGIC ---
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

async function loadOrders() {
    const { data } = await sb.from('orders').select('*, products(name, stock)').order('created_at', { ascending: false });
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = data.map(o => `
        <tr>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
            <td>${o.customer_name}<br>${o.wilaya}, ${o.baladia}<br>${o.phone}</td>
            <td>${o.products?.name}</td>
            <td>${o.total_price} DZD</td>
            <td class="status-${o.status}">${o.status}</td>
            <td>
                <button onclick="updateOrderStatus(${o.id}, 'delivered', ${o.product_id})" ${o.status === 'delivered' ? 'disabled' : ''}>Mark Delivered</button>
            </td>
        </tr>
    `).join('');
}

window.updateOrderStatus = async (orderId, status, prodId) => {
    await sb.from('orders').update({ status }).eq('id', orderId);
    if (status === 'delivered') {
        const { data: prod } = await sb.from('products').select('stock').eq('id', prodId).single();
        if (prod) {
            const newStock = Math.max(0, prod.stock - 1);
            await sb.from('products').update({ stock: newStock, active: newStock > 0 }).eq('id', prodId);
        }
    }
    loadOrders();
};

initAdmin();