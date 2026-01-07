import { getSupabase } from './supabase-client.js';

async function loadShop() {
    const sb = await getSupabase();
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCat = urlParams.get('category');

    // Load Filters
    const { data: categories } = await sb.from('categories').select('*');
    const filterList = document.getElementById('filter-list');
    categories.forEach(cat => {
        filterList.innerHTML += `<a href="/shop?category=${cat.id}" class="btn" style="width:100%; margin-top:5px; background: ${selectedCat == cat.id ? '#222' : '#999'}">${cat.name}</a>`;
    });

    // Load Products
    let query = sb.from('products').select('*').eq('active', true);
    if (selectedCat) query = query.eq('category_id', selectedCat);
    
    const { data: products } = await query;
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    if(products.length === 0) grid.innerHTML = '<p>No products found.</p>';

    products.forEach(prod => {
        grid.innerHTML += `
            <div class="card">
                <img src="${prod.image_url || 'https://via.placeholder.com/200'}" alt="${prod.name}">
                <h3>${prod.name}</h3>
                <p><strong>${prod.price} DZD</strong></p>
                <a href="/product?slug=${prod.slug}" class="btn" style="margin-top:10px; width:100%">Buy Now</a>
            </div>
        `;
    });
}

loadShop();