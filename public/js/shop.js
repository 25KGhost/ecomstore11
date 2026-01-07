import { getSupabase } from './supabase-client.js';

async function loadShop() {
    const sb = await getSupabase();
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCat = urlParams.get('category');
    
    // 1. Load Filters
    const { data: categories } = await sb.from('categories').select('*');
    const filterList = document.getElementById('filter-list');
    
    categories.forEach(cat => {
        const isActive = selectedCat == cat.id;
        filterList.innerHTML += `
            <a href="/shop?category=${cat.id}" class="btn" 
               style="width:100%; margin-top:5px; background: ${isActive ? '#222' : '#fff'}; color: ${isActive ? '#fff' : '#333'}; border: 1px solid #ddd;">
               ${cat.name}
            </a>`;
    });

    // 2. Fetch Logic with Sorting
    async function fetchProducts(sortType) {
        let query = sb.from('products').select('*').eq('active', true).gt('stock', 0);
        
        if (selectedCat) query = query.eq('category_id', selectedCat);

        // Sorting
        if (sortType === 'high-low') query = query.order('price', { ascending: false });
        else if (sortType === 'low-high') query = query.order('price', { ascending: true });
        else query = query.order('created_at', { ascending: false }); // Default

        const { data: products } = await query;
        renderProducts(products);
    }

    function renderProducts(products) {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = '';
        if(!products || products.length === 0) {
            grid.innerHTML = '<p>No products found.</p>';
            return;
        }

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

    // Initial Load
    fetchProducts('newest');

    // Handle Sort Change
    document.getElementById('sort-select').addEventListener('change', (e) => {
        fetchProducts(e.target.value);
    });
}

loadShop();