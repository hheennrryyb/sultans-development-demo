class CollectionUpsell {
  constructor() {
    this.modal = document.querySelector('.upsell-modal');
    this.modalOverlay = document.querySelector('.upsell-modal__overlay');
    this.modalCloseButton = document.querySelector('.upsell-modal__close-button');
    this.modalConfirmButton = document.querySelector('.upsell-modal__confirm-button');
    this.modalCheckoutButton = document.querySelector('.upsell-modal__checkout-button');
    this.productList = document.querySelector('.upsell-modal__product-list');
    this.subtotalPrice = document.querySelector('.upsell-modal__subtotal-price');
    this.modalProductImage = document.querySelector('.upsell-modal__product-image');
    this.modalProductTitle = document.querySelector('.upsell-modal__product-title');
    this.modalProductPrice = document.querySelector('.upsell-modal__product-price');
    this.addToCartButtons = document.querySelectorAll('.collection-upsell__button');
    
    // Carousel elements
    this.carouselContainer = document.querySelector('.collection-upsell__carousel-container');
    this.carousel = document.querySelector('.collection-upsell__carousel');
    this.prevButton = document.querySelector('.collection-upsell__nav--prev');
    this.nextButton = document.querySelector('.collection-upsell__nav--next');
    this.indicators = document.querySelector('.collection-upsell__indicators');
    
    this.mainProduct = null;
    this.upsellProducts = [];
    this.selectedUpsellProducts = [];
    
    this.cartDrawer = document.querySelector('cart-drawer');
    
    this.init();
  }
  
  init() {
    // Add event listeners to "Add to Cart" buttons
    this.addToCartButtons.forEach(button => {
      button.addEventListener('click', this.handleAddToCart.bind(this));
    });
    
    // Add event listeners for modal
    this.modalOverlay.addEventListener('click', this.closeModal.bind(this));
    this.modalCloseButton.addEventListener('click', this.closeModal.bind(this));
    this.modalConfirmButton.addEventListener('click', this.handleConfirmAddToCart.bind(this));
    this.modalCheckoutButton.addEventListener('click', this.handleAcceleratedCheckout.bind(this));
    
    // Handle ESC key to close modal
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });
    
    // Initialize carousel if elements exist
    if (this.carouselContainer && this.carousel) {
      this.initCarousel();
    }
  }
  
  initCarousel() {
    // Add navigation event listeners
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.scrollCarousel('prev'));
    }
    
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.scrollCarousel('next'));
    }
    
    // Add scroll event listener to update navigation states
    this.carousel.addEventListener('scroll', this.handleCarouselScroll.bind(this));
    
    // Generate scroll indicators
    this.generateIndicators();
    
    // Initial navigation state update
    this.updateNavigationState();
    
    // Update navigation on resize
    window.addEventListener('resize', this.updateNavigationState.bind(this));
  }
  
  scrollCarousel(direction) {
    const scrollAmount = this.carousel.clientWidth;
    const currentScroll = this.carousel.scrollLeft;
    
    if (direction === 'prev') {
      this.carousel.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: 'smooth'
      });
    } else {
      this.carousel.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  }
  
  handleCarouselScroll() {
    // Debounce scroll events
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.updateNavigationState();
      this.updateIndicators();
    }, 100);
  }
  
  updateNavigationState() {
    if (!this.prevButton || !this.nextButton) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = this.carousel;
    const isAtStart = scrollLeft <= 0;
    const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 10; // 10px tolerance
    
    this.prevButton.disabled = isAtStart;
    this.nextButton.disabled = isAtEnd;
  }
  
  generateIndicators() {
    if (!this.indicators) return;
    
    const totalWidth = this.carousel.scrollWidth;
    const visibleWidth = this.carousel.clientWidth;
    
    // Only show indicators if content overflows
    if (totalWidth <= visibleWidth) {
      this.indicators.style.display = 'none';
      // Hide navigation buttons when no indicators are displayed
      if (this.prevButton) this.prevButton.style.display = 'none';
      if (this.nextButton) this.nextButton.style.display = 'none';
      return;
    }
    
    // Calculate number of indicators needed
    const indicatorCount = Math.ceil(totalWidth / visibleWidth);
    
    // Clear existing indicators
    this.indicators.innerHTML = '';
    
    // Create indicators
    for (let i = 0; i < indicatorCount; i++) {
      const indicator = document.createElement('button');
      indicator.className = 'collection-upsell__indicator';
      indicator.setAttribute('aria-label', `Go to slide ${i + 1}`);
      indicator.addEventListener('click', () => this.scrollToSection(i));
      this.indicators.appendChild(indicator);
    }
    
    this.updateIndicators();
  }
  
  scrollToSection(sectionIndex) {
    const sectionWidth = this.carousel.clientWidth;
    const targetScroll = sectionIndex * sectionWidth;
    
    this.carousel.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }
  
  updateIndicators() {
    const indicators = this.indicators.querySelectorAll('.collection-upsell__indicator');
    if (indicators.length === 0) return;
    
    const currentSection = Math.round(this.carousel.scrollLeft / this.carousel.clientWidth);
    
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === currentSection);
    });
  }


  // Modal functionality
  
  handleAddToCart(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    
    // Get product data from button's data attributes
    this.mainProduct = {
      id: button.dataset.productId,
      variantId: button.dataset.variantId,
      title: button.dataset.productTitle,
      image: button.dataset.productImage,
      price: button.dataset.productPrice,
      url: button.dataset.productUrl
    };
    
    // Fetch upsell products from metafields
    this.fetchUpsellProducts(this.mainProduct.id).then(() => {
      // Open modal with product info
      this.openModal();
    });
  }
  
  async fetchUpsellProducts(productId) {
    try {
      // Clear any previous upsell products
      this.upsellProducts = [];
      this.selectedUpsellProducts = [];
      
      // Check if required configuration variables exist
      if (!window.shopifyDomain || !window.storefrontAccessToken) {
        console.error('Missing required configuration: shopifyDomain or storefrontAccessToken not defined');
        this.renderUpsellProducts([]);
        return;
      }
      
      // Define the GraphQL query to fetch the product with its upsell_products metafield
      const query = `
        query GetProductWithUpsells($productId: ID!) {
          product(id: $productId) {
            id
            title
            metafield(namespace: "custom", key: "upsell_products") {
              value
              type
            }
          }
        }
      `;
      
      // Create the product ID in Shopify's GID format
      const formattedProductId = `gid://shopify/Product/${productId}`;
      console.log('Making GraphQL request with token:', window.storefrontAccessToken);
      console.log('Product ID:', formattedProductId);
      
      // Make the GraphQL request to the Storefront API
      const response = await fetch(`https://${window.shopifyDomain}/api/2023-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': window.storefrontAccessToken
        },
        body: JSON.stringify({
          query: query,
          variables: {
            productId: formattedProductId
          }
        })
      });
      
      const result = await response.json();
      
      // Check for GraphQL errors specifically
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        this.renderUpsellProducts([]);
        return;
      }
      
      // Check for errors or missing data
      if (!result.data || !result.data.product || !result.data.product.metafield) {
        console.log('No upsell products metafield found for this product');
        this.renderUpsellProducts([]);
        return;
      }
      
      // Parse the metafield value (should be a JSON string of product GIDs)
      let productGids;
      try {
        productGids = JSON.parse(result.data.product.metafield.value);
        
        if (!Array.isArray(productGids) || productGids.length === 0) {
          console.log('No upsell product GIDs found in metafield');
          this.renderUpsellProducts([]);
          return;
        }
      } catch (error) {
        console.error('Error parsing upsell metafield value:', error);
        this.renderUpsellProducts([]);
        return;
      }
      
      
      // Fetch all upsell products with a single GraphQL call
      const upsellProducts = await this.fetchUpsellProductsByGids(productGids);
      this.upsellProducts = upsellProducts;
      
      console.log(`Successfully loaded ${this.upsellProducts.length} upsell products`);
      
      // Render the upsell products
      this.renderUpsellProducts(this.upsellProducts);
      
    } catch (error) {
      console.error('Error fetching upsell products with GraphQL:', error);
      this.renderUpsellProducts([]);
    }
  }
  
  async fetchUpsellProductsByGids(productGids) {
    try {
      // Create a GraphQL query to fetch multiple products by their GIDs
      const query = `
        query GetUpsellProducts($productIds: [ID!]!) {
          nodes(ids: $productIds) {
            ... on Product {
              id
              title
              handle
              featuredImage {
                url
                altText
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        }
      `;
      
      
      // Make the GraphQL request to fetch all upsell products
      const response = await fetch(`https://${window.shopifyDomain}/api/2023-07/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': window.storefrontAccessToken
        },
        body: JSON.stringify({
          query: query,
          variables: {
            productIds: productGids
          }
        })
      });
      
      const result = await response.json();
      
      // Check for GraphQL errors
      if (result.errors) {
        console.error('GraphQL errors fetching upsell products:', result.errors);
        return [];
      }
      
      // Check for missing data
      if (!result.data || !result.data.nodes) {
        console.log('No upsell products data found');
        return [];
      }
      
      // Transform GraphQL response to match the expected format
      const products = result.data.nodes
        .map(product => {
          const variant = product.variants.edges[0]?.node;
          const featuredImage = product.featuredImage || product.images.edges[0]?.node;
          
          if (!variant) {
            console.warn(`Product ${product.id} has no variants, skipping`);
            return null;
          }
          
          return {
            id: product.id.replace('gid://shopify/Product/', ''), // Extract numeric ID
            title: product.title,
            handle: product.handle,
            featured_image: featuredImage?.url || '',
            images: featuredImage ? [{ src: featuredImage.url, alt: featuredImage.altText }] : [],
            variants: [{
              id: variant.id.replace('gid://shopify/ProductVariant/', ''), // Extract numeric ID
              title: variant.title,
              price: Math.round(parseFloat(variant.price.amount) * 100), // Convert to cents
              available: variant.availableForSale
            }]
          };
        })

      return products;
      
    } catch (error) {
      console.error('Error fetching upsell products by GIDs:', error);
      return [];
    }
  }
  
  renderUpsellProducts(products) {
    // Clear product list
    this.productList.innerHTML = '';
    
    if (products.length === 0) {
      // No upsell products to display
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'upsell-modal__empty-message';
      emptyMessage.textContent = 'No recommended products available.';
      this.productList.appendChild(emptyMessage);
      
      // Hide the upsell title if no products
      const upsellTitle = document.querySelector('.upsell-modal__upsell-title');
      if (upsellTitle) {
        upsellTitle.style.display = 'none';
      }
      
      return;
    }
    
    // Show the upsell title
    const upsellTitle = document.querySelector('.upsell-modal__upsell-title');
    if (upsellTitle) {
      upsellTitle.style.display = 'block';
    }
    
    // Create product cards
    products.forEach(product => {
      const variant = product.variants[0]; // Use first variant
      
      const productCard = document.createElement('li');
      productCard.className = 'upsell-product-card';
      productCard.dataset.productId = product.id;
      productCard.dataset.variantId = variant.id;
      productCard.dataset.price = variant.price;
      
      const imageContainer = document.createElement('div');
      imageContainer.className = 'upsell-product-card__image-container';
      
      const image = document.createElement('img');
      image.className = 'upsell-product-card__image';
      image.src = product.featured_image || (product.images && product.images.length > 0 ? product.images[0].src : '');
      image.alt = product.title;
      image.width = 100;
      image.height = 100;
      
      const title = document.createElement('h4');
      title.className = 'upsell-product-card__title';
      title.textContent = product.title;
      
      const price = document.createElement('div');
      price.className = 'upsell-product-card__price';
      price.textContent = this.formatMoney(variant.price);
      
      const toggleButton = document.createElement('button');
      toggleButton.className = 'upsell-product-card__toggle';
      toggleButton.type = 'button';
      toggleButton.textContent = 'Add';
      toggleButton.addEventListener('click', () => this.toggleUpsellProduct(productCard));
      
      imageContainer.appendChild(image);
      productCard.appendChild(imageContainer);
      productCard.appendChild(title);
      productCard.appendChild(price);
      productCard.appendChild(toggleButton);
      
      this.productList.appendChild(productCard);
    });
    
    // Update subtotal
    this.updateSubtotal();
  }
  
  toggleUpsellProduct(productCard) {
    const productId = productCard.dataset.productId;
    const variantId = productCard.dataset.variantId;
    const price = parseInt(productCard.dataset.price);
    console.log(productCard);
    
    // Toggle selected state
    productCard.classList.toggle('selected');
    const isSelected = productCard.classList.contains('selected');
    
    const toggleButton = productCard.querySelector('.upsell-product-card__toggle');
    toggleButton.textContent = isSelected ? 'Remove' : 'Add';
    
    // Update selected products array
    if (isSelected) {
      this.selectedUpsellProducts.push({
        productId,
        variantId,
        price
      });
    } else {
      this.selectedUpsellProducts = this.selectedUpsellProducts.filter(p => p.variantId !== variantId);
    }
    
    // Update subtotal
    this.updateSubtotal();
  }
  
  updateSubtotal() {
    // Calculate subtotal: main product + selected upsells
    let subtotal = parseInt(this.mainProduct.price.replace(/[^0-9]/g, ''));
    
    this.selectedUpsellProducts.forEach(product => {
      subtotal += product.price;
    });
    
    // Update subtotal display
    this.subtotalPrice.textContent = this.formatMoney(subtotal);
  }
  
  async handleConfirmAddToCart() {
    // Show loading state
    this.modalConfirmButton.setAttribute('disabled', 'true');
    this.modalConfirmButton.textContent = 'Adding to cart...';
    
    try {
      // Consolidate all items to add to cart into a single state
      const itemsToAdd = [];

      // Add main product to the items array
      itemsToAdd.push({
        id: this.mainProduct.variantId,
        quantity: 1
      });
      
      // Add selected upsell products to the items array
      this.selectedUpsellProducts.forEach(product => {
        itemsToAdd.push({
          id: product.variantId,
          quantity: 1
        });
      });
      
      // Add all items to cart in a single batch operation
      await this.addItemsToCart(itemsToAdd);
      
      // Close modal
      this.closeModal();
      
      // Update cart drawer if it exists
      if (this.cartDrawer) {
        this.cartDrawer.open();
      }
    } catch (error) {
      console.error('Error adding products to cart:', error);
      alert('There was an error adding products to your cart. Please try again.');
    } finally {
      // Reset button state
      this.modalConfirmButton.removeAttribute('disabled');
      this.modalConfirmButton.textContent = 'Confirm';
    }
  }
  
  async handleAcceleratedCheckout() {
    // Show loading state
    this.modalCheckoutButton.setAttribute('disabled', 'true');
    this.modalCheckoutButton.textContent = 'Processing...';
    
    try {
      // Consolidate all items to add to cart into a single state
      const itemsToAdd = [];
      
      // Add main product to the items array
      itemsToAdd.push({
        id: this.mainProduct.variantId,
        quantity: 1
      });
      
      // Add selected upsell products to the items array
      this.selectedUpsellProducts.forEach(product => {
        console.log('Adding upsell product variant ID for checkout:', product.variantId);
        itemsToAdd.push({
          id: product.variantId,
          quantity: 1
        });
      });
      
      console.log('Items to add for accelerated checkout:', itemsToAdd);
      
      // Add all items to cart in a single batch operation
      await this.addItemsToCart(itemsToAdd);
      
      // Close modal
      this.closeModal();
      
      // Redirect directly to checkout
      window.location.href = '/checkout';
      
    } catch (error) {
      console.error('Error during accelerated checkout:', error);
      alert('There was an error processing your checkout. Please try again.');
    } finally {
      // Reset button state (in case redirect fails)
      this.modalCheckoutButton.removeAttribute('disabled');
      this.modalCheckoutButton.textContent = 'Buy Now';
    }
  }
  
  async addItemsToCart(items) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: items
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add items to cart');
    }
    
    return response.json();
  }
  
  openModal() {
    // Set product information in modal
    this.modalProductImage.src = this.mainProduct.image;
    this.modalProductImage.alt = this.mainProduct.title;
    this.modalProductTitle.textContent = this.mainProduct.title;
    this.modalProductPrice.textContent = this.mainProduct.price;
    
    // Show modal
    this.modal.classList.add('visible');
    this.modal.removeAttribute('hidden');
    
    // Set focus to close button for accessibility
    this.modalCloseButton.focus();
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
  }
  
  closeModal() {
    // Hide modal
    this.modal.classList.remove('visible');
    this.modal.setAttribute('hidden', 'true');
    
    // Allow background scrolling
    document.body.style.overflow = '';
    
    // Reset state
    this.selectedUpsellProducts = [];
  }
  
  isModalOpen() {
    return !this.modal.hasAttribute('hidden');
  }
  
  formatMoney(cents) {
    if (typeof cents === 'string') {
      cents = cents.replace(/[^0-9]/g, '');
    }
    
    const value = parseInt(cents, 10) / 100;
    const formattedValue = value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
    
    return formattedValue;
  }
}

// Initialize the collection upsell functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CollectionUpsell();
}); 