import { getSupabase } from './supabase-client.js';

let currentProduct = null;

async function loadProduct() {
    const sb = await getSupabase();
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) window.location.href = '/shop';

    const { data, error } = await sb.from('products').select('*, categories(name)').eq('slug', slug).single();

    if (error || !data) {
        document.body.innerHTML = "<h1>Product not found</h1>";
        return;
    }

    currentProduct = data;

    // Render Product
    const container = document.getElementById('product-container');
    container.innerHTML = `
        <div>
            <img src="${data.image_url || 'https://via.placeholder.com/400'}" style="width:100%; border:1px solid #ddd;">
        </div>
        <div>
            <span style="background:#eee; padding:5px; font-size:0.8rem">${data.categories?.name || 'Uncategorized'}</span>
            <h1 style="margin: 10px 0;">${data.name}</h1>
            <h2 style="color:var(--success)">${data.price} DZD</h2>
            <p style="margin: 20px 0; white-space: pre-wrap;">${data.description}</p>
        </div>
    `;

    // Handle Order Submit
    document.getElementById('order-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const orderData = {
            customer_name: formData.get('customer_name'),
            phone: formData.get('phone'),
            wilaya: formData.get('wilaya'),
            quantity: formData.get('quantity'),
            product_id: currentProduct.id
        };

        const { error: orderError } = await sb.from('orders').insert([orderData]);

        if (orderError) {
            alert('Error placing order: ' + orderError.message);
        } else {
            // WhatsApp Redirect
            const msg = `New Order: ${currentProduct.name} (x${orderData.quantity}). Name: ${orderData.customer_name}, Wilaya: ${orderData.wilaya}`;
            const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`; // Add your number here e.g. wa.me/213555555
            
            alert('Order saved! Redirecting to WhatsApp...');
            window.location.href = waLink;
        }
    });
}

loadProduct();