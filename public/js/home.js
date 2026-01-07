import { getSupabase } from './supabase-client.js';

async function loadHome() {
    const sb = await getSupabase();

    // 1. Search Functionality
    const handleSearch = async () => {
        const query = document.getElementById('search-input').value.trim();
        if(!query) return;

        const { data } = await sb.from('products')
            .select('slug')
            .ilike('name', `%${query}%`)
            .limit(1);
        
        if (data && data.length > 0) {
            window.location.href = `/product?slug=${data[0].slug}`;
        } else {
            alert('Product not found. Try looking in the shop.');
            window.location.href = `/shop`;
        }
    };
    
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleSearch();
    });

    // 2. Load Featured Categories (Random Shuffle)
    const { data: categories } = await sb.from('categories').select('*');
    if (categories) {
        // Shuffle array
        const shuffled = categories.sort(() => 0.5 - Math.random()).slice(0, 4);
        const catContainer = document.getElementById('category-list');
        catContainer.innerHTML = shuffled.map(cat => `
            <div class="card" style="text-align:center; padding: 30px; cursor:pointer;" 
                 onclick="window.location.href='/shop?category=${cat.id}'">
                <h3>${cat.name}</h3>
                <p>View Collection &rarr;</p>
            </div>
        `).join('');
    }

    // 3. Load New Arrivals (Recently Added, Active, Stock > 0)
    const { data: products } = await sb.from('products')
        .select('*')
        .eq('active', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(4);

    const prodContainer = document.getElementById('featured-products');
    prodContainer.innerHTML = products.map(prod => `
        <div class="card">
            <span class="badge">New</span>
            <img src="${prod.image_url || 'https://via.placeholder.com/200'}" alt="${prod.name}">
            <h3>${prod.name}</h3>
            <p><strong>${prod.price} DZD</strong></p>
            <a href="/product?slug=${prod.slug}" class="btn" style="margin-top:10px; width:100%">Buy Now</a>
        </div>
    `).join('');
}

loadHome();