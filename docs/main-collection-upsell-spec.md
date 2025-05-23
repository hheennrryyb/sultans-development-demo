# 🧩 Section Spec Sheet: Collection + Upsell Modal Flow

## 📛 Section Name

`main-collection-upsell`

---

## 📝 Overview

Create a **reusable, responsive Liquid section** that displays a product **collection** titled `FE CASE STUDY`. The section should include:

* A **product card grid** (image, title, SKU, add-to-cart)
* An **upsell modal**, triggered on Add to Cart
* A **custom flow** for selecting related products (via metafields) and adding them in a **single cart operation**
* **No page reloads or redirects** during the flow

---

## 🔁 Reusability & Integration

* Must be a **standalone section** (`sections/main-collection-upsell.liquid`)
* Can be reused on other pages via custom `collection_id` schema settings
* Integrates with **Dawn theme’s** JavaScript and styling where possible (but overrides allowed where necessary)

---

## 🧱 Frontend Architecture

### 🧩 Product Card Markup (BEM)

Each card in `.collection-upsell__grid`:

```text
.collection-upsell__card
├── .collection-upsell__image
├── .collection-upsell__title
├── .collection-upsell__sku
└── .collection-upsell__button (Add to Cart)
```

### 🪟 Modal Structure (BEM)

When "Add to Cart" is clicked, modal opens:

```text
.upsell-modal
├── .upsell-modal__overlay
├── .upsell-modal__container
│   ├── .upsell-modal__header
│   ├── .upsell-modal__product-summary (current product info)
│   ├── .upsell-modal__carousel (upsell products)
│   │   ├── .upsell-product-card (per item)
│   │   │   ├── .upsell-product-card__image
│   │   │   ├── .upsell-product-card__title
│   │   │   ├── .upsell-product-card__price
│   │   │   └── .upsell-product-card__toggle (Select/Unselect)
│   ├── .upsell-modal__subtotal
│   └── .upsell-modal__confirm-button (Confirm add to cart)
```

---

## 🧠 Liquid Logic

### 1. **Loop Products in Collection**

Use `collection.products` to render cards:

```liquid
{% for product in collections['automated-collection'].products %}
```

### 2. **Fetch SKU**

Use first variant:

```liquid
{{ product.variants.first.sku }}
```

### 3. **Metafields Lookup for Upsell**

Reference product metafields:

```liquid
{% assign upsell_handles = product.metafields.custom.upsell_products.value %}
```

Load upsell products dynamically:

```liquid
{% assign upsell_products = upsell_handles | map: 'handle' | map: 'all_products' %}
```

---

## 🔌 JavaScript Behavior

### On Add to Cart Button

* Prevent default behavior
* Open `.upsell-modal`
* Inject upsell product data (via embedded `data-*` attributes or `window.__upsellData`)

### In Modal

* Allow multi-select using toggle buttons
* Update subtotal live (base product + selected upsells)
* On “Confirm Add to Cart”:

  * Use `fetch('/cart/add.js', { method: 'POST' })` multiple times
  * Await completion before closing modal
  * Update cart drawer asynchronously (if using Dawn’s cart drawer)

---

## 🧰 JSON Schema

```json
{
  "name": "Collection + Upsell Modal",
  "settings": [
    {
      "type": "collection",
      "id": "collection",
      "label": "Collection",
      "default": "automated-collection"
    },
    {
      "type": "range",
      "id": "products_per_row",
      "label": "Products per row",
      "min": 2,
      "max": 4,
      "step": 1,
      "default": 3
    }
  ],
  "presets": [
    {
      "name": "Collection with Upsell Modal",
      "category": "Products"
    }
  ]
}
```

---

## 🎯 Edge Cases to Handle

* No upsell products: Modal should still show main product summary, subtotal, and confirm button
* Out of stock upsells: Display but disable toggle/select
* Multiple clicks: Prevent duplicate cart adds or race conditions
* Accessibility: Ensure modal focus trap, ESC to close, and keyboard navigation

---

## 🧪 Testing Checklist

* [ ] Modal opens correctly for each product
* [ ] Upsell products load via metafields
* [ ] Select/unselect toggles affect subtotal
* [ ] Confirm button adds all selected products
* [ ] No redirects at any point
* [ ] Responsive and mobile-friendly
* [ ] Cart drawer updates if present


